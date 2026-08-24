import { describe, it, expect } from 'vitest';
import { monitor, ScopeForEvent } from '../../src/index'; 

describe('Scope Object Behaviour', () => {
    it('[Sync] should verify that you can query for a variable through the local object or the search method of event.scope.variables',()=>{
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

                    expect(vars.local).toEqual({
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

    it('[Sync] should verify that local strictly has local variables while the search method can fetch captured variables outside the local scope',()=>{
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

                    expect(vars.local).toEqual({
                        name:'person',
                    })
                    hitReturnNode = true;
                })
            }
        })          
        fn();
        expect(hitReturnNode).toBe(true)
    })

    it('[Sync] should ensure that the interpreter always allocates a fresh scope object for a visit even when it hits the same node.', () => {
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
                scopes.clear()
            },
            inspector: (visit) => {
                visit.is('AssignmentExpression', (event) => {
                    const scope = event.scope;

                    if (scope.depth === 2){ // Intercept the 'sum += i' node, which is visited 3 times in the loop
                        expect(scopes.has(scope)).toBe(false) // Proves it's a new object reference, not a reused one
                        scopes.add(scope);
                    }
                });
            }
        });

        fn();
        expect(scopes.size).toBe(3); // The loop runs 3 times, so we should have captured 3 distinct scope objects
    });

    it ('[Sync] should ensure that the scope object is a read-only view and isolated from other scopes',()=>{
        let hitExprNode = false;
        let modifiedLocal = false;

        const fn = monitor({
            main:{
                ref:()=>{
                    const name = "person";
                    let x = 0;
                    x++;x++;x++;
                    return name;
                }
            },
            beforeEachCall:()=>{
                hitExprNode = false;
            },
            inspector:(visit)=>{
                visit.is('UpdateExpression',event=>{
                    const vars = event.scope.variables;
                    if (modifiedLocal) {
                        expect(vars.local['name']).toBe('person');
                    }else {
                        vars.local['name'] = "john";
                        modifiedLocal = true;
                    }
                    hitExprNode = true;
                })
            }
        })
        fn();
        expect(hitExprNode).toBe(true);
        expect(modifiedLocal).toBe(true);
    })
});