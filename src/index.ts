import { 
    Fn, 
    Inspector, 
    InspectorGenerator as InspectorGen, 
    OnStep, 
    WrapperError 
} from "./custom-types.ts";

import { Metadata, SvalPlus } from "./sval-plus.ts";
import ansis from "ansis";

export interface MonitorFnSetup<T extends Fn> {
    /**The configuration for the main function to monitor*/
    main:Metadata<T>,
    
    /**
     * Alternative to capturing a function by reference. Embeds the function's source code into the 
     * interpreter context so it becomes observable (inspected, modified, timed). Embedded functions 
     * can have their own captures and call other embedded functions.
     */
    embed?:Record<string,Metadata<Fn>>,
    
    /**
     * The main hook for inspecting and modifying AST nodes during execution. Receives the `visit` object 
     * with tools to query nodes, inspect scopes, mutate AST, and execute nodes manually.
     * 
     * Note: Using this hook (even as a no-op) has performance overhead due to scope and event allocations.
     */
    inspector?:Inspector<'user'>,

    /**
     * Called before each interpreted step, but without the `visit` object. Significantly faster than 
     * `inspector` alone since it skips all scope/event allocations.
     * 
     * Ideal for lightweight monitoring like execution timers. If you only need `onStep`, leave `inspector` 
     * undefined for maximum efficiency
     */
    onStep?:OnStep,

    /**Receives the generated interpreter code for the monitored function and all embedded functions*/
    sourceOut?:{value:string}

    /**
     * Called before each invocation of the monitored function with the caller's arguments.
     */
    beforeEachCall?:(...args:Parameters<T>)=>void,

    /**
     * Called after each invocation with the function's return value or the thrown error.
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
    const {
        main,
        embed,
        inspector,
        onStep,
        beforeEachCall,
        afterEachCall,
        sourceOut
    } = setup;

    assertRefIsNotMonitored(main);
    if (embed !== undefined) {
        Object.values(embed).forEach(metadata=>{
            assertRefIsNotMonitored(metadata);
        })
    };

    const interpreter = new SvalPlus({
        useExtensions:true,
        inspector,
        onStep,
        fnBeforeEachCall:beforeEachCall,
        fnAfterEachCall:afterEachCall,
    });

    return interpreter.assemble(main,embed,sourceOut);
}

export type InspectorGenerator = InspectorGen<'user'>;//this will prevent callers from seeing the branded type

export type { 
    Metadata 
} from "./sval-plus.ts";

export type {
    Fn,
    Inspector,
    LocalExeStack,
    CallStack,
    OnStep,
    ScopeForEvent,
    Query,
    EventMap,
    Visit,
    ExeResult,
    EsNode,
} from "./custom-types.ts"

export {
    NOT_ALLOCATED,
    LAZY_NODE,

    //the reason why i didnt export these as just types is because the caller may perform runtime class checks

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

    ExpressionStmtEvent,
    ArrayExprEvent,
    ObjectExprEvent,
    TemplateLiteralEvent,
    SequenceExprEvent,
    UnaryExprEvent,
    YieldExprEvent,

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