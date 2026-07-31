import { describe, it, expect } from 'vitest';
import {monitor} from "../../src/index.ts"

describe('Other Runtime Behaviours',()=>{

    it('[Sync] should ensure that monitored functions executes in strict mode', () => {
        const fn = monitor({
            main: {
                ref:()=> {
                    //@ts-expect-error
                    x = 0;
                }
            }
        });
        expect(()=>fn()).toThrow(ReferenceError);
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

            //if the interpreter doesnt properly reset to the monitoring state on every call, 
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
})
