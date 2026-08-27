import { Sval,SvalOptions } from "./sval.ts";
import { generate } from 'astring';
import ansis from "ansis";
import { LRUCache } from 'lru-cache';
import Scope from './scope/index.ts';
import { QList, ReadonlyQList } from './q-list.ts'

import { 
    parse as meriyahParse,
    Options as MeriyahOptions 
} from 'meriyah';

import { 
    Inspector,
    Reusables, 
    ScopeForEvent,
    EsNode,
    Fn, 
    createEvent, 
    SvalPlus as SvalPlusContract, 
    UNASSIGNED, 
    LAZY_NODE, 
    Visit as VisitContract, 
    EventMap, 
    NOT_ALLOCATED,
    PerExeFn,
    OnStep,
    VisitExecutionError,
    GeneratedKey
} from './custom-types.ts'

import { 
    executedManually,
    getSHA256Key, 
    inLazyMode, 
    pushResult 
} from './lifecycle.ts';


export interface Metadata<T extends Fn> {
    /**the reference to the function to be included in the interpreter context*/
    ref:T,

    /** 
     *Because the function runs in an isolated interpreter context, all variables that it needs from the outside scope has to captured by mapping their names to their values and passing the object here.
     *It is important to keep in mind that the captures object itself follows the semantic of copy primitives by value and copy obects by reference.
    */
    captures?:Record<string,any>
}
export interface FnSrc<T extends boolean> {
    fnName:string
    fnCode:string,
    fnCall:T extends true?string:null,
}
export interface FnAst {
    fnCode:EsNode,
    fnCall:EsNode,
}
interface SvalPlusArgs {
    useExtensions:boolean,
    inspector?:Inspector<'user'>,
    onStep?:OnStep,
    fnBeforeEachCall?:Fn,
    fnAfterEachCall?:Fn,
}

class EventScope implements ScopeForEvent {
    #scope:Scope;

    public variables:ScopeForEvent['variables'];

    public depth:number;
    public callDepth:number;

    constructor(interpreter:SvalPlus) {
        this.#scope = interpreter.reusables.scope!;

        const userRootDepth = this.#scope.userRoot.depth;
        const rootDepthErrMsg = ansis.red(`Internal logic error: Cannot allocate a scope for an event if null is given as the user's root depth`)

        if (userRootDepth === null) {
            throw new Error(rootDepthErrMsg)
        };

        this.depth = this.#scope.depth - userRootDepth;
        this.callDepth = interpreter.userRoot.callStack.length - 1;

        const local:ScopeForEvent['variables']['local'] = Object.create(null)
        for (const k in this.#scope.local) {
            local[k] = this.#scope.local[k].get()
        };
        
        this.variables = {
            search:(name:string):unknown | undefined => {
                const variable = this.#scope.find(name);
                return (variable === null)?undefined:variable.get();
            },
            local
        }
    }
} 
export class Visit implements VisitContract {
    #interpreter:SvalPlus

