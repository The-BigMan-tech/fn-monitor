import { describe, it, expect } from 'vitest';
import { monitor,LAZY_NODE,InspectorGenerator,EsNode } from '../../src/index'; 
import { NOT_ALLOCATED, VisitExecutionError } from '../../src/custom-types';
import { isGenerator } from '../../src/lifecycle-functions';


describe('Visit.execute() Method Behaviour',()=>{

    //This particular test specifically uses the scope instead of the node because the scope of an exe result is only available if the internal current event is allocated.and the current event unlike the node,always starts out unallocated from the beginning.
    //This test catches where in the generator evaluator that the local reusables,which are used to restore context in async code, is captured.

    it('[Async] should ensure that the scope of the latest executed result belonging to the current node is allocated if it was allocated for the node before calling visit.execute',async()=>{
        const fn = monitor({
            main:{
                ref:async (a:number,b:number)=>{
                    return await Promise.resolve((a + b) * (a - b))
                }
            },
            inspector:function* (visit):InspectorGenerator {
                visit.is('Any',()=>undefined);//forcefully allocate the scope
                yield visit.execute();
                const head = visit.localExeStack().get(0);
                expect(head.scope).not.toBe(NOT_ALLOCATED)
            }
        })
        await fn(2,3);
    })

    it('[Async-only] should ensure that the interpreter can handle multiple pending async contexts correctly',async()=>{
        const fn = monitor({
            main:{
                ref:async (a:number,b:number)=>{
                    const promise = Promise.resolve((a + b) * (a - b));
                    return await promise;
                }
            },
            inspector:function* (visit):InspectorGenerator {
                let scope;

                visit.is('Any',(event)=>{//forcefully allocate the scope
                    scope = event.scope
                });
                
                yield visit.execute();

                const head = visit.localExeStack().get(0);
                expect(head.scope).toBe(scope)
            }
        })
        const result1 = fn(2,3);
        const result2 = fn(4,9);

        //I intentionally awaited the second call before the first one to simulate a chaotic order
        expect(await result2).toBe(-65);
        expect(await result1).toBe(-5);
    })

    it('[Sync] should ensure that visit.execute manually executes a node and returns the result.',()=>{
        const outsideVar = {value:0};
        let hitAssignNode = false;//having this flag makes the test extra safe even if the visit.is method is already tested on a few nodes

        const fn = monitor({
            main:{
                ref:()=>{
                    const x = 10;
                    outsideVar.value = x;
                },
                captures:{
                    outsideVar
                }
            },
            beforeEachCall:()=>{
                hitAssignNode = false
            },
            inspector:(visit)=>{
                visit.is('AssignmentExpression',()=>{//target outsideVar.value = x
                    expect(visit.execute()).toBe(10)
                    expect(outsideVar.value).toBe(10);
                    hitAssignNode = true;
                })
            }
        })
        fn();
        expect(hitAssignNode).toBe(true)
    });
    
    it('[Sync] should ensure that visit.execute cannot be called more than once',()=>{
        const fn = monitor({
            main:{
                ref:()=>undefined
            },
            inspector:(visit)=>{
                visit.execute()
                expect(()=>visit.execute()).toThrow(VisitExecutionError);
            }
        })
        fn();
    });

    it('[Sync] should not execute the node automatically if visit.execute was called',()=>{
        const outsideVar = {value:0};
        let hitAssignNode = false;

        const fn = monitor({
            main:{
                ref:()=>{
                    const x = 10;
                    outsideVar.value += x;//notice that this particular test increments the value rather than overwriting it.
                },
                captures:{
                    outsideVar
                }
            },
            beforeEachCall:()=>{
                hitAssignNode = false;
            },
            inspector:(visit)=>{
                visit.is('AssignmentExpression',()=>{
                    visit.execute();
                    hitAssignNode = true;
                })
            }
        })
        fn();
        expect(hitAssignNode).toBe(true)

        //If the node was executed twice,this will catch the extra increment
        expect(outsideVar.value).toBe(10);
    })

    it('[Sync] should execute the node automatically if visit.execute was not called',()=>{
        const outsideVar = {value:0};
        let hitAssignNode = false;//having this flag makes the test extra safe even if the visit.is method is already tested on a few nodes

        const fn = monitor({
            main:{
                ref:()=>{
                    const x = 10;
                    outsideVar.value = x;
                },
                captures:{
                    outsideVar
                }
            },
            beforeEachCall:()=>{
                hitAssignNode = false
            },
            inspector:(visit)=>{
                visit.is('AssignmentExpression',()=>{
                    //we do nothing
                    hitAssignNode = true;
                })
            }
        })
        fn();
        expect(hitAssignNode).toBe(true);
        expect(outsideVar.value).toBe(10);
    })

    it('[Async-only] should ensure that visit.execute returns LAZY_NODE for AwaitExpressions',async ()=>{
        let hitAwaitNode = false;

        const fn = monitor({
            main:{
                ref:async (x: number)=>{
                    return await Promise.resolve(x);
                }
            },
            beforeEachCall:()=>{
                hitAwaitNode = false;
            },
            inspector:(visit)=>{
                visit.is('AwaitExpression',()=>{
                    expect(visit.execute()).toBe(LAZY_NODE)
                    hitAwaitNode = true;
                })
            }
        })
        await fn(10);
        expect(hitAwaitNode).toBe(true)
    })

    it('[Async-only] should ensure that visit.execute returns LAZY_NODE for for ForOfStatement (for await...of)',async ()=>{  
        let hitForAwaitNode = false;

        async function* asyncGen() { 
            yield 1; 
            yield 2; 
        }

        const monitoredFn = monitor({
            main: { 
                ref:async () => { 
                    for await (const x of asyncGen()) { 
                        //
                    }
                } 
            },
            embed:{
                asyncGen:{
                    ref:asyncGen
                }
            },
            beforeEachCall:()=>{
                hitForAwaitNode = false;
            },
            inspector:(visit):undefined =>{
                visit.is('ForOfStatement',()=> {
                    expect(visit.execute()).toBe(LAZY_NODE);
                    hitForAwaitNode = true;
                })
            }
        })
        await monitoredFn();
        expect(hitForAwaitNode).toBe(true)
    })

    it('[Sync] should ensure that visit.execute returns LAZY_NODE for YieldExpressions',()=>{  
        let hitYieldNode = false;

        function* yieldResult() {
            for (let i=0;i<10;i++) {
                yield i
            }
        }
        const monitoredFn = monitor({
            main:{
                ref:()=> [...yieldResult()]
            },
            embed:{
                yieldResult:{
                    ref:yieldResult
                }
            },
            beforeEachCall:()=>{
                hitYieldNode = false;
            },
            inspector:(visit):undefined =>{
                visit.is('YieldExpression',()=> {
                    expect(visit.execute()).toBe(LAZY_NODE);
                    hitYieldNode = true;
                })
            }
        })
        monitoredFn();
        expect(hitYieldNode).toBe(true);
    })

    it('[Sync] should ensure that executing a generator call will return the actual generator object rather than confusing the interpreter that it is a LAZY_NODE',()=>{     
        let hitCallExprNode = false;

        function* yieldResult() {
            for (let i=0;i<10;i++) {
                yield i
            }
        }
        const monitoredFn = monitor({
            main:{
                ref:()=> yieldResult()
            },
            embed:{
                yieldResult:{
                    ref:yieldResult
                }
            },
            beforeEachCall:()=>{
                hitCallExprNode = false;
            },
            inspector:(visit):undefined =>{
                visit.is('CallExpression',()=> {
                    const result = visit.execute();

                    expect(result).not.toBe(LAZY_NODE);
                    expect(isGenerator(result)).toBe(true);

                    hitCallExprNode = true;
                })
            }
        })
        monitoredFn();
        expect(hitCallExprNode).toBe(true);
    })

    it('[Async-only] should ensure that yielding LAZY_NODE for AwaitExpressions resume the generator back with the resolved value',async ()=>{
        let hitAwaitNode = false;

        const fn = monitor({
            main:{
                ref:async (x: number)=>{
                    return await Promise.resolve(x);
                }
            },
            beforeEachCall:()=>{
                hitAwaitNode = false
            },
            inspector:function* (visit):InspectorGenerator {
                const result = visit.execute();

                if (result === LAZY_NODE) {
                    const resolvedValue = yield result;
                    visit.is('AwaitExpression',()=>{//we only want to test the executed result of the await node
                        expect(resolvedValue).toBe(10);
                        hitAwaitNode = true;
                    })
                }
            }
        })
        await fn(10);
        expect(hitAwaitNode).toBe(true);
    })

    it('[Sync] should restore the parent node\'s execution context after visit.execute recursively evaluates child nodes',() => {
        const fn = monitor({
            main:{
                ref:(x:number)=>{
                    const y = (x + 1);
                    return y
                }
            },
            inspector:(visit)=>{
                let nodeA:EsNode | undefined;

                visit.is('Any',event=>{
                    nodeA = event.node;
                });

                //calling visit.execute makes the interprter to recursively evaluate child nodes which will cause it to fire the inspector repeatedly.
                //Comparing the node before and after, checks if the interpreter retained the context of its parent as it was executing them
                //we cant compare the scopes because the interpreter always allocates a new scope for every event and we cant compare them by value because the value of the variables would have changed
                
                visit.execute();

                visit.is('Any',event=>{
                    expect(event.node === nodeA).toBe(true);
                })
            }
        })
        fn(10);
    })

    it('[Async] should restore the parent node\'s execution context after visit.execute recursively evaluates child nodes', async () => {
        const fn = monitor({
            main:{
                ref:async (x: number)=>{
                    return await Promise.resolve(x);
                }
            },
            inspector:function* (visit):InspectorGenerator {
                let asyncNodeA:EsNode | undefined;

                visit.is('Any',event=>{
                    asyncNodeA = event.node;
                });

                yield visit.execute();

                visit.is('Any',event=>{
                    expect(event.node === asyncNodeA).toBe(true);
                })
            }
        })
        await fn(10);
    })
})