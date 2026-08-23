import { monitor } from "../src/index.ts";


/**
 * Historical Context: `visit.execute()` has been a core primitive of `fn-monitor` 
 * since the alpha stages.
 * 
 * During that time, I introduced the `perExecution` hook because I assumed 
 * that `visit.execute()` was strictly blocking — that you had to wait for the node 
 * to finish before you could take any action.
 * 
 * The hook let me inject arbitrary logic as the node and its children evaluated, 
 * which felt like the only way to do it.
 * 
 * Once I realized that my assumption was wrong — the `inspector` actually fires top-down 
 * as it walks **every** node — I saw that I could achieve the exact same logic 
 * explicitly using `visit.execute()`.
 * 
 * `perExecution` became redundant. Combined with its single-slot fragility, 
 * it was ultimately a leaky abstraction.
 * 
 * The single-slot semantics were deliberately chosen to prevent the massive memory 
 * usage that comes from keeping distinct closures per node in memory.
*/


//💡 Both `fn1` and `fn2` will give identical results but `fn2` is the better pattern

/**
 * ❌ Using the deprecated `perExecution` hook.
 * 
 * Because it is a single-slot API, users must manually guard it with booleans 
 * and capture the `event` in a closure to know when the owner node finally completes.
 * This leaks the abstraction and forces unnecessary boilerplate.
*/
let hasRegisteredHook = false;

const fn1 = monitor({
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
            if (!hasRegisteredHook) {
                const ownerNode = event.node;
                
                visit.perExecution = () => {
                    const stack = visit.localExeStack();
                    const head = stack.get(0);
                    
                    if (head.node === ownerNode) {
                        console.log('Top Binary Expr Result: ', head.evaluation);
                    }else {
                        console.log('Node type: ', head.type, ', Result: ', head.evaluation);
                    }
                }
            }
            hasRegisteredHook = true;
        })
    }
})

console.log('\nFIRST PATTERN');
fn1(2,3);

/**
 *  Output
 *  ------
 * Node type:  Identifier , Result:  2
 * Node type:  Identifier , Result:  3
 * Node type:  BinaryExpression , Result:  5
 * Node type:  Identifier , Result:  2
 * Node type:  Identifier , Result:  3
 * Node type:  BinaryExpression , Result:  -1
 * Top Binary Expr Result:  -5
*/


// ✅ Refined version with clearer intent. 
// The interpreter executes the inspector exactly as written, for every visited node, with no hidden behaviour.

let insideOwnerSubtree = false;
let ownerNode: any = null;

const fn2 = monitor({
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
        // If we're inside the owner's subtree, execute and log every node
        if (insideOwnerSubtree) {
            visit.execute();
            const stack = visit.localExeStack();
            const head = stack.get(0);
            console.log('Node type: ',head.type,', Result: ',head.evaluation);
        }
        
        // When we hit the first BinaryExpression, mark it as the owner
        visit.is('BinaryExpression', (event) =>{
            if (!ownerNode) {
                ownerNode = event.node;
                insideOwnerSubtree = true;
                
                visit.execute();// Execute the owner and all its children
                const stack = visit.localExeStack();
                const head = stack.get(0);

                console.log('Top Binary Expr Result: ',head.evaluation);
                insideOwnerSubtree = false;
            }
        });
    }
})

console.log('\nSECOND PATTERN');
fn2(2,3);

/**
 *  Output
 *  ------
 * Node type:  Identifier , Result:  2
 * Node type:  Identifier , Result:  3
 * Node type:  BinaryExpression , Result:  5
 * Node type:  Identifier , Result:  2
 * Node type:  Identifier , Result:  3
 * Node type:  BinaryExpression , Result:  -1
 * Top Binary Expr Result:  -5
*/


