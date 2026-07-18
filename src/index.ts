//!!Note:
/** 
 * Many of the design decisions were intentional.
 *  
 * Do not to expand this into a script-level or module-level monitor because it would break the hidden function-context assumptions used throughout the codebase.
 * 
 * To share interpretation context and control with the inspector hook performantly,I used a reusables object architecture to prevent creating intermediate objects mid evaluation.but to prevent several state bugs,I had to extend the architecture to favor copy over overwriting at certain points.
 * So its an overwrite,save progress by copying,then overwriting kind of a thing.I didnt expect the state transitions to be this complex.One of those complexities is where an async function is ran but not awaited followed by an await for another async function
 * 
 * The code works and its not inherently bad but the evaluator may have been cleaner and with less edge cases if I didnt use interpreter-wide reusables from the start.But there is some good to it.I dont know how well it saves memory,but it also allows the extended interpreter and other related objects to be decoupled from any specific local evaluation
 * This model only concerns the modified evaluator thats only used when the inspector hook is passed to the interpreter.The model will likely remain unchanged.
 * 
 * The project uses an ast-walker interpreter underneath and will continue this way.I dont plan to rewrite this to a bytecode implementation anytime soon for very practical reasons.
 * The parts of the project that are pure sval code and are not influenced my custom modifications have type complaints.Since they still work,I left them alone.
 * 
 * because monitored fns run in an isolated context,any errors thrown in them will not map directly to where it was written in the editor.The functions must be debugged in their unmonitored state until a native mapping solution exists.
 * But the inspector will show a proper stack trace if it throws an error because its runs directly in the js runtime,not the interpreter.
*/

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
    VariableForEvent,
    Fn, 
    createEvent, 
    SvalPlus as SvalPlusContract, 
    UNASSIGNED, 
    LAZY_NODE, 
    Visit as VisitContract, 
    EventMap, 
    NOT_ALLOCATED,
    PerExe,
    OnStep
} from './custom-types.ts'

import { isGenerator, pushResult } from './helper-functions.ts';
import { QList, ReadonlyQList } from './q-list.ts'
import jsBeatutify from "js-beautify";


class EventScope implements ScopeForEvent {
    #scope:Scope
    public parent:Scope | null;
    public depth:number;
    public variables:ScopeForEvent['variables'];

    constructor(interpreter:SvalPlus) {
        this.#scope = interpreter.reusables.currentScope!;
        this.parent = this.#scope.scopeParent;
        this.depth = this.#scope.scopeDepth;
        this.variables = {
            search:(name:string):VariableForEvent | null =>{
                const variable = this.#scope.find(name);
                if (variable === null) return null;

                const variableForEvent = { value:()=>variable.get() }
                return variableForEvent
            },
            local:this.#scope.scopeContext
        }
    }
}
class Visit implements VisitContract {
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
                throw new Error(ansis.red(`A node can only be executed once`))
            }
            this.#interpreter.reusables.result = handler(this.#interpreter.reusables.node!,this.#interpreter.reusables.currentScope!);
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
class SvalPlus extends Sval implements SvalPlusContract {
    public inspector:Inspector | null = null;
    public onStep:OnStep | null = null;

    public fnBeforeEachCall:Fn | undefined = undefined;
    public fnAfterEachCall:Fn | undefined = undefined;
    
    public static readonly resultExport:string = SvalPlus.sha256Key('result');
    public static readonly argsVar = SvalPlus.sha256Key('args');//this can safely be static because its just used as a common name for the passed arguments.Its used in a per-instance object to ensure isolation
    public static readonly capturesVar = SvalPlus.sha256Key('captures');
    
    private static fnAstCache =  new LRUCache<string,FnAst>({ max: 400 });
    public astInUse:FnAst | null = null;

    public reusables:Reusables;
    public visit:Visit = new Visit(this);//Even if each inspector gets a shared visit object that reflects the latest values for performance,i wont freeze its properties to allow possible external wrappers to customize it
    public stage:'IDLE' | 'PRE-PROCESSING' | 'MONITORING' = 'IDLE'

    public static meriyahParseOptions:MeriyahOptions = {
        module:false,    //Since im just parsing functions,i dont need the extra overhead of a module parser
        next: true,      // Modern ES support
        loc: true,       // Essential for your shop.demand tracking
        ranges: true,    // Good for error reporting
        lexical: true    // Helps Sval understand 'let/const' vs 'var'
    }
    public static defaultOptions:SvalOptions = {
        sourceType:"script",//use the normalized and faster evaluator at the cost of not using esm import syntax which i dont even need anyway in a function.And some of the monitor's generated code wont even work with the modules option.This also means that the interpreter cant utilize top level await to handle async functions.It has to be done carefully in the evaluator
        ecmaVer:2024, 
        sandBox:true, 
    };

