import { type Node as EsTreeNode} from "estree";
import { type Node as AcornNode} from "acorn";
import { QList,ReadonlyQList } from "./q-list.ts";
import Scope from "./scope/index.ts";
import ansis from "ansis"

import type { 
    // --- Identifiers & Literals ---
    Literal,
    TemplateLiteral,
    Identifier,
    TaggedTemplateExpression,

    // --- Declarations ---
    VariableDeclaration,
    FunctionDeclaration,
    ClassDeclaration,
    ClassExpression,

    // --- Statements & Blocks ---
    BlockStatement,
    ExpressionStatement,

    // --- Control Flow (Branching) ---
    IfStatement,
    SwitchStatement,
    TryStatement,
    CatchClause,

    // --- Control Flow (Loops) ---
    ForStatement,
    WhileStatement,
    DoWhileStatement,
    ForOfStatement,
    ForInStatement,

    // --- Control Flow (Jumps) ---
    BreakStatement,
    ContinueStatement,
    LabeledStatement,
    ReturnStatement,
    ThrowStatement,

    // --- Core Expressions ---
    ArrayExpression,
    ObjectExpression,
    MemberExpression,
    CallExpression,
    NewExpression,
    AwaitExpression,
    YieldExpression,
    UnaryExpression,
    UpdateExpression,
    BinaryExpression,
    LogicalExpression,
    ConditionalExpression,
    AssignmentExpression,
    SequenceExpression,
    FunctionExpression,
    ArrowFunctionExpression,

    // --- Properties & Elements ---
    Property, // or PropertyDefinition depending on estree version
    SpreadElement,
    RestElement,

    // --- Misc ---
    ThisExpression,
    DebuggerStatement,
} from "estree";

type Brand<T, K extends string> = T & { __brand: K };

export type GeneratedKey = `generated_${string}` 
export type Fn = (...args:any[])=>any;
export type EsNode = EsTreeNode;//i couldnt directly export it from the module because its only a types file

export class WrapperError extends Error {};
export class VisitExecutionError extends Error {};
export class ForbiddenDynamicImport extends Error {};

export const LAZY_NODE = Symbol('LAZY_NODE');
export const NOT_ALLOCATED = Symbol('NOT_ALLOCATED');

//This symbol are internal and wont be encountered by the caller/library user
export const UNASSIGNED = Symbol('UNASSIGNED');

/**
 * using unknown in the yield expr means that the user can always yield visit.execute() without 
 * having to use a type guard and the evaluators will handle it properly
 * 
 * using unknown for the TNext type prevents the user from seeing the branded type while the evaluators 
 * still use it for safety
*/
export type InspectorGenerator<T extends 'internal' | 'user'> = Generator<
    T extends 'internal'?typeof LAZY_NODE:unknown,
    undefined,
    T extends 'internal'?NodeResult<unknown>:unknown
>;

export type Inspector<
    T extends 'internal' | 'user'
> = (visit:Visit)=> undefined | InspectorGenerator<T>;

export type OnStep = ()=>void;
export type PerExeFn = ()=>void;

export type LocalExeStack = Omit<ReadonlyQList<ExeResult>,'setSrc'>
export type CallStack = Omit<ReadonlyQList<Fn>,'setSrc'>

export type NodeResult<T extends unknown> = Brand<T,'NodeResult'>
export type NodeHandler<T extends unknown> = (node:AcornNode | EsNode,scope:Scope)=>NodeResult<T>

export type EvaluatorType = 'eager' | 'lazy';
export type EvaluateOps<T extends unknown> = Partial<
    Record<
        EsNode['type'],NodeHandler<T>
    >
>

/**
    * The rich object that gives inspectors their ability to participate in the interpretation 
    * of the function.
    * 
    * Each monitored function has exactly one visit object (allocated once, not per call). 
    * It uses live references to the current interpreter's state, so it must be used strictly 
    * within the inspector hook — using it elsewhere may cause unexpected side effects.
*/
export interface Visit {
    /**
     * Evaluates your query against the current node. If matched, allocates a scope, wraps it with the node 
     * in an event object, and fires your callback.
     * 
     * For nodes that don't match any query, the interpreter doesn't allocate a scope to save memory. 
     * Use `visit.is('Any', ...)` to force allocation for all nodes.
     */
    is:<T extends Query>(query:T, ifMatched:(event:EventMap[T])=>void)=>void,

