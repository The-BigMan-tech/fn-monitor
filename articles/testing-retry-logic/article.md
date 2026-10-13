---
title: A New Way to Test Retry Logic Without Refactoring Your JavaScript Code
description: Use AST node interception to inspect and mutate JavaScript functions without touching their source code
tags: javascript, typescript, testing, webdev
---

If you build robust JavaScript/TypeScript applications, you know that testing functions with internal state or retries is a headache. The standard advice is always: *"Refactor your code to use dependency injection so you can mock the delays."*

But what if you don't want to pollute your clean production API just to satisfy a test?

This is exactly where the **`@typescript-guy/fn-monitor`** package shines. It's a lightweight tool that lets you monitor, intercept, and control the execution of any function at the AST level, without needing to change the code that runs in production. It achieves this by running your functions through a lightweight JS-in-JS interpreter.

Today, I want to highlight one of its most powerful capabilities: the **`overwrite`** property. It uses AST mutation to force variables to always resolve to your specified values.

Here is a snippet of our production code:

```typescript
// 🏭 Fake API
const api = { 
    get: async (url: string) => { throw new Error("Network Failure"); } 
};

// 🏭 Production code: Resilient retry logic
async function fetchWithRetry(url: string) {
    let attempts = 0;
    let lastError: any = null;

    const retryDelayMs = 2000; // 😫 Painful to wait in tests!
    const maxAttempts = 3;

    while (attempts < maxAttempts) {
        try {
            return await api.get(url); 
        } catch (error) {
            attempts++;
            lastError = error;

            if (attempts === maxAttempts) {
                console.log(`Attempt ${attempts} failed. No retries left.`);
                break;
            }
            console.log(`Attempt ${attempts} failed. Retrying in ${retryDelayMs}ms...`);
            await new Promise(r => setTimeout(r, retryDelayMs));
        }
    }
    throw lastError; 
}
```

Using the fn-monitor package to make a copy of our function that fails fast:

```typescript
import { monitor } from "@typescript-guy/fn-monitor";

//...Our production code

// 🧪 Test: Force instant failure (No refactoring needed!)
const failFastFetch = monitor({
    main: { 
        ref: fetchWithRetry, // The function to monitor and transform
        captures: { api },   // Inject the API into the interpreter's environment
        overwrite: { 
            retryDelayMs: 0, // ✨ Eliminates the 2-second wait
            maxAttempts: 2   // ✨ Forces failure on the 2nd try
        } 
    }
});

try {
    // Call the new function exactly like the original
    await failFastFetch('https://api.example.com/data'); 
} catch (error) {
    console.log(`Caught error: ${(error as Error).message}`); 
}
```

## Output

```text
Attempt 1 failed. Retrying in 0ms...
Attempt 2 failed. No retries left.
Caught error: Network Failure
```

### Why this approach helps your production code

- Zero Refactoring
- No fake timers
- Virtually any variable the function uses can be substituted with a mock

If this approach sounds useful for your testing workflow, check out:

- 📦 **The repository and documentation:** [https://github.com/The-BigMan-tech/fn-monitor](https://github.com/The-BigMan-tech/fn-monitor)
- 📝 **My articles for in-depth tutorials:** [https://dev.to/typescript-guy](https://dev.to/typescript-guy)

If you have questions or ideas, feel free to open a [discussion on GitHub](https://github.com/The-BigMan-tech/fn-monitor/discussions).
