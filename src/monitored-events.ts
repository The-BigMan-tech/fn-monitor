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
    defersForNode:DeferredFn[];
}
export type LangListener = (visit:Visit)=>void;

export interface VariableForEvent {
    value:()=>any
}
export interface ScopeForEvent {
    variables:{
        search:(name: string)=> VariableForEvent | null,
        local:()=>Record<string,Var>
    },
    parent:()=>Scope | null;
    depth:()=>number
}
export class LangEvent<NodeType extends EsNode = EsNode> {
    public node:NodeType;
    public scope:ScopeForEvent;
    #interpreter:SvalPlus 

    constructor(node:NodeType,scope:ScopeForEvent,interpreter:SvalPlus) {
        this.node = node;
        this.scope = scope;
        this.#interpreter = interpreter;
    }
    public defer(cb:DeferredFn) {
        this.#interpreter.defersForNode.push(cb);
    }
}
export type DeferredFn = (result:unknown)=>void;

// Expressions
export class BinaryExprEvent extends LangEvent<BinaryExpression> {
    constructor(node: BinaryExpression, scope: ScopeForEvent, interpreter: SvalPlus) { 
        super(node, scope, interpreter); 
    }
}

export class CallExprEvent extends LangEvent<CallExpression> {
    constructor(node: CallExpression, scope: ScopeForEvent, interpreter: SvalPlus) { 
        super(node, scope, interpreter); 
    }
}

export class AssignExprEvent extends LangEvent<AssignmentExpression> {
    constructor(node: AssignmentExpression, scope: ScopeForEvent, interpreter: SvalPlus) { 
        super(node, scope, interpreter); 
    }
}

export class UpdateExprEvent extends LangEvent<UpdateExpression> {
    constructor(node: UpdateExpression, scope: ScopeForEvent, interpreter: SvalPlus) { 
        super(node, scope, interpreter); 
    }
}

export class LogicalExprEvent extends LangEvent<LogicalExpression> {
    constructor(node: LogicalExpression, scope: ScopeForEvent, interpreter: SvalPlus) { 
        super(node, scope, interpreter); 
    }
}

export class MemberExprEvent extends LangEvent<MemberExpression> {
    constructor(node: MemberExpression, scope: ScopeForEvent, interpreter: SvalPlus) { 
        super(node, scope, interpreter); 
    }
}

export class AwaitExprEvent extends LangEvent<AwaitExpression> {
    constructor(node: AwaitExpression, scope: ScopeForEvent, interpreter: SvalPlus) { 
        super(node, scope, interpreter); 
    }
}

export class FuncExprEvent extends LangEvent<FunctionExpression> {
    constructor(node: FunctionExpression, scope: ScopeForEvent, interpreter: SvalPlus) { 
        super(node, scope, interpreter); 
    }
}

export class ArrowFnExprEvent extends LangEvent<ArrowFunctionExpression> {
    constructor(node: ArrowFunctionExpression, scope: ScopeForEvent, interpreter: SvalPlus) { 
        super(node, scope, interpreter); 
    }
}

export class TernaryExprEvent extends LangEvent<ConditionalExpression> {
    constructor(node: ConditionalExpression, scope: ScopeForEvent, interpreter: SvalPlus) { 
        super(node, scope, interpreter); 
    }
}

export class NewExprEvent extends LangEvent<NewExpression> {
    constructor(node: NewExpression, scope: ScopeForEvent, interpreter: SvalPlus) { 
        super(node, scope, interpreter); 
    }
}

export class YieldExprEvent extends LangEvent<YieldExpression> {
    constructor(node: YieldExpression, scope: ScopeForEvent, interpreter: SvalPlus) { 
        super(node, scope, interpreter); 
    }
}

// Statements & Control Flow
export class ReturnStmtEvent extends LangEvent<ReturnStatement> {
    constructor(node: ReturnStatement, scope: ScopeForEvent, interpreter: SvalPlus) { 
        super(node, scope, interpreter); 
    }
}

export class IfStmtEvent extends LangEvent<IfStatement> {
    constructor(node: IfStatement, scope: ScopeForEvent, interpreter: SvalPlus) { 
        super(node, scope, interpreter); 
    }
}

