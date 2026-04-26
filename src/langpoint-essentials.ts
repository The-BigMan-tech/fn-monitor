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

export function callListener(acornNode:Node,acornScope:Scope<{langListener:LangListener | null}>) {
    const interpreter = acornScope.interpreter;
    const node = acornNode as ESTreeNode;

    if (!acornScope.hasParent()) {
        return;//we dont want to track any action thats not inside the function marked with a langpoint
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
        switch(node.type) {
            case 'BinaryExpression':{
                event = new BinaryExprEvent(node as BinaryExpression,scope);
                break;
            }
            default:{
                event = new LangEvent(node,scope);
                break;
            }
        }
        interpreter.langListener(event)
    }
}