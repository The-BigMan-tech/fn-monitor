import * as acorn from 'acorn'
import Scope from '../scope/index.ts'

export function Literal(node: acorn.Literal, scope: Scope) {
  // create a new RegExp instance for regex literals to avoid lastIndex caching issues
  // when a regex has the global flag, reusing the same RegExp object causes lastIndex
  // to persist between calls, leading to incorrect results
  if (node.regex) {
    return new RegExp(node.regex.pattern, node.regex.flags)
  }
  return node.value
}
