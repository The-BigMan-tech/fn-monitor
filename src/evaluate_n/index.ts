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
import { callMonitor, Reusables, SvalPlus, UNASSIGNED } from '../monitored-events.ts'

let evaluateOps: any

function handleResult(node:Node,scope:Scope,handler:any) {
    if (handler) {
        const interpreter:SvalPlus = scope.interpreter;
        if (interpreter.reusables.thrown !== UNASSIGNED) {
            throw interpreter.reusables.thrown;
        }
        return (interpreter.reusables.result !== UNASSIGNED)
            ?interpreter.reusables.result
            :handler(node,scope);//if the listener doesnt explicitly execute the node,the interpreter will do it implicitly
    } else {
        throw new Error(`${node.type} isn't implemented`)
    }
}
function clearEvalStack(interpreter:SvalPlus) {
    interpreter.reusables.node = null;
    interpreter.reusables.svalScope = null;
    interpreter.reusables.handler = null;
    interpreter.reusables.result = UNASSIGNED;
    interpreter.reusables.thrown = UNASSIGNED;
    interpreter.svalVisit.matched = false;
}
interface PrevValues extends Reusables {
    evalStack:0,
    matched:boolean
}
function restorePrevReusables(interpreter:SvalPlus,prevReusables:PrevValues) {
    interpreter.reusables.node = prevReusables.node;
    interpreter.reusables.svalScope = prevReusables.svalScope;
    interpreter.reusables.handler = prevReusables.handler;
    interpreter.reusables.result = prevReusables.result;
    interpreter.reusables.thrown = prevReusables.thrown;
    interpreter.svalVisit.matched = prevReusables.matched;
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
    const interpreter:SvalPlus = scope.interpreter;

    const prevReusables:PrevValues = {
        evalStack:0,
        node: interpreter.reusables.node,
        svalScope:scope,
        handler: interpreter.reusables.handler,
        result: interpreter.reusables.result,
        thrown: interpreter.reusables.thrown,
        matched: interpreter.svalVisit.matched
    };

    try {
        interpreter.reusables.evalStack += 1;
        callMonitor(node,scope,handler);
        return handleResult(node,scope,handler);
    }finally {
        interpreter.reusables.evalStack -= 1;
        if (interpreter.reusables.evalStack === 0) {
            clearEvalStack(interpreter)
        }else {
            restorePrevReusables(interpreter,prevReusables)
        }
    }
}
