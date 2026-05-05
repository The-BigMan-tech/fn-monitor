//My library leaves it to the caller's hands to figure out how to get the details of an event but it helps enough to narrow down the nodes with just instanceof checks 
//because of the demand and supply architecture,the script-monitor runs as close to the speed of sval as possible.so the overhead is the interpretation step not necessarily the monitor or sval

import Scope from "./scope/index.ts";
import { Node as EsNode} from "estree";
import { 
    Literal,VariableDeclaration, FunctionDeclaration,

    IfStatement,SwitchStatement,TryStatement,CatchClause,
    
    ReturnStatement,ThrowStatement,

    ForStatement, WhileStatement,DoWhileStatement, ForOfStatement, ForInStatement,

    BreakStatement,ContinueStatement,LabeledStatement,
    
    YieldExpression,BinaryExpression, CallExpression, AssignmentExpression, 
    UpdateExpression, LogicalExpression, MemberExpression,AwaitExpression,FunctionExpression,
    ArrowFunctionExpression,ConditionalExpression,NewExpression,
    ExpressionStatement,ArrayExpression,ObjectExpression,TemplateLiteral,SequenceExpression,UnaryExpression
} from "estree";

import { Var } from "./scope/variable.ts";
import { QList } from "./q-list.ts";

export type Fn = (...args:any[])=>any;

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
    | YieldExpression['type']
    | ExpressionStatement['type']
    | ArrayExpression['type']
    | ObjectExpression['type']
    | TemplateLiteral['type']
    | SequenceExpression['type']
    | UnaryExpression['type']
    | 'Any'; // The fallback / default

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
    Record<YieldExpression['type'],YieldExprEvent> &
    Record<ExpressionStatement['type'],ExpressionStmtEvent> &
    Record<ArrayExpression['type'],ArrayExprEvent> &
    Record<ObjectExpression['type'],ObjectExprEvent> &
    Record<TemplateLiteral['type'],TemplateLiteralEvent> &
    Record<SequenceExpression['type'],SequenceExprEvent> &
    Record<UnaryExpression['type'],UnaryExprEvent> &
    Record<'Any', LangEvent>
);
export const LAZY_NODE = Symbol('LAZY_NODE');
export const UNASSIGNED = Symbol('UNASSIGNED');

type IfMatched<T extends Query> = (event:EventMap[T])=>void;

export type GenExe = Generator<typeof LAZY_NODE,undefined,any>;

export interface Visit {
    is:<T extends Query>(query:T,ifMatched:IfMatched<T>)=>void,
    matched:()=>boolean,
    execute:<T extends any=any>()=>T 
}
export type LangListener = (visit:Visit)=>void | GenExe

export interface ExeResult {
    value:unknown,
    event:LangEvent
}
export interface Reusables {
    node:EsNode | null,
    currentScope:Scope | null,
    handler:null | ((node:EsNode,scope:Scope<SvalPlus>)=>any),
    result:any | typeof UNASSIGNED,
    thrown:any | typeof UNASSIGNED,
    matchedQuery:boolean,
    currentEvent:LangEvent | null,
    exeStack:QList<ExeResult>
    evalStack:number,
}
export interface SvalPlus {
    langListener:LangListener | null,
    reusables:Reusables,
    visit:Visit,
    createEventScope:()=>ScopeForEvent,
}
export interface VariableForEvent {
    value:()=>any
}
export interface ScopeForEvent {
    variables:{
        search:(name: string)=> VariableForEvent | null,
        local:Record<string,Var>
    },
    parent:Scope | null;
    depth:number
}
export class LangEvent<NodeType extends EsNode = EsNode> {
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

export class YieldExprEvent extends LangEvent<YieldExpression> {
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
        case 'YieldExpression': {
            event = new YieldExprEvent(interpreter);
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