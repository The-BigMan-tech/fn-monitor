import { describe, it, expect } from 'vitest';
import { monitor } from '../../src/index'; 
import { WrapperError } from '../../src/custom-types';

//This doesnt have async tests because it's only testing pure pre-processing behaviour

describe('Wrapper Constraints', () => {

    it('should augment the returned monitored function with the alreadyMonitored flag', () => {
        const monitoredFn = monitor({
            main: { 
                ref:() => undefined
            } 
        });
        expect(monitoredFn.alreadyMonitored).toBe(true);
    });

    it('should throw an error if an already monitored function is directly being wrapped to create a new monitored function', () => {
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

    it('should throw an error if an already monitored function is being embedded in a new monitored function\'s context', () => {
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

    it('should allow an already monitored function to be captured in a new monitored function\'s context', () => {
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