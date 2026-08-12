import { Node as AcornNode } from "acorn";
import Scope from "./scope/index.ts";
import type {Node as EsNode} from "estree";
import {sha256} from "js-sha256"
import ansis from "ansis";

import { 
    UNASSIGNED,
    SvalPlus,
    Reusables, 
    NOT_ALLOCATED, 
    NodeHandler, 
    EvaluatorType, 
    EvaluateOps, 
    NodeResult 
} from "./custom-types.ts";

const generatorPrint = '[object Generator]';

export function isGenerator(obj:unknown):obj is Generator {
    return Object.prototype.toString.call(obj) === generatorPrint
}

export function inLazyMode(interpreter:SvalPlus):boolean {
    return interpreter.reusables.mode === "lazy";
}


export function getHandler<T extends unknown>(evaluateOps:EvaluateOps<T>,node:AcornNode):NodeHandler<T> | undefined {
    return evaluateOps[(node as EsNode).type];
}
export function getSHA256Key(str:string):string {
    return 'generated_' + sha256.create().update(str).hex();
}


function inUserCode(scope:Scope):boolean {
    const interpreter:SvalPlus = scope.interpreter;

    const currentDepth = scope.depth;

    const local = scope.local;//we use the locals object instead of the .find() method to preserve performance
    const anchorValue = local[interpreter.labels.anchor]?.get();
    
    const isAnchored = (anchorValue === true);//we explicitly check for the value to prevent the condition from falsely evaluating to true when it only contains a deadzone value
    let calculatedUserDepth = (scope.userDepth !== null)

    if (isAnchored && !calculatedUserDepth) {
        const offset = local[interpreter.labels.offset];
        if (!offset) {
            throw new Error(ansis.red(`Internal logic error: The depth offset cannot be undefined if the 'anchor' variable is true in the current scope`))
        };
        scope.userDepth = currentDepth + offset.get();
        calculatedUserDepth = true;
    };

    const enteredUserCode = (
        //this particular condition must be done after calculating the user depth. If you take it to the top,the interpreter will miss its only chance to calculate it
        interpreter.stage === "MONITORING" && 
        calculatedUserDepth &&
        currentDepth >= scope.userDepth!
    )
    
    return enteredUserCode;
};


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
        interpreter.reusables.execution.evalStack.value += 1;
    },
    finish:(interpreter:SvalPlus,parentReusables:Reusables | null):void => {
        const evalStack = interpreter.reusables.execution.evalStack;
        evalStack.value -= 1;

        if (evalStack.value < 0) {
            throw new Error(ansis.red(`Internal logic error: The evalstack pointer has been mishandled. It is supposed to be >=0 but found: ${evalStack.value}`));
        }
        
        if (evalStack.value === 0) {
            clearStack(interpreter);
        }else {
            if (parentReusables === null) {//if a user ever encounters this error,they can paste it along with their code in an issues page
                throw new Error(ansis.red(`Internal logic error: The stack handler cannot recover the parent node state because it was given 'null'.`))
            }
            overwriteReusables(interpreter, parentReusables);
        }
    }
}


//These two call* functions dont check for inUserCode because in the evaluators,they only run if useModifiedEvaluator is true

export function callPerExe(interpreter:SvalPlus) {
    const perExe = interpreter.reusables.execution.perExe;
    const node = interpreter.reusables.node!;

    if (perExe) {
        perExe.fn();//call this after the executed result has been pushed.We dont nullify it immediately or lock it to execute strictly for the owner node,because the evaluator can pause a node to evaluate all its other children.Not clearing it immediately allows the perExe hook to fire for all the child nodes of the current node.
        if (perExe.owner === node) {//consume the hook if we are currently at the owner node.This wont always be true on the first try because the owner node can be paused to evaluate its children.
            interpreter.reusables.execution.perExe = null;
        }
    }
};

//This function uses positional args because its called in the hot path of the whole interpreter
//In this function, we want to reset the variables each time before we call the monitor so that each child evaluation doesnt get leaked refs or values from their parents.

