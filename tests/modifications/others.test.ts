import { describe, it, expect } from 'vitest';
import {InspectorGenerator, monitor} from "../../src/index.ts"
import { ForbiddenDynamicImport } from '../../src/custom-types.ts';

describe('Other Runtime Behaviours',()=>{

    it('[Sync] should enforce strict mode semantics (undeclared vars & undefined `this`)', () => {
        // 1. Tests ReferenceError on undeclared variables
        const fnThrow = monitor({
            main: {
                ref: () => {
                    //@ts-expect-error
                    unboundVar = 42;
                }
            }
        });
        expect(() => fnThrow()).toThrow(ReferenceError);

        // 2. Tests that top-level `this` is undefined in strict mode
        const context = { thisValue: 'not-set' as any };
        const fnThis = monitor({
            main: {
                ref: function() {
                    context.thisValue = this;
                },
                captures: { context }
            }
        });
        fnThis();
        expect(context.thisValue).toBe(undefined);
    });

    it('[Async] should ensure that dynamic imports are not supported',async() => {
        /**
          * The import() lives inside a string so that no toolchain rewrites it.
          * This will allow fn-monitor to parse fn.toString() and see a REAL ImportExpression.
        */
        const dynamicImportFn = new Function(`
            return new Promise(resolve => {
                resolve(import("ansis"))
            })
        `);
        const fn = monitor({
            main: { 
                ref: dynamicImportFn as () => unknown 
            }
        });
        await expect(fn()).rejects.toThrowError(ForbiddenDynamicImport)
    });

    it('[Sync] should ensure that the captures of the main function and the embedded ones are properly isolated to themselves',()=>{
        //these declarations are just to prevent TS from complaining
        let count;
        let secondFn;
        let thirdFn;

        const fn = monitor({
            main: {
                ref:()=>{
                    return {
                        mainFn:count,
                        secondFn:secondFn!(),
                        thirdFn:thirdFn!()
                    }
                },
                captures:{
                    count:10
                }
            },
            embed:{
                secondFn:{
                    ref:()=>count,
                    captures:{
                        count:20
                    }
                },
                thirdFn:{
                    ref:()=>count,
                    captures:{
                        count:30
                    }
                }
            }
        });
        expect(fn()).toEqual({
            mainFn:10,
            secondFn:20,
            thirdFn:30
        });
    })

    it('[Sync] should ensure that an inspector always watches the monitored function on every call.',()=>{
        let count = 0;
        let calledInspector = false;

        const fn = monitor({
            main:{
                ref:()=>undefined
            },
            beforeEachCall:()=>{
                calledInspector = false;
            },

            //if the interpreter doesn't properly reset to the monitoring state on every call, 
            // this hook wont fire and it will reflect in the count and fail the test
            inspector:()=>{
                if (!calledInspector) {//this ensures that it only mutates the count once per call
                    count += 1;
                    calledInspector = true
                }
            }
        })
        for (let i = 1;i < 10;i++) {
            fn();
            expect(count).toBe(i);
        }
    })

    it('[Async-only] should ensure that the interpreter properly bubbles up errors when handling an async function with a defined inspector',async()=>{
        const fn = monitor({
            main:{
                ref:async ()=>{
                    await new Promise<void>(() => {
                        throw new Error('Hello world')
                    })
                }
            },
            //using a defined inspector forces it to use the modified parts of the evaluator
            inspector:function* ():InspectorGenerator {}
        })
        await expect(fn()).rejects.toThrow('Hello world');
    })

    /**
     * The function below defines a monitored function that uses a wide range of globals without declaring any `captures`.
     * Successful execution without a ReferenceError proves that they are available by default.
     * 
     * In case the interpreter mocks globals — creating sandboxed copies rather than sharing native 
     * references, this test avoids checking for referential equality. Instead, it asserts behavior to 
     * ensure the test remains robust regardless of implementation choice.
     * 
     * When testing for the console, it simply checks if it is defined. This is to:
     *   - Avoid boilerplate from introducing spy APIs
     * 
     *   - Prevent the test from failing if the interpreter ever decides not to pipe the message to  
     *    `process.stdout` or includes extra strings with the log
    */
    it('[Async] should expose standard language globals without requiring captures',async () => {
        const fn = monitor({
            main: {
                ref:async (a: number, b: number) => {
                    const proxyHandler = {
                        get: (obj: any, prop: string) => {
                            return prop in obj ? obj[prop] : 42;
                        }
                    };
                    return {
                        math:   Math.max(a, b) + Math.min(a, b),
                        json:   JSON.stringify({ total: a + b }),
                        array:  new Array(3).fill(a + b),
                        object: Object.keys({ x: 1, y: 2 }),
                        map:    new Map<string, number>([['key', a * b]]),
                        set:    new Set<number>([a * b]),
                        date:   new Date(0).getTime(),
                        regex:  /abc/.test('xxabcxx'),
                        number: Number('42'),
                        str:    String(42),
                        bool:   Boolean(1),
                        err:    new Error('test').message,
                        promisedValue: await Promise.resolve(42),
                        hasConsole:console !== undefined,
                        valueFromProxy:new Proxy({},proxyHandler)['nonExistentProp']
                    };
                },
                // NOTE: `captures` intentionally omitted.
            },
        });

        const result = await fn(5, 10);
        
        expect(result).toMatchObject({
            math:15,
            json:'{"total":15}',
            array:[15, 15, 15],
            object:['x', 'y'],
            date:0,
            regex:true,
            number:42,
            str:'42',
            bool:true,
            err:'test',
            promisedValue:42,
            hasConsole:true,
            valueFromProxy:42
        })

        expect(result.map.get('key')).toBe(50);
        expect(result.set.has(50)).toBe(true);
    });
})