    constructor(args:{
        inspector:Inspector | undefined,
        onStep:OnStep | undefined,
        options:SvalOptions,
        fnBeforeEachCall:Fn | undefined,
        fnAfterEachCall:Fn | undefined
    }) {
        super(args.options);

        this.fnBeforeEachCall = args.fnBeforeEachCall;
        this.fnAfterEachCall = args.fnAfterEachCall;

        this.inspector = args.inspector || null;
        this.onStep = args.onStep || null;

        this.reusables = {
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
        this.reusables.shared.readonlyExeStack.swapSrc(this.reusables.shared.exeStack);
    }
    public createEventScope = ()=>{
        return new EventScope(this);
    };


    public getFnSrc(fn:Fn,capturesVar:string):FnSrc  {
        const fnString = fn.toString();
        const hash = SvalPlus.sha256Key(fnString);
        const isDeclaration = /^(async\s+)?function(\s*\*|\s+|$)/.test(fnString);

        const intermediateFn:string = 'intermediateFn_' + hash;
        let intermediateFnCode:string = '';

        if (isDeclaration) {//handle function definition
            intermediateFnCode = `\nconst ${intermediateFn} = (()=>{
                ${fnString};
                return ${fn.name}
            })();`
        }else {//handle unassigned anonymous functions
            intermediateFnCode = `\nconst ${intermediateFn} = ${fnString};`
        }  
        const capturedKeys = (capturesVar !== null) ?Object.keys(this.exports[capturesVar]).sort():[];//i used sort here to increase the cache hit rate
        const storeCaptures = (capturedKeys.length > 0) 
            ?`\nconst {${capturedKeys.join(',')}} = exports.${capturesVar};`
            :'';

        const finalFnName = (fn.name.length > 0)?fn.name:'anonymousFn_' + hash;
        const finalFnCode = `\nconst ${finalFnName} = (()=>{
            ${storeCaptures}
            ${intermediateFnCode}
            return ${intermediateFn};
        })();`

        return { 
            fnCode:finalFnCode,
            fnName:finalFnName 
        };
    }
    public getFnSources(functions:Record<string,Metadata<Fn>> | undefined):string {
        let fnCode:string = '';

        if (functions !== undefined) {
            let declarations = '';
            let assignments = '';

            for (const [index,name] of Object.keys(functions).sort().entries()) {//used sort here to increase the cache hit rate
                const fn = functions[name];
                const capturesVar = SvalPlus.sha256Key(`embeddedCaptures_${index}`)
                
                this.exports[capturesVar] = fn.captures || Object.create(null);
                const fnSrc = this.getFnSrc(fn.ref,capturesVar);//passing undefined here prevents infinite recursion

                //doing this ensures that functions with the same but different namespaces dont collide and that they wont be unexpectedly accessible in the monitored fn
                const scopedFn = `(()=>{ 
                    ${fnSrc.fnCode}
                    return ${fnSrc.fnName};
                })();`
                declarations += `\nvar ${name};`;
                assignments += `\n${name} = ${scopedFn};`;
            }
            // Prepend embedded logic so it's available to the main function
            fnCode = declarations + assignments;
        }
        return fnCode;
    };


    public static sha256Key(str:string):string {
        return 'generated_' + sha256.create().update(str).hex();
    }
    public static getFnAst(fnSrc:FnSrc):FnAst {
        const fnCodeHash = SvalPlus.sha256Key(fnSrc.fnCode);
        const cached = SvalPlus.fnAstCache.get(fnCodeHash);
        if (cached) {
            return cached;
        }
        const fnCallString = 
            `\n\n//This is the entry code that is ran each time the monitored function is called and the result is streamed through the exports variable.` +
            `\n\nexports.${SvalPlus.resultExport} = ${fnSrc.fnName!}(...${SvalPlus.argsVar});`;

        const fnCodeAst = meriyahParse(fnSrc.fnCode, SvalPlus.meriyahParseOptions);
        const fnCallAst = meriyahParse(fnCallString, SvalPlus.meriyahParseOptions);
        
        const ast = { 
            fnCode: fnCodeAst as Node, 
            fnCall: fnCallAst as Node ,
            fnCallString
        };
        SvalPlus.fnAstCache.set(fnCodeHash, ast);
        return ast;
    }
    public static refErrMsg(err:ReferenceError) {
        return (
            ansis.red.underline(`\nReference Error`) +
            Colors.orange(`\n-Monitored functions cannot access data outside the isolated interpreter.\n\n-The data must be either be passed as an argument on each call,captured into the monitored fn upon creation or embedded through the embed property when calling monitor.fn(). (inlining only works for functions).\n\n-Captured variables are handled outside the interpreter and thus,outside the monitor's tracking system but embedded functions can be monitored.`) +
            ansis.red.underline(`\n\nTrace`) + `\n${err}`
        )
    }
    private argImports:{ [SvalPlus.argsVar]:any[] } = { 
        [SvalPlus.argsVar]:null as any //we firstly set it to null to prevent creating a wasted empty object
    }

    private normalizeErr(err:unknown):Error {
        if (err instanceof ReferenceError) {
            err.message = SvalPlus.refErrMsg(err);
            return err;
        }else {
            const error = err instanceof Error 
                ? err 
                : new Error(String(err));
            error.message = ansis.red.underline(`\nError in Monitored Function:`) + `\n${error.message}`
            return error
        }
    }


    public runMonitoredFn = (...args:any[])=>{
        this.stage = 'MONITORING';
        let result;

        if (this.fnBeforeEachCall !== undefined) {
            this.fnBeforeEachCall(...args);
        }
        this.argImports[SvalPlus.argsVar] = args;
        this.import(this.argImports);

        try {
            this.run(this.astInUse!.fnCall);
            result = this.exports[SvalPlus.resultExport];
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
                if (this.fnAfterEachCall !== undefined) this.fnAfterEachCall(result);
                if (result instanceof Error) throw result;
                return result;
            }finally {
                this.stage = "IDLE";//this runs regardless of whether the hook throws an error or not
            }
        };
    }
}
const Colors = {
    orange:ansis.hex('#f6c098')
};
interface FnSrc {
    fnCode:string,
    fnName:string 
}
interface FnAst {
    fnCode:Node,
    fnCall:Node,
    fnCallString:string
}

