---
title: A New Way to Test Retry Logic Without Refactoring Your JavaScript Code
description: Use AST node interception to inspect and mutate JavaScript functions without touching their source code.
tags: javascript, typescript, testing, webdev
---

If you build robust JavaScript/TypeScript applications, you know that testing functions with internal state or retries is a headache. The standard advice is always: *"Refactor your code to use dependency injection so you can mock the delays."*

But what if you don't want to pollute your clean production API just to satisfy a test?

This is exactly where the **`@typescript-guy/fn-monitor`** package shines. It's a lightweight tool that lets you monitor, intercept, and control the execution of any function at the AST level, without needing to change the code that runs in production. It achieves this by running your functions through a JS-in-JS interpreter.

Today, I want to highlight one of its most powerful capabilities: the **`overwrite`** property. It uses AST mutation to force specific variables to always resolve to your specified values, bypassing internal logic.

Consider this snippet of typical production code:

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

Now, let's use `fn-monitor` to create a test version of this function that fails instantly. 

First, install the package:

```bash
npm install @typescript-guy/fn-monitor
```

Then add the following code to the same file:

```typescript
import { monitor } from "@typescript-guy/fn-monitor";

// ... `api` and `fetchWithRetry` definitions

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

### Why this approach protects your production code

- **Zero Refactoring:** Mock internal state without changing function signatures or adding boilerplate.
- **No Fake Timers:** Bypasses the delay in `setTimeout` entirely, eliminating the need for complex fake timer setups in your test runner.
- **Universal Mocking:** Virtually any variable the function uses can be seamlessly substituted with a mock value.

If this approach sounds useful for your testing workflow, check out:

- 📦 **The repository and documentation:** https://github.com/The-BigMan-tech/fn-monitor
- 📝 **My articles for in-depth tutorials:** https://dev.to/typescript-guy

If you have questions or ideas, feel free to open a [discussion on GitHub](https://github.com/The-BigMan-tech/fn-monitor/discussions).
