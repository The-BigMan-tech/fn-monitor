import Scope from "./scope/index.ts";
import { Node } from "acorn";

export function callListener(node:Node,scope:Scope<{langListener:LangListener}>) {
    const interpreter = scope.interpreter;
    if (!scope.hasParent()) {
        return;//we dont want to track any action thats not inside the function marked with a langpoint
    }
    if (interpreter && interpreter.langListener) {
        interpreter.langListener({
            type: node.type,
            node: node,
            scope: scope
        });
    }
}
export class LangEvent {

}
export type LangListener = (event:LangEvent)=>void;