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
})