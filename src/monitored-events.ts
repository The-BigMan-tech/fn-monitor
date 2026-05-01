//My library leaves it to the caller's hands to figure out how to get the details of an event but it helps enough to narrow down the nodes with just instanceof checks 
//because of the demand and supply architecture,the script-monitor runs as close to the speed of sval as possible.so the overhead is the interpretation step not necessarily the monitor or sval

import Scope from "./scope/index.ts";
import { Node as AcornNode } from "acorn";
import { Node as EsNode} from "estree";
import { 
    Literal ,BinaryExpression, CallExpression, AssignmentExpression, 
    UpdateExpression, LogicalExpression, MemberExpression,
    ReturnStatement,ForStatement, WhileStatement, 
    DoWhileStatement, ForOfStatement, ForInStatement, 
    IfStatement,SwitchStatement,TryStatement,ThrowStatement,CatchClause,
    VariableDeclaration, FunctionDeclaration, AwaitExpression,FunctionExpression,LabeledStatement,
    BreakStatement,ContinueStatement,ArrowFunctionExpression,ConditionalExpression,NewExpression,
    YieldExpression
} from "estree";

import { Var } from "./scope/variable.ts";

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
    | 'Any'; // The fallback / default

export type EventMap = (
    Record<Literal['type'], LiteralEvent> &
    Record<BinaryExpression['type'], BinaryExprEvent> &
    Record<CallExpression['type'], CallExprEvent> &
    Record<AssignmentExpression['type'], AssignExprEvent> &
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
    Record<'Any', LangEvent>
);
export type IfHit<T extends Query> = (event:EventMap[T])=>void;

export interface Visit {
    is:<T extends Query>(query:T,ifHit:IfHit<T>)=>void,
    matched:()=>boolean
}
export interface SvalVisit {
    is:<T extends Query>(query:T,ifHit:IfHit<T>)=>void,
    matched:boolean
}
export interface Reusables {
    svalScope:Scope | null,
    node:EsNode | null
}
export interface SvalPlus {
    langListener:LangListener | null,
    reusables:Reusables,
    svalVisit:SvalVisit,
    visit:Visit,
    scopeForEvent:ScopeForEvent,
}
export type LangListener = (visit:Visit)=>void;

export interface VariableForEvent {
    value:()=>any
}
export interface ScopeForEvent {
    variables:{
        search:(name: string)=> VariableForEvent | null,
        local:()=>Record<string,Var>
    }
    depth:()=>number
}
export class LangEvent<NodeType extends EsNode = EsNode> {
    public node:NodeType;
    public scope:ScopeForEvent;

    constructor(node:NodeType,scope:ScopeForEvent) {
        this.node = node;
        this.scope = scope;
    }
}
export class BinaryExprEvent extends LangEvent<BinaryExpression> {
    constructor(node: BinaryExpression,scope:ScopeForEvent) { super(node,scope) }
}
// Expressions
export class CallExprEvent extends LangEvent<CallExpression> {
    constructor(node: CallExpression, scope: ScopeForEvent) { super(node, scope) }
}
export class AssignExprEvent extends LangEvent<AssignmentExpression> {
    constructor(node: AssignmentExpression, scope: ScopeForEvent) { super(node, scope) }
}
export class UpdateExprEvent extends LangEvent<UpdateExpression> {
    constructor(node: UpdateExpression, scope: ScopeForEvent) { super(node, scope) }
}
export class LogicalExprEvent extends LangEvent<LogicalExpression> {
    constructor(node: LogicalExpression, scope: ScopeForEvent) { super(node, scope) }
}
export class MemberExprEvent extends LangEvent<MemberExpression> {
    constructor(node: MemberExpression, scope: ScopeForEvent) { super(node, scope) }
}
export class AwaitExprEvent extends LangEvent<AwaitExpression> {
    constructor(node: AwaitExpression, scope: ScopeForEvent) { super(node, scope) }
}
export class FuncExprEvent extends LangEvent<FunctionExpression> {
    constructor(node: FunctionExpression, scope: ScopeForEvent) { super(node, scope) }
}
export class ArrowFnExprEvent extends LangEvent<ArrowFunctionExpression> {
    constructor(node:ArrowFunctionExpression, scope: ScopeForEvent) { super(node, scope) }
}
export class TernaryExprEvent extends LangEvent<ConditionalExpression> {
    constructor(node:ConditionalExpression, scope: ScopeForEvent) { super(node, scope) }
}
export class NewExprEvent extends LangEvent<NewExpression> {
    constructor(node:NewExpression, scope: ScopeForEvent) { super(node, scope) }
}
export class YieldExprEvent extends LangEvent<YieldExpression> {
    constructor(node:YieldExpression, scope: ScopeForEvent) { super(node, scope) }
}

