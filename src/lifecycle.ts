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
    NodeResult, 
    GeneratedKey,
    ForbiddenDynamicImport
} from "./custom-types.ts";


function inUserCode(scope:Scope):boolean {
    const interpreter:SvalPlus = scope.interpreter;
    
    const currentDepth = scope.depth;
    let calculatedUserDepth = (scope.userRoot.depth !== null)

    if (!calculatedUserDepth) {
        const local = scope.local;//we use the locals object instead of the .find() method to preserve performance
        const labels = interpreter.userRoot.labels;

        const anchorValue = local[labels.anchor]?.get();
        const isAnchored = (anchorValue === true);//we explicitly check for the value to prevent the condition from falsely evaluating to true when it only contains a deadzone value
        
        if (isAnchored) {
            const offset = local[labels.offset];
            if (!offset) {
                throw new Error(ansis.red(`Internal logic error: The depth offset cannot be undefined if the 'anchor' variable is true in the current scope`))
            };
            scope.userRoot.depth = currentDepth + offset.get();
            calculatedUserDepth = true;
        }
    };

    const inUserCode = (
        interpreter.stage === "MONITORING" && //this particular condition must be done after calculating the user depth. If you take it to the top,the interpreter will miss its only chance to calculate it
        calculatedUserDepth &&
        currentDepth >= scope.userRoot.depth!
    );
    return inUserCode;
};


export function isGenerator(obj:unknown):obj is Generator {
    return Object.prototype.toString.call(obj) === '[object Generator]'
}
export function inLazyMode(interpreter:SvalPlus):boolean {
    return interpreter.reusables.mode === "lazy";
}
export function useModifiedEvaluator(scope:Scope):boolean {
    const interpreter:SvalPlus = scope.interpreter;
    const shouldUseIt = (
        (interpreter.target === "SvalPlus") && 
        inUserCode(scope) && 
        (interpreter.inspector !== null)
    )
    return shouldUseIt;
}


export function getHandler<T extends unknown>(evaluateOps:EvaluateOps<T>,node:AcornNode,scope:Scope<SvalPlus>):NodeHandler<T> {
    const nodeType = (node as EsNode).type;
    if (scope.interpreter!.target === "SvalPlus") {
        if (nodeType === "ImportExpression") {
            throw new ForbiddenDynamicImport(ansis.red(`Dynamic imports are not supported in monitored functions`))
        }
    }

    const handler = evaluateOps[nodeType];
    if (!handler) {
        throw new Error(`${node.type} isn't implemented`);
    }
    
    return handler;
}
export function getSHA256Key(str:string):GeneratedKey {
    return `generated_${sha256.create().update(str).hex()}`;
}


export function adjustCallStackDepth(phase:'start' | 'finish',node:AcornNode,scope:Scope):void  {
    const interpreter:SvalPlus = scope.interpreter;
    const nodeType = node.type as EsNode['type'];

    if ((nodeType === "CallExpression") || (nodeType === "NewExpression")) {
        if (phase === "start") {
            interpreter.userRoot.callStackDepth += 1
        }else {
            interpreter.userRoot.callStackDepth -= 1
        }
    }
}
export const evalStackHandler = {
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
            clearReusables(interpreter);
        }else {
            if (parentReusables === null) {//if a user ever encounters this error,they can paste it along with their code in an issues page
                throw new Error(ansis.red(`Internal logic error: The stack handler cannot recover the parent node state because it was given 'null'.`))
            }
            overwriteReusables(interpreter, parentReusables);
        }
    }
}



/**
 * This function uses positional args because its called in the hot path of the whole interpreter
 * In this function, we want to reset the variables each time before we call the monitor so that each child evaluation doesnt get leaked refs or values from their parents.
*/
export function callInspector(mode:EvaluatorType, node:AcornNode,scope:Scope<SvalPlus>,handler:Reusables['handler']) {
    const interpreter = scope.interpreter!;
    updateReusables(mode,node,scope,handler);
    return interpreter.inspector!(interpreter.visit);//by the time the callInspector function is called,this is guaranteed to not be null because useModifiedEvaluator checks for the inspector's type
}

