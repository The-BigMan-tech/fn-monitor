import { describe, it, expect } from 'vitest';
import { InspectorGenerator, LangEvent,monitor } from '../../src/index'; 
import { Visit } from '../../src/sval-plus';

describe('Fundamental Runtime Behaviour',()=>{
    
    it('[Sync] should isolate monitored functions from the outside scope',()=>{
        const outsideVar = "";

        const fn = monitor({
            main:{
                ref:() =>outsideVar
            }
        })
        expect(()=>fn()).toThrow(ReferenceError)
    })

    it('[Sync] should isolate monitored functions from each other',()=>{
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

    it('[Sync] should ensure that embedded functions can be inspected',()=>{
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

    it('[Sync] should ensure that the event object is always freshly allocated per visit',()=>{
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

    it('[Sync] should ensure that monitored functions preserve the call signature of their unmonitored counterpart',()=>{
        const weirdFormula = (a:number,b:number,c:number) => {
            return a + ((c  - a)/b);
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

        //if the call signature was messed up,then the monitored fn will fail the test 
        //because the correct result requires the arguments to be passed in properly.
        expect(monitoredFn(a,b,c)).toBe(expectedResult)
    })

    it('[Sync-only] should ensure that the normalized evaluator can properly handle a generator function as the inspector',()=>{
        function add(a: number, b: number) {
            const result = a + b;
            return result;
        };

        let sum;
        let hitReturnNode = false;

        const fn = monitor({
            main:{
                ref:add
            },
            beforeEachCall:()=>{
                hitReturnNode = false;
            },
            inspector:function* (visit):InspectorGenerator {
                const result:any = yield visit.execute();//since our monitored function is synchronous,it will be handled by our normalized evaluator
                visit.is('ReturnStatement',()=>{
                    sum = result.RES;
                    hitReturnNode = true;
                })
            }
        });
        fn(1,3);
        expect(hitReturnNode).toBe(true)
        expect(sum).toBe(4);
    })

    it('[Sync] should ensure that anonymous and normal function definitions are parsed correctly no matter how they are passed to the monitor function.',()=>{
        function add1(a:number,b:number) {
            return a + b
        }
        const add2 = (a:number,b:number)=> {
            return a + b
        }
        const add3 = function (a:number,b:number) {
            return a + b
        };

        //even if the package cant monitor generators, including it ensures that the wrapper is robust
        const add4 = function* (a:number,b:number) {
            return a + b
        };
        function* add5(a:number,b:number) {
            return a + b
        }

        const monitoredAdd1 = monitor({
            main:{
                ref:add1
            }
        })
        const monitoredAdd2 = monitor({
            main:{
                ref:add2
            }
        })
        const monitoredAdd3 = monitor({
            main:{
                ref:add3
            }
        });
        const monitoredAdd4 = monitor({
            main:{
                ref:add4
            }
        });
        const monitoredAdd5 = monitor({
            main:{
                ref:add5
            }
        });

        const result1 = monitoredAdd1(2,2)
        expect(result1).toBe(4);

        const result2 = monitoredAdd2(2,2)
        expect(result2).toBe(4);

        const result3 = monitoredAdd3(2,2)
        expect(result3).toBe(4);

        const result4 = monitoredAdd4(2,2).next().value
        expect(result4).toBe(4);

        const result5 = monitoredAdd5(2,2).next().value
        expect(result5).toBe(4);
    })
})
