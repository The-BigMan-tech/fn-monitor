import { describe, it, expect } from 'vitest';
import { monitor, ScopeForEvent } from '../../src/index'; 

describe('Scope object tests', () => {
    it('should ensure that the depth is 0-indexed, starting from the root of the wrapped function', () => {
        const testFn = (x: number) => {
            let y = x; // Root level of the function body
            
            if (y !== 0) {
                y -= 1; // Inside an 'if' block, which creates a new nested scope
                testFn(y); // Recursive call to prove that the depth resets correctly
            }
        };

        let hitVarDeclNode = false;
        let hitAssignmentExprNode = false;

        const monitoredFn = monitor({
            main: { 
                ref: testFn 
            },
            beforeEachCall:()=>{
                hitVarDeclNode = false,
                hitAssignmentExprNode = false;
            },
            inspector: (visit) => {
                visit.is('VariableDeclaration', (event) => {
                    // The top level of the wrapped function body should be exactly 0
                    expect(event.scope.depth).toBe(0);
                    hitVarDeclNode = true;
                });

                visit.is('AssignmentExpression', (event) => {
                    // The 'if' block creates a new nested scope, so depth should be 1
                    expect(event.scope.depth).toBe(1);
                    hitAssignmentExprNode = true;
                });
            }
        });

        monitoredFn(5);

        // Verify that the interpreter actually fired our callbacks
        expect(hitVarDeclNode).toBe(true);
        expect(hitAssignmentExprNode).toBe(true);
    });

    it('should verify that you can query for a variable through the local object or the search method of event.scope.variables',()=>{
        let hitReturnNode = false;

        const fn = monitor({
            main:{
                ref:()=>{
                    const name = "person";
                    const age = 20;
                    return;
                }
            },
            beforeEachCall:()=>{
                hitReturnNode = false;
            },
            inspector:(visit)=>{
                visit.is('ReturnStatement',event=>{
                    const vars = event.scope.variables;

                    expect(vars.search('name')).toBe('person');
                    expect(vars.search('age')).toBe(20);

                    expect(vars.local).toMatchObject({
                        name:'person',
                        age:20
                    })
                    hitReturnNode = true;
                })
            }
        })
                    
        fn();
        expect(hitReturnNode).toBe(true)
    })

    it('should verify that local strictly has local variables while the search method can fetch captured variables outside the local scope',()=>{
        let hitReturnNode = false;

        const age = 20;

        const fn = monitor({
            main:{
                ref:()=>{
                    const name = "person";
                    return;
                },
                captures:{
                    age
                }
            },
            beforeEachCall:()=>{
                hitReturnNode = false
            },
            inspector:(visit)=>{
                visit.is('ReturnStatement',event=>{
                    const vars = event.scope.variables;

                    expect(vars.search('name')).toBe('person');
                    expect(vars.search('age')).toBe(20);

                    expect(vars.local).toMatchObject({
                        name:'person',
                    })
                    hitReturnNode = true;
                })
            }
        })          
        fn();
        expect(hitReturnNode).toBe(true)
    })

    it('should ensure that the interpreter always allocates a fresh scope object for a visit even when it hits the same node.This is to prevent unexpected behaviour', () => {
        let hitSumUpdate = false;
        const scopes = new Set<ScopeForEvent>()

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
                scopes.clear()
            },
            inspector: (visit) => {
                visit.is('AssignmentExpression', (event) => {
                    const scope = event.scope;

                    if (scope.depth === 2){// Intercept the 'sum += i' node, which is visited 3 times in the loop
                        expect(scopes.has(scope)).toBe(false)
                        scopes.add(scope);
                        hitSumUpdate = true;
                    }
                });
            }
        });

        fn();
        expect(hitSumUpdate).toBe(true);
        expect(scopes.size).toBe(3);// The loop runs 3 times, so we should have captured 3 scope objects
    });

    it ('should ensure that the scope object is a read-only view and isolated from other scopes',()=>{
        let hitReturnNode = false;
        let modifiedLocal = false;

        const fn = monitor({
            main:{
                ref:()=>{
                    const name = "person";
                    return name;
                }
            },
            beforeEachCall:()=>{
                hitReturnNode = false;
            },
            inspector:(visit)=>{
                visit.is('ReturnStatement',event=>{
                    const vars = event.scope.variables;

                    if (!modifiedLocal) {
                        vars.local['name'] = "john";
                        modifiedLocal = true;
                    }else{
                        expect(vars.local['name']).toBe('person')
                    };
                    hitReturnNode = true;
                })
            }
        })
                    
        // First call: Triggers the mutation attempt
        fn();
        expect(hitReturnNode).toBe(true);
        expect(modifiedLocal).toBe(true);

        // Second call: Proves the mutation did not persist or affect internal state
        fn();
        expect(hitReturnNode).toBe(true);
    })
});