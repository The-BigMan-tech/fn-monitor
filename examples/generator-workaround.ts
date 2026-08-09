import { monitor } from "../src/index.ts"


//Assuming that we have a generator that we would like to monitor

function* getResult() {
    for (let i=0;i<10;i++) {
        yield i
    }
}

//We can monitor the generator's internals by having a monitored sync or async function consume it while also having it embedded

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
        //This example uses `visit.is('Any',...) to prevent typescript complaints when pasting it with the v1.2.x series.
        //If you are using v1.3.0, please prefer to use `visit.is('YieldExpression',...)` as it saves more memory

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
