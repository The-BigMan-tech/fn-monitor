import { describe, it, expect } from 'vitest';
import { monitor,LocalExeStack,InspectorGenerator,EsNode } from '../../src/index'; 
import { Visit } from '../../src/sval-plus';


describe('Visit object behaviour',()=>{
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

        //We test the afterEachCall hook again for the async version because the interpreter handles this particular hook differently for async functions 
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

        expect(hitCounts).toMatchObject({
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

    

    it('should restore the parent node\'s execution context after visit.execute recursively evaluates child nodes', async () => {
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

        //This will test the generator-based evaluator
        const fn2 = monitor({
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
        await fn2(10);
    })

    it('should ensure that the perExecution hook is fired exactly for every executed node',()=>{
        let executedNodes = 0;
        let perExeCalls = 0;

        const fn = monitor({
            main:{
                ref:(x: number)=>{
                    return 10 + x
                }
            },
            inspector:(visit)=> {  
                executedNodes += 1;  
                visit.perExecution = ()=>{
                    perExeCalls += 1;
                }
            }
        })
        fn(10);
        expect(perExeCalls).toBe(executedNodes)
    })

    it('should ensure that the perExecution hook only lives as long as its owner node and its children',()=>{
        let hitDeclNode = false;
        let setPerExeHook = false;

        const fn = monitor({
            main:{
                ref:(x: number)=>{
                    const y = 10 + x;
                    return y
                }
            },
            beforeEachCall:()=>{
                hitDeclNode = false;
                setPerExeHook = false;
            },
            inspector:(visit)=> {   
                visit.is('Any',()=>undefined)//force the interpreter to alllocate all scopes

                visit.is('VariableDeclaration',()=>{//this will hit y=10 + x
                    if (!setPerExeHook) {
                        visit.perExecution = ()=>{
                            setPerExeHook = true;
                            const head = visit.localExeStack().get(0)
                            const nodeType = head.type;

                            //if the lifecycle of the perExe hook is handled properly,this particular one shouldnt live long enough to see the return statement
                            expect(nodeType).not.toBe<typeof nodeType>('ReturnStatement')
                        }
                    }
                    hitDeclNode = true;
                })
            }
        })
        fn(10);
        expect(hitDeclNode).toBe(true);
        expect(setPerExeHook).toBe(true);
    })

    it('should ensure that the local exe stack always has the latest executed node at its head',async ()=>{
        const fn = monitor({
            main:{
                ref:(x: number)=>{
                    const y = 10 + x
                    return y;
                }
            },
            inspector:(visit)=> { 
                let currentNode: EsNode | undefined;

                visit.is('Any', (event) => {
                    currentNode = event.node;
                });

                const result = visit.execute();

                const stack = visit.localExeStack();
                const head = stack.get(0);

                expect(head.node).toBe(currentNode);
                expect(head.evaluation).toBe(result);
            }
        })
        fn(10);

        //This will test the generator-based evaluator
        const fn2 = monitor({
            main:{
                ref:async (x: number)=>{
                    return await Promise.resolve(10 + x);
                }
            },
            inspector:function* (visit):InspectorGenerator { 
                let currentNode: EsNode | undefined;

                visit.is('Any', (event) => {
                    currentNode = event.node;
                });

                const result = yield visit.execute();

                const stack = visit.localExeStack();
                const head = stack.get(0);
        
                expect(head.node).toBe(currentNode);
                expect(head.evaluation).toBe(result);
            }
        })
        await fn2(10);
    })
})