import Sval, { SvalOptions } from "./sval.ts"
import { Node } from 'acorn'
import Scope from './scope/index.ts'
import { parse as meriyahParse,Options as MeriyahOptions } from 'meriyah';


import ansis from "ansis";
import { LRUCache } from 'lru-cache'
import {sha256} from "js-sha256"

import { 
    Inspector,
    Reusables, 
    ScopeForEvent,
    Fn, 
    createEvent, 
    SvalPlus as SvalPlusContract, 
    UNASSIGNED, 
    LAZY_NODE, 
    Visit as VisitContract, 
    EventMap, 
    NOT_ALLOCATED,
    PerExe,
    OnStep,
    VisitExecutionError,
} from './custom-types.ts'

import { isGenerator, pushResult } from './lifecycle-functions.ts';
import { QList, ReadonlyQList } from './q-list.ts'


export interface FnSrc<T extends boolean> {
    fnName:string
    fnCode:string,
    fnCall:T extends true?string:null,
}
export interface FnAst {
    fnCode:Node,
    fnCall:Node,
}
export interface Metadata<T extends Fn> {
    /**the reference to the function to be included in the interpreter context**/
    ref:T,

    /** 
     *Because the function runs in an isolated interpreter context,any data that it uses from the outside scope has to captured by mapping the variable names to their variables and passing the object here.
     *It is important to keep in mind that the captures object itself follows the semantic of copy primitives by value and copy obects by reference.
    */
    captures?:Record<string,any>
}
interface SvalPlusArgs {
    useExtensions:boolean,
    inspector?:Inspector,
    onStep?:OnStep,
    fnBeforeEachCall?:Fn,
    fnAfterEachCall?:Fn,
    options?:SvalOptions,
}

class EventScope implements ScopeForEvent {
    #scope:Scope;

    public depth:number;
    public variables:ScopeForEvent['variables'];

    constructor(interpreter:SvalPlus) {
        this.#scope = interpreter.reusables.currentScope!;
        this.depth = this.#scope.scopeDepth - 2;//We subtract 2 to make it 0-indexed.check the comment next to the variable, 'inUserScope' in one of the files
        
        const local:ScopeForEvent['variables']['local'] = {};
        Object.entries(this.#scope.scopeContext).forEach(([k,v])=>{
            local[k] = v.get()
        });