// Statements & Control Flow
export class ReturnStmtEvent extends LangEvent<ReturnStatement> {
    constructor(node: ReturnStatement, scope: ScopeForEvent) { super(node, scope) }
}
export class IfStmtEvent extends LangEvent<IfStatement> {
    constructor(node: IfStatement, scope: ScopeForEvent) { super(node, scope) }
}
export class SwitchStmtEvent extends LangEvent<SwitchStatement> {
    constructor(node: SwitchStatement, scope: ScopeForEvent) { super(node, scope) }
}
export class ThrowStmtEvent extends LangEvent<ThrowStatement> {
    constructor(node: ThrowStatement, scope: ScopeForEvent) { super(node, scope) }
}
export class TryStmtEvent extends LangEvent<TryStatement> {
    constructor(node: TryStatement, scope: ScopeForEvent) { super(node, scope) }
}
export class CatchClauseEvent extends LangEvent<CatchClause> {
    constructor(node: CatchClause, scope: ScopeForEvent) { super(node, scope) }
}

// Declarations
export class VarDeclEvent extends LangEvent<VariableDeclaration> {
    constructor(node: VariableDeclaration, scope: ScopeForEvent) { super(node, scope) }
}
export class FuncDeclEvent extends LangEvent<FunctionDeclaration> {
    constructor(node: FunctionDeclaration, scope: ScopeForEvent) { super(node, scope) }
}

// Iteration
export class ForStmtEvent extends LangEvent<ForStatement> {
    constructor(node: ForStatement, scope: ScopeForEvent) { super(node, scope) }
}
export class WhileStmtEvent extends LangEvent<WhileStatement> {
    constructor(node: WhileStatement, scope: ScopeForEvent) { super(node, scope) }
}
export class DoWhileStmtEvent extends LangEvent<DoWhileStatement> {
    constructor(node: DoWhileStatement, scope: ScopeForEvent) { super(node, scope) }
}
export class ForOfStmtEvent extends LangEvent<ForOfStatement> {
    constructor(node: ForOfStatement, scope: ScopeForEvent) { super(node, scope) }
}
export class ForInStmtEvent extends LangEvent<ForInStatement> {
    constructor(node: ForInStatement, scope: ScopeForEvent) { super(node, scope) }
}
export class LabeledStmtEvent extends LangEvent<LabeledStatement> {
    constructor(node:LabeledStatement, scope: ScopeForEvent) { super(node, scope) }
}
export class BreakStmtEvent extends LangEvent<BreakStatement> {
    constructor(node:BreakStatement, scope: ScopeForEvent) { super(node, scope) }
}
export class ContinueStmtEvent extends LangEvent<ContinueStatement> {
    constructor(node:ContinueStatement, scope: ScopeForEvent) { super(node, scope) }
}
// Data
export class LiteralEvent extends LangEvent<Literal> {
    constructor(node: Literal, scope: ScopeForEvent) { super(node, scope) }
}


