import { describe, it, expect } from 'vitest';
import { monitor,LocalExeStack,InspectorGenerator,EsNode } from '../../src/index'; 

describe('ExeStack Behaviour',()=>{

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

    it('should ensure that the localExeStack is cleared between parent nodes',()=>{
        let hitReturnNode = false;

        const fn = monitor({
            main:{
                ref:(x: number)=>{
                    const y = 10 + x;
                    return y
                }
            },
            beforeEachCall:()=>{
                hitReturnNode = false;
            },
            inspector:(visit)=> {   
                visit.is('ReturnStatement',()=>{
                    //if the stack contains the results of the variable decl node,then this will fail
                    expect(visit.localExeStack().length).toBe(0);
                    hitReturnNode = true;
                })
            }
        })
        fn(10);
        expect(hitReturnNode).toBe(true);
    })

    it('should ensure that the localExeStack contains the evaluation of its node and that of its children',()=>{
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

                //this will hit y = 10 + x
                visit.is('VariableDeclaration',event=>{
                    const ownerNode = event.node;

                    if (!setPerExeHook) {//this locks this hook to the node,(y = 10 + x)
                        visit.perExecution = ()=>{
                            setPerExeHook = true;

                            const stack = visit.localExeStack()
                            const head = stack.get(0)
                            
                            if (head.node === ownerNode) {
                                //the variable decl node gets evaluated last and thus at the head because the interpreter has to evaluate its children first.
                                expect(head.type).toBe('VariableDeclaration');
                                expect(stack.get(1).type).toBe('BinaryExpression');
                                expect(stack.get(2).type).toBe('Identifier')
                                expect(stack.get(3).type).toBe('Literal')
                                expect(stack.length).toBe(4)
                            }
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