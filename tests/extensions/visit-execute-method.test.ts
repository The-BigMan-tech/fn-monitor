import { describe, it, expect } from 'vitest';
import { monitor,LAZY_NODE,InspectorGenerator } from '../../src/index'; 
import { VisitExecutionError } from '../../src/custom-types';


describe('Visit.execute method behaviour',()=>{
    it('should ensure that visit.execute manually executes a node and it is not allowed to be called twice',()=>{
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
                    visit.execute()
                    expect(outsideVar.value).toBe(10);
                    expect(()=>visit.execute()).toThrow(VisitExecutionError);
                    hitAssignNode = true;
                })
            }
        })
        fn();
        expect(hitAssignNode).toBe(true)
    });
    
    it('should not execute the node automatically if visit.execute was called',()=>{
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

    it('should execute the node automatically if visit.execute was not called',()=>{
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

    it('should ensure that visit.execute returns LAZY_NODE for async or generator nodes',async ()=>{
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

    it('should ensure that yielding LAZY_NODE resumes the generator back with the resolved value',async ()=>{
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
})