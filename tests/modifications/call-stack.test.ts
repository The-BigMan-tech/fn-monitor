import { describe, it, expect } from 'vitest';
import { monitor } from '../../src/index'; 

describe('CallStack Behavior', () => {
    it('[Sync] should ensure the call stack is emptied after execution even if the function throws', () => {
        let executionCount = 0;
        let calledInspector = false;

        const embeddedFn = (shouldThrow:boolean)=>{
            if (shouldThrow){
                throw new Error('test error');
            }
        }
        const fn = monitor({
            main: {
                ref: (shouldThrow: boolean) => {
                    //calling an embedded fn makes the call stack to have more than one element. If the interpreter didnt clear it properly, it will fail
                    embeddedFn(shouldThrow);
                    return 'success';
                }
            },
            embed:{
                embeddedFn:{
                    ref:embeddedFn
                }
            },
            beforeEachCall: () => {
                executionCount++;
                calledInspector = false;
            },
            inspector: (visit) => {
                if (calledInspector) return;
                // On the second execution, the stack must contain ONLY the current 
                // main function. If the first (throwing) call leaked, length > 2.
                if (executionCount === 2) {
                    expect(visit.callStack().length).toBe(1);
                }
                calledInspector = true
            }
        });

        expect(() => fn(true)).toThrow('test error');
        fn(false);
    });

    it('[Sync] should ensure functions are inserted into the call stack in correct LIFO order', () => {
        function inner() { let x = 1; }
        function middle() { inner(); }
        function main() { middle(); }

        let hitDeclNode = false;

        const fn = monitor({
            main: { 
                ref: main 
            },
            embed: {
                inner: { ref: inner },
                middle: { ref: middle }
            },
            beforeEachCall:()=>{
                hitDeclNode = false;
            },
            inspector: (visit) => {
                visit.is('VariableDeclaration', () => {
                    const stack = visit.callStack();
                    expect(stack.get(0)).toBe(inner);   // most recent call
                    expect(stack.get(1)).toBe(middle);  // caller of inner
                    expect(stack.get(2)).toBe(main);    // caller of middle
                    expect(stack.length).toBe(3);
                    hitDeclNode = true;
                });
            }
        });
        fn();
        expect(hitDeclNode).toBe(true)
    });
})