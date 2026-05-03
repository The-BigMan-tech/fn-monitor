//My library leaves it to the caller's hands to figure out how to get the details of an event but it helps enough to narrow down the nodes with just instanceof checks 
//because of the demand and supply architecture,the script-monitor runs as close to the speed of sval as possible.so the overhead is the interpretation step not necessarily the monitor or sval

import Scope from "./scope/index.ts";
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

export interface SvalVisit {
    is:<T extends Query>(query:T,ifMatched:IfMatched<T>)=>void,
    matched:boolean
}
export interface Reusables {
    evalStack:number,
    svalScope:Scope | null,
    node:EsNode | null,
    result:any | typeof UNASSIGNED,
    thrown:any | typeof UNASSIGNED,
    handler:null | ((node:EsNode,scope:Scope<SvalPlus>)=>any)
}
export interface SvalPlus {
    langListener:LangListener | null,
    reusables:Reusables,
    svalVisit:SvalVisit,
    visit:Visit,
    scopeForEvent:ScopeForEvent,
}
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

    constructor(node:NodeType,interpreter:SvalPlus) {
        this.node = node;
        this.scope = interpreter.scopeForEvent;
    }
}
// Expressions
export class BinaryExprEvent extends LangEvent<BinaryExpression> {
    constructor(node: BinaryExpression,interpreter: SvalPlus) { 
        super(node,interpreter); 
    }
}

export class CallExprEvent extends LangEvent<CallExpression> {
    constructor(node: CallExpression,interpreter: SvalPlus) { 
        super(node,interpreter); 
    }
}

export class AssignExprEvent extends LangEvent<AssignmentExpression> {
    constructor(node: AssignmentExpression,interpreter: SvalPlus) { 
        super(node,interpreter); 
    }
}

export class UpdateExprEvent extends LangEvent<UpdateExpression> {
    constructor(node: UpdateExpression,interpreter: SvalPlus) { 
        super(node,interpreter); 
    }
}

export class LogicalExprEvent extends LangEvent<LogicalExpression> {
    constructor(node: LogicalExpression,interpreter: SvalPlus) { 
        super(node,interpreter); 
    }
}

export class MemberExprEvent extends LangEvent<MemberExpression> {
    constructor(node: MemberExpression,interpreter: SvalPlus) { 
        super(node,interpreter); 
    }
}

export class AwaitExprEvent extends LangEvent<AwaitExpression> {
    constructor(node: AwaitExpression, interpreter: SvalPlus) { 
        super(node,interpreter); 
    }
}

export class FuncExprEvent extends LangEvent<FunctionExpression> {
    constructor(node: FunctionExpression,interpreter: SvalPlus) { 
        super(node,interpreter); 
    }
}

export class ArrowFnExprEvent extends LangEvent<ArrowFunctionExpression> {
    constructor(node: ArrowFunctionExpression,interpreter: SvalPlus) { 
        super(node,interpreter); 
    }
}

export class TernaryExprEvent extends LangEvent<ConditionalExpression> {
    constructor(node: ConditionalExpression,interpreter: SvalPlus) { 
        super(node,interpreter); 
    }
}

export class NewExprEvent extends LangEvent<NewExpression> {
    constructor(node: NewExpression,interpreter: SvalPlus) { 
        super(node,interpreter); 
    }
}

export class YieldExprEvent extends LangEvent<YieldExpression> {
    constructor(node: YieldExpression,interpreter: SvalPlus) { 
        super(node,interpreter); 
    }
}

// Statements & Control Flow
export class ReturnStmtEvent extends LangEvent<ReturnStatement> {
    constructor(node: ReturnStatement,interpreter: SvalPlus) { 
        super(node,interpreter); 
    }
}

export class IfStmtEvent extends LangEvent<IfStatement> {
    constructor(node: IfStatement,interpreter: SvalPlus) { 
        super(node,interpreter); 
    }
}

export class SwitchStmtEvent extends LangEvent<SwitchStatement> {
    constructor(node: SwitchStatement,interpreter: SvalPlus) { 
        super(node,interpreter); 
    }
}

export class ThrowStmtEvent extends LangEvent<ThrowStatement> {
    constructor(node: ThrowStatement,interpreter: SvalPlus) { 
        super(node,interpreter); 
    }
}

export class TryStmtEvent extends LangEvent<TryStatement> {
    constructor(node: TryStatement,interpreter: SvalPlus) { 
        super(node,interpreter); 
    }
}

export class CatchClauseEvent extends LangEvent<CatchClause> {
    constructor(node: CatchClause,interpreter: SvalPlus) { 
        super(node,interpreter); 
    }
}

// Declarations
export class VarDeclEvent extends LangEvent<VariableDeclaration> {
    constructor(node: VariableDeclaration,interpreter: SvalPlus) { 
        super(node,interpreter); 
    }
}

export class FuncDeclEvent extends LangEvent<FunctionDeclaration> {
    constructor(node: FunctionDeclaration,interpreter: SvalPlus) { 
        super(node,interpreter); 
    }
}

// Iteration
export class ForStmtEvent extends LangEvent<ForStatement> {
    constructor(node: ForStatement,interpreter: SvalPlus) { 
        super(node,interpreter); 
    }
}

export class WhileStmtEvent extends LangEvent<WhileStatement> {
    constructor(node: WhileStatement,interpreter: SvalPlus) { 
        super(node,interpreter); 
    }
}

