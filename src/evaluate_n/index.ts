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

import { SEEN, SvalPlus, UNASSIGNED } from '../monitored-events.ts'
import { callMonitor, captureReusables, cleanStack,isGenerator,  refreshExeStack, restoreCapturedReusables,pushHandler, callPerExe, useModifiedEvaluator } from '../monitor-functions.ts'
import chalk from 'chalk'

let evaluateOps: any

export default function evaluate(node: Node, scope: Scope) {
    if (!node) return;
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
    }
    const handler = evaluateOps[node.type];
    if (!handler) throw new Error(`${node.type} isn't implemented`);

    if (!useModifiedEvaluator(scope)) {
        return handler(node,scope);
    }
    
    const interpreter:SvalPlus = scope.interpreter;
    const parentReusables = captureReusables(interpreter);

    try {
        interpreter.reusables.shared.evalStack.value += 1;
        // console.log(chalk.yellow.underline('\n\nCALLED MONITOR'));
        const feedback = callMonitor(node, scope, handler);

        if (isGenerator(feedback)) {
            const next = feedback.next();
            const executedManually = (interpreter.reusables.result !== UNASSIGNED);

            const result = executedManually
                ?interpreter.reusables.result
                :handler(node,scope)//must be done after calling next

            const manuallyExecutedResult = interpreter.reusables.result;//save it before marking it as seen.this extra line is special just to the generator part under the regular evaluator cuz its not needed in other branches as a medium for safety check
            interpreter.reusables.result = SEEN;//this will cause further calls to visit.execute to justifiably crash
            
            if (!next.done) {
                if (next.value !== manuallyExecutedResult) {
                    throw new Error(chalk.red(`For an eager node,LangListeners that are generators can only yield the result of that node to be consistent but saw: ${String(next.value)} instead of: ${String(interpreter.reusables.result)}.`))
                }
                const next2 = feedback.next(result);
                if (!next2.done) {
                    throw new Error(chalk.red(`In Eager Node:LangListeners that are generators can only yield once.`))
                }
            }
            // console.log(`\nRESULT OF "${interpreter.reusables.node!.type}" :`, result);

            const wasCleared = refreshExeStack(interpreter);//call this only after the listener sees the latest exe stack before it gets possibly cleared but before any exe results that belong to the next stack iteration is pushed so that they dont get cleared prematurely
            const pushedManually = executedManually && !wasCleared
            
            pushHandler(interpreter,result,pushedManually);
            callPerExe(interpreter);

            return result;
        }
        else {
            const executedManually = (interpreter.reusables.result !== UNASSIGNED);

            const result = executedManually
                ?interpreter.reusables.result
                :handler(node,scope)//must be done after calling next
            interpreter.reusables.result = SEEN;

            // console.log(`\nRESULT OF "${interpreter.reusables.node!.type}" :`, result);

            const wasCleared = refreshExeStack(interpreter);
            const pushedManually = executedManually && !wasCleared
            
            pushHandler(interpreter,result,pushedManually);
            callPerExe(interpreter);

            return result;
        }
    }finally {
        // console.log('called finally');
        cleanStack(interpreter,parentReusables)
    }
}
