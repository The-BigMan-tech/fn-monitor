/** 
 *  Historical Context
 *  __________________
 * 
 *  `visit.execute()` has been a core primitive of `fn-monitor` since the alpha stages.
 *  
 *  During that time, I introduced the `perExecution` hook because I assumed 
 *  that `visit.execute()` was strictly blocking — that you had to wait for the node 
 *  to finish executing before you could take any action.
 *  
 *  `perExecution` let me inject arbitrary logic as the node and its children were evaluated, 
 *  which felt like the only way to do it.
 *  
 *  Once I realized that my assumption was wrong, I saw that I could achieve the exact same 
 *  logic explicitly using `visit.execute()`. This is because the `inspector` actually fires 
 *  top-down as it walks **every** node even during a `visit.execute()` call .
 *  
 *  `perExecution` became redundant and its name is not accurate. Combined with its single-slot fragility, 
 *  it was ultimately a leaky abstraction.
 *  
 *  The single-slot semantics were deliberately chosen to prevent the massive memory 
 *  usage that comes from keeping distinct closures per node in memory.
*/


import { monitor } from "../src/index.ts";

/**
 * 💡 Both `firstPattern` and `secondPattern` will give identical results 
 * but the second one is preferable.
*/

/**
 * ❌ Using the deprecated `perExecution` hook.
 * 
 * Because it is a single-slot API, users must manually guard it with a boolean.
 * Since the actual execution is deferred, it has to capture the `event` to know when the owner node finally completes.
*/

let hasRegisteredHook = false;

const firstPattern = monitor({
    main:{
        ref:(a:number,b:number)=>{
            const topBinaryExpr = (a + b) * (a - b);
            return topBinaryExpr;
        }
    },
    beforeEachCall:()=>{
        hasRegisteredHook = false;
    },
    inspector:(visit)=>{
        visit.is('BinaryExpression', event => {
            if (hasRegisteredHook) return;

            const ownerNode = event.node;
            visit.perExecution = () => {
                const latestResult = visit.localExeStack().get(0);
                
                if (latestResult.node === ownerNode) {
                    console.log('Top Binary Expr Result: ', latestResult.evaluation);
                }else {
                    console.log('Node type: ', latestResult.type, ', Result: ', latestResult.evaluation);
                }
            }
            hasRegisteredHook = true;
        })
    }
})

console.log('\nFIRST PATTERN');
firstPattern(2,3);

/**
 *  Output
 *  ------
 *  Node type:  Identifier , Result:  2
 *  Node type:  Identifier , Result:  3
 *  Node type:  BinaryExpression , Result:  5
 *  Node type:  Identifier , Result:  2
 *  Node type:  Identifier , Result:  3
 *  Node type:  BinaryExpression , Result:  -1
 *  Top Binary Expr Result:  -5
*/


/** 
 * ✅ Explicit version with clearer intent and no magic behavior.
 * 
 * When we hit the first BinaryExpression, we mark it as the owner and execute it.
 * 
 * As we visit every node, we check if we're inside the owner's subtree before
 * executing and logging the node. Otherwise, it would log unrelated nodes.
 * 
 * We will then log the result of the owner.
*/

let insideOwnerSubtree = false;
let ownerNode: any = null;

const secondPattern = monitor({
    main:{
        ref:(a:number,b:number)=>{
            const topBinaryExpr = (a + b) * (a - b);
            return topBinaryExpr;
        }
    },
    beforeEachCall:()=>{
        insideOwnerSubtree = false;
        ownerNode = null;
    },
    inspector:(visit)=>{ 
        visit.is('BinaryExpression', event => {
            if (ownerNode) return;

            ownerNode = event.node;
            insideOwnerSubtree = true;
            try {
                visit.execute();
                const latestResult = visit.localExeStack().get(0);
                console.log('Top Binary Expr Result: ', latestResult.evaluation);
            }finally {
                insideOwnerSubtree = false;
            }
        });
        if (insideOwnerSubtree) {
            visit.execute();
            const latestResult = visit.localExeStack().get(0);
            console.log('Node type: ', latestResult.type, ', Result: ', latestResult.evaluation);
        }
    }
})

console.log('\nSECOND PATTERN');
secondPattern(2,3);

/**
 *  Output
 *  ------
 *  Node type:  Identifier , Result:  2
 *  Node type:  Identifier , Result:  3
 *  Node type:  BinaryExpression , Result:  5
 *  Node type:  Identifier , Result:  2
 *  Node type:  Identifier , Result:  3
 *  Node type:  BinaryExpression , Result:  -1
 *  Top Binary Expr Result:  -5
*/