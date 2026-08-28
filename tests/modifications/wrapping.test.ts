import { describe, it, expect } from 'vitest';
import { monitor } from '../../src/index'; 
import { WrapperError } from '../../src/custom-types';
import { parse } from "meriyah"

describe('Wrapping Behaviour', () => {

    it('[Wrap] should augment the returned monitored function with the alreadyMonitored flag', () => {
        const monitoredFn = monitor({
            main: { 
                ref:() => undefined
            } 
        });
        expect(monitoredFn.alreadyMonitored).toBe(true);
    });

    it('[Wrap] should throw an error if an already monitored function is directly being wrapped to create a new monitored function', () => {
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

    it('[Wrap] should write the generated source code used by the interpreter to the value property in sourceOut', () => {
        // Initialized to `undefined` so the test fails loudly if the interpreter forgets to write to `sourceOut`. 
        const generatedCode = {value:undefined} as {value:any}

        monitor({
            main: { 
                ref:() => 'hello'
            },
            sourceOut:generatedCode
        });
        expect(typeof generatedCode.value).toBe('string');
        expect(generatedCode.value.length).toBeGreaterThan(0);
    });

    it('[Wrap] should write syntactically valid source code to sourceOut', () => {
        // Initialized to `undefined` so the test fails loudly if the interpreter forgets to write to `sourceOut`. 
        const generatedCode = { value: undefined } as {value:any};

        monitor({
            main: {
                ref: () => 'hello',
            },
            sourceOut: generatedCode,
        });
        expect(() => parse(generatedCode.value)).not.toThrow();
    });

    it('[Wrap] should throw an error if an already monitored function is being embedded in a new monitored function\'s context', () => {
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

    it('[Wrap] should allow an already monitored function to be captured in a new monitored function\'s context', () => {
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

    it('[Wrap] should ensure that the monitored function doesn\'t execute during the wrapping phase',()=>{
        let calledFn = false;

        monitor({
            main:{
                ref:()=>{
                    calledFn = true
                }
            }
        })
        expect(calledFn).toBe(false);
    });

    it('should preserve `this` context and correctly capture class properties through the `bind` property',()=>{
        let exprCount = 0;
        const props = {
            prefix:'',
            permission:''
        }
        
        class UserService {
            private static prefix = "User:";
            private permission = "user";

            public printName = () => {
                props.prefix = UserService.prefix;
                props.permission = this.permission;
            }
        }

        const service = new UserService();

        const monitoredMethod = monitor({
            main: {
                ref: service.printName,
                bind: service,
                captures: {
                    props,
                    UserService // Capturing the class directly for static properties
                }
            },
            beforeEachCall:()=>{
                exprCount = 0;
            },
            inspector: (visit) => {
                visit.is('AssignmentExpression', () => {
                    exprCount += 1;
                });
            }
        });
        monitoredMethod();
        expect(props.prefix).toBe('User:');
        expect(props.permission).toBe('user');
        expect(exprCount).toBe(2);
    });
});