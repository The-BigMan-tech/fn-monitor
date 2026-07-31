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

import { SEEN, SvalPlus } from '../custom-types.ts'
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

function assertIsManualResult(value:any,manualResult:any) {
    if (value !== manualResult) {
        throw new Error(ansis.red(`[Synchronous Evaluator] Generator-based inspectors can only yield the result of the current node but saw: ${String(value)} instead of: ${String(manualResult)}.`))
    }
}
function assertIsDone(done:boolean | undefined) {
    if (!done) {
        throw new Error(ansis.red(`[Synchronous Evaluator] Generator-based inspectors can only yield once.`))
    }
}
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
    }
    const handler = evaluateOps[node.type];
    if (!handler) throw new Error(`${node.type} isn't implemented`);

    callOnStep(scope);

    if (!useModifiedEvaluator(scope)) {
        return handler(node,scope);
    };

    //only run this code after checking if it should use the modified evaluator to prevent creating unnecessary objects
    const interpreter:SvalPlus = scope.interpreter;
    const parentReusables = copyReusables(interpreter,'optional');

    try {
        stackHandler.start(interpreter)

        const response = callInspector(node, scope, handler);//call this before the node is executed
        //If you noticed,I didnt capture nor restore the reusables local to this evaluation because it runs to completion and the reusables wont be overwritten by another evaluation

        if (isGenerator(response)) {
            const next = response.next();//the generator must be advanced before evaluating the final result
            
            const final = executedManually(interpreter.reusables.result)
                ?interpreter.reusables.result
                :handler(node,scope)//must be done after calling next

            if (!pushedManually(interpreter.reusables.result)) {
                pushResult(interpreter,final);
            }
            
            const manualResult = interpreter.reusables.result//save it before marking the result as seen.this extra line is special just to the generator part under the normalized evaluator cuz its not needed in other branches as a medium for safety check.This allows this evaluator to support geerator inspectors that yield without crashing.
            interpreter.reusables.result = SEEN;//this will cause further calls to visit.execute to justifiably crash when the generator is resumed.So this must be done before resuming it.          

            if (!next.done) {
                assertIsManualResult(next.value,manualResult)
                const next2 = response.next(final);
                assertIsDone(next2.done);
            };

            callPerExe(interpreter);
            return final;
        }
        else {
            const final = executedManually(interpreter.reusables.result)
                ?interpreter.reusables.result
                :handler(node,scope)//must be done after calling next

            if (!pushedManually(interpreter.reusables.result)) {
                pushResult(interpreter,final);
            }
            interpreter.reusables.result = SEEN;

            callPerExe(interpreter);
            return final;
        }
    }finally {
        stackHandler.finish(interpreter,parentReusables)
    }
}
