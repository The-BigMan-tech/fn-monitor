import { describe, it, expect } from 'vitest';
import { monitor } from '../../src/index'; 

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
            main: { ref: testFn },
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

    it ('should ensure that the scope object is a read-only view',()=>{
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

    it('should ensure that the interpreter always allocates a fresh scope object for a visit even when it hits the same node to prevent unexepected behaviour', () => {
        let hitAssignmentNode = false;
        const capturedScopes: any[] = [];

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
            inspector: (visit) => {
                // Intercept the 'i++' node, which is visited 3 times in the loop
                visit.is('AssignmentExpression', (event) => {
                    capturedScopes.push(event.scope);
                    hitAssignmentNode = true;
                });
            }
        });

        fn();
        expect(hitAssignmentNode).toBe(true);

        // The loop runs 3 times, so we should have captured 3 scope objects
        expect(capturedScopes.length).toBe(3);

        // PROOF 1: They are distinct object references (freshly allocated)
        expect(capturedScopes[0]).not.toBe(capturedScopes[1]);
        expect(capturedScopes[1]).not.toBe(capturedScopes[2]);

        // PROOF 2: Mutating the scope on iteration 1 does not affect iteration 2
        capturedScopes[0].variables.local['sum'] = 'MUTATED';
        expect(capturedScopes[1].variables.local['sum']).not.toBe('MUTATED');
    });
});