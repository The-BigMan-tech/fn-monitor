import { monitor } from "../src/index.ts"


// Let us define the generator that we would like to monitor

function* yieldResult() {
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
            return [...yieldResult()]
        }
    },
    embed:{
        yieldResult:{
            ref:yieldResult
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

console.log([...monitoredFn()]);

/**
 *  Output
 *  ------
 *  yielded:  0
 *  yielded:  1
 *  yielded:  2
 *  yielded:  3
 *  yielded:  4
 *  yielded:  5
 *  yielded:  6
 *  yielded:  7
 *  yielded:  8
 *  yielded:  9
 *  [
 *   0, 1, 2, 3, 4,
 *   5, 6, 7, 8, 9
 *  ]
*/