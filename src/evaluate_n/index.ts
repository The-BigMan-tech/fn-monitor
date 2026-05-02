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
import { callMonitor,SvalPlus, UNASSIGNED } from '../monitored-events.ts'

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
    callMonitor(node,scope,handler);

    if (handler) {
        const interpreter:SvalPlus = scope.interpreter;
        if (interpreter.reusables.thrown !== UNASSIGNED) {
            throw interpreter.reusables.thrown;
        }
        return (interpreter.reusables.result !== UNASSIGNED)
            ?interpreter.reusables.result
            :handler(node, scope);//if the listener doesnt explicitly execute the node,the interpreter will do it implicitly
    } else {
        throw new Error(`${node.type} isn't implemented`)
    }
}
