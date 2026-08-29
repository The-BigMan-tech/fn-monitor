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
    GeneratedKey,
    WrapperError
} from './custom-types.ts'

import { 
    executedManually,
    getSHA256Key, 
    inLazyMode, 
    pushResult 
} from './lifecycle.ts';


export interface Metadata<T extends Fn> {
    /**The reference to the function to be included in the interpreter context*/
    ref:T,

    /** 
     *Because the function runs in an isolated interpreter context, all variables that it needs from the outside scope has to captured by mapping their names to their values and passing the object here.
     *It is important to keep in mind that the captures object itself follows the semantic of copy primitives by value and copy obects by reference.
    */
    captures?:Record<string,any>,
    /**
     * The `this` context to bind to the function.
     * This is required when monitoring instance methods to preserve the `this` reference.
    */
    bind?: unknown;
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
    // The method should only create an event object for a node if it matches the query
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

        // The node cannot be null if the handler is not null. If it is, it will rightfully fail with a loud type error
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
     * Shared, pre-computed identifier labels for the generated wrapper code and
     * are used across various properties.
     * 
     * - Performance: Computed once at class initialization to avoid redundant 
     *   SHA-256 hashing overhead for every new interpreter instance.
     * 
     * - Safety: Strictly read-only. Sharing these constant keys across concurrent 
     *   interpreter instances is safe, as the actual execution state remains 
     *   fully isolated within each instance.
    */
    private static commonLabels = {

        /**
         * These point to global variables in any given interpreted context.
         * It is practically inaccessible to all functions within the context unless
         * explicitly passed.
        */
        resultExport:getSHA256Key('result'),
        args:getSHA256Key('args'),
        
        /** 
         * These point to data structures that are shared among all functions within the
         * same context. 
        */
        callStack:getSHA256Key('callStack'),
        fnMap:getSHA256Key('copied-functions-to-the-original-ones'),

        /**
         * These are just used as stable identifiers for specific local variables under
         * each function within the same context
        */
        anchor:getSHA256Key('anchor'),
        offset:getSHA256Key('offset'),
        
        /**
         * These ones must be private to each individual function within the same context because
         * they point to state that is unique to that function.
         * 
         * They include the function's name to keep it unique and it is prepended with a 
         * fixed string to prevent accidental collisions with existing labels
         * 
         * Using a deterministic hash like SHA-256 preserves the cache hit rate
        */
        fnRef:(fnName:string)=>{
            return getSHA256Key(`fn-ref-to-${fnName}`)
        },
        bind:(fnName:string)=>{
            return getSHA256Key(`binding-of-${fnName}`)
        },
        captures:(fnName:string)=>{
            return getSHA256Key(`captures-of-${fnName}`);
        }
    }

    private static options = {
        meriyah:{
            module:false,    // Since the package is just parsing functions, it dont need the extra overhead of a module parser
            next: true,      // Modern ES support
            loc: true,    
            ranges: true,    // Good for error reporting
            lexical: true    // Helps Sval understand 'let/const' vs 'var'
        } satisfies MeriyahOptions,

        sval:{
            sourceType:"script",//This will prevent dynamic imports and top level await. Check README
            ecmaVer:2024, 
            sandBox:true, 
        } satisfies SvalOptions
    }

