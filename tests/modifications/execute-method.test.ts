import { describe, it, expect } from 'vitest';
import { monitor,LAZY_NODE,InspectorGenerator,EsNode } from '../../src/index'; 
import { VisitExecutionError } from '../../src/custom-types';


describe('Visit.execute() Method Behaviour',()=>{

    it('[Sync] should ensure that visit.execute manually executes a node.',()=>{
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
                    visit.execute()
                    expect(outsideVar.value).toBe(10);
                    hitAssignNode = true;
                })
            }
        })
        fn();
        expect(hitAssignNode).toBe(true)
    });
    
    it('[Sync] should ensure that visit.execute cannot be called more than once',()=>{
        const fn1 = monitor({
            main:{
                ref:(a:number,b:number)=>(a + b) * (a - b)
            },
            inspector:(visit)=>{
                visit.execute()
                expect(()=>visit.execute()).toThrow(VisitExecutionError);
            }
        })
        fn1(2,3);
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

    it('[Async-only] should ensure that visit.execute returns LAZY_NODE for async nodes',async ()=>{
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

    it('[Async-only] should ensure that yielding LAZY_NODE resumes the generator back with the resolved value',async ()=>{
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