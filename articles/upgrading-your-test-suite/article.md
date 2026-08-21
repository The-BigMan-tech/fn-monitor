---
title: Upgrade your Test Suite with fn-monitor
description: Combining Vitest with fn-monitor to assert not just what your functions return, but the work they actually do.
tags: javascript, typescript, testing, vitest
---

Modern JavaScript testing focuses heavily on testing public outputs and user behavior rather than chasing line-by-line or branch-by-branch coverage. This is because tests that check final outputs survive when you rewrite internal logic or change how a loop works, and they already catch the majority of regressions.

Despite this, if you write complex financial calculations, security rules, or state machines where an unhandled condition cannot be tolerated, then a green test on the final value is not the whole story. The same return value can be produced by two different executions — one correct, and one that silently skipped a critical step — and an assertion on the output alone cannot tell them apart. In those domains, you need to verify not just what the function returned, but the work it performed to get there.

That is the gap this article closes. We will combine Vitest with fn-monitor — a package that inspects runtime behavior at the AST level — and upgrade a suite from asserting outputs to asserting internal behavior: which calls ran and which were skipped.

## The project

The setup is deliberately minimal: two dependencies, one source file, one test file, and a handful of config lines. Create a folder (we'll call it `vitest-with-monitor`) with this structure:

```text
vitest-with-monitor/
├── src/
│   └── index.ts
├── tests/
│   └── index.test.ts
├── .gitignore
├── vitest.config.ts
└── package.json
```

## Setup

Install the two dependencies:

```shell
npm add -D vitest
npm add -D @typescript-guy/fn-monitor
```

Add `node_modules` to your `.gitignore` and write a minimal config:

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        include: ['tests/**/*.test.ts'],
    },
});
```

Add this script to your `package.json`:

```json
"scripts": {
    "test": "vitest run"
}
```

Setup is done. In the next section, we'll write the code under test.

## The Code Under Test

We're going to test a progressive tax calculator. It applies different rates across income brackets, but there's a compliance requirement: high-income earners must trigger an audit. 

You don't have to stress about the details. For this article, all you need to know is that it must calculate the tax and satisfy the compliance requirement:

```typescript
// src/index.ts

export function calculateTax(income: number): number {
    const lowThreshold = 1_000;
    const highThreshold = 5_000;
    
    const lowRate = 0.1;
    const averageRate = 0.2;
    const highRate = 0.3;
    

    const baseTax = 100; 
    const midBracketTax = 800; 

    let tax = 0;

    if (income <= lowThreshold) {
        tax = income * lowRate;
    } else if (income <= highThreshold) {
        tax = baseTax + (income - lowThreshold) * averageRate;
    } else {
        tax = baseTax + midBracketTax + (income - highThreshold) * highRate;
        triggerHighIncomeAudit(); 
    }
    return tax;
}
function triggerHighIncomeAudit(): void {
    console.log('High income audit triggered');
}
```

## The Tests

### The Black-box Test (The Blind Spot)

Let's write the test that we usually write when we want to assert that a function behaves correctly — a standard black-box test. Although it looks perfectly fine and passes with the correct code, it only asserts that the calculation is correct:

```typescript
// tests/index.test.ts

import { test, expect } from 'vitest';
import { calculateTax } from '../src/index';

test('calculates correct tax for high income', () => {
    const income = 10_000;
    const expectedTax = 2_400;
    
    expect(calculateTax(income)).toBe(expectedTax);
});
```

### The Upgraded Test

Next, we write another test using the same assertion as the black-box one but we will also inspect its AST using `fn-monitor`. It will assert that `triggerHighIncomeAudit` was actually called during execution.

For an overview, `fn-monitor` works by running functions through a JS-in-JS interpreter where it has full control of its execution. We import `monitor`, pass it our target function through an object, and get a new function that runs through the interpreter. The new function retains the call signature of the target.

Because the new function runs in a simulated environment, it will lose access to its lexical scope upon wrapping. The `captures` property gives the interpreter a function reference to bind to the `triggerHighIncomeAudit` identifier so it can execute without throwing a `ReferenceError`.

Together with our target function, we can also pass an `inspector` which is a first-class hook that can observe and control the AST mid-execution. For this test, we will use it to observe `CallExpression` nodes:

```typescript
// tests/index.test.ts

//...Our other imports
//...Our black-box test

import { monitor } from '@typescript-guy/fn-monitor';