    private static standardFnRegex = /^\s*(async\s+)?function\s*\*?\s*[a-zA-Z_$]/;
    private static parsableFnSyntax = /^(async\s+)?(function\b|\([^)]*\)|[a-zA-Z_$][\w$]*\s*=>)/;// allow any function definition except for shorthand methods
    private static fnAstCache =  new LRUCache<string,FnAst>({ max: 400 });

    /**
        * A strictly-typed view of `this.exports` for accessing internal, 
        * interpreter-generated state (like anchors, offsets, and captures).
        * 
        * Note: This is the exact same object reference in memory as `this.exports`. 
        * It exists purely to enforce compile-time safety and prevent accidental 
        * collisions with user-defined exports like those in the `interpreter` tests
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


    private codeGenHelper = {
        /**
         * Because the offset variable is defined on the same level as the intermediate function,
         * it must always start at 1 to ensure that it always points to the inner part of the function's body.
         * 
         * We then increment it by 1 because we nested the user's function's code inside a function expression wrapper to handle the `this` binding
        */
        getInitialOffset:():number =>{
            let initialOffset = 1; 
            initialOffset += 1;
            return initialOffset;
        },
        /**
         * When lookups happen in an AST , an arrow function has a lexical depth of 0 relative to its creation site, 
         * whereas a regular function definition has a depth of 1. 
        */
        getAdditionalOffset:(fnString:string):number => {
            return SvalPlus.standardFnRegex.test(fnString) ? 1 : 0
        },

        unpackCaptures:(capturesLabel:GeneratedKey):string => {
            const capturedKeys = Object.keys(this.svalPlusExports[capturesLabel]).sort(); // sorted to increase cache hit rate
            const unpackedCaptures = (capturedKeys.length > 0) 
                ? `\nconst {${capturedKeys.join(',')}} = exports.${capturesLabel};`
                : '';
            return unpackedCaptures;
        },

        getFinalFnName:(fn:Fn,hash:GeneratedKey):string => {
            return (fn.name.length > 0) ? fn.name : 'anonymousFn_' + hash;
        },

        getMainCall:(finalFnName:string,fnRefKey:GeneratedKey):string => {
            const labels = SvalPlus.commonLabels;
            return `
                exports.${labels.fnMap}.set(${finalFnName},exports.${fnRefKey});
                exports.${labels.callStack}.unshift(
                    exports.${labels.fnMap}.get(${finalFnName}) || ${finalFnName}
                );
                exports.${labels.resultExport} = ${finalFnName!}(...${labels.args});
            `
        },

        checkFnSyntax(fnString: string): void | never {
            const trimmed = fnString.trim();

            if (trimmed.includes('[native code]')) {
                throw new WrapperError(ansis.red(
                    `\nCannot monitor a function that has already been bound because JS engines conceal the source code.` +
                    `\nPlease pass the raw method to 'ref' and use the 'bind' metadata property instead.`
                ));
            }
            if (!SvalPlus.parsableFnSyntax.test(trimmed)) {
                throw new WrapperError(ansis.red(
                    `\nThe interpreter cannot parse the shorthand method syntax, getters, setters, or constructors. ` +
                    `\nPlease define the method as a function expression or an arrow function.`
                ));
            }
        },
    }


    private getFnSource<T extends boolean>(metadata: Metadata<Fn>, capturesLabel: GeneratedKey, isMainFn: T): FnSrc<T> {
        const { ref: fn, captures, bind } = metadata;

        const labels = SvalPlus.commonLabels;
        const helper = this.codeGenHelper;
        const $exports = this.svalPlusExports;

        const fnString = fn.toString();
        helper.checkFnSyntax(fnString);

        const hash = getSHA256Key(fnString);
        const intermediateFnName: string = 'intermediateFn_' + hash;

        const fnRefKey = labels.fnRef(intermediateFnName);
        const bindKey = labels.bind(intermediateFnName);

        $exports[capturesLabel] = captures || Object.create(null);
        $exports[labels.fnMap] = this.userRoot.simulatedFnsToOriginal;
        $exports[labels.callStack] = this.userRoot.callStack;
        $exports[bindKey] = bind;
        $exports[fnRefKey] = fn;

        // It is important that the anchor is set after assigning the offset.
        const finalFnName = helper.getFinalFnName(fn,hash);
        const finalFnCode = `\nconst ${finalFnName} = (()=>{

            let ${this.userRoot.labels.offset} = ${helper.getInitialOffset()};
            ${this.userRoot.labels.offset} += ${helper.getAdditionalOffset(fnString)};
            
            const ${this.userRoot.labels.anchor} = true;

            ${ helper.unpackCaptures(capturesLabel) }

            const ${intermediateFnName} = function(...args) {
                return (${fnString}).apply(this, args);
            };

            ${ isMainFn ? ''
                : `exports.${labels.fnMap}.set(${intermediateFnName},exports.${fnRefKey})`
            }
            
            const target = ${ bind 
                ? `${intermediateFnName}.bind(exports.${bindKey})` 
                : intermediateFnName
            }
            return target;
        })();`

        const finalFnCall = isMainFn
            ? helper.getMainCall(finalFnName, fnRefKey)
            : null;

        return { 
            fnName: finalFnName,
            fnCode: finalFnCode,
            fnCall: finalFnCall as FnSrc<T>['fnCall'] 
        };
    }
    private getEmbeddedSources(embed:Record<string,Metadata<Fn>> | undefined):string {
        let sources:string = '';

        if (embed !== undefined) {
            const fnNames = Object.keys(embed).sort();//used sort here to increase the cache hit rate

            for (const name of fnNames) {
                const metadata = embed[name];

                // prepending the name with 'embeddedFn' ensures that it wont conflict with the captures key of the main one
                const capturesLabel = SvalPlus.commonLabels.captures(`embeddedFn_${name}`);
                const fnSrc = this.getFnSource(metadata,capturesLabel,false);

                /**
                 * Declaring the fnCode within an IIFE ensures that functions with the same
                 * name but are actually coming from different namespaces will not collide.
                 * 
                 * It also ensures that they can only be accessible through the embedded 
                 * function's reference.
                */
                const wrapper = `(()=>{ 
                    ${fnSrc.fnCode}
                    return ${fnSrc.fnName};
                })();`

                sources += `\nvar ${name} = ${wrapper};`;
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
        
        // run the generated ast instead of the string to prevent re-parsing
        this.run(ast.fnCode);
        this.fnCallAst = ast.fnCall;

        return ast;
    }
    private callFn = (...args:any[])=>{
        this._stage = 'MONITORING';

        const labels = SvalPlus.commonLabels;
        let result;

        if (this.fnBeforeEachCall) {
            this.fnBeforeEachCall(...args);
        };

        this.argImports[labels.args] = args;
        this.import(this.argImports);

        try {
            this.run(this.fnCallAst!);
            result = this.svalPlusExports[labels.resultExport];
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
            const fnSrc = this.getFnSource(main,capturesLabel,true);

            fnSrc.fnCode = `
                'use strict'
                ${fnSrc.fnCode}
                ${this.getEmbeddedSources(embed)}
            `;

            const ast = this.useFn(fnSrc);
            if (sourceOut) {//only write the generated code if the interpreter could parse it
                const indent = ''.padStart(4);
                sourceOut.value = (
                    generate(ast.fnCode,{ indent }) + '\n' +
                    generate(ast.fnCall, { indent })
                )
            };

            const finalFn = this.callFn as unknown as R;
            (finalFn as { alreadyMonitored: boolean }).alreadyMonitored = true;

            return finalFn;
        }
        finally {
            this._stage = "IDLE";
        }
    }
};