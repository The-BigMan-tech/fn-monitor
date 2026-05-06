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

import { LAZY_NODE, Reusables, SvalPlus, UNASSIGNED } from '../monitored-events.ts'
import { 
    callMonitor, 
    captureReusables, 
    clearEvalStack, 
    isGenerator, // Use the Generator version
    restoreCapturedReusables 
} from '../monitor-functions.ts'

import chalk from 'chalk'

let evaluateOps: any

function* handleResult(iterator:Generator,interpreter:SvalPlus,capturedReusables:Reusables):Generator {
    const currentEvent = interpreter.reusables.currentEvent;
    let result = iterator.next();

    while (!result.done) {
        let input;
        try {
            input = yield result.value;// The error from .throw() enters here
        } catch (e) {
            restoreCapturedReusables(interpreter, capturedReusables);
            result = iterator.throw(e);
            continue;
        }
        restoreCapturedReusables(interpreter,capturedReusables)//call after the yield but before calling next to ensure that it always continues with the data it had before yielding.i dont use this in the regular evaluator because its not pausable
        result = iterator.next(input);
    }
    interpreter.reusables.exeStack.unshift({
        value:result.value,
        event:currentEvent
    });
    return result.value; 
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

    const depth = scope.scopeDepth;
    if (depth < 2) {//if we are in the generated code wrappers,just skip the extra evaluator logic entirely and send the result
        return yield* handler(node,scope);
    }

    const interpreter: SvalPlus = scope.interpreter;
    const parentReusables = captureReusables(interpreter, scope);

    try {
        const feedback = callMonitor(node, scope, handler);
        const localCapturedReusables = captureReusables(interpreter, scope);//capture it after the call to the monitor has reassigned them
        
        if (interpreter.reusables.evalStack.value <= 0) {
            console.log('\n\nCLEARED EXE STACK');
            interpreter.reusables.exeStack.clear();
        }
        interpreter.reusables.evalStack.value += 1;
        
        if (isGenerator(feedback)) {
            const next = feedback.next();
            const result = (interpreter.reusables.result === UNASSIGNED)//this result variable must be called strictly after resuming the generator if the listener is a generator
                ?yield* handleResult(handler(node,scope),interpreter,localCapturedReusables)
                :yield* handleResult(interpreter.reusables.result,interpreter,localCapturedReusables);

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
        const result = (interpreter.reusables.result === UNASSIGNED)//this result variable must be called strictly after resuming the generator if the listener is a generator
            ?yield* handleResult(handler(node,scope),interpreter,localCapturedReusables)
            :yield* handleResult(interpreter.reusables.result,interpreter,localCapturedReusables);
        
        return result;
    } 
    finally {
        interpreter.reusables.evalStack.value -= 1;
        console.log('EVAL STACK: ',interpreter.reusables.evalStack.value);
        if (interpreter.reusables.evalStack.value <= 0) {
            clearEvalStack(interpreter);
        } else {
            restoreCapturedReusables(interpreter, parentReusables);
        }
    }
}