import { describe, it, expect } from 'vitest';
import { monitor } from '../../src/index'; 
import { Visit } from '../../src/sval-plus';

describe('Hook Behaviour',()=>{

    it('[Sync] should ensure that all the hooks are fired when set and together with their proper arguments',()=>{
        let calledBeforeCallHook = false;
        let calledAfterCallHook = false;
        let calledInspectorHook = false;
        let calledOnStepHook = false;

        const fn = monitor({
            main:{
                ref:(x:number)=>x**2
            },
            beforeEachCall:(x)=>{
                calledBeforeCallHook = true;
                expect(x).toBe(10)
            },
            afterEachCall:(result)=>{
                calledAfterCallHook = true;
                expect(result).toBe(100)
            },
            inspector:(visit)=>{
                calledInspectorHook = true;
                expect(visit instanceof Visit).toBe(true)
            },
            onStep:((args:any)=>{
                calledOnStepHook = true;
                expect(args).toBe(undefined)
            }) as any
        })
        fn(10);
        expect(calledBeforeCallHook).toBe(true);
        expect(calledAfterCallHook).toBe(true);
        expect(calledInspectorHook).toBe(true);
        expect(calledOnStepHook).toBe(true)
    })

    it('[Sync] should ensure that the beforeEachCall and afterEachCall hooks are only fired once per function call',()=>{
        let beforeHookCount = 0;
        let afterHookCount = 0;

        const fn = monitor({
            main:{
                ref:()=>undefined
            },
            beforeEachCall:()=>{
                beforeHookCount += 1;
            },
            afterEachCall:()=>{
                afterHookCount += 1;
            }
        })
        fn();
        expect(beforeHookCount).toBe(1);
        expect(afterHookCount).toBe(1)
    })

    it('[Async] should ensure that the beforeEachCall and afterEachCall hooks are only fired once per function call',async ()=>{ 
        //We test the afterEachCall hook again for the async version because the interpreter handles this particular hook differently for async functions 
        let afterHookCount = 0;

        //im only adding this count for consistency
        let beforeHookCount = 0;

        const fn2 = monitor({
            main:{
                ref:async ()=>undefined
            },
            beforeEachCall:()=>{
                beforeHookCount += 1;
            },
            afterEachCall:()=>{
                afterHookCount += 1;
            }
        })
        await fn2();
        expect(beforeHookCount).toBe(1);
        expect(afterHookCount).toBe(1)
    })

    it('[Sync] should ensure that the beforeEachCall and afterEachCall hooks are fired in order',()=>{
        let hookCalls:('before' | 'after')[] = [];

        const fn = monitor({
            main:{
                ref:()=>undefined
            },
            beforeEachCall:()=>{
                hookCalls.push('before')
            },
            afterEachCall:()=>{
                hookCalls.push('after')
            }
        })
        fn();
        expect(hookCalls).toEqual(['before','after'])
    })

    it('[Sync] should ensure that when both the inspector and the onStep hooks are defined, each one is called the exact number of times as the other',()=>{
        let inspectorHookCalls = 0;
        let onStepHookCalls = 0;

        const fn = monitor({
            main:{
                ref:(a:number,b:number)=>(a + b) * (a - b)
            },
            onStep:()=>{
                onStepHookCalls += 1
            },
            inspector:()=>{
                inspectorHookCalls += 1
            }
        })
        fn(2,2);
        expect(inspectorHookCalls).toBe(onStepHookCalls)
    })

    /**
      * We embed a function with a captured variable to create varying depths of where the user code lies
      * If the interpreter gets confused about this, it will fire the hooks and fail the test
      * 
      * The test is marked as sync even though its checking the correctness of the pre-processing 
      * phase because its relying on specific runtime hooks that are handled by the evaluators
    */
    it('[Sync] should ensure that the inspector and onStep hooks are not fired during the wrapping phase',()=>{
        const generatedCode = {value:''}
        const Printed = 'Printed: ';

        function print(str:string) {
            console.log(Printed,str);
        }
        function printName(name:string) {
            console.log('Hello ',name);
        }
        function sayHello(name:string) {
            print('Hello world')
            printName(name)
        }

        let inspectorHookCalls = 0;
        let onStepHookCalls = 0;

        monitor({
            main:{
                ref:sayHello,
                captures:{
                    printName
                }
            },
            embed:{
                print:{
                    ref:print,
                    captures:{
                        Printed
                    }
                }
            },
            inspector:()=>{
                inspectorHookCalls += 1;
            },
            onStep:()=>{
                onStepHookCalls += 1;
            },
            sourceOut:generatedCode
        })

        expect(inspectorHookCalls).toBe(0);
        expect(onStepHookCalls).toBe(0);
    })

    it('[Sync] should ensure that the inspector is fired before executing the node.',()=>{
        const outsideVar = {value:0};
        let hitAssignNode = false;//having this flag makes the test extra safe even if the visit.is method is already tested on a few nodes

        const fn = monitor({
            main:{
                ref:()=>{
                    outsideVar.value = 10;
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
                    expect(outsideVar.value).toBe(0);
                    hitAssignNode = true;
                })
            }
        })
        fn();
        expect(hitAssignNode).toBe(true)
    });
})
