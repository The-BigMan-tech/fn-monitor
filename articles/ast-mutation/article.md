---
title: Rewrite JavaScript Behavior at Runtime with AST Mutation, From the Same Thread
description: Use AST node interception to inspect and mutate JavaScript behavior while a function executes on the same thread.
tags: javascript, typescript, ast, webdev
---

I've spent the last few months building an open-source package called `@typescript-guy/fn-monitor`. 

This post walks through the package and how to rewrite a function's behavior at runtime, from the same thread — no build step, no workers, no message serialization.

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

You give it a function through an object, and it returns a new function with the **same call signature** that runs through the custom interpretation layer when called.

Wrapping a function is straightforward. You create and pass an object with the key, `main`, which is the config of the function that we want to wrap. We then pass the reference through the `ref` property under `main`:

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

### Output

```text
Hello World
```

To the caller, the raw function and the monitored version are structurally the same.

But under the hood, the wrapper:
- reads the function's source code through the .toString() method
- parses it
- spins up an interpreter for it
- and tells the interpreter to run the parsed code
  
Whenever you call it, it asks the interpreter to import your arguments, use them in a virtual function call, and return the result.

Simply running a function in an interpreter isn't the main benefit. Instead, we will see what we can do by attaching hooks such as:

- `beforeEachCall`
- `afterEachCall`
- `inspector`

---
## Mutating an Assignment Operator at Runtime

Let's build an example to demonstrate three important ideas and gradually extend it as we go:

1. intercepting AST nodes during execution
2. mutating execution behavior without changing the original source
3. capturing external variables into the interpreter context
   
First, let's define the function we want to wrap. It will take an array of numbers, sum all the elements and return the result:

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

### Output

```text
Result:  15
```

Now let's wrap it with `monitor` and use the inspector hook:

The inspector hook is fired as the interpreter walks the AST. The interpreter passes it a `visit` object that contains four methods but we will only use two for this example — `visit.execute` and `visit.is` .

Let's start with `visit.is`:

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

When we call it, we get a different result from `sumUp`

```typescript
console.log('Result: ',monitoredSumUp([1,2,3,4,5]));
```

### Output

```text
Result:  -15
```

When we run it, we get -15 because our inspector used `visit.is` to query for an `AssignmentExpression`. When it matched, the interpreter fired the callback passed alongside the query with an event object. The object contains the matching AST node under its `node` property.

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

### Output

```text
intermediate result:  -1
intermediate result:  -3
intermediate result:  -6
intermediate result:  -10
intermediate result:  -15
Result:  -15
```

Calling visit.execute within the inspector is optional. If omitted, the interpreter will execute the node after the hook finishes. And for safety reasons — to prevent silent, partial execution — you cannot stop a node from running unless you throw an error.

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

### Output

```text
Error: For of statements are not allowed.
```

For logging purposes, we can also use the `beforeEachCall` and `afterEachCall` hooks. 
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

### Output

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

### Understanding how to search the scope

Let's look at this line: 

```ts
const finalSum = event.scope.variables.search('sum');
```

Here, `event.scope` gives us a snapshot of the interpreted function’s scope at the point where the `ReturnStatement` is being handled.

For safety reasons, the scope cannot be mutated like the node through the `visit` object and thus, a snapshot is freshly allocated for the event.

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

#### Output

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

If our `sumUp` function wasn't self-contained and used an outside variable, we will need a way to pass it into the interpreter's context, else we will get a reference error if we tried to call the `monitoredSumUp` function:

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

You'll see the error logged twice — once by `afterEachCall` and once by JavaScript's native error handling:

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

To fix this, we can add a check:

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

Here's the complete example:

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

### ES Support

You can use any function with the interpreter as long as it uses **ES2024** syntax or earlier.

### `visit.is` is eager

One thing worth understanding early is that `visit.is(...)` does not keep your callback as a persistent hook.

From the README, it eagerly evaluates the query against the current node. If it matches, it allocates a scope, wraps it with the node in an event object, and fires the callback. If it doesn't, it discards the callback.

That design choice is intentional. It keeps the interpreter fast and memory efficient by avoiding the bloat of book-keeping closures in memory.

### AST mutations persist

From the README, the function is parsed into an AST only once. This means that any mutations made to an AST node within the inspector hook will persist and affect all subsequent calls to that function. 

That can be powerful if you want a persistent runtime transformation but it can also surprise you if you expected the mutation to apply only to one call. 

If the interpreter were to parse it on every call, it would be too slow for practical use.

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
- custom function wrappers 
  
### What this package is not

Even though the package lexically isolates monitored functions, it is not a secure sandbox by default, as explicitly stated in the README.

You can build stricter execution boundaries using hooks, but it does not secure the host from malicious code.

---
## Key limitations to keep in mind

`fn-monitor` is a powerful tool, but it is not a one-size-fits-all solution. Here are the most critical constraints to be aware of:

- **Setup Cost:** `monitor()` incurs overhead. Always call it **once** outside of hot loops and reuse the returned function.
  
- **No Dynamic Imports:** You cannot use `import()` inside monitored functions. Use `captures` instead.
  
- **Stack Traces:** Errors thrown inside monitored functions won't map directly to your original source lines in your editor.
  
- **Advanced Nuances:** For edge cases like native generators and complex library proxies, please refer to the [**Advanced Behavior**](https://github.com/The-BigMan-tech/fn-monitor#advanced-behavior) section of the README.
  
---
## The right mental model for this package

Despite its name, the package is a **runtime execution layer** rather than a metric tool.

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

If you had any trouble following along, spotted a typo, or just want to show off a unique use case you built with `fn-monitor`, feel free to open a [discussion on GitHub](https://github.com/The-BigMan-tech/fn-monitor/discussions).

And if you're interested in using `fn-monitor` in your own projects, check out the [main repository](https://github.com/The-BigMan-tech/fn-monitor) for the full documentation.