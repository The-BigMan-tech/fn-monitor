---
title: Stop a Function Call From Hanging the Main Thread Without Using Web Workers
description: Using hooks into a JS-in-JS interpreter to enforce a time budget on the same thread
tags: javascript, typescript, interpreter, webworkers
---

In JavaScript, the de facto standard to stop a function call from hanging the main thread is asynchronous non-blocking execution, typically achieved by offloading heavy work to a Web Worker or breaking the task into smaller chunks using setTimeout or queueMicrotask to yield control back to the event loop. 

While this works, these setups usually require you to change how you call or implement your functions. Today, we are going to take a different approach that will address these limitations by using the package, `@typescript-guy/fn-monitor`.

Before we start this article, let us get a quick overview of the package:

- It is a wrapper over a JS-in-JS interpreter that lets you deeply monitor functions as they execute through an API that abstracts the underlying interpreter's mechanics

- It allows you to plug in hooks at any part of the function's lifecycle to observe data and mutate nodes at runtime while remaining on the same thread

- Its main export is a function called `monitor` which takes in a configuration object. It returns a brand new function that has an identical call signature to the original. The config object includes:
  
   - A function reference — the function you want to monitor
   - A captures object — to include any external variables the function will use
   - Various hooks for different lifecycle events

- It works for both synchronous and asynchronous functions. There is a specific nuance to how it handles generators, which is detailed in the [Important Notes & Limitations](https://github.com/The-BigMan-tech/fn-monitor#important-notes--limitations-%EF%B8%8F) section of the README

If you ever want to dive deeper into its fundamentals later, you can read the [first article](https://dev.to/typescript-guy/rewrite-javascript-behavior-at-runtime-with-ast-mutation-from-the-same-thread-5gh6)

To try this out locally, you can install the package from npm:

```bash
npm install @typescript-guy/fn-monitor
```

---
## Making our timeout function

To begin, let us first write out our imports and custom types:

```typescript
import { monitor, type Metadata } from "@typescript-guy/fn-monitor";

type milliseconds = number;
type Fn = (...args:any[])=>any
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

        onStep:() => {
            step += 1;

            //Only check the budget every 1024 steps since performance.now is heavy
            //we use a bitwise operator here to be fast
            const shouldCheckBudget = (step & 1023) === 0;
            if (shouldCheckBudget) checkBudget();
        },

        //From the name, this will run after each call to our monitored function
        afterEachCall:(result)=>{

            //if the result is an error, we let the interpreter bubble it up rather than checking the budget
            if (!(result instanceof Error)) {
                //in case the function doesn't use up to the number of steps required to check the budget, we check the budget here to be accurate and safe
                checkBudget();
            }
        }
    });
    return monitoredFn
};
```

Our custom timeout uses the `onStep` hook instead of the `inspector`. You can learn more about the `inspector` later in the [first article](https://dev.to/typescript-guy/rewrite-javascript-behavior-at-runtime-with-ast-mutation-from-the-same-thread-5gh6).

Although they are similar, they have their differences:

- The `onStep` hook is fired before each interpreted step, while the `inspector` hook is fired as the interpreter walks the AST.

- Unlike the `inspector` hook, it does not get the rich `visit` object which is used to observe and mutate AST nodes as the function executes.

- The advantage of using `onStep` for this use case is that our monitored function will run much faster because it skips any extra allocations.

With that clarified, we can use our custom timeout on a function that gets the price of an item. But when the item is undefined, it will lag forever trying to fetch the price:

```typescript
function getPrice(item?:string):number {
    if (!item) {
        //Calling this natively in JS will hang the main thread.
        //but our monitored function setup should halt it and throw an error.

        while (true) {
            console.log('Lag');
        }
    }
    return 10; // we just return a constant number to keep it simple
}
```

Calling the bare `getPrice` function will hang our thread as expected:

```typescript
getPrice();
```

### Output

```text
Lag
Lag
Lag
Lag
....
```

But if we call a timed version, it should throw an error.

```typescript
const timedGetPrice = timeFn(getPrice,50);
timedGetPrice()
```

### Output

```text
Lag
Lag
Lag
Lag
Error: The monitored function used 53.961ms when only given a budget of 50.000ms.
...
```

Because we only check the budget every now and then, and because the interpreter steps off while the native JS engine executes the logs, our timeout function isn't 100% accurate. And the exact millisecond it will halt is not deterministic. 

But if we are being pragmatic, it is far better to lose a few milliseconds than to hang our main thread. 

Our timeout function works great for simple cases, but real-world functions rarely exist in isolation. If that function uses external variables, you have to ensure that you capture them as stated in the README.

We'll address this in a scenario where our timed function needs to call another function.

---
## Capturing vs Embedding Functions
Assuming that we want to time a function that calls an external function:

```typescript
function getDetails(item?:string):{id?:string,price:number} {
    return {
        id:'id_' + item,
        price:getPrice(item)
    }
}
const timedGetDetails = timeFn(getDetails,50);
```

If we attempt to call it, it will crash and we will get a ReferenceError: 

```typescript
timedGetDetails()
```

### Output

```text
ReferenceError: 
getPrice is not defined

-Monitored functions cannot access variables from the outside.
-They must either be passed as an argument on each call or captured/embedded upon creation.

```

To solve this, we will have to extend our custom timeout function to accept a captures object and include it in the interpreter's context:

```typescript
function timeFn<T extends Fn>(fn:T,budget:milliseconds,captures?:Record<string,any>):T {
    //...Variable declarations and checkBudget implementation

    const monitoredFn = monitor({
        main:{
            ref:fn,
            captures
        },
        //...Other properties
    });
    return monitoredFn
}
```

If we now setup the `timedGetDetails` function with its captures and call it, we will bypass the error but we will run into another problem:

```typescript
const timedGetDetails = timeFn(getDetails,50,{
    getPrice
});
timedGetDetails()
```

Because it is captured, calling it will make it run in the native JS engine and hang our main thread.

### Output

```text
Lag
Lag
Lag
Lag
....
```

One way to solve this is to force it to use the `timedGetPrice` function by using it in the captures:

```typescript
const timedGetDetails = timeFn(getDetails,50,{
    getPrice:timedGetPrice
});
timedGetDetails()
```

When we run it, we expect our timeout to work as usual and halt it. 

### Output

```text
Lag
Lag
Lag
Lag
Error: The monitored function used 58.440ms when only given a budget of 50.000ms.
...
```

This solves our immediate problem because not only does it allow the `timedGetDetails` function to call an external function without having to change its original source code, but it also allows us to put it under a strict budget.

The problem with this approach, though, is that it forces us to time every single function that our timed function will call and it makes the timer fragmented — one for the outer function and one for the captured one. We can solve these problems with a more streamlined solution.

### What is Embedding?

In contrast to capturing, which works for all data types and simply gives the interpreter direct references/values, embedding is exclusive to function references and it tells the interpreter to copy its source code into the same context as our monitored function and parse it together. 

This allows the onStep hook for the `timedGetDetails` function alone to contain the entire execution under a strict budget. 

This will require us to extend our timeout function. We will pack both the captures and embed configurations into a single object to make it neat.


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
        //...Other properties
    })
    return monitoredFn
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
Error: The monitored function used 58.161ms when only given a budget of 50.000ms.
...
```

---
## Peeking at the generated code (only when you need it)

So far, how the values are captured or embedded has been treated as a black box.

But if a captured or embedded function ever behaves unexpectedly, you don't have to guess — you can
read the exact code the interpreter runs by passing an object to the `sourceOut` property when calling `monitor`. 

Let us quickly add that to our timeout function and extend our interface:

```typescript
interface ExternalData {
    //...Other properties
    sourceOut?:{value:string}//Add this to the interface
};

function timeFn<T extends Fn>(fn:T,budget:milliseconds,external?:ExternalData):T {
    //...Variable declarations and checkBudget implementation
    const monitoredFn = monitor({
       sourceOut:external?.sourceOut,
       //...Other properties
    })
    return monitoredFn
}
```

Then in the `timedGetDetails` function:

```ts
const generatedCode = { value: "" };

const timedGetDetails = timeFn(getDetails,50,{
    embed:{
        getPrice:{
            ref:getPrice
        }
    },
    sourceOut:generatedCode
});
```

The package overwrites the `value` property with the code executed by the interpreter.

The resulting code is crafted by a code generator that stitches together the injected
captures and the source code of the embedded functions into a single string. The result
isn't that pretty because it uses hashes to guarantee that it's collision-free.

The package ensures that the `inspector` and `onStep` hooks are only fired when executing
the actual logic of your functions and not the generated boilerplate.

When we run this, we will be able to see it:

```typescript
console.log(generatedCode.value);
//We dont call `timedGetDetails` so that it doesn't cut off the generated code from the logs
```

<strong>Output</strong>
{% details Click to expand %}

```typescript
'use strict'

const getDetails = (() => {


    const intermediateFn_generated_1de912009fe409ac0c51bb82c6c939ecad3227fe8d36ede3aae906089a513ade =
        function getDetails(item) {
            return {
                id:'id_' + item,
                price: getPrice(item)
            };
        };
    return intermediateFn_generated_1de912009fe409ac0c51bb82c6c939ecad3227fe8d36ede3aae906089a513ade;
})();

var getPrice;
getPrice = (() => {

    const getPrice = (() => {


        const intermediateFn_generated_8ce88bfc0fe7f0c48f18013aa0d9b67fdf80fbd257ce4526aaa8d0c33afbeb5c =
            function getPrice(item) {
                if (!item) {
                    //Calling this natively in JS will hang the main thread.
                    //but our monitored function setup should halt it and throw an error.

                    while (true) {
                        console.log('Lag');
                    }
                }
                //some other implementation
                return 10;
            };
        return intermediateFn_generated_8ce88bfc0fe7f0c48f18013aa0d9b67fdf80fbd257ce4526aaa8d0c33afbeb5c;
    })();
    return getPrice;
})();

//This is the code that is ran each time the monitored function is called and the result is returned through the exports variable.

exports.generated_f6a214f7a5fcda0c2cee9660b7fc29f5649e3c68aad48e20e950137c98913a68 = getDetails(...generated_090772cf4068973daad3f715eb788d39fe2c02be42efd86de81f0e59198d6237);
```

{% enddetails %}

> 💡 The exact format of the generated code may change between versions but the package ensures that it will not affect the behavior of your functions.

---
## Conclusion

Because JavaScript is single-threaded, any code running on the main thread must finish completely before your browser can update the UI or before your server can respond to user requests, meaning that there is no seamless, single-thread solution to stop a function call from hanging the application.

This package, although providing a single-threaded solution, is not free in terms of performance and you have to capture any external variables that your functions will use.

But if you're comfortable being explicit about how external data is passed, or if you're working in an environment that can't spawn workers, or if guaranteeing a function halts outweighs any performance overhead — then this package is worth considering.

If you have questions or ideas, drop a comment — I read all of them. The project is open source on [GitHub](https://github.com/The-BigMan-tech/fn-monitor) for more details and published on npm as `@typescript-guy/fn-monitor`, with runnable examples in the repo.