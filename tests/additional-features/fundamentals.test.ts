import { describe, it, expect } from 'vitest';
import { LangEvent, monitor } from '../../src/index'; 

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
        let hitDeclNode = false;

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
                hitDeclNode = false
            },
            inspector:(visit)=>{
                visit.is('ReturnStatement',event=>{
                    const vars = event.scope.variables;
                    expect(vars.search('x')).toBe('hello world');
                    expect(vars.local).toHaveProperty('x', 'hello world');
                    hitDeclNode = true;
                })
            }
        });

        //Ensure that the embedded functions works as expected
        expect(fn()).toBe('hello world')
        expect(hitDeclNode).toBe(true)
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
})