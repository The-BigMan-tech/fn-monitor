/**
 * ARCHITECTURAL NOTES & DESIGN DECISIONS
 * 
 * Please read before making significant modifications to the evaluators.
 * 
 * 1. SCOPE LIMITATIONS:
 *    Do not expand this into a script-level or module-level monitor. Doing so will 
 *    break the hidden function-context assumptions used throughout this codebase.
 * 
 * 2. STATE MANAGEMENT (Reusables Architecture):
 *    To share interpretation context and control with the inspector hook performantly,
 *    this implementation leverages reusable objects from the extended interpreter to prevent 
 *    creating intermediate objects mid-evaluation. 
 * 
 *    - To prevent state bugs in this architecture (especially during complex async/await 
 *      transitions), the implementation favors a "copy, then overwrite" pattern at specific 
 *      points rather than always choosing to overwrite the reusables.
 * 
 *    - While the evaluator could theoretically be cleaner without interpreter-wide 
 *      reusables, this approach successfully decouples the extended interpreter from 
 *      specific local evaluations. This model is stable and will likely remain unchanged.
 * 
 * 3. CORE IMPLEMENTATION:
 *    This project uses an AST-walker interpreter underneath and will continue to do so.
 *    There are no plans to rewrite this to a bytecode implementation for practical reasons.
 * 
 * 4. TYPESCRIPT & UNMODIFIED CODE:
 *    Parts of the codebase that consist of pure, unmodified `sval` code may have 
 *    TypeScript complaints. Since they function correctly, they have been left as-is 
 *    to preserve the original behavior.
 * 
 * 5. DEBUGGING LIMITATIONS:
 *    Because monitored functions run in an isolated context, errors thrown within them 
 *    will not map directly to their original source location in the editor. 
 *    - Functions should be debugged in their unmonitored state until a native source 
 *      mapping solution is implemented.
 *    - However, the inspector will still display a proper stack trace if an error is 
 *      thrown, as it executes directly in the JS runtime, not the interpreter.
 * 
 * 6. INTERPRETER ISOLATION:
 *    Each monitored function must be assigned its own interpreter instance. While this 
 *    may appear to be a memory overhead, it is strictly required to prevent state 
 *    collision between executions. Sharing a single interpreter across multiple monitored 
 *    functions would introduce severe and unpredictable edge cases.
 * 
 * 7. AST NODE MUTATION & PERFORMANCE:
 *    A monitored function is parsed only once, meaning its AST node and scope objects 
 *    are created just once and reused. 
 *    - WARNING: Any mutations made to this node within the inspector during a function 
 *      call will persist and reflect in all subsequent calls. 
 *    - Reparsing the code on every call was intentionally avoided to maintain execution speed.
 * 
 * 8. SANDBOXING CONTEXT:
 *    This monitor is not designed to act as a secure sandbox on its own. However, you 
 *    can use the inspector hook to simulate a sandboxed environment by actively monitoring 
 *    and intercepting nodes as the interpreter executes the function.
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
            `\n\n//This is the code that is ran each time the monitored function is called and the result is returned through the exports variable.` +
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
    /**the reference to the function to be included in the interpreter context**/
    ref:T,

    /** 
     *Because the function runs in an isolated interpreter context,any data that it uses from the outside scope has to captured by mapping the variable names to their variables and passing the object here.
     *It is important to keep in mind that the captures object itself follows the semantic of copy primitives by value and copy obects by reference.
    */
    captures?:Record<string,any>
}
export interface MonitorFnSetup<T extends Fn> {
    /**The configuration for the main function to monitor */
    main:Metadata<T>,
    
    /**
     * If the main function calls another function outside of its scope,this is an alternative to capturing it by reference.
     * Unlike reference capturing,this directly include a function's source code in the same interpreter context as the main function being monitored.It can also state its own captures as well or use other embedded functions.
    */
    embed?:Record<string,Metadata<Fn>>,
    
    /**
     * The main hook that gets fed the interpreter's context as the function executes.The visit object is rich enough to inspect nodes and their scope,modify them before execution and execute nodes manually to see and change their results.
     * But it cannot directly stop the interpreter from executing a node itself.This is to prevent a half broken state.If required,it must throw an error.
    */
    inspector?:Inspector,

    /**
     *Like the inspector hook,this is called before each interpreted step.but it does not get the rich visit object to inspect or modify nodes
     *Using this hook alone without the inspector will make the interpreter significantly faster because it removes all the allocations it will need to create the tools for the visit object
     *Even without node information,it is useful for setting timers on the interpreted code by checking against a time after a number of steps.
     *If the use case above is enough,use this hook and leave the inspector as undefined.Else,including the inspector,even as a no-op function,will cause several unnecessary allocations
    */
    onStep?:OnStep,

    /**It takes an object with a value property and overwrites it with the generated code used in the interpreter for a specific monitored function.It includes the code for all embedded functions as well */
    sourceOut?:{value:string}

    /**
     * The hook that is called before each call to the monitored function
     * It gets the arguments passed to the function from the caller.It is useful for logging or inspecting the args before execution
    */
    beforeEachCall?:(...args:Parameters<T>)=>void,


    /**
     *The hook that is called after each call to the monitored function
     *It gets the result returned from the function or an error if an error was thrown in the function.
     */
    afterEachCall?:(result:ReturnType<T> | Error)=>void,
}

/**
 * This function is the only export you need to get started.It accepts a brief config that includes a function and returns a new function that can be called exactly as the original.But it is executed by a custom interpreter rather than your js engine directly.
 * The major advantage you get is that you can inject hooks at any part of the function's lifecyle and they are treated as first class citizens by the interpreter.Essentially making it a white-box.
*/
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
        sourceOut
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

    if (sourceOut) {
        sourceOut.value = jsBeatutify(
            fnSrc.fnCode + 
            ast.fnCallString,
            {indent_size:4}
        );
    };

    interpreter.astInUse = ast;
    const newFn = interpreter.runMonitoredFn as any;

    newFn['alreadyMonitored'] = true;
    return newFn;
}

export { Var } from './scope/variable.ts';

export {
    QList,
    ReadonlyQList
} from './q-list.ts';

//!!The estree types pkg is intentionally made as a dependency and not a dev dep because the project is directly exporting one of its types for intellisense

export type {
    Inspector,
    OnStep,
    VariableForEvent,
    ScopeForEvent,
    Query,
    EventMap,
    Visit,
    InspectorGenerator,
    ExeResult,
    EsNode,
} from "./custom-types.ts"

export {
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