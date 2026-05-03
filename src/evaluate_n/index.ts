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
import { callMonitor, captureReusables, clearEvalStack, handleResult, isGenerator, restorePrevReusables } from '../monitor-functions.ts'
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

    const interpreter:SvalPlus = scope.interpreter;
    const prevReusables = captureReusables(interpreter,scope)

    try {
        interpreter.reusables.evalStack += 1;

        const feedback = callMonitor(node, scope, handler);

        if (isGenerator(feedback)) {
            const next = feedback.next();
            const result = (interpreter.reusables.result === UNASSIGNED)//must be done after calling next
                ?handleResult(scope,handler(node,scope))
                :handleResult(scope,interpreter.reusables.result)

            if (!next.done) {
                if (next.value !== interpreter.reusables.result) {
                    throw new Error(chalk.red(`For an eager node,LangListeners that are generators can only yield the result of that node to be consistent.`))
                }
                const next2 = feedback.next(result);
                if (!next2.done) {
                    throw new Error(chalk.red(`In Eager Node:LangListeners that are generators can only yield once.`))
                }
            }
            return result;
        }
        return (interpreter.reusables.result === UNASSIGNED)
            ?handleResult(scope,handler(node,scope))
            :handleResult(scope,interpreter.reusables.result)
    }
    finally {
        interpreter.reusables.evalStack -= 1;
        if (interpreter.reusables.evalStack === 0) {
            clearEvalStack(interpreter)
        }else {
            restorePrevReusables(interpreter,prevReusables)
        }
    }
}
