import { describe, it, expect } from 'vitest';
import { LangEvent, monitor,LAZY_NODE,LocalExeStack,InspectorGenerator,EsNode } from '../../src/index'; 
import { VisitExecutionError } from '../../src/custom-types';
import { Visit } from '../../src/sval-plus';

describe('Basic behaviours',()=>{
    it('should isolate monitored functions from the outside scope',()=>{
        const outsideVar = "";

        const fn = monitor({
            main:{
                ref:() =>outsideVar
            }
        })
        expect(()=>fn()).toThrow(ReferenceError)
    })

    it('should isolate monitored functions from each other',()=>{
        let outsideVar;

        function echo(str?:string) {
            return (str || '') + outsideVar
        }
        const fn1 = monitor({
            main:{
                ref:echo,
                captures:{
                    outsideVar:'Hello'
                }
            }
        })
        const fn2 = monitor({
            main:{
                ref:echo,
                captures:{
                    outsideVar:'world'
                }
            }
        })
        expect(fn1('Say')).toBe('SayHello')

        // This intentionally doesnt pass an argument to the second call.
        // If the implementation imported the arg of the first fn here,this will fail.
        expect(fn2()).toBe('world')
    })

    it('should ensure that embedded functions can be inspected',()=>{
        let outsideFn:(...args:any[])=>any | undefined;
        let hitReturnNode = false;

        const fn = monitor({
            main:{
                ref:()=>outsideFn!()
            },
            embed:{
                outsideFn:{
                    ref:()=>{
                        const x = "hello world";
                        return x
                    }
                }
            },
            beforeEachCall:()=>{
                hitReturnNode = false
            },
            inspector:(visit)=>{
                visit.is('ReturnStatement',event=>{
                    const vars = event.scope.variables;
                    expect(vars.search('x')).toBe('hello world');
                    expect(vars.local).toHaveProperty('x', 'hello world');

                    hitReturnNode = true;
                })
            }
        });

        //Ensure that the embedded functions works as expected
        expect(fn()).toBe('hello world')
        expect(hitReturnNode).toBe(true)
    })

    it('should ensure that the event object is always freshly allocated per visit',()=>{
        let hitSumUpdate = false;
        const events = new Set<LangEvent>();

        const fn = monitor({
            main: {
                ref: () => {
                    let sum = 0;
                    // A loop ensures the exact same AST nodes are visited multiple times
                    for (let i = 0; i < 3; i++) {
                        sum += i;
                    }
                    return sum;
                }
            },
            beforeEachCall:()=>{
                hitSumUpdate = false;
                events.clear()
            },
            inspector: (visit) => {
                visit.is('AssignmentExpression',event => {
                    if (event.scope.depth === 2) {// Intercept the 'sum += i' node, which is visited 3 times in the loop
                        expect(events.has(event)).toBe(false);
                        events.add(event);
                        hitSumUpdate = true;
                    }
                });
            }
        })
        fn()
        expect(hitSumUpdate).toBe(true);
        expect(events.size).toBe(3)
    })

    it('should ensure that monitored functions preserve the call signature of their unmonitored counterpart',()=>{
        const weirdFormula = (a:number,b:number,c:number) => {
            return a + (b/(c - a));
        }
        const monitoredFn = monitor({
            main:{
                ref:weirdFormula
            }
        })
        const a = 1;
        const b = 2;
        const c = 3;

        const expectedResult = weirdFormula(a,b,c);
        expect(monitoredFn(a,b,c)).toBe(expectedResult)
    })

    it('should correctly route and fire visit.is callbacks for multiple distinct AST node types, including async nodes', async () => {
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

        const testFn = async (a: number) => {
            let x = a;                              // 1. VariableDeclaration
            if (x > 0) {                            // 2. IfStatement, 3. BinaryExpression (x > 0)
                x = x + 1;                          // 4. AssignmentExpression, 5. BinaryExpression (x + 1)
                x++;                                // 6. UpdateExpression
            }

            // 7. VariableDeclaration, 8. ArrowFunctionExpression, 9. BinaryExpression (y * 2)
            const double = (y: number) => y * 2;
            
            // 10. VariableDeclaration, 11. CallExpression (double), 12. CallExpression (Promise.resolve), 13. AwaitExpression
            const res = await Promise.resolve(double(x)); 
            return res;                             // 14. ReturnStatement
        };

        const monitoredFn = monitor({
            main: { ref: testFn },
            inspector: (visit) => {
                // Register hooks for all 9 distinct node types
                visit.is('VariableDeclaration', () => { hitCounts.VariableDeclaration++; });
                visit.is('IfStatement', () => { hitCounts.IfStatement++; });
                visit.is('BinaryExpression', () => { hitCounts.BinaryExpression++; });
                visit.is('AssignmentExpression', () => { hitCounts.AssignmentExpression++; });
                visit.is('UpdateExpression', () => { hitCounts.UpdateExpression++; });
                visit.is('ArrowFunctionExpression', () => { hitCounts.ArrowFunctionExpression++; });
                visit.is('CallExpression', () => { hitCounts.CallExpression++; });
                visit.is('AwaitExpression', () => { hitCounts.AwaitExpression++; });
                visit.is('ReturnStatement', () => { hitCounts.ReturnStatement++; });
            }
        });

        // Execute the async function to trigger the generator-based AST walk
        const result = await monitoredFn(5);
        expect(result).toBe(14);

        // Assert the exact hit counts based on the AST structure of testFn
        expect(hitCounts.VariableDeclaration).toBe(3);   // let x, const double, const res
        expect(hitCounts.IfStatement).toBe(1);           // if (x > 0)
        expect(hitCounts.BinaryExpression).toBe(3);      // (x > 0), (x + 1), (y * 2)
        expect(hitCounts.AssignmentExpression).toBe(1);  // x = ...
        expect(hitCounts.UpdateExpression).toBe(1);      // x++
        expect(hitCounts.ArrowFunctionExpression).toBe(1);// (y) => ...
        expect(hitCounts.CallExpression).toBe(2);        // double(x) AND Promise.resolve(...)
        expect(hitCounts.AwaitExpression).toBe(1);       // await ...
        expect(hitCounts.ReturnStatement).toBe(1);       // return res
    });

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

    it('should ensure that all the hooks are fired when set and together with their proper arguments',()=>{
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

    it('should ensure that the beforeEachCall and afterEachCall hooks are only fired once per function call',async ()=>{
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

        //We test the afterEachCall hook again for the async version because the interpreter handles the hook for async functions differently
        let afterHookCountForAsync = 0;

        const fn2 = monitor({
            main:{
                ref:async ()=>undefined
            },
            afterEachCall:()=>{
                afterHookCountForAsync += 1;
            }
        })
        await fn2();
        expect(afterHookCountForAsync).toBe(1)
    })

    it('should ensure that the local exe stack is cleared after evaluating the function',()=>{
        let stack:LocalExeStack | undefined;
        const fn = monitor({
            main:{
                ref:(x:number)=>x + 5
            },
            inspector:(visit)=>{
                stack = visit.localExeStack()//dont do this pattern in actual use cases
            }
        })
        fn(10);
        expect(stack).toBeDefined();
        expect(stack!.length).toBe(0)
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

    it('should ensure that yielding LAZY_NODE resumes the generator back with the resolved value',()=>{

    })

    it('should ensure that the perExecution hook is fired for every node starting from the current node and terminating at the node where it started firing from',()=>{

    })

    it('should ensure that the local exe stack is synchronized with the executed nodes',()=>{

    })
})