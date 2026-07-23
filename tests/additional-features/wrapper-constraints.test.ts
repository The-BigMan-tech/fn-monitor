import { describe, it, expect } from 'vitest';
import { monitor } from '../../src/index'; 
import { WrapperError } from '../../src/custom-types';

describe('Wrapper Constraints', () => {
    const monitoredFn = monitor({
        main: { 
            ref:() => undefined
        } 
    });

    // TEST 1: Verify the `alreadyMonitored` flag exists

    it('should augment the returned function with the alreadyMonitored flag', () => {
        expect(monitoredFn.alreadyMonitored).toBe(true);
    });


    // TEST 2: The Guardrail (Double-wrapping via main.ref)

    it('should throw an error if an already monitored function is passed to main.ref', () => {
        expect(() => {
            monitor({ 
                main: { 
                    ref: monitoredFn 
                } 
            });
        }).toThrow(WrapperError);
    });


    // TEST 3: The Guardrail (Double-wrapping via embed)

    it('should throw an error if an already monitored function is passed to embed through a ref property', () => {
        expect(() => {
            monitor({ 
                main: { 
                    ref:()=>undefined
                },
                embed: { 
                    inner: { 
                        ref: monitoredFn 
                    } 
                } 
            });
        }).toThrow(WrapperError);
    });

    // TEST 4: The Workaround (Capturing a monitored function)

    it('should successfully execute an already monitored function when passed via captures', () => {
        const innerFn = (x: number) => x * 2;
        const monitoredInnerFn = monitor({ main: { ref: innerFn } });
        
        // Verify the inner function works natively first
        expect(monitoredInnerFn(5)).toBe(10);

        const monitoredOuterFn = monitor({
            main: { 
                ref:(x: number) => {
                    return monitoredInnerFn(x) + 100; 
                },
                captures: {
                    // We pass the monitored function into the native captures.
                    // Because it's in `captures`, it runs in the native JS engine,completely outside the outer interpreter's AST context.
                    monitoredInnerFn 
                }
            }
        });
        // Execute and verify
        expect(monitoredOuterFn(5)).toBe(110);
    });
});