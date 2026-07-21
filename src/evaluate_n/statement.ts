// @ts-nocheck

import { BREAK, CONTINUE, RETURN, AWAIT } from '../share/const.ts'
import { hoist, pattern, ForXHandler } from './helper.ts'
import { getAsyncIterator } from '../share/util.ts'
import Scope from '../scope/index.ts'
import evaluate from './index.ts'
import * as acorn from 'acorn'

export function ExpressionStatement(node: acorn.ExpressionStatement, scope: Scope) {
  evaluate(node.expression, scope)
}

export interface LabelOptions {
  label?: string
}

export interface BlockOptions {
  invasived?: boolean
  hoisted?: boolean
}

export function BlockStatement(
  block: acorn.BlockStatement | acorn.StaticBlock,
  scope: Scope,
  options: BlockOptions & LabelOptions = {},
) {
  const {
    invasived = false,
    hoisted = false,
  } = options

  const subScope = invasived ? scope : new Scope(scope)

  if (!hoisted) {
    hoist(block, subScope, { onlyBlock: true })
  }

  for (let i = 0; i < block.body.length; i++) {
    const result = evaluate(block.body[i], subScope)
    if (result === BREAK) {
      if (result.LABEL && result.LABEL === options.label) {
        // only labeled break to current block statement doesn't bubble up the result
        break
      }
      return result
    }
    if (result === CONTINUE || result === RETURN) {
      return result
    }
  }
}

export function EmptyStatement(): any {
  // No operation here
}

export function DebuggerStatement(): any {
  debugger
}

export function ReturnStatement(node: acorn.ReturnStatement, scope: Scope) {
  RETURN.RES = node.argument ? (evaluate(node.argument, scope)) : undefined
  return RETURN
}

export function BreakStatement(node: acorn.BreakStatement) {
  BREAK.LABEL = node.label?.name
  return BREAK
}

export function ContinueStatement(node: acorn.ContinueStatement) {
  CONTINUE.LABEL = node.label?.name
  return CONTINUE
}

export function LabeledStatement(node: acorn.LabeledStatement, scope: Scope) {
  const label = node.label.name
  if (node.body.type === 'WhileStatement') {
    return WhileStatement(node.body, scope, { label })
  }
  if (node.body.type === 'DoWhileStatement') {
    return DoWhileStatement(node.body, scope, { label })
  }
  if (node.body.type === 'ForStatement') {
    return ForStatement(node.body, scope, { label })
  }
  if (node.body.type === 'ForInStatement') {
    return ForInStatement(node.body, scope, { label })
  }
  if (node.body.type === 'ForOfStatement') {
    return ForOfStatement(node.body, scope, { label })
  }
  if (node.body.type === 'BlockStatement') {
    return BlockStatement(node.body, scope, { label })
  }
  if (node.body.type === 'WithStatement') {
    return WithStatement(node.body, scope, { label })
  }
  if (node.body.type === 'IfStatement') {
    return IfStatement(node.body, scope, { label })
  }
  if (node.body.type === 'SwitchStatement') {
    return SwitchStatement(node.body, scope, { label })
  }
  if (node.body.type === 'TryStatement') {
    return TryStatement(node.body, scope, { label })
  }
  throw new SyntaxError(`${node.body.type} cannot be labeled`)
}

export function WithStatement(node: acorn.WithStatement, scope: Scope, options: LabelOptions = {}) {
  const withScope = new Scope(scope)
  withScope.with(evaluate(node.object, scope))
  const result = evaluate(node.body, withScope)
  if (result === BREAK) {
    if (result.LABEL && result.LABEL === options.label) {
      // only labeled break to current with statement doesn't bubble up the result
      return
    }
    return result
  }
  if (result === CONTINUE || result === RETURN) {
    return result
  }
}

export function IfStatement(node: acorn.IfStatement, scope: Scope, options: LabelOptions = {}) {
  let result

  if (evaluate(node.test, scope)) {
    result = evaluate(node.consequent, scope)
  } else {
    result = evaluate(node.alternate, scope)
  }

  if (result === BREAK) {
    if (result.LABEL && result.LABEL === options.label) {
      // only labeled break to current if statement doesn't bubble up the result
      return
    }
    return result
  }
  if (result === CONTINUE || result === RETURN) {
    return result
  }
}

