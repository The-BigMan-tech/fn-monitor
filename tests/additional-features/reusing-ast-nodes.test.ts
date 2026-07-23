import { describe, it, expect } from 'vitest';
import { monitor } from '../../src/index'; 

describe('AST Mutation Persistence', () => {
    it('should parse the function into an AST once and reuse it, causing mutations to persist across calls', () => {
        let modifiedOp = false;

        function add(a: number, b: number) {
            return a + b;
        }
        const monitoredFn = monitor({//this is intentionally not lifted to the top because its doing a stateful operation and it should not affect other tests
            main: { 
                ref: add 
            },
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
        // The function executes as `5 - 1`, resulting in 4.
        const result1 = monitoredFn(5, 1);
        expect(result1).toBe(4);
        expect(modifiedOp).toBe(true);

        // Second call: The inspector skips mutation, BUT the AST is already changed.
        // The function executes as `4 - 3`, resulting in 1 (proving persistence).
        expect(modifiedOp).toBe(true);
        const result2 = monitoredFn(4, 3);
        expect(result2).toBe(1);
    });

    it('should reuse ast nodes if the internal generated code from calling monitor hits the cache.',()=>{
        function sub(a: number, b: number) {
            return a - b;
        }
        const monitoredSub = monitor({//this is intentionally not lifted to the top because its doing a stateful operation and it should not affect other tests
            main: { 
                ref:sub 
            },
            inspector: (visit) => {
                visit.is('ReturnStatement', (event) => {
                    const arg = event.node.argument;
                    if (arg?.type === "BinaryExpression") {
                        arg.operator = "+"; // Mutate the AST node from '-' to '+'
                    }
                });
            }
        });
        const monitoredSub2 = monitor({
            main:{
                ref:sub
            }
        });
        expect(monitoredSub(4,2)).toBe(6);
        expect(monitoredSub2(5,2)).toBe(7);//the mutated operator persists to this call
    })
});