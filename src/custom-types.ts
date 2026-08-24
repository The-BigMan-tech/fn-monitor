//My library leaves it to the caller's hands to figure out how to get the details of an event but it helps enough by narrowing down the nodes through the event classes

import Scope from "./scope/index.ts";
import type { Node as EsTreeNode} from "estree";
import {type Node as AcornNode} from "acorn";

import type { 
    Literal,VariableDeclaration, FunctionDeclaration,

    IfStatement,SwitchStatement,TryStatement,CatchClause,
    
    ReturnStatement,ThrowStatement,

    ForStatement, WhileStatement,DoWhileStatement, ForOfStatement, ForInStatement,

    BreakStatement,ContinueStatement,LabeledStatement,
    
    BinaryExpression, CallExpression, AssignmentExpression, 
    UpdateExpression, LogicalExpression, MemberExpression,AwaitExpression,FunctionExpression,
    ArrowFunctionExpression,ConditionalExpression,NewExpression,
    ExpressionStatement,ArrayExpression,ObjectExpression,TemplateLiteral,SequenceExpression,UnaryExpression,YieldExpression
} from "estree";

import { QList,ReadonlyQList } from "./q-list.ts";

/**
 * This is a string union of all the possible nodes the caller can query in the visit.is callback.
 * They are all estree node types.You will see type definitions shortening this to EsNode.
 * There are over 30 types of nodes that you can query and if any of the nodes dont match your needs,you can always use the 'Any' query which matches for every node.You can then use the estree node type to cast it to specific types
 */
export type Query = 
    | Literal['type']
    | BinaryExpression['type']
    | CallExpression['type']
    | AssignmentExpression['type']
    | UpdateExpression['type']
    | LogicalExpression['type']
    | MemberExpression['type']
    | AwaitExpression['type']
    | FunctionExpression['type']
    | ReturnStatement['type']
    | IfStatement['type']
    | SwitchStatement['type']
    | ThrowStatement['type']
    | TryStatement['type']
    | CatchClause['type']
    | VariableDeclaration['type']
    | FunctionDeclaration['type']
    | ForStatement['type']
    | WhileStatement['type']
    | DoWhileStatement['type']
    | ForOfStatement['type']
    | ForInStatement['type']
    | LabeledStatement['type']
    | BreakStatement['type']
    | ContinueStatement['type']
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
    | 'Any'; // The fallback / default

/**
 * The type definiton that maps each node query to the event object you will get from that query
 * Each type has its own dedicated Event class which helps to tailor intellisense
 */
