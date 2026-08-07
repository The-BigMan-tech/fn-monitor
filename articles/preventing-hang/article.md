---
title: Stopping a function call from hanging the main thread without using web workers
description: Using a hook into a JS-in-JS interpreter to implement budget allocation on the same thread
tags: javascript, typescript, interpreter, web-workers
---

In JavaScript, the de facto way to stop a function call from hanging the main thread in JavaScript is asynchronous non-blocking execution, typically achieved by offloading heavy work to a Web Worker or breaking the task into smaller chunks using setTimeout or queueMicrotask to yield control back to the event loop

Today, we are going to take a different approach by using the package, `@typescript-guy/fn-monitor`

Here is a quick overview of the package: 

- It is a wrapper over a JS-in-JS interpreter that lets you to deeply monitor functions as they execute with an api that abstracts the interpreter's mechanics

- It allows you to plug in hooks at any part of the function's lifecyle to observe data and mutate nodes at runtime

- It exposes a function called `monitor` which takes in a configuration object that includes a function reference(the function you want to monitor), a captures object(for including external variables that the function uses) and a bunch of hooks. It returns a brand new function that has an identical call signature as the original.

- It works for synchronous and asynchronous functions and although it cant accept a generator function, it cannot monitor them


Before diving into this article, here is a link to the first article to read later if you want to understand the fundamentals.[link goes here] 


Back to the topic:

Let us first write out our imports and custom types:

```typescript
import { monitor, Metadata } from "@typescript-guy/fn-monitor";

type milliseconds = number;
type Fn = (...args:any[])=>void
```

Then we can create our timer function. You can implement your own, but here, we have a bare minimum example

```typescript
function timeFn<T extends Fn>(fn:T,budget:milliseconds):T {
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
function hangingOp():void {
    //This simulates a lagging operation.
    //calling this natively in js will hang the main thread.
    //but our monitored function setup should halt it and throw an error.

    while (true) {
        console.log('Lag');
    }
    //some other implementation
}
const timedOp = timeFn(hangingOp,50);
```

then we call it
```typescript
timedOp()
```

when we run it, we get:

**Output:**
```text
Lag
Lag
Lag
Lag
Lag
Lag
Lag
Lag
Error: The monitored function used 62.281ms when only given a budget of 50.000ms.
...
```

The timer isnt 100% accurate because the interprter steps off while the native js engine runs those logs. And the exact millisecond it will halt is not deterministic. But if we are being pragmatic, it is far better to loose a few milliseconds than to hang our main thread.

While this works, you cant just use our timer on any arbitrary function. If that function uses external variables, you have to make sure that you capture them with the captures property as discussed in the last article. But let us see a nuance when our timed function calls another function.

## Capturing vs Embedding
Assuming we have time a function that needs to call another, we can't just do:

```typescript
function hangingOp2():void {
    hangingOp()
}
const timedOp2 = timeFn(hangingOp2,50,{
    hangingOp
});
timedOp2()
```

this will crash and we will get a Reference Error: 

### Output
```text
Reference Error
----------------
hangingOp is not defined
```

so we will have to extends our custom timeout to accept a captures object:

```typescript
type milliseconds = number;

function timeFn<T extends Fn>(fn:T,budget:milliseconds,captures?:Record<string,any>):T {
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
            captures
        },
        //other hooks
    })
    return monitoredFn
}

```
Then we can time our new hanging op like this:

```typescript
const timedOp2 = timeFn(hangingOp2,50,{
    hangingOp
});
timedOp2()
```

but when we call it, our timeout wont be able to stop it and it will hang the main thread:

### Output
```text
Lag
Lag
Lag
Lag
Lag
Lag
Lag
Lag
Lag
....
```

This is where embedding comes into play. Unlike capturing, which tells the interpreter to take direct references, embedding tells it to take our existing function reference, copy its source code into the same context as our moitored function and parse it altogether. 

This allows the onStep hook in our timeout function to catch an infinite loop in our previous example. But we will need to extend our timeout function. We will pack both the captures and embed configurations in a single object to make it neat

```typescript
interface ExternalData {
    captures?:Record<string,any>,
    embed?:Record<string,Metadata<Fn>>
};
function timeFn<T extends Fn>(fn:T,budget:milliseconds,externalData?:ExternalData):T {
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
            captures:externalData?.captures
        },
        embed:externalData?.embed,
        //Other hooks
    })
}
```

Then we can time our function like this: 
```typescript
const timedOp2 = timeFn(hangingOp2,50,{
    //The embed property has the same configuration structure as 'main' in the object passed to monitor()
    embed:{
        hangingOp:{
            ref:hangingOp
        }
    }
});
timedOp2()
```

Then we get:

### Output
```text
Lag
Lag
Lag
Lag
Lag
Lag
Lag
Lag
Lag
Error: The monitored function used 58.161ms when only given a budget of 50.000ms.
...
```

## Conclusion

Because JavaScript is single-threaded, any code running on the main thread must finish completely before the browser can update the UI or the server can respond to user requests meaning that there is no seamless, single-thread solution to stop a function call from hanging the application

This package uses a different approach, but of course, it is not free in terms of performance and you have to capture any external variables that it uses. But it is good for running functions where performance is not critical, where the overhead is affordable and explicity in external variable access is worth the trade.

If you have questions or ideas, drop a comment — I read all of them. The project is open source on [GitHub](https://github.com/The-BigMan-tech/fn-monitor) for more details and published on npm as `@typescript-guy/fn-monitor`, with runnable examples in the repo.