import { describe, it, expect } from 'vitest';
import { monitor } from '../../src/index'; 

describe('AST Mutation Persistence', () => {
    function add(a: number, b: number) {
        return a + b;
    }

    it('should parse the function into an AST once and reuse it, causing mutations to persist across calls', () => {
        let modifiedOp = false;

        const monitoredAdd = monitor({
            main: { ref: add },
            inspector: (visit) => {
                // Only mutate on the first execution to prove persistence
                if (modifiedOp) return;

                visit.is('ReturnStatement', (event) => {
                    const arg = event.node.argument;
                    if (arg?.type === "BinaryExpression") {
                        arg.operator = "-"; // Mutate the AST node from '+' to '-'
                        modifiedOp = true;
                    }
                });
            }
        });

        // Before execution, no mutation has occurred
        expect(modifiedOp).toBe(false);

        // First call: The inspector mutates the AST. 
        // The function executes as `1 - 2`, resulting in -1.
        const result1 = monitoredAdd(1, 2);
        expect(result1).toBe(-1);
        expect(modifiedOp).toBe(true);

        // Second call: The inspector skips mutation, BUT the AST is already changed.
        // The function executes as `4 - 3`, resulting in 1 (proving persistence).
        const result2 = monitoredAdd(4, 3);
        expect(result2).toBe(1);
        expect(modifiedOp).toBe(true);
    });
});