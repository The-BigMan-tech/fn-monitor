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
        expect(()=>fn()).toThrow(ReferenceError)
    });
})