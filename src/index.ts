/**
 *  ARCHITECTURAL NOTES FOR MAINTAINERS & CONTRIBUTORS
 *  
 *  Please thoroughly review the "Important Notes" section in the README and 
 *  understand the following before making significant modifications to the codebase.
 *  
 *  1. PURPOSE LIMITATIONS:
 *     --------------------
 *     Do not expand this into a script-level or module-level monitor. Doing so will 
 *     break the hidden function-context assumptions used throughout this codebase.
 *  
 *  2. TYPESCRIPT COMPLAINTS:
 *     ----------------------
 *     Parts of the codebase that consist of pure, unmodified `sval` code may have 
 *     TypeScript complaints. Since they function correctly, they have been left as-is 
 *     to preserve the original behavior and are marked with `@ts-nocheck`.
 *  
 *  3. ES-NODE EXPORT:
 *     ---------------
 *     The `@types/estree` package is intentionally installed as a production dependency 
 *     (not a devDependency) because the codebase directly exports its types for public 
 *     intellisense. This prevents users from having to install an extra package just 
 *     to get full type support.
 * 
 *  4. INTERPRETER IMPLEMENTATION:
 *     ---------------------------
 *     The package will continue to use AST-walking to interprete code and will not 
 *     transition to a bytecode implementation. This is an intentional architectural 
 *     choice: AST-walking allows the `inspector` hook to intercept, mutate, and query 
 *     individual nodes mid-execution, which a compiled bytecode VM cannot easily 
 *     support without losing the white-box Developer Experience.
 * 
 *  5. SVAL COMPATIBILITY:
 *     -------------------
 *      - The extended interpreter class, `SvalPlus`, must remain a strict drop-in 
 *        replacement for `Sval`. Its constructor and public API must be strictly 
 *        identical or additive to ensure upstream `sval` test suites run seamlessly. 
 *  
 *      - Avoid breaking changes to core internals unless rigorously tested to 
 *        preserve compatibility (e.g., the evaluator modifications). 
 *      
 *      - As a result of this compatibility, you will see `acorn` and `estree` node 
 *        types being used interchangeably. This introduces some type redundancy, but 
 *        it won't affect runtime behavior and is required to maintain upstream compatibility.
 *  
 *  6. PARSER REDUNDANCY (INTENTIONAL):
 *     --------------------------------
 *     The package uses `meriyah` to parse user functions for speed, but retains `acorn` 
 *     to avoid breaking or heavily refactoring inherited `sval` code. While carrying 
 *     two parsers might be viewed by some as "bloat", it is an intentional trade-off 
 *     that guarantees stability and upstream compatibility without requiring a massive, 
 *     risky rewrite of the core evaluator. Do not remove `acorn`.
 * 
 *  7. TEST COVERAGE & EVALUATOR ARCHITECTURE:
 *     ---------------------------------------
 *      - The interpreter has two evaluator implementations:
 *          1. Normalized (`evaluate_n` folder): Processes synchronous nodes.
 *          2. Generator (`evaluate` folder): Processes asynchronous nodes.
 *          
 *          Note: Custom modifications live in their respective `index.ts` files; 
 *          everything else is inherited from `sval` and left untouched. 
 *          
 *      - Modifications also exist in the Scope class (`scope/index.ts`) and the 
 *        Sval class (`sval.ts`).
 *      
 *      - Test Suite Structure:
 *          - `interpreter` tests: 200+ tests inherited from `sval`.
 *          - `modifications` tests: 55+ tests written for the custom modifications.
 *      
 *      - Modification Test Prefixes:
 *          - `[Sync]`: Targets the normalized evaluator. (An `[Async]` counterpart should exist).
 *          - `[Async]`: Targets the generator evaluator. (A `[Sync]` counterpart should exist).
 *          - `[Sync-only]`: Strictly for the normalized evaluator. (No async counterpart needed).
 *          - `[Async-only]`: Strictly for the generator evaluator. (No sync counterpart needed).
 *          - `[Pre]`: Tests the pre-processing step (wrapping/parsing), not runtime execution.
 *          
 *      - Coverage Status: 
 *          Because each evaluator has its own copy of the node handlers, the tests must be explicitly
 *          written to cover both the generator and the normalized evaluator individually.
 * 
 *          ALL tests are currently heavily skewed toward the normalized evaluator and coverage 
 *          for the generator version is incomplete.
 *          
 *          This means that a change to the generator version can pass the entire test suite while 
 *          silently breaking it. Passing the suite is NOT proof that the async path is unaffected.
 * 
 *          The goal is to ensure that for all modification tests, the `[Sync]` tests have `[Async]` 
 *          equivalents and vice versa.
 *          
 *          As for the interpreter tests, plans to complete the coverage are postponed until
 *          modification tests have received full coverage
 * 
 *          
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
        options:SvalPlus.svalOptions
    });

    interpreter.stage = "PRE-PROCESSING";

    const capturesLabel = SvalPlus.commonLabels.captures('mainFn');
    interpreter.svalPlusExports[capturesLabel] = captures || Object.create(null);
    
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