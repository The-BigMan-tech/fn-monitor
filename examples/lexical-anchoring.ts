import { 
    monitor,
    LangEvent,
    VarDeclEvent
} from "../src/index.ts";

function writeLexicalAnchor(varName:string,event:VarDeclEvent) {
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
}
function depthRelativeToAnchor(varName:string,event:LangEvent):number | null {
    const scope = event.scope;
    const lexicalAnchor = scope.variables.search(varName) as number | null;
    if (typeof lexicalAnchor !== "number") {
        return null
    }
    return scope.depth - lexicalAnchor
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
        const lexicalAnchorLabel = 'lexicalAnchor';

        visit.is('VariableDeclaration',event=>{
            if (event.scope.callDepth > 0) {// enter our helper
                writeLexicalAnchor(lexicalAnchorLabel,event);
            }
        })
        visit.is('UpdateExpression', event=>{
            if (event.scope.callDepth > 0) {// the update expression in the helper
                const depth = depthRelativeToAnchor(lexicalAnchorLabel,event)
                console.log('Lexical depth of helper\'s update expression: ',depth);
            }
        })
        visit.is('ReturnStatement', event=>{
            if (event.scope.callDepth > 0) {// the return statement of our helper
                const depth = depthRelativeToAnchor(lexicalAnchorLabel,event)
                console.log('Lexical depth of helper\'s return statement: ',depth);
            }
        })
    }
});
fn()