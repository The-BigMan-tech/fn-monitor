import { describe, it, expect } from 'vitest';
import { monitor } from '../../src/index'; 
import { WrapperError } from '../../src/custom-types';

describe('Wrapper Constraints', () => {

    it('should augment the returned function with the alreadyMonitored flag', () => {
        const monitoredFn = monitor({
            main: { 
                ref:() => undefined
            } 
        });
        expect(monitoredFn.alreadyMonitored).toBe(true);
    });

    it('should throw an error if an already monitored function is passed to main.ref', () => {
        const monitoredFn = monitor({
            main: { 
                ref:() => undefined
            } 
        });
        expect(() => {
            monitor({ 
                main: { 
                    ref: monitoredFn 
                } 
            });
        }).toThrow(WrapperError);
    });

    it('should throw an error if an already monitored function is passed to embed through a ref property', () => {
        const monitoredFn = monitor({
            main: { 
                ref:() => undefined
            } 
        });
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

    it('should successfully execute an already monitored function when passed via captures', () => {
        const monitoredInnerFn = monitor({ 
            main: { 
                ref: (x: number) => x * 2
            } 
        });
        
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
        
        expect(monitoredOuterFn(5)).toBe(110);// Execute and verify
    });
});