export function SwitchStatement(node: acorn.SwitchStatement, scope: Scope, options: LabelOptions = {}) {
  const discriminant = evaluate(node.discriminant, scope)

  // Per ECMAScript spec, first check all case clauses for a match,
  // then fall back to default only if no case matched
  let matched = false
  let defaultIndex = -1
  for (let i = 0; i < node.cases.length; i++) {
    const eachCase = node.cases[i]
    if (!eachCase.test) {
      defaultIndex = i
    } else if (
      !matched
      && (evaluate(eachCase.test, scope)) === discriminant
    ) {
      matched = true
      defaultIndex = -1 // a case matched, ignore default
    }
    if (matched) {
      const result = SwitchCase(eachCase, scope)
      if (result === BREAK) {
        if (result.LABEL === options.label) {
          break
        }
        return result
      }
      if (result === CONTINUE || result === RETURN) {
        return result
      }
    }
  }

  // No case matched, fall through from default if present
  if (!matched && defaultIndex !== -1) {
    for (let i = defaultIndex; i < node.cases.length; i++) {
      const result = SwitchCase(node.cases[i], scope)
      if (result === BREAK) {
        if (result.LABEL === options.label) {
          break
        }
        return result
      }
      if (result === CONTINUE || result === RETURN) {
        return result
      }
    }
  }
}

export function SwitchCase(node: acorn.SwitchCase, scope: Scope) {
  for (let i = 0; i < node.consequent.length; i++) {
    const result = evaluate(node.consequent[i], scope)
    if (result === BREAK || result === CONTINUE || result === RETURN) {
      return result
    }
  }
}

export function ThrowStatement(node: acorn.ThrowStatement, scope: Scope) {
  throw evaluate(node.argument, scope)
}

export function TryStatement(node: acorn.TryStatement, scope: Scope, options: LabelOptions = {}) {
  let result

  try {
    result = BlockStatement(node.block, scope)
  } catch (err) {
    if (node.handler) {
      const subScope = new Scope(scope)
      const param = node.handler.param
      if (param) {
        if (param.type === 'Identifier') {
          const name = param.name
          subScope.var(name, err)
        } else {
          pattern(param, scope, { feed: err })
        }
      }
      result = CatchClause(node.handler, subScope)
    } else {
      throw err
    }
  } finally {
    if (node.finalizer) {
      result = BlockStatement(node.finalizer, scope)
    }
  }

  if (result === BREAK) {
    if (result.LABEL && result.LABEL === options.label) {
      // only labeled break to current try statement doesn't bubble up the result
      return
    }
    return result
  }
  if (result === CONTINUE || result === RETURN) {
    return result
  }
}

export function CatchClause(node: acorn.CatchClause, scope: Scope) {
  return BlockStatement(node.body, scope, { invasived: true })
}

export function WhileStatement(node: acorn.WhileStatement, scope: Scope, options: LabelOptions = {}) {
  while (evaluate(node.test, scope)) {
    const result = evaluate(node.body, scope)
    if (result === BREAK) {
      if (result.LABEL === options.label) {
        break
      }
      return result
    } else if (result === CONTINUE) {
      if (result.LABEL === options.label) {
        continue
      }
      return result
    } else if (result === RETURN) {
      return result
    }
  }
}

export function DoWhileStatement(node: acorn.DoWhileStatement, scope: Scope, options: LabelOptions = {}) {
  do {
    const result = evaluate(node.body, scope)
    if (result === BREAK) {
      if (result.LABEL === options.label) {
        break
      }
      return result
    } else if (result === CONTINUE) {
      if (result.LABEL === options.label) {
        continue
      }
      return result
    } else if (result === RETURN) {
      return result
    }
  } while (evaluate(node.test, scope))
}

export function ForStatement(node: acorn.ForStatement, scope: Scope, options: LabelOptions = {}) {
  const forScope = new Scope(scope)
  
  for (
    node.init ? evaluate(node.init, forScope) : undefined;
    node.test ? (evaluate(node.test, forScope)) : true;
    node.update ? evaluate(node.update, forScope) : undefined
  ) {
    const subScope = new Scope(forScope)
    let result: any
    if (node.body.type === 'BlockStatement') {
      result = BlockStatement(node.body, subScope, { invasived: true })
    } else {
      result = evaluate(node.body, subScope)
    }

    if (result === BREAK) {
      if (result.LABEL === options.label) {
        break
      }
      return result
    } else if (result === CONTINUE) {
      if (result.LABEL === options.label) {
        continue
      }
      return result
    } else if (result === RETURN) {
      return result
    }
  }
}

export function ForInStatement(node: acorn.ForInStatement, scope: Scope, options: LabelOptions = {}) {
  for (const value in evaluate(node.right, scope)) {
    const result = ForXHandler(node, scope, { value })
    if (result === BREAK) {
      if (result.LABEL === options.label) {
        break
      }
      return result
    } else if (result === CONTINUE) {
      if (result.LABEL === options.label) {
        continue
      }
      return result
    } else if (result === RETURN) {
      return result
    }
  }
}

export function ForOfStatement(node: acorn.ForOfStatement, scope: Scope, options: LabelOptions = {}): any {
  const right = evaluate(node.right, scope)
  
    for (const value of right) {
      const result = ForXHandler(node, scope, { value })
      if (result === BREAK) {
        if (result.LABEL === options.label) {
          break
        }
        return result
      } else if (result === CONTINUE) {
        if (result.LABEL === options.label) {
          continue
        }
        return result
      } else if (result === RETURN) {
        return result
      }
    }
  
}
