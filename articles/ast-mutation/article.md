---
title: Rewrite JavaScript Behavior at Runtime with AST Mutation, From the Same Thread
description: Use AST node interception to inspect and mutate JavaScript behavior while a function executes on the same thread.
tags: javascript, typescript, ast, webdev
---

I've spent the last few months building an open-source package called `@typescript-guy/fn-monitor`. 

This post walks through the package and its most surprising part: rewriting a function's behavior at runtime, from the same thread — no build step, no workers, no message serialization.

In JavaScript, functions are fixed units. You define one, call it, and the code inside runs exactly as written. You can wrap it, monkey-patch dependencies, or use proxies around objects, but actually changing what happens inside the function usually requires one of these:

- rewriting the source code
- using a build-time transformation
- running code in a worker or sandbox
- manually patching every internal call site

`fn-monitor` offers a different approach.

It lets you execute a function through a JS-in-JS interpreter, and gives you hooks into the function’s AST while it executes.

That means you can do things like:

- intercept specific AST nodes
- inspect evaluated values
- mutate operators
- change returned results
- observe execution flow
- build runtime control layers

To try this out locally, you can install the package from npm:

```bash
npm install @typescript-guy/fn-monitor
```

---
## How to Wrap a Function in an Interpreter Context

We will start by writing our import:

```ts
import { monitor } from "@typescript-guy/fn-monitor";
```

The core export is `monitor`.

You give it a function, and it returns a new function with the **same call signature** but it runs through the custom interpretation layer when called

Wrapping a function is straightforward. You create and pass an object with the key, `main`, which is the config of the function that we want to wrap. We then pass the reference through the `ref` property under `main`

```typescript
const originalFn = ()=>{
    return 'Hello World'
}

const monitoredFn = monitor({
    main: {
        ref: originalFn
    }
})
```

We can call the monitoredFn and log the result:

```typescript
console.log(monitoredFn());
```

### Output:

```text
Hello World
```

So to the caller, the raw function and the monitored version are structurally the same

But under the hood, the wrapper;
- read the function's source code through the .toString() method 
- parsed it
- spun up an interpreter just for it
- and told the interpreter to parse the source code. 
  
Then whenever you call it, it just requests the interpreter to run a virtual function call with the provided arguments as imports, and then return the result.

But just running a function in an interpreter's context is not the benefit of using this package.
Instead, we will see what we can do by attaching hooks such as:

- `beforeEachCall`
- `afterEachCall`
- `inspector`

There is a fourth hook called `onStep` but it is reserved for another article.
The most interesting one for AST mutation is the `inspector`.

---
## Mutating an Assignment Operator at Runtime

We will code an example to demonstrate three important ideas and gradually extend it as we go:

1. intercepting AST nodes during execution
2. mutating execution behavior without changing the original source
3. capturing external variables into the interpreter context
   
We first start by defining the function that we want to wrap. We will use a function called `sumUp`, that will take an array of numbers, sum all the elements and return the result.

```ts
const sumUp = (nums: number[]) => {
    let sum: number = 0;
    for (const num of nums) {
        sum += num;
    }
    return sum;
}
```

When we call this function as it is, we expect to get our result as usual:

```typescript
console.log('Result: ',sumUp([1,2,3,4,5]));
```

### Output:

```text
Result:  15
```

Let us now define our modified version of this function by wrapping it in `monitor` while utilizing the inspector hook

The inspector hook is fired as the interpreter walks the AST. The interpreter passes it a `visit` object that contains four methods but we will only use two for this example — `visit.execute` and `visit.is` .

Let us start with `visit.is`

```typescript
const monitoredSumUp = monitor({
    main: {
        ref: sumUp,
    },
    inspector: (visit) => {
        visit.is('AssignmentExpression', event => {
            event.node.operator = "-="; // silently change the operator
        });
    }
});
```

When we call it, we get a different result from `sumUp`"

```typescript
console.log('Result: ',monitoredSumUp([1,2,3,4,5]));
```

### Output:

```text
Result:  -15
```

When we run it, we get -15 because our inspector used `visit.is` to query for an `AssignmentExpression` and when it matched, the interpreter fired the callback passed alongside the query with an event object. The event object contains a `node` property which is the AST node that matched the query.

Originally in the source code, the assignment expression was this:

```typescript
sum += num;
```

But when we ran the following line, we told it to change the operator right before it could execute the node.

```typescript
event.node.operator = "-=";
```

We can extend our inspector to log each intermediate result by using `visit.execute`. It explicitly tells the interpreter to execute the node right now and return the result. 

```typescript
const monitoredSumUp = monitor({
    main: {
        ref: sumUp,
    },
    inspector: (visit) => {
        visit.is('AssignmentExpression', event => {
            event.node.operator = "-="; // silently change the operator
            console.log('intermediate result: ',visit.execute());
        });
    }
});
```

So when we call it with our arguments, we can see the logs:

```typescript
console.log('Result: ',monitoredSumUp([1,2,3,4,5]));
```

### Output:

```text
intermediate result:  -1
intermediate result:  -3
intermediate result:  -6
intermediate result:  -10
intermediate result:  -15
Result:  -15
```

The interpreter will automatically execute nodes if `visit.execute` is not called and for safety reasons, you cannot stop it from executing a node unless you throw an error.

So if you detect wrong behaviour according to your custom rules, you can do this:

```typescript
const sumWithNoLoops = monitor({
    main: {
        ref: sumUp,
    },
    inspector: (visit) => {
        visit.is('ForOfStatement',()=>{
            throw new Error('For of statements are not allowed.')
        })
    }
});

console.log('Result: ',sumWithNoLoops([1,2,3,4,5]));
```

### Output:

```text
Error: For of statements are not allowed.
```

For telemetry reasons, we can also use the `beforeEachCall` and `afterEachCall` hooks. 
`beforeEachCall` receives the arguments before the function is called while `afterEachCall` receives the result or an error after the function is called:

```ts
const monitoredSumUp = monitor({
    main: {
        ref: sumUp,
    },
    beforeEachCall:(nums)=>{
        console.log('Logging args: ',nums);
    },
    afterEachCall:(result)=>{
        console.log('Logging result: ',result);
    },
    //...Our inspector hook
});
```

When we call it we can see when they are called through the logs:

```typescript
console.log('Result: ',monitoredSumUp([1,2,3,4,5]));
```

### Output:

```text
Logging args:  [ 1, 2, 3, 4, 5 ]
intermediate result:  -1
intermediate result:  -3
intermediate result:  -6
intermediate result:  -10
intermediate result:  -15
Logging result:  -15
Result:  -15
```

---
## Extending our Example by Modifying the Return Statement

We can add this query to our inspector hook to do two things:
- modify the returned value
- query the scope for the `sum` before mutating the result

```ts
const monitoredSumUp = monitor({
    main: {
        ref: sumUp,
    },
    inspector:(visit)=>{
        //...Our other query
        visit.is('ReturnStatement', event => {
            const result = visit.execute();
            const finalSum = event.scope.variables.search('sum');

            console.log('final sum: ', finalSum);
            result.RES = 'I CHANGED THE VALUE';
        });
    }
    //...Our other hooks
});
```

When we call it, the returned result is changed before it reaches the caller and the `afterEachCall` hook.

```typescript
console.log('Result: ',monitoredSumUp([1,2,3,4,5]));
```

### Output:

```text
Logging args:  [ 1, 2, 3, 4, 5 ]
intermediate result:  -1
intermediate result:  -3
intermediate result:  -6
intermediate result:  -10
intermediate result:  -15
final sum:  -15
Logging result:  I CHANGED THE VALUE
Result:  I CHANGED THE VALUE
```

### A closer look at querying the scope

Let us look at this line: 

```ts
const finalSum = event.scope.variables.search('sum');
```

Here, `event.scope` gives us a snapshot of the interpreted function’s scope at the point where the `ReturnStatement` is being handled.

For safety reasons, the scope cannot be mutated like the node through the `visit` object and thus,a snapshot is freshly allocated for the event.

This searches the scope chain for a variable named `sum`.

```ts
event.scope.variables.search('sum')
```

In this case, it finds the `sum` variable declared inside the monitored function:

```ts
let sum: number = 0;
```

By the time the return statement is reached, the loop has already finished executing, so `sum` holds the final interpreted value:

```ts
console.log('final sum: ', finalSum);
```

#### Output:

```text
final sum:  -15
```

At that moment, before we mutate the return value, the value inside the function scope and the value produced by the return statement are still the same.

Then we change the return result:

```ts
result.RES = 'I CHANGED THE VALUE';
```

---
## Captures: bringing outside values into the interpreter context

If our `sumUp` function wasn't self contained and used an outside variable, we will need a way to pass it into the interpreter's context, else we will get a reference error if we tried to call the `monitoredSumUp` function:

In this example above, `sumUp` uses `zero`, which lives outside the function.

```typescript
const zero = 0;

const sumUp = (nums: number[]) => {
    let sum: number = zero;
    for (const num of nums) {
        sum += num;
    }
    return sum;
};
//...Our monitored function  setup
console.log('Result: ',monitoredSumUp([1,2,3,4,5]));
```

### Output

```text
Logging args:  [ 1, 2, 3, 4, 5 ]
Logging result:  ReferenceError: 
zero is not defined

-Monitored functions cannot access variables from the outside.
-They must either be passed as an argument on each call or captured/embedded upon creation.
...

ReferenceError: 
zero is not defined

-Monitored functions cannot access variables from the outside.
-They must either be passed as an argument on each call or captured/embedded upon creation.
...
```

The error is logged twice because the `afterEachCall` hook receives and logs it in addition to js throwing the error natively.

We can adjust that by adding an if-check, but this is totally optional:

```typescript
const monitoredSumUp = monitor({
    main: {
        ref: sumUp,
    },
    afterEachCall:(result)=>{
        if (!(result instanceof Error)) {
            console.log('Logging result: ',result);
        }
    },
    //...Our other hooks
})
```

