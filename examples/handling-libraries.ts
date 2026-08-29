// change the import path to '@typescript-guy/fn-monitor' 

import { monitor } from "../src/index.ts";
const ansis = await import("ansis");// you can quickly install this to test the example

// ❌ FAILING CASE: Capturing the entire library object or one of its functions

const green = ansis.green;

const fn = monitor({
    main: {
        /**
         * It will fail at runtime because `ansis.green` and `green` return 
         * complex objects that the interpreter can't invoke properly
        */
        ref: (use:'fn' | 'object') => {
            return (use === 'fn')
                ?green('Hello world')
                :ansis.green('Hello world');
        },
        captures: {
            green,
            ansis
        }
    }
});

try {
    console.log(fn('fn'));
} catch (err) {
    console.log('Error:', (err as Error).message);
    // Output: Error: func.apply is not a function
}

try {
    console.log(fn('object'));
} catch (err) {
    console.log('Error:', (err as Error).message);
    // Output: Error: func.apply is not a function
}


// ✅ WORKING CASE: Capture a simple wrapper object

const stylize = {
    green: (text: string) => ansis.green(text)
};

const fn2 = monitor({
    main: {
        /**
         * `stylize.green` works here because we're calling a function on a plain object
         * that the interpreter captured directly
        */
        ref: () => {
            return stylize.green('Hello world');
        },
        captures: {
            stylize  // Capture the wrapper with a distinct name
        }
    }
});

console.log(fn2());
// Output: Hello world (with green ANSI codes)