    constructor(interpreter:SvalPlus) {
        this.#interpreter = interpreter;
    }
    public localExeStack = ()=>{
        return this.#interpreter.reusables.execution.readonlyExeStack;
    }
    public callStack = ()=>{
        return this.#interpreter.userRoot.readonlyCallStack;
    }
    //the monitor will only create the event object for a node if it matches the query
    public is:VisitContract['is'] = (query,cb)=>{
        const node = this.#interpreter.reusables.node!;

        if ((query === "Any") || (node.type === query)) {
            const event:EventMap[typeof query] = createEvent(query,this.#interpreter)
            cb(event);
            this.#interpreter.reusables.event = event;
        }
    };

    public execute = () =>{
        const handler = this.#interpreter.reusables.handler;

        if (handler === null) {
            throw new Error(ansis.red(`Cannot use visit.execute because it received null as the handler`))
        };
        if (executedManually(this.#interpreter.reusables.result)) {
            throw new VisitExecutionError(ansis.red(`A node can only be executed once`))
        };

        //the node cannot be null if the handler is not null. If it is, it will rightfully fail with a loud type error
        this.#interpreter.reusables.result = handler(
            this.#interpreter.reusables.node!,
            this.#interpreter.reusables.scope!
        );

        if (inLazyMode(this.#interpreter)) {
            return LAZY_NODE;
        }else {
            pushResult(this.#interpreter,this.#interpreter.reusables.result);
            return this.#interpreter.reusables.result;
        }
    };
    set perExecution(fn:PerExeFn) {
        const reusables = this.#interpreter.reusables
        const perExe = reusables.execution.perExe;

        perExe.fn = fn;
        perExe.owner = reusables.node!;
    }
} 
export class SvalPlus extends Sval implements SvalPlusContract {
    /**
     * Shared, pre-computed identifier labels for the generated wrapper code.
     *
     * - Performance: Computed once at class initialization to avoid redundant 
     *   SHA-256 hashing overhead for every new interpreter instance.
     * 
     * - Safety: Strictly read-only. Sharing these constant keys across concurrent 
     *   interpreter instances is safe, as the actual execution state remains 
     *   fully isolated within each instance.
    */
    private static commonLabels = {
        resultExport:getSHA256Key('result'),
        args:getSHA256Key('args'),
        anchor:getSHA256Key('anchor'),
        offset:getSHA256Key('offset'),
        callStack:getSHA256Key('callStack'),
        fnMap:getSHA256Key('simulated-functions-to-original-functions'),
        fnRef:(fnName:string)=>{
            return getSHA256Key(`fn-ref-to-${fnName}`)
        },
        captures:(fnName:string)=>{
            return getSHA256Key(`captures-of-${fnName}`);//prepending the dynamic fn name with a fixed string prevents accidental collisions with existing labels
        }
    }

    private static options = {
        meriyah:{
            module:false,    //Since im just parsing functions,i dont need the extra overhead of a module parser
            next: true,      // Modern ES support
            loc: true,    
            ranges: true,    // Good for error reporting
            lexical: true    // Helps Sval understand 'let/const' vs 'var'
        } satisfies MeriyahOptions,

        sval:{
            sourceType:"script",//This will prevent dynamic imports and top level await.Check README
            ecmaVer:2024, 
            sandBox:true, 
        } satisfies SvalOptions
    }

    private static standardFnRegex = /^\s*(async\s+)?function\s*\*?\s*[a-zA-Z_$]/;
    private static fnAstCache =  new LRUCache<string,FnAst>({ max: 400 });

    /**
        * A strictly-typed view of `this.exports` for accessing internal, 
        * interpreter-generated state (like anchors, offsets, and captures).
        * 
        * Note: This is the exact same object reference in memory as `this.exports`. 
        * It exists purely to enforce compile-time safety and prevent accidental 
        * collisions with user-defined exported variables.
        * 
        * @internal This is meant to be used for SvalPlus internals and the code generator. 
    */
    private svalPlusExports = this.exports as Record<GeneratedKey,any>;

    private _stage:SvalPlusContract['stage'] = 'IDLE';
    private _target:SvalPlusContract['target'];

    private argImports = { 
        [SvalPlus.commonLabels.args]:null as any //we firstly set it to null to prevent creating a wasted empty array
    } as Record<GeneratedKey,unknown[]>

    
    public inspector:Inspector<'internal'> | null = null;
    public onStep:OnStep | null = null;

    private fnBeforeEachCall:Fn | null = null;
    private fnAfterEachCall:Fn | null = null;
    
    private fnCallAst:EsNode | null = null;
    public visit:Visit = new Visit(this);

    public userRoot = {
        callStack:new QList<Fn>(),
        readonlyCallStack:new ReadonlyQList<Fn>(),
        simulatedFnsToOriginal:new Map<Fn,Fn>(),
        labels:{
            offset:SvalPlus.commonLabels.offset,
            anchor:SvalPlus.commonLabels.anchor
        }
    };
    public reusables:Reusables = {
        node:null,
        scope:null,
        handler:null,
        result:UNASSIGNED,
        event:NOT_ALLOCATED,
        mode:null,
        execution:{
            evalStack:{value:0},
            exeStack:new QList(),
            readonlyExeStack:new ReadonlyQList(),
            perExe:{
                owner:null,
                fn:null
            }
        },
    };

    /**
     * Accepting either SvalOptions, SvalPlusArgs or nothing allows this class to be instantiated either 
     * with the extensions or exactly like Sval.
     * 
     * Constructing it with SvalOptions puts it in backward-compatible mode and is utilized in the core tests.
     * Any code utilizing the SvalPlus extensions is required to always pass true to 'useExtensions'
    */
    constructor(args?:SvalPlusArgs | SvalOptions) {
        const useExtensions:boolean = Boolean(args && (args as SvalPlusArgs).useExtensions);

        if (!useExtensions) {
            super(args as SvalOptions,'SvalPlus');//even if this branch is tagetting Sval, the origin is still from the SvalPlus class
            this._target = 'Sval';
            return;
        };

        super(SvalPlus.options.sval,'SvalPlus');
        this._target = 'SvalPlus';

        args = args as SvalPlusArgs;
        this.fnBeforeEachCall = args.fnBeforeEachCall || null;
        this.fnAfterEachCall = args.fnAfterEachCall || null;

        this.inspector = (args.inspector as Inspector<'internal'>) || null;
        this.onStep = args.onStep || null;

        const exeState = this.reusables.execution;
        exeState.readonlyExeStack.setSrc(exeState.exeStack);
        
        const userRoot = this.userRoot;
        userRoot.readonlyCallStack.setSrc(userRoot.callStack);
    };

    public createEventScope = ()=>{
        return new EventScope(this);
    };
    public get target() {
        return this._target;
    }
    public get stage() {
        return this._stage;
    }

    private refErrMsg(err:ReferenceError):string {
        return (
            ansis.white(
                `\n${err.message}\n` +
                `\nIf the first line of the stack trace points to the evaluator, please read: ` + 
                `\n   -Monitored functions cannot access variables from the outside.` + 
                `\n   -They must either be passed as an argument on each call or captured/embedded upon creation.\n`
            )
        )
    };
    private normalizeErr(err:unknown):Error {
        if (err instanceof ReferenceError) {
            err.message = this.refErrMsg(err);
            return err;
        }else {
            const error = err instanceof Error 
                ? err 
                : new Error(String(err));
            return error
        }
    }


    private getFnSrc<T extends boolean>(fn:Fn,capturesLabel:GeneratedKey,isMainFn:T):FnSrc<T>  {
        const fnString = fn.toString();
        const hash = getSHA256Key(fnString);

        const intermediateFnName:string = 'intermediateFn_' + hash;
        const intermediateFnCode:string = `\nconst ${intermediateFnName} = \n${fnString};`

        const capturedKeys = Object.keys(this.svalPlusExports[capturesLabel]).sort();//i used sort here to increase the cache hit rate

        const unpackCaptures = (capturedKeys.length > 0) 
            ?`\nconst {${capturedKeys.join(',')}} = exports.${capturesLabel};`
            :'';

        const finalFnName = (fn.name.length > 0)?fn.name:'anonymousFn_' + hash;
        const isStandardFunction = SvalPlus.standardFnRegex.test(fnString);
        
        //The depth offset must start at 1 to ensure that it always points to the inner part of the function's body
        //It is important that the anchor is set after assigning the offset

        const fnRefKey = SvalPlus.commonLabels.fnRef(intermediateFnName);

        this.svalPlusExports[SvalPlus.commonLabels.fnMap] = this.userRoot.simulatedFnsToOriginal;
        this.svalPlusExports[fnRefKey] = fn
            
        const addToMap = (isMainFn)?''
            :`exports.${SvalPlus.commonLabels.fnMap}.set(${intermediateFnName},exports.${fnRefKey})`

        const finalFnCode = `\nconst ${finalFnName} = (()=>{
            let ${this.userRoot.labels.offset} = 1;
            ${this.userRoot.labels.offset} += ${
                isStandardFunction?1:0
            }
            const ${this.userRoot.labels.anchor} = true;

            ${unpackCaptures}
            ${intermediateFnCode}

            ${addToMap}
            return ${intermediateFnName};
        })();`

        let finalFnCall = null;

        if (isMainFn) {
            this.svalPlusExports[SvalPlus.commonLabels.callStack] = this.userRoot.callStack;
            finalFnCall = `
                \n\n//This is the code that is ran each time the monitored function is called...
                exports.${SvalPlus.commonLabels.fnMap}.set(${finalFnName},exports.${fnRefKey});
                exports.${SvalPlus.commonLabels.callStack}.unshift(
                    exports.${SvalPlus.commonLabels.fnMap}.get(${finalFnName}) || ${finalFnName}
                );
                exports.${SvalPlus.commonLabels.resultExport} = ${finalFnName!}(...${SvalPlus.commonLabels.args});
            `
        }
        return { 
            fnName:finalFnName ,
            fnCode:finalFnCode,
            fnCall:finalFnCall as FnSrc<T>['fnCall'] 
        };
    }
    private getFnSources(functions:Record<string,Metadata<Fn>> | undefined):string {
        let sources:string = '';

        if (functions !== undefined) {
            const fnNames = Object.keys(functions).sort();//used sort here to increase the cache hit rate

            for (const name of fnNames) {
                const fn = functions[name];
                const capturesLabel = SvalPlus.commonLabels.captures(`embeddedFn_${name}`);//prepending embeddedFn ensures that it wont conflct with existing generated commonLabels

                this.svalPlusExports[capturesLabel] = fn.captures || Object.create(null);
                const fnSrc = this.getFnSrc(fn.ref,capturesLabel,false);//passing undefined here prevents infinite recursion

                //doing this ensures that functions with the same but different namespaces dont collide and that they wont be unexpectedly accessible in the monitored fn
                const scopedFn = `(()=>{ 
                    ${fnSrc.fnCode}
                    return ${fnSrc.fnName};
                })();`

                sources += `\n\nvar ${name} = ${scopedFn};`;
            }
        }
        return sources;
    };

    private useFn(fnSrc:FnSrc<true>):FnAst {
        if (this.fnCallAst !== null) {
            throw new Error(ansis.red(`The interpreter can only use one function`))
        };
        
        const fnCodeHash = getSHA256Key(fnSrc.fnCode);
        const cachedAst = SvalPlus.fnAstCache.get(fnCodeHash);

        let ast:FnAst;

        if (cachedAst) {
            ast = cachedAst;
        }else {
            ast = { 
                fnCode: meriyahParse(fnSrc.fnCode,SvalPlus.options.meriyah) as EsNode, 
                fnCall: meriyahParse(fnSrc.fnCall,SvalPlus.options.meriyah) as EsNode ,
            };
            SvalPlus.fnAstCache.set(fnCodeHash, ast);
        }
        
        //run the generated ast instead of the string to prevent re-parsing
        this.run(ast.fnCode);
        this.fnCallAst = ast.fnCall;

        return ast;
    }
    private callFn = (...args:any[])=>{
        this._stage = 'MONITORING';
        let result;

        if (this.fnBeforeEachCall) {
            this.fnBeforeEachCall(...args);
        }
        this.argImports[SvalPlus.commonLabels.args] = args;
        this.import(this.argImports);

        try {
            this.run(this.fnCallAst!);
            result = this.svalPlusExports[SvalPlus.commonLabels.resultExport];
        }catch(err) {
            result = this.normalizeErr(err);
        };

        if (result instanceof Promise) {
            return result
                .then(res => {
                    if (this.fnAfterEachCall) this.fnAfterEachCall(res);
                    return res; // Pass the successful result down the chain
                })
                .catch(err => {
                    const error = this.normalizeErr(err)
                    if (this.fnAfterEachCall) this.fnAfterEachCall(error);
                    throw error; // Re-throw so the caller still sees the error
                })
                .finally(()=>{
                    this.userRoot.callStack.clear();
                    this._stage = "IDLE";
                })
        }else {
            try {
                if (this.fnAfterEachCall) this.fnAfterEachCall(result);
                if (result instanceof Error) throw result;
                return result;
            }finally {
                this.userRoot.callStack.clear();
                this._stage = "IDLE";//this runs regardless of whether the hook throws an error or not
            }
        };
    }

    public assemble = <
        T extends Fn,
        R = T & { alreadyMonitored: true }
    >(
        main:Metadata<T>,
        embed?:Record<string,Metadata<Fn>>,
        sourceOut?:{value:string}
    ):R => {
        this._stage = "WRAPPING";
        
        try {
            const capturesLabel = SvalPlus.commonLabels.captures('mainFn');
            this.svalPlusExports[capturesLabel] = main.captures || Object.create(null);
            
            const fnSrc = this.getFnSrc(main.ref,capturesLabel,true);
            fnSrc.fnCode = `
                'use strict'
                ${fnSrc.fnCode}
                ${this.getFnSources(embed)}
            `;
            
            const ast = this.useFn(fnSrc);
            if (sourceOut) {//only write the generated code if the interpreter could parse it
                const indent = ''.padStart(4);
                sourceOut.value = (
                    generate(ast.fnCode,{ indent }) + '\n' +
                    generate(ast.fnCall, { indent })
                )
            };

            const wrappedFn = this.callFn as unknown as R;
            (wrappedFn as { alreadyMonitored: boolean }).alreadyMonitored = true;

            return wrappedFn;
        }
        finally {
            this._stage = "IDLE";
        }
    }
};