import { describe, it, expect } from 'vitest';
import { EsNode, monitor } from '../../src/index'; 

describe('Visit Object Behaviour',()=>{
    
    it('[Sync] should ensure that visit.is eagerly evaluates the query and discards the callback right after.',()=>{
        let checkedQuery = false;
        let hits = 0;

        const fn = monitor({
            main:{
                ref:(a:number,b:number)=>(a + b) * (a - b)//complex ast with multiple nodes
            },
            inspector:(visit)=>{
                if (!checkedQuery) {
                    visit.is('Any',()=>{
                        hits += 1;
                    })
                    checkedQuery = true;
                }
            }
        })
        fn(2,3);
        
        // If visit.is were a persistent listener, hits would be > 1 (firing for every node).
        // Because it is eager and single-use, it fires exactly once for the current node and is then discarded.
        expect(hits).toBe(1);
    })

    it('[Async] should correctly route and fire visit.is callbacks for multiple distinct AST node types, including async nodes', async () => {
        const hitCounts = {
            VariableDeclaration: 0,
            IfStatement: 0,
            BinaryExpression: 0,
            AssignmentExpression: 0,
            UpdateExpression: 0,
            ArrowFunctionExpression: 0,
            CallExpression: 0,
            AwaitExpression: 0,
            ReturnStatement: 0,
        };

        const monitoredFn = monitor({
            main: { 
                ref:async (a: number) => {
                    let x = a;      // 1. VariableDeclaration
                    if (x > 0) {    // 2. IfStatement, 3. BinaryExpression (x > 0)
                        x = x + 1;  // 4. AssignmentExpression, 5. BinaryExpression (x + 1)
                        x++;        // 6. UpdateExpression
                    }
                    // 7. VariableDeclaration, 
                    // 8. ArrowFunctionExpression, 
                    // 9. BinaryExpression (y * 2)
                    const double = (y: number) => y * 2;

                    // 10. VariableDeclaration, 
                    // 11. CallExpression (double), 
                    // 12. CallExpression (Promise.resolve), 
                    // 13. AwaitExpression
                    const res = await Promise.resolve(double(x)); 
                    return res;// 14. ReturnStatement
                }
            },
            inspector: (visit) => {
                // Register hooks for all 9 distinct node types
                visit.is('VariableDeclaration', () => { 
                    hitCounts.VariableDeclaration += 1; 
                });
                visit.is('IfStatement', () => { 
                    hitCounts.IfStatement += 1; 
                });
                visit.is('BinaryExpression', () => { 
                    hitCounts.BinaryExpression += 1;
                });
                visit.is('AssignmentExpression', () => { 
                    hitCounts.AssignmentExpression += 1; 
                });
                visit.is('UpdateExpression', () => { 
                    hitCounts.UpdateExpression += 1;
                });
                visit.is('ArrowFunctionExpression', () => { 
                    hitCounts.ArrowFunctionExpression += 1;
                });
                visit.is('CallExpression', () => { 
                    hitCounts.CallExpression += 1;
                });
                visit.is('AwaitExpression', () => { 
                    hitCounts.AwaitExpression += 1; 
                });
                visit.is('ReturnStatement', () => { 
                    hitCounts.ReturnStatement += 1;
                });
            }
        });

        // Execute the async function to trigger the generator-based AST walk
        const result = await monitoredFn(5);
        expect(result).toBe(14);

        expect(hitCounts).toEqual({
            VariableDeclaration:3,// let x, const double, const res
            IfStatement:1,// if (x > 0)
            BinaryExpression:3,// (x > 0), (x + 1), (y * 2)
            AssignmentExpression:1,// x = ...
            UpdateExpression:1,// x++
            ArrowFunctionExpression:1,// (y) => ...
            CallExpression:2,// double(x) AND Promise.resolve(...)
            AwaitExpression:1,// await ...
            ReturnStatement:1// return res
        } as Record<keyof typeof hitCounts,number>)
    });

    it('[Sync] should ensure that querying for \'Any\' node with visit.is() will match for all nodes',()=>{
        let executedNodes = 0;
        let queryHits = 0;

        const fn = monitor({
            main:{
                ref:(x: number)=>{
                    return 10 + x
                }
            },
            inspector:(visit)=> {  
                executedNodes += 1;  
                visit.is('Any',()=>{
                    queryHits += 1;
                })
            }
        })
        fn(10);
        expect(queryHits).toBe(executedNodes)
    })

    it('[Sync] should ensure that the perExecution hook does not leak if an error is thrown mid-execution', () => {
        let callCount = 0;
        let perExeFiredCount = 0;

        const fn = monitor({
            main: {
                ref: (x: number) => 10 + x
            },
            beforeEachCall: () => {
                callCount += 1;
            },
            inspector: (visit) => {
                // Check the callCount to ensure that it doesnt set the hook on the second call
                if ((callCount === 1) && (perExeFiredCount === 0)) {
                    visit.perExecution = () => {
                        perExeFiredCount += 1;
                        throw new Error("Mid-execution error");
                    };
                }
            }
        });

        // First call: registers hook, fires, throws error, aborts execution.
        expect(() => fn(10)).toThrow("Mid-execution error");
        expect(perExeFiredCount).toBe(1);

        // Second call: The hook should NOT leak from the aborted first call.
        // Since the inspector no longer registers it, it should run cleanly.
        expect(() => fn(10)).not.toThrow();
        expect(perExeFiredCount).toBe(1); // Still 1, proving no ghost hook fired
    });

    it('[Sync] should ensure that the perExecution hook is only fired for the owner and its children', () => {
        let setPerExeHook = false;
        const firedNodeTypes: string[] = [];

        const fn = monitor({
            main: {
                ref: (x: number) => {
                    const y = (10 + x) + (x ** 2);
                    return y;
                }
            },
            inspector: (visit) => {
                visit.is('Any', () => undefined); // force scope allocation

                // Lock the hook to the first BinaryExpression we see
                visit.is('BinaryExpression', () => {
                    if (!setPerExeHook) {
                        setPerExeHook = true;
                        visit.perExecution = () => {
                            const head = visit.localExeStack().get(0);
                            firedNodeTypes.push(head.type);
                        };
                    }
                });
            }
        });

        fn(10);

        // 1. The hook should have fired at least once (for the owner and its children)
        expect(firedNodeTypes.length).toBeGreaterThan(0);
        
        // 2. It should actually have fired for the owner
        expect(firedNodeTypes).toContain('BinaryExpression');

        // 3. CRITICAL: It should NEVER fire for nodes outside the owner's subtree
        expect(firedNodeTypes).not.toContain('VariableDeclaration');
        expect(firedNodeTypes).not.toContain('ReturnStatement');
    });
})