export class DoWhileStmtEvent extends LangEvent<DoWhileStatement> {
    constructor(node: DoWhileStatement,interpreter: SvalPlus) { 
        super(node, interpreter); 
    }
}

export class ForOfStmtEvent extends LangEvent<ForOfStatement> {
    constructor(node: ForOfStatement, interpreter: SvalPlus) { 
        super(node, interpreter); 
    }
}

export class ForInStmtEvent extends LangEvent<ForInStatement> {
    constructor(node: ForInStatement, interpreter: SvalPlus) { 
        super(node,interpreter); 
    }
}

export class LabeledStmtEvent extends LangEvent<LabeledStatement> {
    constructor(node: LabeledStatement,interpreter: SvalPlus) { 
        super(node,interpreter); 
    }
}

export class BreakStmtEvent extends LangEvent<BreakStatement> {
    constructor(node: BreakStatement, interpreter: SvalPlus) { 
        super(node,interpreter); 
    }
}

export class ContinueStmtEvent extends LangEvent<ContinueStatement> {
    constructor(node: ContinueStatement,interpreter: SvalPlus) { 
        super(node,interpreter); 
    }
}

// Data
export class LiteralEvent extends LangEvent<Literal> {
    constructor(node: Literal,interpreter: SvalPlus) { 
        super(node,interpreter); 
    }
}
export function createEvent<T extends Query>(query:Query,node:EsNode,interpreter:SvalPlus):EventMap[T]  {
    let event:LangEvent | null = null;
    switch (query) {
        case 'BinaryExpression': {
            event = new BinaryExprEvent(node as BinaryExpression,interpreter);
            break;
        }
        case 'CallExpression': {
            event = new CallExprEvent(node as CallExpression,interpreter);
            break;
        }
        case 'AssignmentExpression': {
            event = new AssignExprEvent(node as AssignmentExpression,interpreter);
            break;
        }
        case 'UpdateExpression': {
            event = new UpdateExprEvent(node as UpdateExpression,interpreter);
            break;
        }
        case 'LogicalExpression': {
            event = new LogicalExprEvent(node as LogicalExpression,interpreter);
            break;
        }
        case 'MemberExpression': {
            event = new MemberExprEvent(node as MemberExpression,interpreter);
            break;
        }
        case 'AwaitExpression': {
            event = new AwaitExprEvent(node as AwaitExpression,interpreter);
            break;
        }
        case 'FunctionExpression': {
            event = new FuncExprEvent(node as FunctionExpression, interpreter);
            break;
        }
        case 'ReturnStatement': {
            event = new ReturnStmtEvent(node as ReturnStatement,interpreter);
            break;
        }
        case 'IfStatement': {
            event = new IfStmtEvent(node as IfStatement,interpreter);
            break;
        }
        case 'SwitchStatement': {
            event = new SwitchStmtEvent(node as SwitchStatement,interpreter);
            break;
        }
        case 'ThrowStatement': {
            event = new ThrowStmtEvent(node as ThrowStatement,interpreter);
            break;
        }
        case 'TryStatement': {
            event = new TryStmtEvent(node as TryStatement,interpreter);
            break;
        }
        case 'CatchClause': {
            event = new CatchClauseEvent(node as CatchClause,interpreter);
            break;
        }
        case 'VariableDeclaration': {
            event = new VarDeclEvent(node as VariableDeclaration, interpreter);
            break;
        }
        case 'FunctionDeclaration': {
            event = new FuncDeclEvent(node as FunctionDeclaration, interpreter);
            break;
        }
        case 'ForStatement': {
            event = new ForStmtEvent(node as ForStatement, interpreter);
            break;
        }
        case 'WhileStatement': {
            event = new WhileStmtEvent(node as WhileStatement,interpreter);
            break;
        }
        case 'DoWhileStatement': {
            event = new DoWhileStmtEvent(node as DoWhileStatement, interpreter);
            break;
        }
        case 'ForOfStatement': {
            event = new ForOfStmtEvent(node as ForOfStatement,interpreter);
            break;
        }
        case 'ForInStatement': {
            event = new ForInStmtEvent(node as ForInStatement, interpreter);
            break;
        }
        case 'Literal': {
            event = new LiteralEvent(node as Literal,interpreter);
            break;
        }
        case 'LabeledStatement': {
            event = new LabeledStmtEvent(node as LabeledStatement,interpreter);
            break;
        }
        case 'BreakStatement': {
            event = new BreakStmtEvent(node as BreakStatement,interpreter);
            break;
        }
        case 'ContinueStatement': {
            event = new ContinueStmtEvent(node as ContinueStatement,interpreter);
            break;
        }
        case 'NewExpression': {
            event = new NewExprEvent(node as NewExpression,interpreter);
            break;
        }
        case 'ArrowFunctionExpression': {
            event = new ArrowFnExprEvent(node as ArrowFunctionExpression,interpreter);
            break;
        }
        case 'ConditionalExpression': {
            event = new TernaryExprEvent(node as ConditionalExpression,interpreter);
            break;
        }
        case 'YieldExpression': {
            event = new YieldExprEvent(node as YieldExpression,interpreter);
            break;
        }
        case 'Any': default: {
            event = new LangEvent(node,interpreter);
            break;
        }
    }
    return event as EventMap[T];
}