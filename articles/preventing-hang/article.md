---
title: Stop a Function Call From hanging the Main Thread Without Using Web Workers
description: Using a hook into a JS-in-JS interpreter to implement budget allocation on the same thread
tags: javascript, typescript, interpreter, web-workers
---

In JavaScript, the de facto standard to stop a function call from hanging the main thread is asynchronous non-blocking execution, typically achieved by offloading heavy work to a Web Worker or breaking the task into smaller chunks using setTimeout or queueMicrotask to yield control back to the event loop. 

While this works, these setups usually requires you to change how you call or implement your functios. Today, we are going to take a different approach that will address these limitations by using the package, `@typescript-guy/fn-monitor`

Before we start this article, let us get a quick overview of the package:

- It is a wrapper over a JS-in-JS interpreter that lets you to deeply monitor functions as they execute through an api that abstracts the underlying interpreter's mechanics

- It allows you to plug in hooks at any part of the function's lifecyle to observe data and mutate nodes at runtime while remaining on the same thread

- It exports a function called `monitor` which takes in a configuration object that includes a function reference (the function you want to monitor), a captures object (to include any external variable that the function will use) and a bunch of hooks. It returns a brand new function that has an identical call signature to the original

- It works for both synchronous and asynchronous functions. And although it can accept a generator function, it cannot monitor them


If you want to dig more into its fundamentals later, you can read the [first article]()


# Making our timeout function

To begin, let us first write out our imports and custom types:

```typescript
import { monitor, Metadata } from "@typescript-guy/fn-monitor";

type milliseconds = number;
type Fn = (...args:any[])=>void
```

Then we can create our timeout function. You can write your own implementation, but to follow along with the article, you can use this bare minimum example. We will extend it as we go:

```typescript
function timeFn<T extends Fn>(fn:T,budget:milliseconds):T {
    //We create a grace period to account for floating point errors in performance.now()
    const graceTime = 0.5 as milliseconds;

    //A snapshot of roughly the exact millisecond the function was called
    let startTime = 0 as milliseconds;

    //A volatile variable that continuously tracks how much time the function has used
    let usedTime = 0 as milliseconds;

    //A buffer to prevent us from checking performance.now() for every single interpreted step which will hurt its performance
    let step = 0;

    //This is a function that implements our budget tracking
    const checkBudget = ()=>{
        //UsedTime is calculated as the difference between the currentTime and the time as when the function was called
        const currentTime = performance.now();
        usedTime = (currentTime - startTime);

        const timeIsUp = usedTime > (budget + graceTime)
        if (timeIsUp) {
            throw new Error(`The monitored function used ${usedTime.toFixed(3)}ms when only given a budget of ${budget.toFixed(3)}ms.`);
        };
    };

    //The monitored function that we will return to the caller
    const monitoredFn = monitor({
        main:{
            ref:fn,
        },
        
        //From the name, this will run before each call to our monitored function
        beforeEachCall: () => {
            startTime = performance.now()
            usedTime = 0;
            step = 0;
        },

        //This hook is fired before each interpreted step
        //Unlike the inspector hook, this hook does not get the rich visit object which is used to mutate or observe ast nodes as the function executes
        //But our monitored function will run much faster this way because it will skip any extra allocations

        onStep:() => {
            step += 1;

            //Only check the budget every 1024 steps since perf.now is heavy
            //we use a bitwise operator here to be fast
            const shouldCheckBudget = (step & 1023) === 0;
            if (shouldCheckBudget) checkBudget();
        },

        //From the name, this will run after each call to our monitored function
        afterEachCall:(result)=>{

            //if the result is an error,we let the interpreter to bubble it up rather than checking the budget
            if (!(result instanceof Error)) {
                //in case the function doesn't use up to the number of steps required to check the budget, we check the budget here to be accurate and safe
                checkBudget();
            }
        }
    });
    return monitoredFn
};
```

We can use it on a sample function that gets the price of an item. But when the item is undefined, it will lag forever trying to fetch the price:

```typescript
function getPrice(item?:string):number {
    if (!item) {
        //Calling this natively in js will hang the main thread.
        //but our monitored function setup should halt it and throw an error.

        while (true) {
            console.log('Lag');
        }
    }
    //some other implementation
    return 10
}
const timedGetPrice = timeFn(getPrice,50);
```

Then when we call our function, our timeout function should throw an error

```typescript
timedGetPrice()
```

