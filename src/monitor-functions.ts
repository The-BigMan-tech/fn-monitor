import { Node as AcornNode } from "acorn";
import Scope from "./scope/index.ts";
import {Node as EsNode} from "estree";
import { UNASSIGNED,SvalPlus,Reusables } from "./monitored-events.ts";

export function isGenerator(obj:unknown):obj is Generator {
    return Object.prototype.toString.call(obj) === '[object Generator]';
}
export function pushResult(interpreter:SvalPlus,result:any) {
    const currentEvent = interpreter.reusables.currentEvent;
    interpreter.reusables.exeStack.unshift({
        value:result,
        event:currentEvent
    });
}
export function refreshExeStack(interpreter:SvalPlus) {
    const OneNodeLeft = interpreter.reusables.evalStack.value <= 1
    if (OneNodeLeft) {
        console.log('\n\nCLEARED EXE STACK');
        interpreter.reusables.exeStack.clear();//since the listener can only ever see the last exe stack,we only clear it after theyve seen it and not immediately after its filled with values
    }
}
//we want to reset the variables each time before we call the monitor so that each child evaluation dont get leaked refs or values from their parents.but we exclude eval stack and exe stack because they must be tracked throughout all evaluations
export function callMonitor(acornNode:AcornNode,currentScope:Scope<SvalPlus>,handler:Reusables['handler']) {
    const interpreter = currentScope.interpreter!;
    if (interpreter.langListener) {
        refreshReusables(acornNode,currentScope,handler)
        return interpreter.langListener(interpreter.visit);
    }
}
function refreshReusables(acornNode:AcornNode,currentScope:Scope<SvalPlus>,handler:Reusables['handler']) {
    const interpreter = currentScope.interpreter!;
    interpreter.reusables.node = acornNode as EsNode;
    interpreter.reusables.currentScope = currentScope;
    interpreter.reusables.handler = handler;
    interpreter.reusables.result = UNASSIGNED;
    interpreter.reusables.matchedQuery = false;
    interpreter.reusables.currentEvent = null;
}
export function clearEvalStack(interpreter:SvalPlus) {
    console.log('CLEARED EVAL');
    interpreter.reusables.node = null;
    interpreter.reusables.currentScope = null;
    interpreter.reusables.handler = null;
    interpreter.reusables.result = UNASSIGNED;
    interpreter.reusables.matchedQuery = false;
    interpreter.reusables.currentEvent = null;
    interpreter.reusables.evalStack.value = 0;
}
export function captureReusables(interpreter:SvalPlus):Reusables {
    return {
        node: interpreter.reusables.node,
        currentScope:interpreter.reusables.currentScope,
        handler: interpreter.reusables.handler,
        result: interpreter.reusables.result,
        matchedQuery: interpreter.reusables.matchedQuery,
        currentEvent:interpreter.reusables.currentEvent,
        evalStack:interpreter.reusables.evalStack,//the eval stack variable is a global tracker.so it cant be cleared or reset in local functions.
        exeStack:interpreter.reusables.exeStack,
    };
}
export function restoreCapturedReusables(interpreter:SvalPlus,prevReusables:Reusables) {
    interpreter.reusables.node = prevReusables.node;
    interpreter.reusables.currentScope = prevReusables.currentScope;
    interpreter.reusables.handler = prevReusables.handler;
    interpreter.reusables.result = prevReusables.result;
    interpreter.reusables.matchedQuery = prevReusables.matchedQuery;
    interpreter.reusables.currentEvent = prevReusables.currentEvent;
    interpreter.reusables.evalStack = prevReusables.evalStack;
    interpreter.reusables.exeStack = prevReusables.exeStack;
}
