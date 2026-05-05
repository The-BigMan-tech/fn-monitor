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

import { LAZY_NODE, SvalPlus, UNASSIGNED } from '../monitored-events.ts'
import { 
    callMonitor, 
    captureReusables, 
    clearEvalStack, 
    handleGeneratorResult, isGenerator, // Use the Generator version
    restorePrevReusables 
} from '../monitor-functions.ts'

import chalk from 'chalk'

let evaluateOps: any

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

    const interpreter: SvalPlus = scope.interpreter;
    const prevReusables = captureReusables(interpreter, scope);

    try {
        //i know that it looks like im repeating the same code concerning the result but because the timing of when the result is evaluated based on the type of listener is important,i have to do this.Unless i use lazy closures but i dont want js to allocate more memory just for that
        interpreter.reusables.evalStack += 1;
        const feedback = callMonitor(node, scope, handler);

        if (isGenerator(feedback)) {
            const next = feedback.next();
            const result = (interpreter.reusables.result === UNASSIGNED)//this result variable must be called strictly after resuming the generator if the listener is a generator
                ?yield* handleGeneratorResult(scope,handler(node,scope))
                :yield* handleGeneratorResult(scope,interpreter.reusables.result)
            
            interpreter.reusables.exeStack.unshift({
                value:result,
                event:interpreter.reusables.currentEvent!
            });

            if (!next.done) {
                if (next.value !== LAZY_NODE) {
                    throw new Error(chalk.red(`For lazy nodes,LangListeners that are generators can only yield that node.`))
                }
                const next2 = feedback.next(result);
                if (!next2.done) {
                    throw new Error(chalk.red(`In Lazy Node:LangListeners that are generators can only yield once.`))
                }
            }
            return result;
        }
        const result = (interpreter.reusables.result === UNASSIGNED)
            ?yield* handleGeneratorResult(scope,handler(node,scope))
            :yield* handleGeneratorResult(scope,interpreter.reusables.result)
        
        interpreter.reusables.exeStack.unshift({
            value:result,
            event:interpreter.reusables.currentEvent!
        });
        return result;
    } 
    finally {
        interpreter.reusables.evalStack -= 1;
        if (interpreter.reusables.evalStack <= 0) {
            clearEvalStack(interpreter);
        } else {
            restorePrevReusables(interpreter, prevReusables);
        }
    }
}