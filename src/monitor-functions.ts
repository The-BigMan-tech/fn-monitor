import { Node as AcornNode } from "acorn";
import Scope from "./scope/index.ts";
import {Node as EsNode} from "estree";
import { UNASSIGNED,SvalPlus,Reusables, NOT_ALLOCATED } from "./monitored-events.ts";


export function isGenerator(obj:unknown):obj is Generator {
    return Object.prototype.toString.call(obj) === '[object Generator]';
}
export function cleanStack(interpreter:SvalPlus,parentReusables:Reusables) {
    interpreter.reusables.shared.evalStack.value -= 1;
    // console.log('EVAL STACK: ',interpreter.reusables.shared.evalStack.value);

    const zeroNodesLeft = (interpreter.reusables.shared.evalStack.value <= 0);
    if (zeroNodesLeft) {
        clearEvalStack(interpreter);
    } else {
        restoreCapturedReusables(interpreter, parentReusables);
    }
}
export function pushHandler(args:{interpreter:SvalPlus,result:any,pushedManually:boolean,nodeType:EsNode['type']}) {
    if (!args.pushedManually) {//only push the result if visit.execute wasnt called which would have assigned the result and pushed it
        pushResult(args.interpreter,args.result,args.nodeType);
    }
}
export function pushResult(interpreter:SvalPlus,result:any,nodeType:EsNode['type']) {
    const currentEvent = interpreter.reusables.currentEvent;
    interpreter.reusables.shared.exeStack.unshift({
        value:result,
        type:nodeType,
        event:currentEvent
    });
}
/**It returns true if it was refreshed and false if it wasnt */
export function refreshExeStack(interpreter:SvalPlus):boolean {
    const OneNodeLeft = interpreter.reusables.shared.evalStack.value <= 1
    if (OneNodeLeft) {
        // console.log('\nCLEARED EXE STACK');
        interpreter.reusables.shared.exeStack.clear();//since the listener can only ever see the last exe stack,we only clear it after theyve seen it and not immediately after its filled with values
        return true;
    }
    return false;
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
    interpreter.reusables.currentEvent = NOT_ALLOCATED;
}
export function clearEvalStack(interpreter:SvalPlus) {
    // console.log('CLEARED EVAL');
    interpreter.reusables.node = null;
    interpreter.reusables.currentScope = null;
    interpreter.reusables.handler = null;
    interpreter.reusables.result = UNASSIGNED;
    interpreter.reusables.currentEvent = NOT_ALLOCATED;
    interpreter.reusables.shared.evalStack.value = 0;
}
export function captureReusables(interpreter:SvalPlus):Reusables {
    return {
        node: interpreter.reusables.node,
        currentScope:interpreter.reusables.currentScope,
        handler: interpreter.reusables.handler,
        result: interpreter.reusables.result,
        currentEvent:interpreter.reusables.currentEvent,
        shared:{
            evalStack:interpreter.reusables.shared.evalStack,//the eval stack variable is a global tracker.so it cant be cleared or reset in local functions.
            exeStack:interpreter.reusables.shared.exeStack,
            readonlyExeStack:interpreter.reusables.shared.readonlyExeStack,
            perExe:interpreter.reusables.shared.perExe
        }
    };
}
export function restoreCapturedReusables(interpreter:SvalPlus,prevReusables:Reusables) {
    interpreter.reusables.node = prevReusables.node;
    interpreter.reusables.currentScope = prevReusables.currentScope;
    interpreter.reusables.handler = prevReusables.handler;
    interpreter.reusables.result = prevReusables.result;
    interpreter.reusables.currentEvent = prevReusables.currentEvent;
    interpreter.reusables.shared.evalStack = prevReusables.shared.evalStack;
    interpreter.reusables.shared.exeStack = prevReusables.shared.exeStack;
    interpreter.reusables.shared.readonlyExeStack = prevReusables.shared.readonlyExeStack;
    interpreter.reusables.shared.perExe = prevReusables.shared.perExe
}
