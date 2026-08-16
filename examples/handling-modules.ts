import { monitor } from "../src/index.ts";


// ❌ FAILING CASE: Capturing the entire library object

const ansis = await import("ansis");

const fn = monitor({
    main: {
        ref: () => {
            // This call fails because `.green` returns a complex object that
            // the interpreter can't invoke properly
            return ansis.green('Hello world');
        },
        captures: {
            ansis: ansis.default
        }
    }
});

try {
    console.log(fn());
} catch (err) {
    console.log('Error:', (err as Error).message);
    // Output: Error: func.apply is not a function
}


// ✅ WORKING CASE: Capture a simple wrapper over the function

const ansisWrapper = {
    green:(text: string) => ansis.green(text)
}
const fn2 = monitor({
    main: {
        ref: () => {
            // This works because we're calling a function on a plain object that the
            // interpreter captured directly
            return ansis.green('Hello world');
        },
        captures: {
            ansis:ansisWrapper
        }
    }
});

console.log(fn2());
// Output: Hello world (with green ANSI codes)