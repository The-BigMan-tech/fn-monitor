import { describe, it, expect } from 'vitest';
import { Fn, monitor } from '../../src/index'; 

/** 
* These tests use distinct ast node to distinguish different functions
* Do not attempt to clean any of them up by using a single node type with `callDepth` to distinguish them
* It will make the test quality poor and logically contradictive because they will be relying on a depth property to test a depth property
*/
describe('Depth Tracking', () => {
    
    it('[Sync] should ensure that the depth is a 0-indexed structural measure and starting from the root of the current running function', () => {
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
                    //in the third embedded fn
                    expect(event.scope.depth).toBe(0);
                    hitTryStmt = true;
                })

                visit.is('DoWhileStatement',(event)=>{
                    //in the fourth embedded fn
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
    })

    it('[Sync] should ensure that callDepth is a 0-indexed measure of the call stack size even across recursive, embedded, and NewExpression boundaries', () => {
        function embeddedFn() {
            for (const x of [1, 2, 3]) {}
            
            // We instantiate this class using a NewExpression to prove the call stack increments
            class TestClass {
                constructor() {
                    let temp = 1;
                    temp++; // We track this UpdateExpression to avoid node collisions with the `x === 0` BinaryExpression
                }
            }
            new TestClass(); 
        }

        function recursiveFn(x: number) {
            if (x === 0) return;
            embeddedFn();

            x -= 1;  
            recursiveFn(x);
        }

        // Track the exact sequence of callDepth values to prove temporal accuracy
        const depthSequence: number[] = [];

        const mainFn = monitor({
            main: {
                ref: recursiveFn
            },
            embed: {
                embeddedFn: {
                    ref: embeddedFn
                }
            },
            inspector: (visit) => {
                visit.is('ForOfStatement', (event) => {
                    // embeddedFn is called FROM recursiveFn.
                    depthSequence.push(event.scope.callDepth);
                });

                visit.is('UpdateExpression', (event) => {
                    // Fired ONLY inside the constructor of TestClass (triggered by NewExpression)
                    depthSequence.push(event.scope.callDepth);
                });

                visit.is('AssignmentExpression', (event) => {
                    // x -= 1 happens AFTER embeddedFn returns.
                    depthSequence.push(event.scope.callDepth);
                });
            }
        });

        mainFn(3);

        // Verify the exact temporal order and 0-indexed depth values
        expect(depthSequence).toEqual([
            1, // ForOf in embeddedFn (called by recursiveFn at depth 0)
            2, // UpdateExpr inside TestClass constructor (via `new` inside embeddedFn)
            0, // x -= 1 in recursiveFn (after embeddedFn returns)

            2, // ForOf in embeddedFn (called by recursiveFn at depth 1)
            3, // UpdateExpr inside TestClass constructor
            1, // x -= 1 in recursiveFn (after embeddedFn returns)

            3, // ForOf in embeddedFn (called by recursiveFn at depth 2)
            4, // UpdateExpr inside TestClass constructor
            2, // x -= 1 in recursiveFn (after embeddedFn returns)
        ]);
    });

    // This test is important because a CallExpression node can be followed by different nodes before the actual call. 
    // The nodes encountered during argument passing are good examples.
    
    it('[Sync] should ensure that the callDepth is incremented at the exact moment of executing a function and not upon encountering a CallExpression node',()=>{
        const interceptedFns = new Set<Fn>();

        const code = {value:''}

        const capturedFn = ()=>{
            const x = 1
        }
        function embeddedFn() {
            const x = 1//must contain at least one line to fire the inspector
        }
        function main() {
            capturedFn();
            embeddedFn();
        }
        const fn = monitor({
            main:{
                ref:main,
                captures:{
                    capturedFn
                }
            },
            embed:{
                embeddedFn:{
                    ref:embeddedFn
                }
            },
            sourceOut:code,
            inspector:(visit)=>{
                visit.is('Any',event=>{
                    if (event.scope.callDepth > 0) {
                        interceptedFns.add(visit.callStack().get(0));
                    }
                })
            }
        });
        fn();
        
        // If the interpreter increased the callDepth just because it saw a CallExpression, it will include `capturedFn` and fail the test
        expect(interceptedFns).toContain(embeddedFn)
        expect(interceptedFns).not.toContain(capturedFn)
    })
})