import { monitor, LangEvent } from "../src/index.ts";

let lexicalAnchor:number | null = null;

function relativeDepth(anchor:number,event:LangEvent):number {
    return event.scope.depth - anchor
}
const fn = monitor({
    main: {
        ref: () => {
            const helper = ()=>{
                if (true) {
                    let x = 10;
                    x++;
                }
                return 10
            }
            helper()
        }
    },
    inspector: (visit):undefined => {
        const currentFn = visit.callStack().get(0)

        if (currentFn.name === "helper") { // enter the helper
            if (!lexicalAnchor) {
                visit.is('Any', event => {
                    lexicalAnchor = event.scope.depth;
                });
                return;
            }
            visit.is('UpdateExpression', event=>{
                const depth = relativeDepth(lexicalAnchor!,event)
                console.log('Lexical depth of helper\'s update expression: ',depth);
            })
            visit.is('ReturnStatement', event=>{
                const depth = relativeDepth(lexicalAnchor!,event)
                console.log('Lexical depth of helper\'s return statement: ',depth);
            })
        }
    }
});
fn()

/**
 *  Output
 *  ------
 *  Lexical depth of helper's update expression:  1
 *  Lexical depth of helper's return statement:  0
*/