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
import { Reusables, SvalPlus, UNASSIGNED } from '../monitored-events.ts'
import { callMonitor, captureReusables, clearEvalStack, handleResult, restorePrevReusables } from '../monitor-functions.ts'

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

    const interpreter:SvalPlus = scope.interpreter;
    const prevReusables = captureReusables(interpreter,scope)
    
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
