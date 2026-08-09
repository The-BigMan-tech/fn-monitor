import { monitor } from "../src/index.ts"


//Assuming that we have a generator that we would like to monitor

function* getResult() {
    for (let i=0;i<10;i++) {
        yield i
    }
}

//We can monitor the generator's internals by having a monitored sync or async function consume it

const monitoredFn = monitor({
    main:{
        ref:()=>{
            console.log([...getResult()]);
        }
    },
    embed:{
        getResult:{
            ref:getResult
        }
    },
    inspector:(visit):undefined =>{
        visit.is('YieldExpression',(event)=>{ 
            const yieldedVar = event.node.argument;
            const search = event.scope.variables.search;

            if (yieldedVar?.type === "Identifier") {
                console.log('yielded: ',search(yieldedVar.name));
            }
        })
    }
})
monitoredFn();

//Run it and see the output. 
//You should see the array printed as well as the extra logs for each yield statement