export function callMonitor(acornNode:AcornNode,svalScope:Scope<SvalPlus>) {
    const interpreter = svalScope.interpreter;
    if (!interpreter) return;//this is unlikely to happen since its preserved from parent to children scopes
    
    const atRoot = !svalScope.hasParent();
    if (atRoot) {
        return;//we dont want to track any action thats not inside the monitored function
    }
    if (interpreter.langListener) {
        try {
            interpreter.reusables.svalScope = svalScope;
            interpreter.reusables.node = acornNode as EsNode
            interpreter.langListener(interpreter.visit);
        }finally {
            interpreter.reusables.node = null;
            interpreter.reusables.svalScope = null;
            interpreter.svalVisit.matched = false;
        }
    }
}
export function createEvent<T extends Query>(query:Query,node:EsNode,scope:ScopeForEvent):EventMap[T]  {
    let event:LangEvent | null = null;
    switch (query) {
        case 'BinaryExpression': {
            event = new BinaryExprEvent(node as BinaryExpression, scope);
            break;
        }
        case 'CallExpression': {
            event = new CallExprEvent(node as CallExpression, scope);
            break;
        }
        case 'AssignmentExpression': {
            event = new AssignExprEvent(node as AssignmentExpression, scope);
            break;
        }
        case 'UpdateExpression': {
            event = new UpdateExprEvent(node as UpdateExpression, scope);
            break;
        }
        case 'LogicalExpression': {
            event = new LogicalExprEvent(node as LogicalExpression, scope);
            break;
        }
        case 'MemberExpression': {
            event = new MemberExprEvent(node as MemberExpression, scope);
            break;
        }
        case 'AwaitExpression': {
            event = new AwaitExprEvent(node as AwaitExpression, scope);
            break;
        }
        case 'FunctionExpression': {
            event = new FuncExprEvent(node as FunctionExpression, scope);
            break;
        }
        case 'ReturnStatement': {
            event = new ReturnStmtEvent(node as ReturnStatement, scope);
            break;
        }
        case 'IfStatement': {
            event = new IfStmtEvent(node as IfStatement, scope);
            break;
        }
        case 'SwitchStatement': {
            event = new SwitchStmtEvent(node as SwitchStatement, scope);
            break;
        }
        case 'ThrowStatement': {
            event = new ThrowStmtEvent(node as ThrowStatement, scope);
            break;
        }
        case 'TryStatement': {
            event = new TryStmtEvent(node as TryStatement, scope);
            break;
        }
        case 'CatchClause': {
            event = new CatchClauseEvent(node as CatchClause, scope);
            break;
        }
        case 'VariableDeclaration': {
            event = new VarDeclEvent(node as VariableDeclaration, scope);
            break;
        }
        case 'FunctionDeclaration': {
            event = new FuncDeclEvent(node as FunctionDeclaration, scope);
            break;
        }
        case 'ForStatement': {
            event = new ForStmtEvent(node as ForStatement, scope);
            break;
        }
        case 'WhileStatement': {
            event = new WhileStmtEvent(node as WhileStatement, scope);
            break;
        }
        case 'DoWhileStatement': {
            event = new DoWhileStmtEvent(node as DoWhileStatement, scope);
            break;
        }
        case 'ForOfStatement': {
            event = new ForOfStmtEvent(node as ForOfStatement, scope);
            break;
        }
        case 'ForInStatement': {
            event = new ForInStmtEvent(node as ForInStatement, scope);
            break;
        }
        case 'Literal': {
            event = new LiteralEvent(node as Literal, scope);
            break;
        }
        case 'LabeledStatement': {
            event = new LabeledStmtEvent(node as LabeledStatement, scope);
            break;
        }
        case 'BreakStatement': {
            event = new BreakStmtEvent(node as BreakStatement, scope);
            break;
        }
        case 'ContinueStatement': {
            event = new ContinueStmtEvent(node as ContinueStatement, scope);
            break;
        }
        case 'NewExpression': {
            event = new NewExprEvent(node as NewExpression, scope);
            break;
        }
        case 'ArrowFunctionExpression': {
            event = new ArrowFnExprEvent(node as ArrowFunctionExpression, scope);
            break;
        }
        case 'ConditionalExpression': {
            event = new TernaryExprEvent(node as ConditionalExpression, scope);
            break;
        }
        case 'YieldExpression': {
            event = new YieldExprEvent(node as YieldExpression, scope);
            break;
        }
        case 'Any': default: {
            event = new LangEvent(node,scope);
            break;
        }
    }
    return event as EventMap[T];
}