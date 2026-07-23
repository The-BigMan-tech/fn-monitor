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
});