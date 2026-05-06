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
import { callMonitor, captureReusables, clearEvalStack,isGenerator, restoreCapturedReusables } from '../monitor-functions.ts'
import chalk from 'chalk'

let evaluateOps: any

export function pushResult(interpreter:SvalPlus,result:any) {
    const currentEvent = interpreter.reusables.currentEvent;
    interpreter.reusables.exeStack.unshift({
        value:result,
        event:currentEvent
    });
    return result;
}
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
    const parentReusables = captureReusables(interpreter,scope)

    try {
        const feedback = callMonitor(node, scope, handler);
        if (interpreter.reusables.evalStack.value <= 0) {
            console.log('\n\nCLEARED EXE STACK');
            interpreter.reusables.exeStack.clear();//since the listener can only ever see the last exe stack,we only clear it after theyve seen it and not immediately after its filled with values
        }
        interpreter.reusables.evalStack.value += 1;

        if (isGenerator(feedback)) {
            const next = feedback.next();
            const result = (interpreter.reusables.result === UNASSIGNED)//must be done after calling next
                ?pushResult(interpreter,handler(node,scope))
                :pushResult(interpreter,interpreter.reusables.result)

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
        const result = (interpreter.reusables.result === UNASSIGNED)
            ?pushResult(interpreter,handler(node,scope))
            :pushResult(interpreter,interpreter.reusables.result)

        return result;
    }
    finally {
        interpreter.reusables.evalStack.value -= 1;
        console.log('EVAL STACK: ',interpreter.reusables.evalStack.value);
        if (interpreter.reusables.evalStack.value <= 0) {
            clearEvalStack(interpreter)
        }else {
            restoreCapturedReusables(interpreter,parentReusables)
        }
    }
}
