import { monitor } from "../src/index.ts"


// Let us define the generator that we would like to monitor

function* getResult() {
    for (let i=0;i<10;i++) {
        yield i
    }
}

/** 
    If a monitored sync or async function fully consumes an embedded generator 
    (rather than captured), the generator's internals — including YieldExpression 
    nodes — become visible to the inspector.   
    
    Note that the consuming function itself cannot be a generator; if it is, the
    native JS engine reclaims control of the iteration and the inspector goes blind.
*/

const monitoredFn = monitor({
    main:{
        ref:()=> {
            return [...getResult()]
        }
    },
    embed:{
        getResult:{
            ref:getResult
        }
    },
    inspector:(visit):undefined =>{
        /** 
            This example uses `visit.is('Any',...) to prevent typescript complaints when 
            pasting it with version 1.2.x of the package.

            If you are using v1.3.0, please prefer to use `visit.is('YieldExpression',...)` 
            as it saves more memory
        */
        visit.is('Any',(event)=>{
            if (event.node.type === "YieldExpression") {
                const yieldedVar = event.node.argument;
                const search = event.scope.variables.search;

                if (yieldedVar?.type === "Identifier") {
                    console.log('yielded: ',search(yieldedVar.name));
                }
            }
        })
    }
})

console.log([...monitoredFn()]);

//Run it and see the output. 
//You should see the array printed as well as the extra logs for each yield statement
