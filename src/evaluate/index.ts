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
    SEEN, 
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
    useModifiedEvaluator, // Use the Generator version
} from '../lifecycle-functions.ts'


function assertIsLazy(value:any) {
    if (value !== LAZY_NODE) {
        throw new Error(ansis.red(`In Generator Evaluator: When the interpreter visit a LAZY_NODE,generator-based inspectors can only yield that lazy node but saw ${String(value)}.`))
    };
}
function assertIsDone(done:boolean | undefined) {
    if (!done) {
        throw new Error(ansis.red(`In Generator Evaluator: Generator-based inspectors can only yield once.`))
    }
}
function* higherHandler(iterator:Generator,interpreter:SvalPlus,localReusables:Reusables):Generator {
    let iterResult = iterator.next();

    while (!iterResult.done) {
        let feedback;
        try {
            feedback = yield iterResult.value;
            overwriteReusables(interpreter,localReusables);//since this is a generator,an arbitary amount of time would have passed between when it yielded and when it got resumed.another monitored fn would have ran.so we restore the localReusables to prevent state bugs
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

    const interpreter:SvalPlus = scope.interpreter;
    if (interpreter.onStep) {
        interpreter.onStep();
    }

    if (!useModifiedEvaluator(scope)) {
        return yield* handler(node,scope);
    }

    //only run this code after checking if it should use the modified evaluator to prevent creating unnecessary objects
    const parentReusables = copyReusables(interpreter);
    const currentReusables = interpreter.reusables;
    
    try {
        stackHandler.start(interpreter)

        const response = callInspector(node, scope, handler);
        const localReusables = copyReusables(interpreter);//capture the reusbales after the callInspector method has updated it to the local node and scope

        if (isGenerator(response)) {
            const next = response.next();

            const final = executedManually(currentReusables.result)//this result variable must be called strictly after resuming the generator if the inspector is a generator
                ?yield* higherHandler(
                    currentReusables.result,
                    interpreter,
                    localReusables
                )
                :yield* higherHandler(
                    handler(node,scope),
                    interpreter,
                    localReusables
                );

            if (!pushedManually(currentReusables.result)) pushResult(interpreter,final);
            currentReusables.result = SEEN;//this will cause further calls to visit.execute to justifiably crash when the generator is resumed.So this must be done before resuming it.
            
            if (!next.done) {
                assertIsLazy(next.value)
                const next2 = response.next(final);
                assertIsDone(next2.done)
            };
            callPerExe(interpreter);
            return final;
        }
        else {
            const final = executedManually(currentReusables.result)
                ?yield* higherHandler(
                    currentReusables.result,
                    interpreter,
                    localReusables
                )
                :yield* higherHandler(
                    handler(node,scope),
                    interpreter,
                    localReusables
                );

            if (!pushedManually(currentReusables.result)) pushResult(interpreter,final);
            currentReusables.result = SEEN;
            
            callPerExe(interpreter);
            return final;
        }
    } 
    finally {
        stackHandler.finish(interpreter,parentReusables)
    }
}