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
    //we want to reset the variables each time before we call the monitor so that each child evaluation dont get leaked refs or values from their parents.but we exclude eval stack and exe stack because they must be tracked throughout all evaluations
    if (interpreter.langListener) {
        interpreter.reusables.node = acornNode as EsNode;
        interpreter.reusables.currentScope = currentScope;
        interpreter.reusables.handler = handler;
        interpreter.reusables.result = UNASSIGNED;
        interpreter.reusables.thrown = UNASSIGNED;
        interpreter.reusables.matchedQuery = false;
        interpreter.reusables.currentEvent = null;
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
    interpreter.reusables.currentEvent = null;
    interpreter.reusables.exeStack.clear();
}
export function captureReusables(interpreter:SvalPlus,scope:Scope):PrevValues {
    return {
        evalStack:0,//the eval stack variable is a global tracker.so it cant be cleared or reset in local functions.
        node: interpreter.reusables.node,
        currentScope:scope,
        handler: interpreter.reusables.handler,
        result: interpreter.reusables.result,
        thrown: interpreter.reusables.thrown,
        matchedQuery: interpreter.reusables.matchedQuery,
        currentEvent:interpreter.reusables.currentEvent,
        exeStack:interpreter.reusables.exeStack,
    };
}
export function restorePrevReusables(interpreter:SvalPlus,prevReusables:PrevValues) {
    interpreter.reusables.node = prevReusables.node;
    interpreter.reusables.currentScope = prevReusables.currentScope;
    interpreter.reusables.handler = prevReusables.handler;
    interpreter.reusables.result = prevReusables.result;
    interpreter.reusables.thrown = prevReusables.thrown;
    interpreter.reusables.matchedQuery = prevReusables.matchedQuery;
    interpreter.reusables.currentEvent = prevReusables.currentEvent;
    interpreter.reusables.exeStack = prevReusables.exeStack;
}
