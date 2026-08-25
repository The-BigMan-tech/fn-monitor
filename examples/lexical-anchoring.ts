import { 
    monitor,
    LangEvent,
    VarDeclEvent
} from "../src/index.ts";

const anchor = {
    write:(varName:string,event:VarDeclEvent) => {
        const node = event.node;
        const scope = event.scope;
        const lexicalAnchor = scope.variables.search(varName);

        if (typeof lexicalAnchor !== "number") {
            node.declarations.forEach(decl=>{
                const isLexicalDepth = (decl.id.type === 'Identifier') && (decl.id.name === varName);
                if (isLexicalDepth) {
                    if (decl.init?.type === "Literal") {
                        decl.init.value = scope.depth;
                        decl.init.raw = scope.depth.toString();
                    }
                }
            })
        }
    },
    getRelativeDepth:(varName:string,event:LangEvent):number | null => {
        const scope = event.scope;
        const lexicalAnchor = scope.variables.search(varName) as number | null;
        if (typeof lexicalAnchor !== "number") {
            return null
        }
        return scope.depth - lexicalAnchor
    }
}

const fn = monitor({
    main: {
        ref: () => {
            const helper = ()=>{
                let lexicalAnchor = null;// artifically insert our anchor
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
            const lexicalAnchorLabel = 'lexicalAnchor';

            visit.is('VariableDeclaration',event=>{
                anchor.write(lexicalAnchorLabel,event);
            })
            visit.is('UpdateExpression', event=>{
                const depth = anchor.getRelativeDepth(lexicalAnchorLabel,event)
                console.log('Lexical depth of helper\'s update expression: ',depth);
            })
            visit.is('ReturnStatement', event=>{
                const depth = anchor.getRelativeDepth(lexicalAnchorLabel,event)
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