export class SwitchStmtEvent extends LangEvent<SwitchStatement> {
    constructor(node: SwitchStatement, scope: ScopeForEvent, interpreter: SvalPlus) { 
        super(node, scope, interpreter); 
    }
}

export class ThrowStmtEvent extends LangEvent<ThrowStatement> {
    constructor(node: ThrowStatement, scope: ScopeForEvent, interpreter: SvalPlus) { 
        super(node, scope, interpreter); 
    }
}

export class TryStmtEvent extends LangEvent<TryStatement> {
    constructor(node: TryStatement, scope: ScopeForEvent, interpreter: SvalPlus) { 
        super(node, scope, interpreter); 
    }
}

export class CatchClauseEvent extends LangEvent<CatchClause> {
    constructor(node: CatchClause, scope: ScopeForEvent, interpreter: SvalPlus) { 
        super(node, scope, interpreter); 
    }
}

// Declarations
export class VarDeclEvent extends LangEvent<VariableDeclaration> {
    constructor(node: VariableDeclaration, scope: ScopeForEvent, interpreter: SvalPlus) { 
        super(node, scope, interpreter); 
    }
}

export class FuncDeclEvent extends LangEvent<FunctionDeclaration> {
    constructor(node: FunctionDeclaration, scope: ScopeForEvent, interpreter: SvalPlus) { 
        super(node, scope, interpreter); 
    }
}

// Iteration
export class ForStmtEvent extends LangEvent<ForStatement> {
    constructor(node: ForStatement, scope: ScopeForEvent, interpreter: SvalPlus) { 
        super(node, scope, interpreter); 
    }
}

export class WhileStmtEvent extends LangEvent<WhileStatement> {
    constructor(node: WhileStatement, scope: ScopeForEvent, interpreter: SvalPlus) { 
        super(node, scope, interpreter); 
    }
}

export class DoWhileStmtEvent extends LangEvent<DoWhileStatement> {
    constructor(node: DoWhileStatement, scope: ScopeForEvent, interpreter: SvalPlus) { 
        super(node, scope, interpreter); 
    }
}

export class ForOfStmtEvent extends LangEvent<ForOfStatement> {
    constructor(node: ForOfStatement, scope: ScopeForEvent, interpreter: SvalPlus) { 
        super(node, scope, interpreter); 
    }
}

export class ForInStmtEvent extends LangEvent<ForInStatement> {
    constructor(node: ForInStatement, scope: ScopeForEvent, interpreter: SvalPlus) { 
        super(node, scope, interpreter); 
    }
}

export class LabeledStmtEvent extends LangEvent<LabeledStatement> {
    constructor(node: LabeledStatement, scope: ScopeForEvent, interpreter: SvalPlus) { 
        super(node, scope, interpreter); 
    }
}

export class BreakStmtEvent extends LangEvent<BreakStatement> {
    constructor(node: BreakStatement, scope: ScopeForEvent, interpreter: SvalPlus) { 
        super(node, scope, interpreter); 
    }
}

export class ContinueStmtEvent extends LangEvent<ContinueStatement> {
    constructor(node: ContinueStatement, scope: ScopeForEvent, interpreter: SvalPlus) { 
        super(node, scope, interpreter); 
    }
}

