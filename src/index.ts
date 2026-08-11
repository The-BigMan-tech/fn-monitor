/**
 *  ARCHITECTURAL NOTES FOR MAINTAINERS & CONTRIBUTORS
 *  
 *  Please thoroughly review the "Important Notes" section in the README and 
 *  understand the following before making significant modifications to the codebase.
 *  
 *  1. PURPOSE LIMITATIONS:
 *     Do not expand this into a script-level or module-level monitor. Doing so will 
 *     break the hidden function-context assumptions used throughout this codebase.
 *  
 *  2. TYPESCRIPT COMPLAINTS:
 *     Parts of the codebase that consist of pure, unmodified `sval` code may have 
 *     TypeScript complaints. Since they function correctly, they have been left as-is 
 *     to preserve the original behavior, marked with `@ts-nocheck`.
 *  
 *  3. ES-NODE EXPORT:
 *     The @types/estree pkg is intentionally installed as a dependency and not as a dev dependency 
 *     because the codebase directly exports one of its types for intellisense. It prevents users
 *     from having to install an extra package just to get full intellisense.
 * 
 *  4. INTERPRETER IMPLEMENTATION:
 *     The package will continue to use AST-walking to interprete code and will not transition to
 *     a bytecode implementation for very practical reasons
 * 
 *  5. SVAL COMPATIBILITY:
 *      - The `SvalPlus` class must remain a strict drop-in replacement for `Sval`. Its constructor and 
 *      public API must be strictly identical or additive to ensure upstream `sval` test suites 
 *      run seamlessly. 
 *  
 *      - Avoid breaking changes to core internals unless rigorously tested to 
 *      preserve compatibility (e.g., the evaluator modifications). 
 *      
 *      - As a result of this compatibility, you will see acorn and estree node types being used 
 *      interchangeably. But this wont affect runtime behaviour
 *  
 *  6. TEST COVERAGE:
 *      - Quick note, 
 *          - There are two evaluator implementations--the nomalized version under the  
 *          evaluate_n folder and the generator version which is under the evaluate folder
 * 
 *          - The normalized version is used by the interpreter to run a node synchronously 
 *            while the generator version is used to run async nodes
 *          
 *          - The parts of these evaluators that have the custom modifications to enable function
 *            monitoring are in their respective index.ts files while everything else were inherited 
 *            from sval and left as they were.
 * 
 *      - There are two test folders, the interpreter tests and the modifications tests:
 *          - The interpreter tests consists of the 200+ tests inherited from `sval`
 *          - The modification tests consist of the 50+ tests made for the custom modifications
 *      
 *      - For the modification tests, 
 *          - Each of them are marked with one of the following prefixes ;
 * 
 *              - [Sync] to indicate that it targets the normalized evaluator.
 *                An [Async] counterpart should be made if not available.
 *  
 *              - [Async] to indicate that it targets the generator evaluator.
 *                A [Sync] counterpart should be made if not available.
 *  
 *              - [Sync-only] to indicate that it is only meant to target the normalized evaluator.
 *                An [Async] counterpart should not be made
 *  
 *              - [Async-only] to indicate that it is only meant to test the generator evaluator. 
 *                A [Sync] counterpart should not be made
 *              
 *              - [Pre] to indicate that it only tests the pre-processing step(wrapping and parsing)
 *                and not runtime execution
 *          
 *      - All the tests are heavily skewed towards the normalized evaluator.
 *        
 *      - This means that the coverage is not complete and you will have to manually test any changes 
 *        you make to the generator version
 * 
 *      - For the modification tests, the goal is to ensure that all [Sync] tests have [Async] equivalents 
 *        and vice versa. This will ensure that they have complete coverage.
 *      
 *      - For the interpreter tests, any plans to help it to fully cover the generator 
 *        version is postponed till the coverage of the modification tests is complete.
 *      
 *      - More tests may be pushed while the coverage is undergoing completion but it will
 *        be less frequent.
*/



import jsBeatutify from "js-beautify";
import { Fn, Inspector, InspectorGenerator as InspectorGen, OnStep, WrapperError } from "./custom-types.ts";
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
    inspector?:Inspector<'user'>,

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
        useExtensions:true,
        inspector,
        onStep,
        fnBeforeEachCall:beforeEachCall,
        fnAfterEachCall:afterEachCall,
        options:SvalPlus.defaultOptions
    });

    interpreter.stage = "PRE-PROCESSING";

    const capturesLabel = SvalPlus.commonLabels.captures('mainFn');
    interpreter.exports[capturesLabel] = captures || Object.create(null);
    
    const fnSrc = interpreter.getFnSrc(mainFn,capturesLabel,true);
    fnSrc.fnCode += interpreter.getFnSources(functionsToEmbed);

    fnSrc.fnCode = `'use strict'\n${fnSrc.fnCode}`;//ensure that it runs in strict mode
    interpreter.useFn(fnSrc);

    if (sourceOut) {//only write the generated code if the interpreter could parse it
        sourceOut.value = jsBeatutify(
            fnSrc.fnCode + fnSrc.fnCall,
            {indent_size:4}
        );
    };

    const newFn = interpreter.runFn as T & { alreadyMonitored: true };
    newFn['alreadyMonitored'] = true;

    return newFn;
}

export  type InspectorGenerator = InspectorGen<'user'>;//this will prevent callers from seeing the branded type

export type { 
    Metadata 
} from "./sval-plus.ts";

export type {
    Inspector,
    LocalExeStack,
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