//This doesnt check for inUserCode because in the evaluators, it only runs if useModifiedEvaluator is true
export function callPerExe(interpreter:SvalPlus):void {
    const perExe = interpreter.reusables.execution.perExe;
    const node = interpreter.reusables.node!;

    if (perExe.fn) {
        perExe.fn(); // call this after the executed result has been pushed
        
        // consume the hook if we are currently at the owner node
        if (perExe.owner === node) {
            perExe.fn = null;
            perExe.owner = null; 
        }
    }
};
export function callOnStep(scope:Scope):void {
    const interpreter:SvalPlus = scope.interpreter;
    if (inUserCode(scope) && (interpreter.onStep !== null)) {
        interpreter.onStep();
    }
}


export function copyReusables<
    T extends 'compulsory' | 'optional',
    R extends Reusables | null = T extends 'compulsory'?Reusables: null
>
(interpreter:SvalPlus,flag:T):R {
    const reusables = interpreter.reusables;

    const canSkipOp = (
        (flag === "optional") && 
        (reusables.execution.evalStack.value <= 0)
    )
    //if the evalstack is 0,it means that the reusables are cleared and if they are cleared,it means that the evaluator can safely overwrite it without having to pay any copy overhead
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
        execution:reusables.execution//this doesnt get deeply copied because it doesnt get rewritten when executing a node
    } as R;
}
export function overwriteReusables(interpreter:SvalPlus,srcReusables:Reusables):void {
    interpreter.reusables.node = srcReusables.node;
    interpreter.reusables.scope = srcReusables.scope;
    interpreter.reusables.handler = srcReusables.handler;
    interpreter.reusables.result = srcReusables.result;
    interpreter.reusables.event = srcReusables.event;
    interpreter.reusables.mode = srcReusables.mode;
}
function updateReusables(mode:EvaluatorType,node:AcornNode,scope:Scope<SvalPlus>,handler:Reusables['handler']):void {
    const interpreter = scope.interpreter!;
    interpreter.reusables.node = node as EsNode;
    interpreter.reusables.scope = scope;
    interpreter.reusables.handler = handler;
    interpreter.reusables.result = UNASSIGNED;
    interpreter.reusables.event = NOT_ALLOCATED;
    interpreter.reusables.mode = mode;
    //we dont touch any of the execution state here because they are global trackers for the current execution context and their lifecycle are handled elsewhere
}
function clearReusables(interpreter:SvalPlus):void {
    interpreter.reusables.node = null;
    interpreter.reusables.scope = null;
    interpreter.reusables.handler = null;
    interpreter.reusables.result = UNASSIGNED;
    interpreter.reusables.event = NOT_ALLOCATED;
    interpreter.reusables.mode = null;
    interpreter.reusables.execution.evalStack.value = 0;
    interpreter.reusables.execution.exeStack.clear();

    //this acts as a fail-safe to prevent "ghost hooks" when an execution crashes or times out.
    interpreter.reusables.execution.perExe.owner = null
    interpreter.reusables.execution.perExe.fn = null

    //we dont clear the readonlyExeStack because its just a live reference to the exe stack
}



export function executedManually<T extends NodeResult<unknown>>(result:T | typeof UNASSIGNED):result is T {
    return (result !== UNASSIGNED)
}
export function pushedManually(interpreter:SvalPlus):boolean {
    return (
        executedManually(interpreter.reusables.result) &&
        (!inLazyMode(interpreter))//the visit.execute method couldn't have pushed the result while the interpreter was lazy
    )
}
export function pushResult(interpreter:SvalPlus,final:NodeResult<unknown>):void {
    const event = interpreter.reusables.event;
    const node = interpreter.reusables.node!;

    //we should aways insert a new object.Trying to optimize this by reusing objects will be logically incorrect
    interpreter.reusables.execution.exeStack.unshift({
        evaluation:final,
        type:node.type,
        node,
        scope:(event === NOT_ALLOCATED)
            ?NOT_ALLOCATED
            :event.scope
    });
}