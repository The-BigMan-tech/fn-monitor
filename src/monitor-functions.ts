import { Node as AcornNode } from "acorn";
import Scope from "./scope/index.ts";
import {Node as EsNode} from "estree";
import { UNASSIGNED,SvalPlus,Reusables, Fn } from "./monitored-events.ts";

interface PrevValues extends Reusables {
    evalStack:0,
    matched:boolean
}
export function isGenerator (obj:unknown):obj is Generator {
    return Object.prototype.toString.call(obj) === '[object Generator]';
}
export const LAZY_NODE = Symbol('LAZY_NODE');

export function handleResult(node:AcornNode,scope:Scope,handler:any) {
    if (handler) {
        const interpreter:SvalPlus = scope.interpreter;
        if (interpreter.reusables.thrown !== UNASSIGNED) {
            throw interpreter.reusables.thrown;
        }else {
            return (interpreter.reusables.result !== UNASSIGNED)
                ?interpreter.reusables.result
                :handler(node,scope);//if the listener doesnt explicitly execute the node,the interpreter will do it implicitly
        }
    } 
    else throw new Error(`${node.type} isn't implemented`)
}
export function* handleResultGen(node: AcornNode, scope: Scope, handler: any) {
    if (handler) {
        const interpreter: SvalPlus = scope.interpreter;
        if (interpreter.reusables.thrown !== UNASSIGNED) {
            throw interpreter.reusables.thrown;
        }else {
            return (interpreter.reusables.result !== UNASSIGNED)
                ? yield* interpreter.reusables.result
                : yield* handler(node, scope); 
        }
    } 
    else throw new Error(`${node.type} isn't implemented`);
}
export function callMonitor(acornNode:AcornNode,svalScope:Scope<SvalPlus>,handler:Reusables['handler']) {
    const interpreter = svalScope.interpreter;
    if (!interpreter) return;//this is unlikely to happen since its preserved from parent to children scopes
    
    const atRoot = !svalScope.hasParent();
    if (atRoot) {
        return;//we dont want to track any action thats not inside the monitored function
    }
    if (interpreter.langListener) {
        interpreter.reusables.svalScope = svalScope;
        interpreter.reusables.node = acornNode as EsNode;
        interpreter.reusables.handler = handler;
        interpreter.svalVisit.matched = false;
        interpreter.reusables.result = UNASSIGNED;
        interpreter.reusables.thrown = UNASSIGNED;
        interpreter.langListener(interpreter.visit);
    }
}
export function clearEvalStack(interpreter:SvalPlus) {
    interpreter.reusables.node = null;
    interpreter.reusables.svalScope = null;
    interpreter.reusables.handler = null;
    interpreter.reusables.result = UNASSIGNED;
    interpreter.reusables.thrown = UNASSIGNED;
    interpreter.svalVisit.matched = false;
}
export function restorePrevReusables(interpreter:SvalPlus,prevReusables:PrevValues) {
    interpreter.reusables.node = prevReusables.node;
    interpreter.reusables.svalScope = prevReusables.svalScope;
    interpreter.reusables.handler = prevReusables.handler;
    interpreter.reusables.result = prevReusables.result;
    interpreter.reusables.thrown = prevReusables.thrown;
    interpreter.svalVisit.matched = prevReusables.matched;
}
export function captureReusables(interpreter:SvalPlus,scope:Scope):PrevValues {
    return {
        evalStack:0,
        node: interpreter.reusables.node,
        svalScope:scope,
        handler: interpreter.reusables.handler,
        result: interpreter.reusables.result,
        thrown: interpreter.reusables.thrown,
        matched: interpreter.svalVisit.matched
    };
}