### Output:

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
Lag
Error: The monitored function used 53.961ms when only given a budget of 50.000ms.
...
```

Because we only check the budget every now and then, and because the interprter steps off while the native js engine executes those logs, our timeout function isnt 100% accurate. And the exact millisecond it will halt is not deterministic. 

But if we are being pragmatic, it is far better to loose a few milliseconds than to hang our main thread. Calling the bare `getPrice` function would have hanged it as expected:

```typescript
getPrice();
```

### Output:

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

While our setup works, you cant just use our timer on any arbitrary function. If that function uses external variables, you have to ensure that you capture them through the captures property as discussed in the last article. 

We will address this in a nuance where we want our timed function to call another function.


## Capturing vs Embedding Functions
Assuming that we want to time a function that calls an external function

```typescript
function getDetails(item?:string):{name?:string,price:number} {
    return {
        name:item,
        price:getPrice(item)
    }
}
const timedGetDetails = timeFn(getDetails,50);
```

If we attempt to call it, it will crash and we will get a Reference Error: 

```typescript
timedGetDetails()
```

### Output

```text
Reference Error
----------------
getPrice is not defined
```

To solve this, we will have to extend our custom timeout to accept a captures object and include it in the interpreter's context:

```typescript
function timeFn<T extends Fn>(fn:T,budget:milliseconds,captures?:Record<string,any>):T {
    //...Variable declarations and checkBudget implementation

    const monitoredFn = monitor({
        main:{
            ref:fn,
            captures
        },
        //...Other hooks
    })
}
```

If we now call the `timedGetDetails` function with the captures, we will bypass the error but run into another problem:

```typescript
const timedGetDetails = timeFn(getDetails,50,{
    getPrice
});
timedGetDetails()
```

Because it is captured, calling it will make it run in the native JS engine and hang our main thread

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

One way to solve this is to make it call the `timedGetPrice` function instead by using it as the captures:

```typescript
const timedGetDetails = timeFn(getDetails,50,{
    getPrice:timedGetPrice
});
timedGetDetails()
```

When we run it, we will expect our timeout function to work as usual and halt it. 

### Output:
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
Lag
Error: The monitored function used 53.961ms when only given a budget of 50.000ms.
```

This solves our immediate problem because not only does it allow the `timedGetDetails` function to call an external function without having to change its original source code, but it also allows us to put it under a strict budget.

The problem with this approach though, is that it forces us to time every single function that our timed function will call and it makes the timer fragmanted -- one for the outer function and one for the inner one. We can solve these problems with a more strealined solution.

### What is Embedding?

Unlike capturing, which tells the interpreter to take direct references, embedding tells it to take that reference, copy its source code into the same context as our monitored function and parse it altogether. 

This allows the onStep hook for the `timedGetDetails` function alone toput its whole execution under a strict budget. 

This will require us to extend our timeout function. We will pack both the captures and embed configurations in a single object to make it neat


```typescript

interface ExternalData {
    captures?:Record<string,any>,
    embed?:Record<string,Metadata<Fn>>
};

function timeFn<T extends Fn>(fn:T,budget:milliseconds,external?:ExternalData):T {
    //...Variable declarations and checkBudget implementation

    const monitoredFn = monitor({
        main:{
            ref:fn,
            captures:external?.captures
        },
        embed:external?.embed,
        //...Other hooks
    })
}
```

Then we can time our function like this: 

```typescript
const timedGetDetails = timeFn(getDetails,50,{
    //The embed property has the same configuration structure as 'main' in the object passed to monitor()
    embed:{
        getPrice:{
            ref:getPrice
        }
    }
});
```

Then when we call it, it runs under our budget:

```typescript
timedGetDetails()
```

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

Because JavaScript is single-threaded, any code running on the main thread must finish completely before your browser can update the UI or before your server can respond to user requests meaning that there is no seamless, single-thread solution to stop a function call from hanging the application

This package, although providing a single-threaded solution, is not free in terms of performance and you have to capture any external variables that your functions will use.

But if performance is not critical or you are working in an environment that cannot spin off a worker or you are fine about being explicit on how external data is passed, then this package is worth considering.

If you have questions or ideas, drop a comment — I read all of them. The project is open source on [GitHub](https://github.com/The-BigMan-tech/fn-monitor) for more details and published on npm as `@typescript-guy/fn-monitor`, with runnable examples in the repo.