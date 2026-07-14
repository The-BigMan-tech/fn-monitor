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

import { LAZY_NODE, Reusables, SEEN, SvalPlus, UNASSIGNED } from '../custom-types.ts'
import { 
    callMonitor, 
    callPerExe, 
    captureReusables, 
    cleanStack, 
    isGenerator, pushHandler, pushResult, refreshExeStack,
    useModifiedEvaluator, // Use the Generator version
} from '../helper-functions.ts'

import chalk from 'chalk'

let evaluateOps: any

function* higherHandler(iterator:Generator,interpreter:SvalPlus):Generator {
    let result = iterator.next();
    while (!result.done) {
        let input;
        try {
            input = yield result.value;// The error from .throw() enters here
        }catch (e) {
            result = iterator.throw(e);
            continue;
        }
        result = iterator.next(input);
    }
    const final = result.value;
    if (interpreter.reusables.result !== UNASSIGNED) {//this is true if visit.execute was called
        pushResult(interpreter,final)//the node cant be null during an evaluator call
    }
    return final; 
}

export default function* evaluate(node: Node, scope: Scope) {
    if (!node) return
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
    }
    const handler = evaluateOps[node.type];
    if (!handler) throw new Error(`${node.type} isn't implemented`);

    if (!useModifiedEvaluator(scope)) {
        return yield* handler(node,scope);
    }

    const interpreter: SvalPlus = scope.interpreter;
    const parentReusables = captureReusables(interpreter);

    try {
        interpreter.reusables.shared.evalStack.value += 1;
        // console.log(chalk.yellow.underline('\n\nCALLED MONITOR'));
        const feedback = callMonitor(node, scope, handler);

        if (isGenerator(feedback)) {
            const next = feedback.next();
            const executedManually = (interpreter.reusables.result !== UNASSIGNED);

            const result = executedManually//this result variable must be called strictly after resuming the generator if the listener is a generator
                ?yield* higherHandler(interpreter.reusables.result,interpreter)
                :yield* higherHandler(handler(node,scope),interpreter);

            interpreter.reusables.result = SEEN;//this will cause further calls to visit.execute to justifiably crash

            if (!next.done) {
                if (next.value !== LAZY_NODE) {
                    throw new Error(chalk.red(`For a lazy node,LangListeners that are generators can only yield that lazy node but saw ${String((next as IteratorResult<any>).value)}.`))
                }
                const next2 = feedback.next(result);
                if (!next2.done) {
                    throw new Error(chalk.red(`In Lazy Node:LangListeners that are generators can only yield once.`))
                }
            }
            // console.log(`\nRESULT OF "${interpreter.reusables.node!.type}" :`, result);

            const wasCleared = refreshExeStack(interpreter);//the order here is important.refresh it after the whole generator finishes so that it doesnt clear mid-execution of the listener.But it must be done before pushing the new result so that it doesnt become part of the old values in the stack.
            const pushedManually = executedManually && !wasCleared
            
            pushHandler(interpreter,result,pushedManually);
            callPerExe(interpreter);

            return result;
        }
        else {
            const executedManually = (interpreter.reusables.result !== UNASSIGNED);
            const result = executedManually
                ?yield* higherHandler(interpreter.reusables.result,interpreter)
                :yield* higherHandler(handler(node,scope),interpreter);
            interpreter.reusables.result = SEEN
            
            // console.log(`\nRESULT OF "${interpreter.reusables.node!.type}" :`, result);

            const wasCleared = refreshExeStack(interpreter);
            const pushedManually = executedManually && !wasCleared
            
            pushHandler(interpreter,result,pushedManually);
            callPerExe(interpreter);

            return result;
        }
    } 
    finally {
        // console.log('called finally');
        cleanStack(interpreter,parentReusables)
    }
}