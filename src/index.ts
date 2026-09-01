import { Metadata, SvalPlus } from "./sval-plus.ts";
import ansis from "ansis";

import { 
    Fn, 
    Inspector, 
    InspectorGenerator as InspectorGen, 
    OnStep, 
    WrapperError 
} from "./custom-types.ts";

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
     * Note: Using this hook (even as a no-op) has performance overhead due to extra allocations required to give it context.
     */
    inspector?:Inspector<'user'>,

    /**
     * Called before each interpreted step, but without the `visit` object. When used alone, 
     * it is significantly faster than the `inspector` because it skips extra allocations.
     * 
     * Ideal for lightweight monitoring like execution timers. If you only need `onStep`, leave `inspector` 
     * undefined for maximum efficiency
     */
    onStep?:OnStep,

    /**Receives the generated interpreter code for the monitored function including all of its embedded functions*/
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

/**
 * We assert this for the refs because they are directly included in the interpreter's context. 
 * On the other hand, captured functions are run by the native JS engine and thus will work without issues.
 * 
 * The reason this uses a key check rather than a Set is to handle cases where two different 
 * versions of the package happen to be loaded in memory. A property key will successfully 
 * enforce this rule across package instances, whereas a Set would be limited to a specific 
 * instance of the package in memory.
*/
function assertIsUnmonitored(metadata:Metadata<Fn>) {
    if ('alreadyMonitored' in metadata.ref) {
        throw new WrapperError(ansis.red(`\nA monitored function cannot be directly included in the interpreter's context. Try to capture it instead.`))
    };
}

/**
 * @param setup A configuration object containing the target function together with lifecycle hooks.
 * @returns A new function that is executed by the custom interpreter while retaining the call signature of the target.
*/
export function monitor<T extends Fn>(setup:MonitorFnSetup<T>):T {
    const {
        main, embed,
        inspector, onStep, sourceOut,
        beforeEachCall, afterEachCall
    } = setup;

    assertIsUnmonitored(main);
    if (embed !== undefined) {
        Object.values(embed).forEach(metadata=>{
            assertIsUnmonitored(metadata);
        })
    };

    const interpreter = new SvalPlus({
        useExtensions:true,
        inspector,
        onStep,
        fnBeforeEachCall:beforeEachCall,
        fnAfterEachCall:afterEachCall
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
    LiteralEvent,

    // New ones
    IdentifierEvent,
    TaggedTemplateExprEvent,
    ClassDeclEvent,
    ClassExprEvent,
    BlockStmtEvent,
    PropertyEvent,
    SpreadElementEvent,
    RestElementEvent,
    ThisExprEvent,
    DebuggerStmtEvent
} from "./custom-types.ts"