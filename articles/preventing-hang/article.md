---
title: Stopping
description: Use AST node interception to inspect and mutate JavaScript behavior while a function executes on the same thread.
tags: javascript, typescript, ast, webdev
---

Before diving into this article, here is a link to the first article to read later if you want to understand the fundamentals. Here is a quick cathup if you want to read that article later:

- @typescript-guy/fn-monitor is a package that lets you to deeply monitor functions as they execute by using a js-in-js interpreter

- It allows you to plug in hooks at any part of the function's lifecyle to observe data and mutate nodes at runtime

- It exposes a function called `monitor` which takes in a configuration object that includes a function reference(the function you want to monitor), a captures object(for including external variables that the function uses) and a bunch of hooks. It returns a brand new function that has an identical call signature as the original.

- It works for synchronous and asynchronous functions and although it cant accept a generator function, it cannot monitor them


Back to the topic:

We first create our timeout function. You can implement your own, but here, we have a bare minimum example

```typescript
import { monitor } from "@typescript-guy/fn-monitor";

type milliseconds = number;

function timeFn<T extends (...args:any[])=>void>(fn:T,budget:milliseconds):T {
    const fnBuildStart = performance.now();
    const graceTime = 0.5 as milliseconds;

    let startTime = 0 as milliseconds;
    let usedTime = 0 as milliseconds;
    let step = 0;

    const checkBudget = ()=>{
        usedTime = (performance.now() - startTime);
        if (usedTime > (budget + graceTime)) {
            throw new Error(`The monitored function used ${usedTime.toFixed(3)}ms when only given a budget of ${budget.toFixed(3)}ms.`);
        };
    };
    const monitoredFn = monitor({
        main:{
            ref:fn,
        },
        beforeEachCall: () => {
            startTime = performance.now()
            usedTime = 0;
            step = 0;
        },
        onStep:() => {
            step += 1;

            //Only check the budget every 1024 steps since perf.now is heavy
            //we use a bitwise operator here to be fast
            const shouldCheckBudget = (step & 1023) === 0;
            if (shouldCheckBudget) checkBudget();
        },
        afterEachCall:(result)=>{
            //if the result is an error,we let the interpreter bubble it up
            if (!(result instanceof Error)) {
                //in case the function doesn't use up to the number of steps required to recheck the budget,we check the budget here to be accurate and safe
                checkBudget();
            }
        }
    });
    return monitoredFn
};
```

we can try to time a sample function

```typescript
function hangingOp(): number {
    //simulate an infinite loop.calling this natively in js will hang the main thread.
    // but our monitored function setup should halt it and throw an error.
    while (true) {

    }
    //some other implementation
}
const timedOp = timeFn(hangingOp,50);
timedOp()
```

then we call it
```typescript
timedOp()
```

when we run it, we get:

**Output:**
```text
Error: The monitored function used 50.941ms when only given a budget of 50.000ms.
...
```

While this works, you cant just wrap any arbitrary function if it uses external variables. You have to make sure that you capture them with the captures property as discussed in the previous article
