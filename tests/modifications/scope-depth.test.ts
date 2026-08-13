import { describe, it, expect } from 'vitest';
import { monitor } from '../../src/index'; 

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
})