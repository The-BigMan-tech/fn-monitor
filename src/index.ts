/**
 * ARCHITECTURAL NOTES & DESIGN DECISIONS
 * 
 * Please read before making significant modifications to the evaluators.
 * 
 * 1. PURPOSE LIMITATIONS:
 *    Do not expand this into a script-level or module-level monitor. Doing so will 
 *    break the hidden function-context assumptions used throughout this codebase.
 * 
 * 2. TYPESCRIPT & UNMODIFIED CODE:
 *    Parts of the codebase that consist of pure, unmodified `sval` code may have 
 *    TypeScript complaints. Since they function correctly, they have been left as-is 
 *    to preserve the original behavior.
 * 
 * 3. INTERPRETER ISOLATION:
 *    Each monitored function must be assigned its own interpreter instance. While this 
 *    may appear to be a memory overhead, it is strictly required to prevent state 
 *    collision between executions. Sharing a single interpreter across multiple monitored 
 *    functions would introduce severe and unpredictable edge cases.
 * 
 * 4. AST NODE MUTATION & PERFORMANCE:
 *    A monitored function is parsed only once, meaning its AST node and scope objects 
 *    are created just once and reused. 
 *    - WARNING: Any mutations made to this node within the inspector during a function 
 *      call will persist and reflect in all subsequent calls. 
 *    - Reparsing the code on every call was intentionally avoided to maintain execution speed.
 * 
 * 5. ISOLATION CONTEXT:
 *    This monitor is not designed to act as a secure sandbox on its own. However, you 
 *    can use the inspector hook to simulate a sandboxed environment by actively monitoring 
 *    and intercepting nodes as the interpreter executes the function.
 */


import jsBeatutify from "js-beautify";
import { Fn, Inspector, OnStep, WrapperError } from "./custom-types.ts";
import { Metadata, SvalPlus } from "./sval-plus.ts";
import ansis from "ansis";

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


function assertRefIsNotMonitored(metadata:Metadata<Fn>) {
    const {ref} = metadata;
    if ('alreadyMonitored' in ref) {//we only assert this for the refs because they are directly included in the interpreter's context. Whereas captured fns are ran by the js engine and thus,it will work without issues.
        throw new WrapperError(ansis.red(`\nA monitored function cannot be directly included in the interpreter's context.Try to capture it instead.`))
    };
}
/**
 * This function is the only export you need to get started.It accepts a brief config that includes a function and returns a new function that can be called exactly as the original.But it is executed by a custom interpreter rather than your js engine directly.
 * The major advantage you get is that you can inject hooks at any part of the function's lifecyle and they are treated as first class citizens by the interpreter.Essentially making it a white-box.
*/
export function monitor<T extends Fn>(setup:MonitorFnSetup<T>):T & {alreadyMonitored:true} {
    const {ref:mainFn,captures} = setup.main;

    assertRefIsNotMonitored(setup.main);

    const {
        embed:functionsToEmbed,
        inspector,
        onStep,
        beforeEachCall,
        afterEachCall,
        sourceOut
    } = setup;

    if (functionsToEmbed !== undefined) {
        Object.values(functionsToEmbed).forEach(metadata=>{
            assertRefIsNotMonitored(metadata);
        })
    };

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
    const newFn = interpreter.runMonitoredFn as T & { alreadyMonitored: true };

    newFn['alreadyMonitored'] = true;
    return newFn;
}


export type {Metadata} from "./sval-plus.ts";

export type {
    QList,
    ReadonlyQList
} from './q-list.ts';

export type {
    Inspector,
    OnStep,
    ScopeForEvent,
    Query,
    EventMap,
    Visit,
    InspectorGenerator,
    ExeResult,

    //!!The estree types pkg is intentionally made as a dependency and not a dev dep because the project is directly exporting its types for intellisense
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