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

import { LAZY_NODE, SvalPlus } from '../monitored-events.ts'
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
        interpreter.reusables.evalStack += 1;

        const feedback = callMonitor(node, scope, handler);
        const isGen = isGenerator(feedback);
        
        if (isGen) {
            const next = feedback.next();
            if (!next.done) {
                if (next.value !== LAZY_NODE) throw new Error(chalk.red(`LangListeners that are generators can only yield lazy nodes.`))
                const result = yield* handleGeneratorResult(scope,interpreter.reusables.result);
                feedback.next(result);
                return result;
            }
            return yield* handleGeneratorResult(scope,handler(node,scope));
        }
        return yield* handleGeneratorResult(scope,handler(node,scope));
    } 
    finally {
        interpreter.reusables.evalStack -= 1;
        if (interpreter.reusables.evalStack === 0) {
            clearEvalStack(interpreter);
        } else {
            restorePrevReusables(interpreter, prevReusables);
        }
    }
}