    /** 
     * Fires for each executed node starting from the current node (which becomes the owner). 
     * Terminates when the interpreter reaches back to the owner.
     * 
     * Good for checking the local exe stack to see evaluation results in real time.
     * 
     * @deprecated Single-slot API. Each assignment silently overwrites the previous. 
     * Use `visit.execute()` instead for safer semantics.
     * {@link https://github.com/The-BigMan-tech/fn-monitor/blob/master/examples/migrating-from-perExe.ts}
     * 
     * Will be removed in a future major release.
    */
    set perExecution(fn:PerExeFn),

    /**
     * Manually executes the current node and returns the result. Calling this is optional; 
     * if omitted, the interpreter executes the node normally after the inspector finishes.
     * 
     * For lazy nodes, it returns the `LAZY_NODE` symbol. To handle these, use `yield visit.execute()` 
     * in a generator-based inspector.
     */
    execute:()=>unknown | typeof LAZY_NODE,

    /**
     * Live, read-only reference to the stack of latest evaluated child node results with indexed access.
     * Latest at head, oldest at tail. Volatile — use on demand, don't store for later.
     */
    localExeStack:()=>LocalExeStack,
    
    /**
     * Live, read-only reference to the stack of active interpreted function calls. 
     * Latest call at head, previous calls are indexed behind it. Supports iteration.
     */
    callStack:()=>CallStack
}

export interface ScopeForEvent {
    /**
     * The variables in the scope. Use `search()` to find a variable by identifier, 
     * or access `local` for direct property lookup.
     */
    variables:{
        search:(name: string)=>unknown | undefined,
        local:Record<string,unknown>
    },
    /**0-indexed lexical depth relative to either the `main` or an `embedded` function*/
    depth:number,
    /**0-indexed runtime metric representing the current call stack depth starting from the `main` function*/
    callDepth:number
};

export interface ExeResult {
    /**The result of the node's evaluation*/
    evaluation:unknown,
    /**The type of the node*/
    type:EsNode['type'],
    /**The node itself (always allocated)*/
    node:EsNode,
    /**The safe scope created for the caller, or NOT_ALLOCATED if no query matched*/
    scope:ScopeForEvent | typeof NOT_ALLOCATED;
}

/**
 * This type describes an internal object 
 * 
 * The eval-stack is a number that represents how many recursions deep the interpreter is, during a specific evaluation
 * It is a wrapper around a value to prevent any edge case concerning the copy-by-value and copy-by-ref nuance
 * 
 * The exe-stack contains the results of each evaluated node
*/
export interface Reusables<T extends unknown | Generator = unknown | Generator> {
    node:EsNode | null,
    scope:Scope | null,
    handler:NodeHandler<T> | null,
    result:NodeResult<T> | typeof UNASSIGNED,
    event:LangEvent | typeof NOT_ALLOCATED,
    mode:EvaluatorType | null,
    execution:{
        evalStack:{value:number},
        exeStack:QList<ExeResult>,
        readonlyExeStack:ReadonlyQList<ExeResult>,
        perExe:{
            owner:EsNode | null
            fn:PerExeFn | null
        }
    }
}

export interface SvalPlus<T extends unknown | Generator = unknown | Generator> {
    /** Prevents the interpreter from firing inspector hooks during the AST parsing stage, or when the monitored function is not actively executing. */
    stage: 'IDLE' | 'WRAPPING' | 'MONITORING';
    /** Using the internal Inspector type forces the evaluator to maintain strict type safety with NodeResult */
    inspector: Inspector<'internal'> | null, 
    onStep: OnStep | null,
    reusables: Reusables<T>,
    visit: Visit,
    target:'Sval' | 'SvalPlus',
    userRoot:{
        callStack:QList<Fn>,
        readonlyCallStack:ReadonlyQList<Fn>,
        simulatedFnsToOriginal:Map<Fn,Fn>,
        labels:{
            anchor:string,
            offset:string
        }
    },
    createEventScope: () => ScopeForEvent,
}


// The package leaves it to the caller's hands to figure out how to get the details of an event but it helps enough by narrowing down the nodes through the event classes

export class LangEvent<NodeType extends EsNode = EsNode> {//LangEvent is short for Language Event
    public node:NodeType;
    public scope:ScopeForEvent;

