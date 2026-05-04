import { Node as AcornNode } from "acorn";
import Scope from "./scope/index.ts";
import {Node as EsNode} from "estree";
import { UNASSIGNED,SvalPlus,Reusables } from "./monitored-events.ts";

interface PrevValues extends Reusables {
    evalStack:0,
}
export function isGenerator (obj:unknown):obj is Generator {
    return Object.prototype.toString.call(obj) === '[object Generator]';
}
export function handleResult(scope:Scope,result:any) {
    const interpreter:SvalPlus = scope.interpreter;
    if (interpreter.reusables.thrown !== UNASSIGNED) {
        throw interpreter.reusables.thrown;
    }else {
        return result;
    }
}
export function* handleGeneratorResult(scope: Scope,generator:Generator) {
    const interpreter: SvalPlus = scope.interpreter;
    if (interpreter.reusables.thrown !== UNASSIGNED) {
        throw interpreter.reusables.thrown;
    }else {
        return yield* generator;
    }
}
export function callMonitor(acornNode:AcornNode,currentScope:Scope<SvalPlus>,handler:Reusables['handler']) {
    const interpreter = currentScope.interpreter;
    if (!interpreter) return;//this is unlikely to happen since its preserved from parent to children scopes
    
    const atRoot = !currentScope.hasParent();
    if (atRoot) {
        return;//we dont want to track any action thats not inside the monitored function
    }
    if (interpreter.langListener) {
        interpreter.reusables.currentScope = currentScope;
        interpreter.reusables.node = acornNode as EsNode;
        interpreter.reusables.handler = handler;
        interpreter.reusables.result = UNASSIGNED;
        interpreter.reusables.thrown = UNASSIGNED;
        interpreter.reusables.matchedQuery = false;
        return interpreter.langListener(interpreter.visit);
    }
}
export function clearEvalStack(interpreter:SvalPlus) {
    interpreter.reusables.node = null;
    interpreter.reusables.currentScope = null;
    interpreter.reusables.handler = null;
    interpreter.reusables.result = UNASSIGNED;
    interpreter.reusables.thrown = UNASSIGNED;
    interpreter.reusables.matchedQuery = false;
}
export function restorePrevReusables(interpreter:SvalPlus,prevReusables:PrevValues) {
    interpreter.reusables.node = prevReusables.node;
    interpreter.reusables.currentScope = prevReusables.currentScope;
    interpreter.reusables.handler = prevReusables.handler;
    interpreter.reusables.result = prevReusables.result;
    interpreter.reusables.thrown = prevReusables.thrown;
    interpreter.reusables.matchedQuery = prevReusables.matchedQuery;
}
export function captureReusables(interpreter:SvalPlus,scope:Scope):PrevValues {
    return {
        evalStack:0,
        node: interpreter.reusables.node,
        currentScope:scope,
        handler: interpreter.reusables.handler,
        result: interpreter.reusables.result,
        thrown: interpreter.reusables.thrown,
        matchedQuery: interpreter.reusables.matchedQuery
    };
}