export function callInspector(mode:EvaluatorType, node:AcornNode,scope:Scope<SvalPlus>,handler:Reusables['handler']) {
    const interpreter = scope.interpreter!;
    updateReusables(mode,node,scope,handler);
    return interpreter.inspector!(interpreter.visit);//by the time the callInspector function is called,this is guaranteed to not be null because useModifiedEvaluator checks for the inspector's type
}


function updateReusables(mode:EvaluatorType,node:AcornNode,scope:Scope<SvalPlus>,handler:Reusables['handler']) {
    const interpreter = scope.interpreter!;
    interpreter.reusables.node = node as EsNode;
    interpreter.reusables.scope = scope;
    interpreter.reusables.handler = handler;
    interpreter.reusables.result = UNASSIGNED;
    interpreter.reusables.event = NOT_ALLOCATED;
    interpreter.reusables.mode = mode;
    //we dont touch the exe stack here because its usage and end of lifecycle are handled elsewhere
    //we dont touch the evalstack pointer here because its handled in stackHandler
}
function clearStack(interpreter:SvalPlus) {
    interpreter.reusables.node = null;
    interpreter.reusables.scope = null;
    interpreter.reusables.handler = null;
    interpreter.reusables.result = UNASSIGNED;
    interpreter.reusables.event = NOT_ALLOCATED;
    interpreter.reusables.mode = null;
    interpreter.reusables.execution.evalStack.value = 0;
    interpreter.reusables.execution.exeStack.clear();
    //we dont touch perExe here because its lifecycle's end is handled in another function
    //we dont touch the readonlyExeStack because its just a live reference to the exe stack
}


export function copyReusables<
    T extends 'compulsory' | 'optional',
    R extends Reusables | null = T extends 'compulsory'?Reusables: null
>
(interpreter:SvalPlus,flag:T):R {
    const reusables = interpreter.reusables;
    const canSkipOp = (flag === "optional") && (reusables.execution.evalStack.value <= 0);

    //if the evalstack is 0,it means that the reusables are cleared and if they are cleared,it means that the evaluator can safely overwrite it without having to pay copy overhead
    if (canSkipOp) {
        return null as R;
    }
    return {
        node:reusables.node,
        scope:reusables.scope,
        handler:reusables.handler,
        result:reusables.result,
        event:reusables.event,
        mode:reusables.mode,
        execution:{
            evalStack:reusables.execution.evalStack,//the eval stack variable is a global tracker.so it cant be cleared or reset in local functions.
            exeStack:reusables.execution.exeStack,
            readonlyExeStack:reusables.execution.readonlyExeStack,
            perExe:reusables.execution.perExe
        }
    } as R;
}
export function overwriteReusables(interpreter:SvalPlus,srcReusables:Reusables) {
    interpreter.reusables.node = srcReusables.node;
    interpreter.reusables.scope = srcReusables.scope;
    interpreter.reusables.handler = srcReusables.handler;
    interpreter.reusables.result = srcReusables.result;
    interpreter.reusables.event = srcReusables.event;
    interpreter.reusables.mode = srcReusables.mode;
    interpreter.reusables.execution.evalStack = srcReusables.execution.evalStack;
    interpreter.reusables.execution.exeStack = srcReusables.execution.exeStack;
    interpreter.reusables.execution.readonlyExeStack = srcReusables.execution.readonlyExeStack;
    interpreter.reusables.execution.perExe = srcReusables.execution.perExe
}


export function executedManually<T extends NodeResult<unknown>>(result:T | typeof UNASSIGNED):result is T {
    return (result !== UNASSIGNED)
}
export function pushedManually(interpreter:SvalPlus):boolean {
    return (
        !(inLazyMode(interpreter)) &&//the visit.execute method couldn't have pushed any result if it is lazy
        executedManually(interpreter.reusables.result) 
    )
}
export function pushResult(interpreter:SvalPlus,final:NodeResult<unknown>) {
    const event = interpreter.reusables.event;
    const node = interpreter.reusables.node!;

    //we should aways insert a new object.Trying to optimize this by reusing objects may be logically incosistent with the rest of the codebase
    interpreter.reusables.execution.exeStack.unshift({
        evaluation:final,
        type:node.type,
        node,
        scope:(event === NOT_ALLOCATED)
            ?NOT_ALLOCATED
            :event.scope
    });
}