import { describe, it, expect } from 'vitest';
import { monitor, ScopeForEvent } from '../../src/index'; 

describe('Scope Object Behaviour', () => {
    
    it('[Sync] should ensure that the depth is a 0-indexed structural measure, starting from the root of the current running function which is either the main one or an embedded one', () => {
        /**
         * for the test to be very effective, the first embedded function must be a standard declaration.
         * This will cause their internal depths to drift which is the factor that tests if the depth calculation is actually robust
         * 
         * The other embedded functions must be declared the way they currently are to test the internal regex used to catch their declr type
         * While the main one must be an arrow fn to also test the regex
         * 
        */
        function embeddedFn() {
            for (const x of [1,2,3]) {}
        }
        const embeddedFn2 = function () {
            while (false) {}
        }

        function* embeddedFn3() {
            try {} catch {}
        }
        const embeddedFn4 = function* () {
            if (true) {
                do {} while (false) {}
            }
        }

        const testFn = (x: number)=> {
            //call the embedded functions before running the main function's logic
            //this will check if the user depth of the embedded functions will leak into the main one
            embeddedFn()
            embeddedFn2()
            embeddedFn3().next()
            embeddedFn4().next()

            let y = x; // Root level of the function body
            
            if (y !== 0) {
                y -= 1; // Inside an 'if' block, which creates a new nested scope
                testFn(y); // Recursive call to prove that the depth resets correctly
            }
        };

        let hitVarDeclNode = false;
        let hitAssignmentExprNode = false;
        let hitForOfNode = false;
        let hitWhileNode = false;
        let hitDoWhileNode = false;
        let hitTryStmt = false;

        const generatedCode = {value:''};

        const monitoredFn = monitor({
            main: { 
                ref: testFn 
            },
            embed:{
                embeddedFn:{
                    ref:embeddedFn
                },
                embeddedFn2:{
                    ref:embeddedFn2
                },
                embeddedFn3:{
                    ref:embeddedFn3
                },
                embeddedFn4:{
                    ref:embeddedFn4
                }
            },
            beforeEachCall:()=>{
                hitVarDeclNode = false,
                hitAssignmentExprNode = false;
                hitForOfNode = false;
                hitWhileNode = false;
                hitDoWhileNode = false;
                hitTryStmt = false;
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

                visit.is('ForOfStatement',(event)=>{
                    //the for loop in the first embedded function
                    expect(event.scope.depth).toBe(0);
                    hitForOfNode = true;
                })

                visit.is('WhileStatement',(event)=>{
                    //the while loop in the second embedded function
                    expect(event.scope.depth).toBe(0);
                    hitWhileNode = true;
                })

                visit.is('TryStatement',(event)=>{
                    expect(event.scope.depth).toBe(0);
                    hitTryStmt = true;
                })

                visit.is('DoWhileStatement',(event)=>{
                    expect(event.scope.depth).toBe(1);
                    hitDoWhileNode = true;
                })
            },
            // sourceOut:generatedCode
        });
        // console.log('CODE:\n',generatedCode.value);
        monitoredFn(5);

        // Verify that the interpreter actually fired our callbacks
        expect(hitVarDeclNode).toBe(true);
        expect(hitAssignmentExprNode).toBe(true);
        expect(hitForOfNode).toBe(true);
        expect(hitWhileNode).toBe(true);
        expect(hitTryStmt).toBe(true);
        expect(hitDoWhileNode).toBe(true);
    });

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

    it ('[Sync] should ensure that the scope object is a read-only view and isolated from other scopes',()=>{
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