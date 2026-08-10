import { Node as AcornNode } from "acorn";
import Scope from "./scope/index.ts";
import type {Node as EsNode} from "estree";
import {sha256} from "js-sha256"
import { UNASSIGNED,SvalPlus,Reusables, NOT_ALLOCATED, NodeHandler, EvaluatorType } from "./custom-types.ts";

const generatorPrint = '[object Generator]';

export function isGenerator(obj:unknown):obj is Generator {
    return Object.prototype.toString.call(obj) === generatorPrint
}

export function isLazyNode(interpreter:SvalPlus):boolean {
    return interpreter.reusables.currentEvaluator === "lazy";
}


export function getHandler(evaluateOps:Record<string,any>,nodeType:string):NodeHandler | undefined {
    return evaluateOps[nodeType];
}
export function getSHA256Key(str:string):string {
    return 'generated_' + sha256.create().update(str).hex();
}


function inUserCode(scope:Scope) {
    const interpreter:SvalPlus = scope.interpreter;
    return (
        (interpreter.stage === 'MONITORING') &&
        scope.scopeDepth >= 2//its only the boilerplate in the generated code that is at depth 0 and 1.
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
    start:(interpreter:SvalPlus):void => {
        interpreter.reusables.shared.evalStack.value += 1;
    },
    finish:(interpreter:SvalPlus,parentReusables:Reusables | null):void => {
        const evalStack = interpreter.reusables.shared.evalStack;
        evalStack.value -= 1;

        if (evalStack.value < 0) {
            throw new Error(`Internal logic error: The evalstack pointer has been mishandled. It is supposed to be >=0 but found: ${evalStack.value}`);
        }
        
        if (evalStack.value === 0) {
            clearStack(interpreter);
        }else {
            if (parentReusables === null) {//if a user ever encounters this error,they can paste it along with their code in an issues page
                throw new Error(`Internal logic error: The stack handler cannot recover the parent node state because it was given 'null'.`)
            }
            overwriteReusables(interpreter, parentReusables);
        }
    }
}


//These two call* functions dont check for inUserCode because in the evaluators,they only run if useModifiedEvaluator is true

export function callPerExe(interpreter:SvalPlus) {
    const perExe = interpreter.reusables.shared.perExe;
    const node = interpreter.reusables.node!;

    if (perExe) {
        perExe.fn();//call this after the executed result has been pushed.We dont nullify it immediately or lock it to execute strictly for the owner node,because the evaluator can pause a node to evaluate all its other children.Not clearing it immediately allows the perExe hook to fire for all the child nodes of the current node.
        if (perExe.owner === node) {//consume the hook if we are currently at the owner node.This wont always be true on the first try because the owner node can be paused to evaluate its children.
            interpreter.reusables.shared.perExe = null;
        }
    }
};

//This function uses positional args because its called in the hot path of the whole interpreter
//In this function, we want to reset the variables each time before we call the monitor so that each child evaluation doesnt get leaked refs or values from their parents.

export function callInspector(evaluatorType:EvaluatorType, acornNode:AcornNode,currentScope:Scope<SvalPlus>,handler:Reusables['handler']) {
    const interpreter = currentScope.interpreter!;
    updateReusables(evaluatorType,acornNode,currentScope,handler);
    return interpreter.inspector!(interpreter.visit);//by the time the callInspector function is called,this is guaranteed to not be null because useModifiedEvaluator checks for the inspector's type
}


function updateReusables(evaluatorType:EvaluatorType, acornNode:AcornNode,currentScope:Scope<SvalPlus>,handler:Reusables['handler']) {
    const interpreter = currentScope.interpreter!;
    interpreter.reusables.node = acornNode as EsNode;
    interpreter.reusables.currentScope = currentScope;
    interpreter.reusables.handler = handler;
    interpreter.reusables.result = UNASSIGNED;
    interpreter.reusables.currentEvent = NOT_ALLOCATED;
    interpreter.reusables.currentEvaluator = evaluatorType;
    //we dont touch the exe stack here because its usage and end of lifecycle are handled elsewhere
    //we dont touch the evalstack pointer here because its handled in stackHandler
}
function clearStack(interpreter:SvalPlus) {
    interpreter.reusables.node = null;
    interpreter.reusables.currentScope = null;
    interpreter.reusables.handler = null;
    interpreter.reusables.result = UNASSIGNED;
    interpreter.reusables.currentEvent = NOT_ALLOCATED;
    interpreter.reusables.currentEvaluator = null;
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
        currentEvaluator:reusables.currentEvaluator,
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
    interpreter.reusables.currentEvaluator = srcReusables.currentEvaluator;
    interpreter.reusables.shared.evalStack = srcReusables.shared.evalStack;
    interpreter.reusables.shared.exeStack = srcReusables.shared.exeStack;
    interpreter.reusables.shared.readonlyExeStack = srcReusables.shared.readonlyExeStack;
    interpreter.reusables.shared.perExe = srcReusables.shared.perExe
}


export function executedManually(result:any):boolean {
    return (result !== UNASSIGNED)
}
export function pushedManually(interpreter:SvalPlus):boolean {
    return (
        !(isLazyNode(interpreter)) &&//the visit.execute method couldn't have pushed any result if it is lazy
        executedManually(interpreter.reusables.result) 
    )
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
            ?NOT_ALLOCATED
            :currentEvent.scope
    });
}