So we can address the error by extending the `monitoredSumUp` configuration to capture it. We map the name `zero` to the actual value from the surrounding JavaScript environment.


```typescript
const monitoredSumUp = monitor({
    main: {
        ref: sumUp,
        captures:{
            zero
        }
    },
    //...Our other hooks
})
```

When we then call it, it will run as expected:

```typescript
console.log('Result: ',monitoredSumUp([1,2,3,4,5]));
```

### Output

```text
Logging args:  [ 1, 2, 3, 4, 5 ]
intermediate result:  -1
intermediate result:  -3
intermediate result:  -6
intermediate result:  -10
intermediate result:  -15
final sum:  -15
Logging result:  I CHANGED THE VALUE
Result:  I CHANGED THE VALUE
```

---
## The Full Example

Here is the full example provided as a snippet that you can paste:

```typescript
import { monitor } from "@typescript-guy/fn-monitor"

const zero = 0;

const sumUp = (nums: number[]) => {
    let sum: number = zero;
    for (const num of nums) {
        sum += num;
    }
    return sum;
};

const monitoredSumUp = monitor({
    main: {
        ref: sumUp,
        captures:{
            zero
        }
    },
    beforeEachCall:(nums)=>{
        console.log('Logging args: ',nums);
    },
    afterEachCall:(result)=>{
        if (!(result instanceof Error)) {
            console.log('Logging result: ',result);
        }
    },
    inspector: (visit) => {
        visit.is('AssignmentExpression', event => {
            event.node.operator = "-="; // silently change the operator
            console.log('intermediate result: ',visit.execute());
        });

        visit.is('ReturnStatement', event => {
            const result = visit.execute();
            const finalSum = event.scope.variables.search('sum');

            console.log('final sum: ', finalSum);
            result.RES = 'I CHANGED THE VALUE';
        });
    }
});

console.log('Result: ',monitoredSumUp([1,2,3,4,5]));
```

---
## Important caveats: 

### `visit.is` is eager

One thing worth understanding early is that `visit.is(...)` is not a global persistent hook.

From the README:

> `visit.is(query, callback)` evaluates the query against the current node. If it matches, it allocates a scope, wraps it with the node in an event object, and fires the callback.

> This does not register a persistent hook for future nodes. It is an eager, single-use check against the node currently being evaluated.

That design choice is intentional.

It keeps the interpreter faster and more memory-efficient.

So as the interpreter walks the function, the inspector gets opportunities to inspect the current node. `visit.is` checks whether that current node matches what you care about.

### AST mutations persist

This is one of the most important notes in the README:

> Because the code is parsed into an AST only once, any mutations made to an AST node within the inspector hook will persist and affect all subsequent calls to that function.

That means if you mutate an operator like this:

```ts
event.node.operator = "-=";
```

you are mutating a reused AST node.

That can be powerful if you want a persistent runtime transformation.

But it can also surprise you if you expected the mutation to apply only to one call.

So if you build something with AST mutation, be intentional about whether the mutation should be:

- one-time
- per-call
- permanent for that monitored function instance

---
### What this package is good for

This kind of tool is especially interesting if you are building something like:

- experimentation tools
- runtime transformations
- execution visualizers
- teaching tools
- instrumentation layers
- advanced testing utilities
- controlled evaluation pipelines
- custom function wrappers with deeper introspection

### What this package is not

Even though monitored functions have basic isolation, this package is not a secure sandbox by default, as explicitly stated in the README.

You can build stricter execution boundaries using hooks, but isolation is not the default guarantee.

---
## Other limitations worth knowing

The package is not a one-size-fits-all solution and thus, it has its own constraints as documented in the README:

- the interpreter supports JavaScript syntax up to **ES2024**
- `monitor()` has overhead, so call it once outside hot loops
- you cannot use dynamic imports inside monitored functions 
- native generator functions (`function*`) cannot be monitored because they run outside the interpreter context
- you cannot wrap a monitored function in another
- errors inside monitored functions will not map directly to original source locations in your editor
  
---
## A good way to think about this package

It is less like a metric tool and more like a **runtime execution layer**.

Instead of asking:

> "What did this function return?"
> "How long did it run for?"

you can ask:

> "What AST nodes executed?"
> "Can I intercept them?"
> "Can I inspect their results?"
> "Can I inspect the scope around them?"
> "Can I change their behavior while they run?"


---
## Final thoughts

JavaScript usually gives you very little control over what happens inside a function once it starts executing.

This package changes that by running functions through an interpreter on the same JS thread and exposing hooks into the AST itself. This lets you do things that normally feel out of reach in ordinary runtime JavaScript.

It is not a secure sandbox, and it is not free in terms of performance. But as a tool for runtime introspection and programmatic control, it opens up a genuinely interesting space.

If you have questions or ideas, drop a comment — I read all of them. The project is open source on [GitHub](https://github.com/The-BigMan-tech/fn-monitor) and published on npm as `@typescript-guy/fn-monitor`, with runnable examples in the repo.