        this.variables = {
            search:(name:string):unknown | undefined =>{
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
        return this.#interpreter.reusables.shared.readonlyExeStack;
    }
    public is:VisitContract['is'] = (query,cb)=>{//the monitor will only create the event object for a node if it meets the demand.
        const node = this.#interpreter.reusables.node!;

        if ((query === "Any") || (node.type === query)) {
            const event:EventMap[typeof query] = createEvent(query,this.#interpreter)
            cb(event);
            this.#interpreter.reusables.currentEvent = event;
        }
    };
    public execute = ()=>{
        const handler = this.#interpreter.reusables.handler;
        if (handler !== null) {
            if (this.#interpreter.reusables.result !== UNASSIGNED) {
                throw new VisitExecutionError(ansis.red(`A node can only be executed once`))
            };

            this.#interpreter.reusables.result = handler(
                this.#interpreter.reusables.node!,
                this.#interpreter.reusables.currentScope!
            );
            if (isGenerator(this.#interpreter.reusables.result)) {
                return LAZY_NODE;
            }else {
                pushResult(this.#interpreter,this.#interpreter.reusables.result);
                return this.#interpreter.reusables.result;
            }
        }
    };
    set perExecution(perExe:PerExe) {
        this.#interpreter.reusables.shared.perExe = {
            fn:perExe,
            owner:this.#interpreter.reusables.node!
        }
    }
} 
export class SvalPlus extends Sval implements SvalPlusContract {
    //This one is static to prevent recomputing the same keys for each instance
    //This is safe because each instance uses this as a readonly view. They are still isolated

    public static commonLabels = {
        resultExport:SvalPlus.sha256Key('result'),
        args:SvalPlus.sha256Key('args'),
        captures:(fnName:string)=>{
            return SvalPlus.sha256Key(`captures-of-${fnName}`);//prepending the dynamic fn name with a fixed string prevents accidental collisions with existing labels
        }
    }

    private static fnAstCache =  new LRUCache<string,FnAst>({ max: 400 });

    public static meriyahParseOptions:MeriyahOptions = {
        module:false,    //Since im just parsing functions,i dont need the extra overhead of a module parser
        next: true,      // Modern ES support
        loc: true,    
        ranges: true,    // Good for error reporting
        lexical: true    // Helps Sval understand 'let/const' vs 'var'
    }
    public static defaultOptions:SvalOptions = {
        sourceType:"script",//This will prevent dynamic imports and top level await.Check README
        ecmaVer:2024, 
        sandBox:true, 
    };
    

    public inspector:Inspector | null = null;
    public onStep:OnStep | null = null;

    public fnBeforeEachCall:Fn | null = null;
    public fnAfterEachCall:Fn | null = null;
    
    public fnCallAst:Node | null = null;

    public visit:Visit = new Visit(this);//Even if each inspector gets a shared visit object that reflects the latest values for performance,i wont freeze its properties to allow possible external wrappers to customize it
    public stage:'IDLE' | 'PRE-PROCESSING' | 'MONITORING' = 'IDLE'

    public reusables:Reusables = {
        currentEvent:NOT_ALLOCATED,
        currentScope:null,
        node:null,
        result:UNASSIGNED,
        handler:null,
        shared:{
            evalStack:{value:0},
            exeStack:new QList(),
            readonlyExeStack:new ReadonlyQList(),
            perExe:null
        },
    };
    private argImports = { 
        [SvalPlus.commonLabels.args]:null as any as any[] //we firstly set it to null to prevent creating a wasted empty object
    }


    // Accepting either SvalOptions,SvalPlusArgs or nothing allows this class to be instantiated exactly like the parent class. 
    // This backward-compatible behavior is utilized in the core tests.
    // Any code utilizing the SvalPlus extensions is required to always pass true to 'useExtensions'

    constructor(args?:SvalPlusArgs | SvalOptions) {
        const useExtensions:boolean = 
            (args !== undefined) && (args as SvalPlusArgs).useExtensions
            ?true
            :false

        if (!useExtensions) {
            super(args as SvalOptions);
            return;
        };

        args = args as SvalPlusArgs;
        super(args.options);

        this.fnBeforeEachCall = args.fnBeforeEachCall || null;
        this.fnAfterEachCall = args.fnAfterEachCall || null;

        this.inspector = args.inspector || null;
        this.onStep = args.onStep || null;

        this.reusables.shared.readonlyExeStack.swapSrc(this.reusables.shared.exeStack);
    };

    private static sha256Key(str:string):string {
        return 'generated_' + sha256.create().update(str).hex();
    }
    

    public getFnSrc<T extends boolean>(fn:Fn,capturesLabel:string,isMainFn:T):FnSrc<T>  {
        const fnString = fn.toString();
        const hash = SvalPlus.sha256Key(fnString);

        const intermediateFnName:string = 'intermediateFn_' + hash;
        const intermediateFnCode:string = `\nconst ${intermediateFnName} = \n${fnString};`

        const capturedKeys = Object.keys(this.exports[capturesLabel]).sort();//i used sort here to increase the cache hit rate

        const unpackCaptures = (capturedKeys.length > 0) 
            ?`\nconst {${capturedKeys.join(',')}} = exports.${capturesLabel};`
            :'';

        const finalFnName = (fn.name.length > 0)?fn.name:'anonymousFn_' + hash;

        const finalFnCode = `\nconst ${finalFnName} = (()=>{
            ${unpackCaptures}
            ${intermediateFnCode}
            return ${intermediateFnName};
        })();`

        const finalFnCall = !isMainFn?null
            :`\n\n//This is the code that is ran each time the monitored function is called and the result is returned through the exports variable.` +
            `\n\nexports.${SvalPlus.commonLabels.resultExport} = ${finalFnName!}(...${SvalPlus.commonLabels.args});`

        return { 
            fnName:finalFnName ,
            fnCode:finalFnCode,
            fnCall:finalFnCall as FnSrc<T>['fnCall'] 
        };
    }
    public getFnSources(functions:Record<string,Metadata<Fn>> | undefined):string {
        let fnCode:string = '';

        if (functions !== undefined) {
            let declarations = '';
            let assignments = '';

            const fnNames = Object.keys(functions).sort();//used sort here to increase the cache hit rate

            for (const name of fnNames) {
                const fn = functions[name];
                const capturesLabel = SvalPlus.commonLabels.captures(`embeddedFn_${name}`);//prepending embeddedFn ensures that it wont conflct with existing generated commonLabels

                this.exports[capturesLabel] = fn.captures || Object.create(null);
                const fnSrc = this.getFnSrc(fn.ref,capturesLabel,false);//passing undefined here prevents infinite recursion

                //doing this ensures that functions with the same but different namespaces dont collide and that they wont be unexpectedly accessible in the monitored fn
                const scopedFn = `(()=>{ 
                    ${fnSrc.fnCode}
                    return ${fnSrc.fnName};
                })();`

                declarations += `\n\nvar ${name};`;
                assignments += `\n${name} = ${scopedFn};`;
            }
            // Prepend embedded logic so it's available to the main function
            fnCode = declarations + assignments;
        }
        return fnCode;
    };
    public useFn(fnSrc:FnSrc<true>):void {
        if (this.fnCallAst !== null) {
            throw new Error(ansis.red(`The interpreter can only use one function`))
        };
        let ast:FnAst;

        const fnCodeHash = SvalPlus.sha256Key(fnSrc.fnCode);
        const cachedAst = SvalPlus.fnAstCache.get(fnCodeHash);

        if (cachedAst) {
            ast = cachedAst;
        }else {
            const options = SvalPlus.meriyahParseOptions;
            ast = { 
                fnCode: meriyahParse(fnSrc.fnCode,options) as Node, 
                fnCall: meriyahParse(fnSrc.fnCall,options) as Node ,
            };
            SvalPlus.fnAstCache.set(fnCodeHash, ast);
        }
        
        //run the generated ast instead of the string to prevent re-parsing
        this.run(ast.fnCode);
        this.fnCallAst = ast.fnCall;
    }


    public createEventScope = ()=>{
        return new EventScope(this);
    };
    public runFn = (...args:any[])=>{
        this.stage = 'MONITORING';
        let result;

        if (this.fnBeforeEachCall) {
            this.fnBeforeEachCall(...args);
        }
        this.argImports[SvalPlus.commonLabels.args] = args;
        this.import(this.argImports);

        try {
            this.run(this.fnCallAst!);
            result = this.exports[SvalPlus.commonLabels.resultExport];
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
                    this.stage = "IDLE";
                })
        }else {
            try {
                if (this.fnAfterEachCall) this.fnAfterEachCall(result);
                if (result instanceof Error) throw result;
                return result;
            }finally {
                this.stage = "IDLE";//this runs regardless of whether the hook throws an error or not
            }
        };
    }


    public refErrMsg(err:ReferenceError) {
        return (
            ansis.white(
                `\n${err.message}\n` +
                `\n-Monitored functions cannot access variables from the outside.` + 
                `\n-They must be either be passed as an argument on each call or captured/embedded upon creation.\n`
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
};