    constructor(interpreter:SvalPlus) {//taking the interpreter directly rather than the node and scope separately,heavily simplifies the constructor per sub class
        this.node = interpreter.reusables.node as NodeType;
        this.scope = interpreter.createEventScope()
    }
}
export class IdentifierEvent extends LangEvent<Identifier> {
    constructor(interpreter: SvalPlus) { super(interpreter); }
}

export class TaggedTemplateExprEvent extends LangEvent<TaggedTemplateExpression> {
    constructor(interpreter: SvalPlus) { super(interpreter); }
}

export class ClassDeclEvent extends LangEvent<ClassDeclaration> {
    constructor(interpreter: SvalPlus) { super(interpreter); }
}

export class ClassExprEvent extends LangEvent<ClassExpression> {
    constructor(interpreter: SvalPlus) { super(interpreter); }
}

export class BlockStmtEvent extends LangEvent<BlockStatement> {
    constructor(interpreter: SvalPlus) { super(interpreter); }
}

export class PropertyEvent extends LangEvent<Property> {
    constructor(interpreter: SvalPlus) { super(interpreter); }
}

export class SpreadElementEvent extends LangEvent<SpreadElement> {
    constructor(interpreter: SvalPlus) { super(interpreter); }
}

export class RestElementEvent extends LangEvent<RestElement> {
    constructor(interpreter: SvalPlus) { super(interpreter); }
}

export class ThisExprEvent extends LangEvent<ThisExpression> {
    constructor(interpreter: SvalPlus) { super(interpreter); }
}

export class DebuggerStmtEvent extends LangEvent<DebuggerStatement> {
    constructor(interpreter: SvalPlus) { super(interpreter); }
}

// Expressions
export class ExpressionStmtEvent extends LangEvent<ExpressionStatement> {
    constructor(interpreter: SvalPlus) { super(interpreter); }
}
export class ArrayExprEvent extends LangEvent<ArrayExpression> {
    constructor(interpreter: SvalPlus) { super(interpreter); }
}

export class ObjectExprEvent extends LangEvent<ObjectExpression> {
    constructor(interpreter: SvalPlus) { super(interpreter); }
}
export class YieldExprEvent extends LangEvent<YieldExpression> {
    constructor(interpreter: SvalPlus) { super(interpreter); }
}

export class TemplateLiteralEvent extends LangEvent<TemplateLiteral> {
    constructor(interpreter: SvalPlus) { super(interpreter); }
}

export class SequenceExprEvent extends LangEvent<SequenceExpression> {
    constructor(interpreter: SvalPlus) { super(interpreter); }
}
export class UnaryExprEvent extends LangEvent<UnaryExpression> {
    constructor(interpreter: SvalPlus) { super(interpreter); }
}


export class BinaryExprEvent extends LangEvent<BinaryExpression> {
    constructor(interpreter: SvalPlus) { super(interpreter); }
}

export class CallExprEvent extends LangEvent<CallExpression> {
    constructor(interpreter: SvalPlus) { super(interpreter); }
}

export class AssignmentExprEvent extends LangEvent<AssignmentExpression> {
    constructor(interpreter: SvalPlus) { super(interpreter); }
}

export class UpdateExprEvent extends LangEvent<UpdateExpression> {
    constructor(interpreter: SvalPlus) { super(interpreter); }
}

export class LogicalExprEvent extends LangEvent<LogicalExpression> {
    constructor(interpreter: SvalPlus) { super(interpreter); }
}

export class MemberExprEvent extends LangEvent<MemberExpression> {
    constructor(interpreter: SvalPlus) { super(interpreter); }
}
export class AwaitExprEvent extends LangEvent<AwaitExpression> {
    constructor(interpreter: SvalPlus) { super(interpreter); }
}



export class FuncExprEvent extends LangEvent<FunctionExpression> {
    constructor(interpreter: SvalPlus) { super(interpreter); }
}

export class ArrowFnExprEvent extends LangEvent<ArrowFunctionExpression> {
    constructor(interpreter: SvalPlus) { super(interpreter); }
}

export class TernaryExprEvent extends LangEvent<ConditionalExpression> {
    constructor(interpreter: SvalPlus) { super(interpreter); }
}

