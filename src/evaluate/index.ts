import ansis from 'ansis';

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

import { 
    LAZY_NODE, 
    Reusables, 
    SvalPlus 
} from '../custom-types.ts';

import { 
    callInspector, 
    callPerExe, 
    copyReusables, 
    stackHandler, 
    executedManually, 
    isGenerator,pushedManually,pushResult,
    overwriteReusables,
    useModifiedEvaluator,
    callOnStep, // Use the Generator version
} from '../lifecycle-functions.ts'


function* higherHandler(iterator:Generator,interpreter:SvalPlus):Generator {
    const localReusables = copyReusables(interpreter,'compulsory');//capture the reusbales after the callInspector method has updated it to the local node and scope
    let iterResult = iterator.next();

    while (!iterResult.done) {
        let feedback;
        try {
            feedback = yield iterResult.value;
            //since this is a generator,an arbitary amount of time would have passed between when it yielded and when it got resumed.another monitored fn would have ran.so we restore the localReusables to prevent state bugs.This is only unique to this evaluator
            overwriteReusables(interpreter,localReusables);
        }catch (e) {
            iterResult = iterator.throw(e);
            continue;
        }
        iterResult = iterator.next(feedback);
    }
    return iterResult.value; 
}

let evaluateOps: any

export default function* evaluate(node: Node, scope: Scope) {
    if (!node) {
        return;
    }
    if (!evaluateOps) {
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

    const handler = evaluateOps[node.type];
    if (!handler) throw new Error(`${node.type} isn't implemented`);
    
    callOnStep(scope);

    if (!useModifiedEvaluator(scope)) {
        return yield* handler(node,scope);
    }

    //only run this code after checking if it should use the modified evaluator to prevent creating unnecessary objects
    const interpreter:SvalPlus = scope.interpreter;
    const parentReusables = copyReusables(interpreter,'optional');

    try {
        stackHandler.start(interpreter)
        const response = callInspector(node, scope, handler);

        const genResult = isGenerator(response) ? response.next() : null;  
        const finished = (genResult === null) ? true : genResult.done

        if (finished) {
            const final = executedManually(interpreter.reusables.result)
                ?yield* higherHandler(
                    interpreter.reusables.result,
                    interpreter
                )
                :yield* higherHandler(
                    handler(node,scope),
                    interpreter
                );

            if (!pushedManually(interpreter.reusables.result)) {
                pushResult(interpreter,final);
            }
        
            callPerExe(interpreter);
            return final;
        }
        else {
            if (!executedManually(interpreter.reusables.result)) {//this assetion is the important piece that justifies the removal of the SEEN symbol in one refactor
                throw new Error(ansis.red(`[Generator Evaluator] Generator-based inspectors can only yield after executing the node.`))
            };

            const final = yield* higherHandler(
                interpreter.reusables.result,
                interpreter
            )
            if (!pushedManually(interpreter.reusables.result)) {
                pushResult(interpreter,final);
            };

            const yieldedValue = genResult!.value;
            if (yieldedValue !== LAZY_NODE) {
                throw new Error(ansis.red(`[Generator Evaluator] When the interpreter visit a LAZY_NODE,generator-based inspectors can only yield that lazy node but saw ${String(yieldedValue)}.`))
            };

            const isDone = response!.next(final).done;
            if (!isDone) {
                throw new Error(ansis.red(`[Generator Evaluator] Generator-based inspectors can only yield once.`))
            }

            callPerExe(interpreter);
            return final
        }
    } 
    finally {
        stackHandler.finish(interpreter,parentReusables)
    }
}