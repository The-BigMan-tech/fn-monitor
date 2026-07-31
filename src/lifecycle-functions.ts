import { Node as AcornNode } from "acorn";
import Scope from "./scope/index.ts";
import type {Node as EsNode} from "estree";
import { UNASSIGNED,SvalPlus,Reusables, NOT_ALLOCATED } from "./custom-types.ts";

const generatorPrint = '[object Generator]';
export function isGenerator(obj:unknown):obj is Generator {
    return Object.prototype.toString.call(obj) === generatorPrint
}


function inUserCode(scope:Scope) {
    const interpreter:SvalPlus = scope.interpreter;
    return (
        (interpreter.stage === 'MONITORING') &&
        scope.scopeDepth >= 2//its only the generated code thats at depth 1 and 0.
    );
}
export function callOnStep(scope:Scope) {
    const interpreter:SvalPlus = scope.interpreter;
    if (inUserCode(scope) && (interpreter.onStep !== null)) {
        interpreter.onStep();
    }
}
export function useModifiedEvaluator(scope:Scope):boolean {
    const interpreter:SvalPlus = scope.interpreter;
    return ( 
        inUserCode(scope) && (interpreter.inspector !== null)
    )
}


export const stackHandler = {
    start:(interpreter:SvalPlus)=>{
        interpreter.reusables.shared.evalStack.value += 1;
    },
    finish:(interpreter:SvalPlus,parentReusables:Reusables | null)=> {
        interpreter.reusables.shared.evalStack.value -= 1;
        const zeroNodesLeft = (interpreter.reusables.shared.evalStack.value <= 0);

        if (zeroNodesLeft) {
            clearStack(interpreter);
        }else {
            if (parentReusables === null) {//if a user ever encounters this error,they can paste it along with their code in an issues page
                throw new Error(`Internal logic error: The stack handler cannot recover the parent node state because it was given 'null'.`)
            };
            overwriteReusables(interpreter, parentReusables);
        }
    }
}


//These two call* functions dont check inUserCode because in the evaluators,they only run if useMModifiedEvaluator is true

export function callPerExe(interpreter:SvalPlus) {
    const perExe = interpreter.reusables.shared.perExe;
    const node = interpreter.reusables.node!;

    if (perExe) {
        perExe.fn();//call this after the executed result has been pushed.We dont nullify it immediately or lock it to execute strictly for the owner node,because the evaluator can pause a node to evaluate all its other children.Not clearing it immediately allows the perExe hook to fire for all the child nodes of the current node.
        if (perExe.owner === node) {//consume the hook if we are currently at the owner node.This wont always be true on the first try because the owner node can be paused to evaluate its children.
            interpreter.reusables.shared.perExe = null;
        }
    }
}
//we want to reset the variables each time before we call the monitor so that each child evaluation doesnt get leaked refs or values from their parents.
export function callInspector(acornNode:AcornNode,currentScope:Scope<SvalPlus>,handler:Reusables['handler']) {
    const interpreter = currentScope.interpreter!;
    updateReusables(acornNode,currentScope,handler)
    return interpreter.inspector!(interpreter.visit);//by the time the call monitor is called,this is guaranteed to not be null
}


function updateReusables(acornNode:AcornNode,currentScope:Scope<SvalPlus>,handler:Reusables['handler']) {
    const interpreter = currentScope.interpreter!;
    interpreter.reusables.node = acornNode as EsNode;
    interpreter.reusables.currentScope = currentScope;
    interpreter.reusables.handler = handler;
    interpreter.reusables.result = UNASSIGNED;
    interpreter.reusables.currentEvent = NOT_ALLOCATED;
    //we dont touch the exe stack here to retain it across a chain of evaluations originating from the root of another evaluation.Its lifecycle's end is handled in another function
    //we dont touch the evalstack pointer here.
}
function clearStack(interpreter:SvalPlus) {
    interpreter.reusables.node = null;
    interpreter.reusables.currentScope = null;
    interpreter.reusables.handler = null;
    interpreter.reusables.result = UNASSIGNED;
    interpreter.reusables.currentEvent = NOT_ALLOCATED;
    interpreter.reusables.shared.evalStack.value = 0;
    interpreter.reusables.shared.exeStack.clear();
    //we dont touch perExe here because its lifecycle's end is handled in another function
    //we dont touch the readonlyExeStack because its just a live reference to the exe stack
}


export function copyReusables<
    T extends 'compulsory' | 'optional',
    R extends Reusables | null = T extends 'compulsory'?Reusables: null
>
(interpreter:SvalPlus,flag:T):R {
    const reusables = interpreter.reusables;
    const canSkipOp = (flag === "optional") && (reusables.shared.evalStack.value <= 0);

    //if the evalstack is 0,it means that the reusables are cleared and if they are cleared,it means that the evaluator can safely overwrite it without having to pay copy overhead
    if (canSkipOp) {
        return null as R;
    }
    return {
        node:reusables.node,
        currentScope:reusables.currentScope,
        handler:reusables.handler,
        result:reusables.result,
        currentEvent:reusables.currentEvent,
        shared:{
            evalStack:reusables.shared.evalStack,//the eval stack variable is a global tracker.so it cant be cleared or reset in local functions.
            exeStack:reusables.shared.exeStack,
            readonlyExeStack:reusables.shared.readonlyExeStack,
            perExe:reusables.shared.perExe
        }
    } as R;
}
export function overwriteReusables(interpreter:SvalPlus,srcReusables:Reusables) {
    interpreter.reusables.node = srcReusables.node;
    interpreter.reusables.currentScope = srcReusables.currentScope;
    interpreter.reusables.handler = srcReusables.handler;
    interpreter.reusables.result = srcReusables.result;
    interpreter.reusables.currentEvent = srcReusables.currentEvent;
    interpreter.reusables.shared.evalStack = srcReusables.shared.evalStack;
    interpreter.reusables.shared.exeStack = srcReusables.shared.exeStack;
    interpreter.reusables.shared.readonlyExeStack = srcReusables.shared.readonlyExeStack;
    interpreter.reusables.shared.perExe = srcReusables.shared.perExe
}


export function executedManually(result:any):boolean {
    return (result !== UNASSIGNED)
}
export function pushedManually(result:any):boolean {
    return executedManually(result) && !(isGenerator(result));//the visit.execute method doesnt and cant push the result if it is a generator
}
export function pushResult(interpreter:SvalPlus,final:any) {
    const currentEvent = interpreter.reusables.currentEvent;
    const node = interpreter.reusables.node!;

    //we should aways insert a new object.Trying to optimize this by reusing objects may be logically incosistent with the rest of the codebase
    interpreter.reusables.shared.exeStack.unshift({
        evaluation:final,
        type:node.type,
        node,
        scope:(currentEvent === NOT_ALLOCATED)
            ?NOT_ALLOCATED:
            currentEvent.scope
    });
}