export class NewExprEvent extends LangEvent<NewExpression> {
    constructor(interpreter: SvalPlus) { super(interpreter); }
}


// Statements & Control Flow
export class ReturnStmtEvent extends LangEvent<ReturnStatement> {
    constructor(interpreter: SvalPlus) { super(interpreter); }
}

export class IfStmtEvent extends LangEvent<IfStatement> {
    constructor(interpreter: SvalPlus) { super(interpreter); }
}

export class SwitchStmtEvent extends LangEvent<SwitchStatement> {
    constructor(interpreter: SvalPlus) { super(interpreter); }
}

export class ThrowStmtEvent extends LangEvent<ThrowStatement> {
    constructor(interpreter: SvalPlus) { super(interpreter); }
}

export class TryStmtEvent extends LangEvent<TryStatement> {
    constructor(interpreter: SvalPlus) { super(interpreter); }
}

export class CatchClauseEvent extends LangEvent<CatchClause> {
    constructor(interpreter: SvalPlus) { super(interpreter); }
}

// Declarations
export class VarDeclEvent extends LangEvent<VariableDeclaration> {
    constructor(interpreter: SvalPlus) { super(interpreter); }
}

export class FuncDeclEvent extends LangEvent<FunctionDeclaration> {
    constructor(interpreter: SvalPlus) { super(interpreter); }
}

// Iteration
export class ForStmtEvent extends LangEvent<ForStatement> {
    constructor(interpreter: SvalPlus) { super(interpreter); }
}

export class WhileStmtEvent extends LangEvent<WhileStatement> {
    constructor(interpreter: SvalPlus) { super(interpreter); }
}

export class DoWhileStmtEvent extends LangEvent<DoWhileStatement> {
    constructor(interpreter: SvalPlus) { super(interpreter); }
}

export class ForOfStmtEvent extends LangEvent<ForOfStatement> {
    constructor(interpreter: SvalPlus) { super(interpreter); }
}

export class ForInStmtEvent extends LangEvent<ForInStatement> {
    constructor(interpreter: SvalPlus) { super(interpreter); }
}

export class LabeledStmtEvent extends LangEvent<LabeledStatement> {
    constructor(interpreter: SvalPlus) { super(interpreter); }
}

export class BreakStmtEvent extends LangEvent<BreakStatement> {
    constructor(interpreter: SvalPlus) { super(interpreter); }
}

export class ContinueStmtEvent extends LangEvent<ContinueStatement> {
    constructor(interpreter: SvalPlus) { super(interpreter); }
}
// Data
export class LiteralEvent extends LangEvent<Literal> {
    constructor(interpreter: SvalPlus) { super(interpreter); }
}

/**
 * This is a string union of all the possible nodes the caller can query in the visit.is callback.
 * They are all estree node types.You will see type definitions shortening this to EsNode.
 * There are over 40 types of nodes that you can query and if any of the nodes dont match your needs,you can always use the 'Any' query which matches for every node.You can then use the estree node type to cast it to specific types
 */
export type Query = 
    | Literal['type']
    | Identifier['type']
    | TaggedTemplateExpression['type']
    | ClassDeclaration['type']
    | ClassExpression['type']
    | BlockStatement['type']
    | Property['type']
    | SpreadElement['type']
    | RestElement['type']
    | ThisExpression['type']
    | DebuggerStatement['type']
    | VariableDeclaration['type']
    | FunctionDeclaration['type']
    | IfStatement['type']
    | SwitchStatement['type']
    | TryStatement['type']
    | CatchClause['type']
    | ReturnStatement['type']
    | ThrowStatement['type']
    | ForStatement['type']
    | WhileStatement['type']
    | DoWhileStatement['type']
    | ForOfStatement['type']
    | ForInStatement['type']
    | BreakStatement['type']
    | ContinueStatement['type']
    | LabeledStatement['type']
    | BinaryExpression['type']
    | CallExpression['type']
    | AssignmentExpression['type']
    | UpdateExpression['type']
    | LogicalExpression['type']
    | MemberExpression['type']
    | AwaitExpression['type']
    | FunctionExpression['type']
    | ArrowFunctionExpression['type']
    | ConditionalExpression['type']
    | NewExpression['type']
    | ExpressionStatement['type']
    | ArrayExpression['type']
    | ObjectExpression['type']
    | TemplateLiteral['type']
    | SequenceExpression['type']
    | UnaryExpression['type']
    | YieldExpression['type']
    | 'Any';// the catch all fallback