export type EventMap = (
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

export type LocalExeStack = Omit<ReadonlyQList<ExeResult>,'swapSrc'>

export type NodeResult<T extends unknown> = Brand<T,'NodeResult'>
export type NodeHandler<T extends unknown> = (node:AcornNode | EsNode,scope:Scope<SvalPlus>)=>NodeResult<T>

export type EvaluatorType = 'eager' | 'lazy';
export type EvaluateOps<T extends unknown> = Partial<
    Record<
        EsNode['type'],NodeHandler<T>
    >
>

/**
 * The rich object that gives inspectors their ability to participate in the interpretation of the function
 * Every monitored function has exactly one interpreter and also,exactly one visit object to themselves
 * This means that the visit object is only alloacted once per monitored function and not per call to save memory
 * You will shoot yourself in the foot if you attempt to take the visit object oustide of the inspector hook to use elsewhere.It can cause unexpected side effects.It is to be used strictly within that hook
 * 
 * Because there is only one unique visit object,it uses live references to the current interpreter's state.This means that:
 *  -The local exe stack is volatile.
 *  -The 'is' method does not register your callback as a hook.Although that is what it will look like on the outside,its actually eagerly evaluating your callback the moment you call it and check your query against the current node.It will then discard your callback right after.
 *  -The perExecution hook is short lived.It only exists for the current node and all its children
 *  -The execute method must strictly be called within the lifetime of the inspector hook if you ever wish to call it.
 * 
 */
export interface Visit {
    /**
     * You pass in which node you are interested in as the first argument and you pass in your callback as the second.
     * For each node that matches your query,it will fire your callback and allocate a scope object to wrap together with the node under a single event object
     * You can mutate the node or query the scope.
     * 
     * If you dont set a query for a particular node,the interpreter will not allocate a scope nor an event object.This is to save memory.
     * 
     * So for the result matching the node in the execution stack, you will see a symbol called NOT_ALLOCATED. but you can use visit.is('Any',...) to force the interpreter to allocate a scope and event object for every node it visits
     */
    is:<T extends Query>(query:T,ifMatched:(event:EventMap[T])=>void)=>void,

    /** 
     * This is fired for each executed node starting from the current node. The current node at the time when it was set becomes its owner.
     * 
     * After firing for all other related nodes, it will terminate when the interpreter reaches back to the owner. 
     *
     * The hook itself does not get passed anything. But it is a good place to check the local exe stack.
     * By querying for the head element, you get to see the exe result in real time which includes the nodes, the evaluated result and each scope
     * 
     * @deprecated This is a single-slot API. Each assignment overwrites the previous 
     * owner and closure. If a child node sets the hook, it silently replaces the 
     * parent's registration. Similar but safer semantics can be achieved explicitly with 
     * `visit.execute()`. See the migration guide:
     * {@link https://github.com/The-BigMan-tech/fn-monitor/blob/master/examples/migrating-from-perExe.ts}
     * 
     * Will be removed in a future major release
    */
    set perExecution(fn:PerExeFn),

    /**
     * The function that tells the interpreter to execute the current node and return the result.
     * 
     * If its a lazy node like an await call,you get LAZY_NODE instead of the awaited result.You must explicitly type yield visit.execute() to get it.but it requires the inspector to be a generator instead of a regular function
     * 
     * Once you get the result,you can read it or even modify it before it is returned to the caller
     * The interpreter will execute the node manually if you never call it.
     * 
     * There is no way to directly stop the interpreter from executing a node.This is to prevent a half broken state. If required,the inspector hook must throw an error
     */
    execute:()=>unknown | typeof LAZY_NODE,

    /**
     * A live, read-only reference to a stack of the latest evaluated child node results, with indexed access to older entries
     * 
     * The latest results stay at the head and the oldest remain at the tail.
     * 
     * It is a live reference to the current interpreter's state and it is cleared regularly
     * So it should be used on demand and not stored somewhere for use later
     */
    localExeStack:()=>LocalExeStack,
}


export interface ScopeForEvent {
    /**The variables in the scope.You can check for all the local variables or use the search method to get a variable from its identifier.*/
    variables:{
        /**If a variable cannot be identified from the given name,it returns undefined. */
        search:(name: string)=>unknown | undefined,
        local:Record<string,unknown>
    },
    /**The lexical depth of the scope relative to the current running function*/
    depth:number,
    /**a runtime metric representing the current size of the call stack*/
    callDepth:number
};


export interface ExeResult {
    /**The result of the node's evaluation */
    evaluation:unknown,

    /**The type of the node*/

    type:EsNode['type'],
    /**
     * The node itself.Unlike the scope object,the nodes are always allocated.
     * The reality is that the interpreter always allocates a node and a scope object to process each step.
     * But it doesnt openly pass the original scope object because mutating the scope directly isnt as safe as a specific node
     * So it only directly passes the internal node object and allocates a safe scope object that cant be used to mutate the original scope in any way.But it is only selectively allocated
    */
    node:EsNode,
    /**
     *the safe scope created for the caller
     */
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
        callStackDepth:number,
        labels:{
            anchor:string,
            offset:string
        }
    },
    createEventScope: () => ScopeForEvent,
}

export class LangEvent<NodeType extends EsNode = EsNode> {//LangEvent is short for Language Event
    public node:NodeType;
    public scope:ScopeForEvent;

    constructor(interpreter:SvalPlus) {//taking the interpreter directly rather than the node and scope separately,heavily simplifies the constructor per sub class
        this.node = interpreter.reusables.node as NodeType;
        this.scope = interpreter.createEventScope()
    }
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



export function createEvent<T extends Query>(query:Query,interpreter:SvalPlus):EventMap[T]  {
    let event:LangEvent | null = null;
    switch (query) {
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
        case 'Any': default: {
            event = new LangEvent(interpreter);
            break;
        }
    }
    return event as EventMap[T];
}