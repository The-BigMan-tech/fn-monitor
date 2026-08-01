import ansis from 'ansis'

import { Node } from 'acorn'
import { assign } from '../share/util.ts'
import Scope from '../scope/index.ts'

import * as declaration from './declaration.ts'
import * as expression from './expression.ts'
import * as identifier from './identifier.ts'
import * as statement from './statement.ts'
import * as literal from './literal.ts'
import * as pattern from './pattern.ts'
import * as program from './program.ts'

import { NodeHandler, SvalPlus } from '../custom-types.ts'
import { 
    callInspector, 
    copyReusables, 
    stackHandler,
    isGenerator, 
    callPerExe, 
    useModifiedEvaluator, 
    pushResult, 
    executedManually, 
    pushedManually, 
    callOnStep
} from '../lifecycle-functions.ts'

let evaluateOps: any

//Leave the frequent access of interpreter.reusables.result the way it is.
//Dont be tempted to lift it to a variable. It is subject to mutations and it will add more overhead on how the local variable is managed
//'final' and the result are typed as any.so be sure to check the parameter name of the fn you are passing them to

export default function evaluate(node: Node, scope: Scope) {
    if (!node) {
        return;
    }
    if (!evaluateOps) {// delay initalizing to remove circular reference issue for jest
        evaluateOps = assign(
            {},
            declaration,
            expression,
            identifier,
            statement,
            literal,
            pattern,  
            program
        )
    };

    const handler:NodeHandler | undefined  = evaluateOps[node.type];
    if (!handler) {
        throw new Error(`${node.type} isn't implemented`);
    }

    callOnStep(scope);

    if (!useModifiedEvaluator(scope)) {
        return handler(node,scope);
    };

    //only run this code after checking if it should use the modified evaluator to prevent creating unnecessary objects
    const interpreter:SvalPlus = scope.interpreter;
    const parentReusables = copyReusables(interpreter,'optional');

    try {
        stackHandler.start(interpreter);
        const response = callInspector(node, scope, handler);//call this before the node is executed
        
        const genResult = isGenerator(response) ? response.next() : null;  
        const finished = (genResult === null) ? true : genResult.done

        if (finished) {
            const final = executedManually(interpreter.reusables.result)
                ?interpreter.reusables.result
                :handler(node,scope)

            if (!pushedManually(interpreter.reusables.result)) {//this check must pass the value of the result directly and not the 'final' variable
                pushResult(interpreter,final);
            }

            callPerExe(interpreter);
            return final;
        }
        else {
            if (!executedManually(interpreter.reusables.result)) {//this assetion is the important piece that justifies the removal of the SEEN symbol in one refactor
                throw new Error(ansis.red(`[Synchronous Evaluator] Generator-based inspectors can only yield after executing the node.`))
            }

            const final = interpreter.reusables.result;
            if (!pushedManually(interpreter.reusables.result)) {
                pushResult(interpreter,final);
            };

            const yieldedValue = genResult!.value;
            if (yieldedValue !== final) {
                throw new Error(ansis.red(`[Synchronous Evaluator] Generator-based inspectors can only yield the result of the current node but saw: ${String(yieldedValue)} instead of: ${String(final)}.`))
            };

            const isDone = response!.next(final).done;//since this evaluator will only be used for sync code,we just resume the generator with the result directly.
            if (!isDone) {
                throw new Error(ansis.red(`[Synchronous Evaluator] Generator-based inspectors can only yield once.`))
            }

            callPerExe(interpreter);
            return final
        }
    }finally {
        stackHandler.finish(interpreter,parentReusables)
    }
}