// Data
export class LiteralEvent extends LangEvent<Literal> {
    constructor(node: Literal, scope: ScopeForEvent, interpreter: SvalPlus) { 
        super(node, scope, interpreter); 
    }
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
export function createEvent<T extends Query>(query:Query,node:EsNode,interpreter:SvalPlus):EventMap[T]  {
    let event:LangEvent | null = null;
    switch (query) {
        case 'BinaryExpression': {
            event = new BinaryExprEvent(node as BinaryExpression, interpreter.scopeForEvent, interpreter);
            break;
        }
        case 'CallExpression': {
            event = new CallExprEvent(node as CallExpression, interpreter.scopeForEvent, interpreter);
            break;
        }
        case 'AssignmentExpression': {
            event = new AssignExprEvent(node as AssignmentExpression, interpreter.scopeForEvent, interpreter);
            break;
        }
        case 'UpdateExpression': {
            event = new UpdateExprEvent(node as UpdateExpression, interpreter.scopeForEvent, interpreter);
            break;
        }
        case 'LogicalExpression': {
            event = new LogicalExprEvent(node as LogicalExpression, interpreter.scopeForEvent, interpreter);
            break;
        }
        case 'MemberExpression': {
            event = new MemberExprEvent(node as MemberExpression, interpreter.scopeForEvent, interpreter);
            break;
        }
        case 'AwaitExpression': {
            event = new AwaitExprEvent(node as AwaitExpression, interpreter.scopeForEvent, interpreter);
            break;
        }
        case 'FunctionExpression': {
            event = new FuncExprEvent(node as FunctionExpression, interpreter.scopeForEvent, interpreter);
            break;
        }
        case 'ReturnStatement': {
            event = new ReturnStmtEvent(node as ReturnStatement, interpreter.scopeForEvent, interpreter);
            break;
        }
        case 'IfStatement': {
            event = new IfStmtEvent(node as IfStatement, interpreter.scopeForEvent, interpreter);
            break;
        }
        case 'SwitchStatement': {
            event = new SwitchStmtEvent(node as SwitchStatement, interpreter.scopeForEvent, interpreter);
            break;
        }
        case 'ThrowStatement': {
            event = new ThrowStmtEvent(node as ThrowStatement, interpreter.scopeForEvent, interpreter);
            break;
        }
        case 'TryStatement': {
            event = new TryStmtEvent(node as TryStatement, interpreter.scopeForEvent, interpreter);
            break;
        }
        case 'CatchClause': {
            event = new CatchClauseEvent(node as CatchClause, interpreter.scopeForEvent, interpreter);
            break;
        }
        case 'VariableDeclaration': {
            event = new VarDeclEvent(node as VariableDeclaration, interpreter.scopeForEvent, interpreter);
            break;
        }
        case 'FunctionDeclaration': {
            event = new FuncDeclEvent(node as FunctionDeclaration, interpreter.scopeForEvent, interpreter);
            break;
        }
        case 'ForStatement': {
            event = new ForStmtEvent(node as ForStatement, interpreter.scopeForEvent, interpreter);
            break;
        }
        case 'WhileStatement': {
            event = new WhileStmtEvent(node as WhileStatement, interpreter.scopeForEvent, interpreter);
            break;
        }
        case 'DoWhileStatement': {
            event = new DoWhileStmtEvent(node as DoWhileStatement, interpreter.scopeForEvent, interpreter);
            break;
        }
        case 'ForOfStatement': {
            event = new ForOfStmtEvent(node as ForOfStatement, interpreter.scopeForEvent, interpreter);
            break;
        }
        case 'ForInStatement': {
            event = new ForInStmtEvent(node as ForInStatement, interpreter.scopeForEvent, interpreter);
            break;
        }
        case 'Literal': {
            event = new LiteralEvent(node as Literal, interpreter.scopeForEvent, interpreter);
            break;
        }
        case 'LabeledStatement': {
            event = new LabeledStmtEvent(node as LabeledStatement, interpreter.scopeForEvent, interpreter);
            break;
        }
        case 'BreakStatement': {
            event = new BreakStmtEvent(node as BreakStatement, interpreter.scopeForEvent, interpreter);
            break;
        }
        case 'ContinueStatement': {
            event = new ContinueStmtEvent(node as ContinueStatement, interpreter.scopeForEvent, interpreter);
            break;
        }
        case 'NewExpression': {
            event = new NewExprEvent(node as NewExpression, interpreter.scopeForEvent, interpreter);
            break;
        }
        case 'ArrowFunctionExpression': {
            event = new ArrowFnExprEvent(node as ArrowFunctionExpression, interpreter.scopeForEvent, interpreter);
            break;
        }
        case 'ConditionalExpression': {
            event = new TernaryExprEvent(node as ConditionalExpression, interpreter.scopeForEvent, interpreter);
            break;
        }
        case 'YieldExpression': {
            event = new YieldExprEvent(node as YieldExpression, interpreter.scopeForEvent, interpreter);
            break;
        }
        case 'Any': default: {
            event = new LangEvent(node, interpreter.scopeForEvent, interpreter);
            break;
        }
    }
    return event as EventMap[T];
}