/**
 * The type definiton that maps each node query to the event object you will get from that query
 * Each type has its own dedicated Event class which helps to tailor intellisense
 */
export type EventMap = (
    Record<Identifier['type'], IdentifierEvent> &
    Record<TaggedTemplateExpression['type'], TaggedTemplateExprEvent> &
    Record<ClassDeclaration['type'], ClassDeclEvent> &
    Record<ClassExpression['type'], ClassExprEvent> &
    Record<BlockStatement['type'], BlockStmtEvent> &
    Record<Property['type'], PropertyEvent> &
    Record<SpreadElement['type'], SpreadElementEvent> &
    Record<RestElement['type'], RestElementEvent> &
    Record<ThisExpression['type'], ThisExprEvent> &
    Record<DebuggerStatement['type'], DebuggerStmtEvent> &
    Record<Literal['type'], LiteralEvent> &
    Record<BinaryExpression['type'], BinaryExprEvent> &
    Record<CallExpression['type'], CallExprEvent> &
    Record<AssignmentExpression['type'], AssignmentExprEvent> &
    Record<UpdateExpression['type'], UpdateExprEvent> &
    Record<LogicalExpression['type'], LogicalExprEvent> &
    Record<MemberExpression['type'], MemberExprEvent> &
    Record<AwaitExpression['type'], AwaitExprEvent> &
    Record<FunctionExpression['type'], FuncExprEvent> &
    Record<ReturnStatement['type'], ReturnStmtEvent> &
    Record<IfStatement['type'], IfStmtEvent> &
    Record<SwitchStatement['type'], SwitchStmtEvent> &
    Record<ThrowStatement['type'], ThrowStmtEvent> &
    Record<TryStatement['type'], TryStmtEvent> &
    Record<CatchClause['type'], CatchClauseEvent> &
    Record<VariableDeclaration['type'], VarDeclEvent> &
    Record<FunctionDeclaration['type'], FuncDeclEvent> &
    Record<ForStatement['type'], ForStmtEvent> &
    Record<WhileStatement['type'], WhileStmtEvent> &
    Record<DoWhileStatement['type'], DoWhileStmtEvent> &
    Record<ForOfStatement['type'], ForOfStmtEvent> &
    Record<ForInStatement['type'], ForInStmtEvent> &
    Record<LabeledStatement['type'], LabeledStmtEvent> &
    Record<BreakStatement['type'],BreakStmtEvent> &
    Record<ContinueStatement['type'],ContinueStmtEvent> &
    Record<ArrowFunctionExpression['type'],ArrowFnExprEvent> &
    Record<ConditionalExpression['type'],TernaryExprEvent> &
    Record<NewExpression['type'],NewExprEvent> &
    Record<ExpressionStatement['type'],ExpressionStmtEvent> &
    Record<ArrayExpression['type'],ArrayExprEvent> &
    Record<ObjectExpression['type'],ObjectExprEvent> &
    Record<TemplateLiteral['type'],TemplateLiteralEvent> &
    Record<SequenceExpression['type'],SequenceExprEvent> &
    Record<UnaryExpression['type'],UnaryExprEvent> &
    Record<YieldExpression['type'],YieldExprEvent> &
    Record<'Any', LangEvent>
);
export function createEvent<T extends Query>(query:Query,interpreter:SvalPlus):EventMap[T]  {
    let event:LangEvent | null = null;
    switch (query) {
        case 'Identifier': {
            event = new IdentifierEvent(interpreter);
            break;
        }
        case 'TaggedTemplateExpression': {
            event = new TaggedTemplateExprEvent(interpreter);
            break;
        }
        case 'ClassDeclaration': {
            event = new ClassDeclEvent(interpreter);
            break;
        }
        case 'ClassExpression': {
            event = new ClassExprEvent(interpreter);
            break;
        }
        case 'BlockStatement': {
            event = new BlockStmtEvent(interpreter);
            break;
        }
        case 'Property': {
            event = new PropertyEvent(interpreter);
            break;
        }
        case 'SpreadElement': {
            event = new SpreadElementEvent(interpreter);
            break;
        }
        case 'RestElement': {
            event = new RestElementEvent(interpreter);
            break;
        }
        case 'ThisExpression': {
            event = new ThisExprEvent(interpreter);
            break;
        }
        case 'DebuggerStatement': {
            event = new DebuggerStmtEvent(interpreter);
            break;
        }
        case 'BinaryExpression': {
            event = new BinaryExprEvent(interpreter);
            break;
        }
        case 'CallExpression': {
            event = new CallExprEvent(interpreter);
            break;
        }
        case 'AssignmentExpression': {
            event = new AssignmentExprEvent(interpreter);
            break;
        }
        case 'UpdateExpression': {
            event = new UpdateExprEvent(interpreter);
            break;
        }
        case 'LogicalExpression': {
            event = new LogicalExprEvent(interpreter);
            break;
        }
        case 'YieldExpression':{
            event = new YieldExprEvent(interpreter);
            break;
        }
        case 'MemberExpression': {
            event = new MemberExprEvent(interpreter);
            break;
        }
        case 'AwaitExpression': {
            event = new AwaitExprEvent(interpreter);
            break;
        }
        case 'FunctionExpression': {
            event = new FuncExprEvent(interpreter);
            break;
        }
        case 'ReturnStatement': {
            event = new ReturnStmtEvent(interpreter);
            break;
        }
        case 'IfStatement': {
            event = new IfStmtEvent(interpreter);
            break;
        }
        case 'SwitchStatement': {
            event = new SwitchStmtEvent(interpreter);
            break;
        }
        case 'ThrowStatement': {
            event = new ThrowStmtEvent(interpreter);
            break;
        }
        case 'TryStatement': {
            event = new TryStmtEvent(interpreter);
            break;
        }
        case 'CatchClause': {
            event = new CatchClauseEvent(interpreter);
            break;
        }
        case 'VariableDeclaration': {
            event = new VarDeclEvent(interpreter);
            break;
        }
        case 'FunctionDeclaration': {
            event = new FuncDeclEvent(interpreter);
            break;
        }
        case 'ForStatement': {
            event = new ForStmtEvent(interpreter);
            break;
        }
        case 'WhileStatement': {
            event = new WhileStmtEvent(interpreter);
            break;
        }
        case 'DoWhileStatement': {
            event = new DoWhileStmtEvent(interpreter);
            break;
        }
        case 'ForOfStatement': {
            event = new ForOfStmtEvent(interpreter);
            break;
        }
        case 'ForInStatement': {
            event = new ForInStmtEvent(interpreter);
            break;
        }
        case 'Literal': {
            event = new LiteralEvent(interpreter);
            break;
        }
        case 'LabeledStatement': {
            event = new LabeledStmtEvent(interpreter);
            break;
        }
        case 'BreakStatement': {
            event = new BreakStmtEvent(interpreter);
            break;
        }
        case 'ContinueStatement': {
            event = new ContinueStmtEvent(interpreter);
            break;
        }
        case 'NewExpression': {
            event = new NewExprEvent(interpreter);
            break;
        }
        case 'ArrowFunctionExpression': {
            event = new ArrowFnExprEvent(interpreter);
            break;
        }
        case 'ConditionalExpression': {
            event = new TernaryExprEvent(interpreter);
            break;
        }
        case 'ExpressionStatement': {
            event = new ExpressionStmtEvent(interpreter);
            break;
        }
        case 'ArrayExpression': {
            event = new ArrayExprEvent(interpreter);
            break;
        }
        case 'ObjectExpression': {
            event = new ObjectExprEvent(interpreter);
            break;
        }
        case 'TemplateLiteral': {
            event = new TemplateLiteralEvent(interpreter);
            break;
        }
        case 'SequenceExpression': {
            event = new SequenceExprEvent(interpreter);
            break;
        }
        case 'UnaryExpression': {
            event = new UnaryExprEvent(interpreter);
            break;
        }
        case 'Any': {
            event = new LangEvent(interpreter);
            break;
        }
        // Because `visit.is` ignores invalid queries, the default case will only be reached if the codebase forgot to implement a mapping for it 
        // or if a user queries for a legitimate node that the library clearly does not support. 
        default: {
            throw new Error(ansis.red(`The query, '${query}' matched a node but it does not map to any event class.`))
        }
    }
    return event as EventMap[T];
}