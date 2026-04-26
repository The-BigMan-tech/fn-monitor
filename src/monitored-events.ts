import Scope from "./scope/index.ts";
import { Node } from "acorn";
import { Node as ESTreeNode} from "estree";
import { 
    Literal ,BinaryExpression, CallExpression, AssignmentExpression, 
    UpdateExpression, LogicalExpression, MemberExpression, 
    ReturnStatement,ForStatement, WhileStatement, 
    DoWhileStatement, ForOfStatement, ForInStatement, 
    IfStatement,SwitchStatement,TryStatement,ThrowStatement,CatchClause,
    VariableDeclaration, FunctionDeclaration, AwaitExpression,FunctionExpression
} from "estree";

//My library leaves it to the caller's hands to figure out how to get the details of an event but it helps enough to narrow down the nodes with just instanceof checks 

export type LangListener = (event:LangEvent)=>void;

export interface VariableForEvent {
    value:()=>any
}
export interface ScopeForEvent {
    find:(name: string)=> VariableForEvent | null
}
export class LangEvent<NodeType=ESTreeNode> {
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

// Data
export class LiteralEvent extends LangEvent<Literal> {
    constructor(node: Literal, scope: ScopeForEvent) { super(node, scope) }
}
export function callListener(acornNode:Node,acornScope:Scope<{langListener:LangListener | null}>) {
    const interpreter = acornScope.interpreter;
    const node = acornNode as ESTreeNode;

    if (!acornScope.hasParent()) {
        return;//we dont want to track any action thats not inside the monitored function
    }
    if (interpreter && interpreter.langListener) {
        let event:LangEvent;
        const scope:ScopeForEvent = {
            find:(name:string):VariableForEvent | null =>{
                const variable = acornScope.find(name);
                if (variable === null) return null;
                return {
                    value:()=>variable.get()
                }
            }
        }
        switch (node.type) {
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
            default: {
                event = new LangEvent(node, scope);
                break;
            }
        }
        interpreter.langListener(event)
    }
}