test('triggers compliance audit for high income', () => {
    const calls = new Set();
    const mockAudit = () => {};

    const monitoredCalculateTax = monitor({
        main: { 
            ref: calculateTax, // the function that we want to monitor
            captures: {
                triggerHighIncomeAudit: mockAudit
            }
        },
        inspector: (visit) => {
            visit.is('CallExpression', event => {
                const callee = event.node.callee;
                const scope = event.scope;

                if (callee.type !== "Identifier") return;

                const func = scope.variables.search(callee.name);
                calls.add(func);
            });
        }
    });
    // Output assertion
    expect(monitoredCalculateTax(10_000)).toBe(2_400);
    
    // Internal behavior assertion (The upgrade!)
    expect(calls).toContain(mockAudit);
});
```

If we run the tests now, both will pass.

#### Output

```text
 ✓ tests/index.test.ts (2 tests) 63ms
   ✓ calculates correct tax for high income 12ms
   ✓ triggers compliance audit for high income 45ms

 Test Files  1 passed (1)
      Tests  2 passed (2)
```

> 💡 The loss of lexical access uncovers a hidden advantage of using `fn-monitor` for this test: `triggerHighIncomeAudit` **does not need to be exported**. 
> 
> Traditional spies can't reach a private function without restructuring the code. With `fn-monitor`, you just pass a dummy function into `captures` — the interpreter only needs *some* binding for that name, as long as it respects the signature the code under test expects.


### The "Gotcha" Moment (Breaking the Code)

Six months later, a well-meaning developer refactors `calculateTax` to clean up the math. They accidentally delete the audit call. The tax calculation function still returns the correct number but now you have a compliance violation.

```typescript
export function calculateTax(income: number): number {
     // ... math ...
    } else {
        tax = baseTax + midBracketTax + (income - highThreshold) * highRate;
        // triggerHighIncomeAudit();
    }
    return tax;
}
```

When we run the tests, we will see that it is only the second test that catches the regression and fails:

#### Output

```text
 ❯ tests/index.test.ts (2 tests | 1 failed) 51ms
   ✓ calculates correct tax for high income 6ms
   × triggers compliance audit for high income 40ms

FAIL  tests/index.test.ts > triggers compliance audit for high income
AssertionError: expected [] to include [Function mockAudit]
 ❯ tests/index.test.ts:46:19
     44|
     45|     // Internal behavior assertion (The upgrade!)
     46|     expect(calls).toContain(mockAudit);
       |                   ^
     47| });
```

## When to Use This

The upgraded test caught a compliance violation that the first one missed — but we paid for it with extra code and execution overhead. That's the tradeoff for internal behavior assertions, but they catch a different class of bugs.

Use them when:
- **Silent failures are unacceptable** — compliance rules, financial calculations, security checks
- **Side effects matter** — logging, analytics, cache invalidation, audit trails
- **Output alone doesn't tell the whole story** — the same return value could come from correct or incorrect internal work

For most tests, output assertions are enough. They're fast, they survive refactors, and they catch the majority of regressions. But for the 5% of your code where a green test on the wrong behavior is a real problem, fn-monitor gives you the observability to assert on the work, not just the output.

## Further Reading

This article covered the most common use case: observing internal behavior. `fn-monitor` has two other powerful patterns worth exploring:

- [**Execution Timeouts**](https://dev.to/typescript-guy/stop-a-function-call-from-hanging-the-main-thread-without-using-web-workers-15me) — govern how long a function can run before it's forcibly stopped. Useful for preventing infinite loops and enforcing performance budgets.

- [**AST Mutation**](https://dev.to/typescript-guy/rewrite-javascript-behavior-at-runtime-with-ast-mutation-from-the-same-thread-5gh6) — rewrite function behavior at the AST level. Useful for advanced mocking and testing scenarios where you need to intercept and modify code before it runs.

## Next Steps

The code for this article is available in the [vitest-with-monitor](https://github.com/The-BigMan-tech/vitest-with-monitor) repository. Clone it, run `npm install` and `npm test`, and see the difference between the black-box and upgraded tests yourself.

If you had any trouble following along, spotted a typo, or just want to show off a unique use case you built with `fn-monitor`, feel free to open a [discussion on GitHub](https://github.com/The-BigMan-tech/fn-monitor/discussions).

And if you're interested in using `fn-monitor` in your own projects, check out the [main repository](https://github.com/The-BigMan-tech/fn-monitor) for the full documentation.