export interface Metadata<T extends Fn> {
    ref:T,
    captures?:Record<string,any>
}
export interface MonitorFnSetup<T extends Fn> {
    main:Metadata<T>,
    embed?:Record<string,Metadata<Fn>>,//directly include a function's src in the same interpreter context as the main function being monitored
    inspector?:Inspector,
    onStep?:OnStep,
    sendGeneratedCodeTo?:{value:string}
    beforeEachCall?:(...args:Parameters<T>)=>void,//having the arguments here is useful for logging or blocking the fn if the args are malicious
    afterEachCall?:(result:ReturnType<T> | Error)=>void,
}

//the paradigm for monitored functions is one interpreter per function to ensure complete isolation,predictability and zero side effects across different functions

export function monitor<T extends Fn>(setup:MonitorFnSetup<T>):T & {alreadyMonitored:true} {
    const {ref:mainFn,captures} = setup.main;
    
    if ('alreadyMonitored' in mainFn) {
        throw new Error(ansis.red(`\nA monitored function cannot be monitored.`))
    };

    const {
        embed:functionsToEmbed,
        inspector,
        onStep,
        beforeEachCall,
        afterEachCall,
        sendGeneratedCodeTo
    } = setup;

    const interpreter = new SvalPlus({
        inspector,
        onStep,
        fnBeforeEachCall:beforeEachCall,
        fnAfterEachCall:afterEachCall,
        options:SvalPlus.defaultOptions
    });

    interpreter.stage = "PRE-PROCESSING";
    interpreter.exports[SvalPlus.capturesVar] = captures || Object.create(null);
    
    const fnSrc = interpreter.getFnSrc(mainFn,SvalPlus.capturesVar);
    fnSrc.fnCode += interpreter.getFnSources(functionsToEmbed);
    
    const ast = SvalPlus.getFnAst(fnSrc);
    interpreter.run(ast.fnCode);

    if (sendGeneratedCodeTo) {
        sendGeneratedCodeTo.value = jsBeatutify(fnSrc.fnCode + ast.fnCallString,{indent_size:4}); //for debubgging the generated code
    };

    interpreter.astInUse = ast;
    const newFn = interpreter.runMonitoredFn as any;

    newFn['alreadyMonitored'] = true;
    return newFn;
}

export { Var } from './scope/variable.ts'
export {
    QList,
    ReadonlyQList
} from './q-list.ts';

//!!The estree types pkg is intentionally made as a dependency and not a dev dep because the project is directly exporting one of its types for intellisense
export {
    type Inspector,
    type OnStep,
    type VariableForEvent,
    type ScopeForEvent,
    type Query,
    type EventMap,
    type Visit,
    type InspectorGenerator,
    type ExeResult,
    type EsNode,

    NOT_ALLOCATED,
    LAZY_NODE,

    //the reason why i didnt export these as just types is because of possible instance-of checks 
    //Default Event
    LangEvent,

    // Expressions
    BinaryExprEvent,
    CallExprEvent,
    AssignmentExprEvent,
    UpdateExprEvent,
    LogicalExprEvent,
    MemberExprEvent,
    AwaitExprEvent,
    FuncExprEvent,
    NewExprEvent,
    ArrowFnExprEvent,
    TernaryExprEvent,
    YieldExprEvent,

    ExpressionStmtEvent,
    ArrayExprEvent,
    ObjectExprEvent,
    TemplateLiteralEvent,
    SequenceExprEvent,
    UnaryExprEvent,

    // Statements & Control Flow
    ReturnStmtEvent,
    IfStmtEvent,
    SwitchStmtEvent,
    ThrowStmtEvent,
    TryStmtEvent,
    CatchClauseEvent,
    LabeledStmtEvent,
    BreakStmtEvent,
    ContinueStmtEvent,

    // Declarations
    VarDeclEvent,
    FuncDeclEvent,

    // Iteration
    ForStmtEvent,
    WhileStmtEvent,
    DoWhileStmtEvent,
    ForOfStmtEvent,
    ForInStmtEvent,

    // Data
    LiteralEvent
} from "./custom-types.ts"