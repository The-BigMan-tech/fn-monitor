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

import {Node as EsNode} from "estree";
import { SvalPlus, UNASSIGNED } from '../monitored-events.ts'
import { callMonitor, captureReusables, cleanStack,isGenerator, pushResult, refreshExeStack, restoreCapturedReusables } from '../monitor-functions.ts'
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

    const depth = scope.scopeDepth;
    if (depth < 2) {//if we are in the generated code wrappers,just skip the extra evaluator logic entirely and send the result
        return handler(node,scope);
    }

    const interpreter:SvalPlus = scope.interpreter;
    const parentReusables = captureReusables(interpreter)

    try {
        interpreter.reusables.nonVolatile.evalStack.value += 1;
        console.log(chalk.yellow.underline('\n\nCALLED MONITOR'));
        const feedback = callMonitor(node, scope, handler);

        if (isGenerator(feedback)) {
            const next = feedback.next();
            
            const result = (interpreter.reusables.result === UNASSIGNED)//must be done after calling next
                ?handler(node,scope)
                :interpreter.reusables.result

            if (!next.done) {
                if (next.value !== interpreter.reusables.result) {
                    throw new Error(chalk.red(`For an eager node,LangListeners that are generators can only yield the result of that node to be consistent.`))
                }
                const next2 = feedback.next(result);
                if (!next2.done) {
                    throw new Error(chalk.red(`In Eager Node:LangListeners that are generators can only yield once.`))
                }
            }
            console.log(`\nRESULT OF "${interpreter.reusables.node!.type}" :`, result);

            refreshExeStack(interpreter);//call this only after the listener sees the last exe stack before it gets possibly cleared but before any exe results that belong to the next stack iteration is pushed so that they dont get cleared prematurely
            pushResult(interpreter,result,(node as EsNode).type);

            return result;
        }
        else {
            const result = (interpreter.reusables.result === UNASSIGNED)
                ?handler(node,scope)
                :interpreter.reusables.result

            console.log(`\nRESULT OF "${interpreter.reusables.node!.type}" :`, result);

            refreshExeStack(interpreter);
            pushResult(interpreter,result,(node as EsNode).type);

            return result;
        }
    }finally {
        console.log('called finally');
        cleanStack(interpreter,parentReusables)
    }
}
