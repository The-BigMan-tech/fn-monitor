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

`@typescript-guy/fn-monitor` offers a different approach.

It lets you execute a function through a JS-in-JS interpreter, and gives you hooks into the function’s AST while it executes.

That means you can do things like:

- intercept specific AST nodes
- inspect evaluated values
- mutate operators
- change return results
- observe execution flow
- build runtime control layers

To try this out locally, you can install the package from npm:

```bash
npm install @typescript-guy/fn-monitor
```

---

## The core idea

The main API looks like this:

```ts
import { monitor } from "@typescript-guy/fn-monitor";

const originalFn = ()=>{
    //some implementation
}
const monitoredFn = monitor({
    main: {
        ref: originalFn
    }
});
```

Its core export is `monitor`.

You give it a function, and it returns a new function with the **same call signature**, but that function is executed by a custom interpreter instead of directly by the JS engine.

That interpreter layer is what makes runtime AST inspection and mutation possible. You can attach hooks such as:

- `beforeEachCall`
- `afterEachCall`
- `inspector`
- `onStep`

The most interesting one for AST mutation is the `inspector`.

---

## Example: mutating an assignment operator at runtime

Here’s the first showcase from the README.

It demonstrates three important ideas at once:

1. intercepting AST nodes during execution
2. mutating execution behavior without changing the original source
3. capturing external variables into the interpreter context
   
```ts
import { monitor } from "@typescript-guy/fn-monitor";

const zero = 0;

const sumUp = (nums: number[]) => {
    let sum: number = zero;
    for (const num of nums) {
        sum += num;
    }
    return sum;
}

const monitoredSumUp = monitor({
    main: {
        ref: sumUp,
        captures: {
            // since 'zero' is used by sumUp and is outside its scope,
            // we capture it into the interpreter's context
            zero
        }
    },
    beforeEachCall: (nums) => {
        console.log('Entered the monitored sum up function with the nums: ', nums);
    },
    inspector: (visit) => {
        visit.is('AssignmentExpression', event => {
            event.node.operator = "-="; // silently change the operator
            console.log('assignment result', visit.execute());
        });

        visit.is('ReturnStatement', event => {
            const result = visit.execute();
            const finalSum = event.scope.variables.search('sum');

            console.log('final sum: ', finalSum, 'Is result:', finalSum === result.RES);
            result.RES = 'I CHANGED THE VALUE';
        });
    },
    afterEachCall: (result) => {
        console.log('result of the monitored function: ', result);
    }
});

const arrToSum = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

const result1 = sumUp(arrToSum);
console.log('Result 1', result1);

const result2 = monitoredSumUp(arrToSum); // the exact same call signature
console.log('Result 2', result2);
```

### Output

```text
Result 1 55

Entered the monitored sum up function with the nums:  [
  1, 2, 3, 4,  5,
  6, 7, 8, 9, 10
]
assignment result -1
assignment result -3
assignment result -6
assignment result -10
assignment result -15
assignment result -21
assignment result -28
assignment result -36
assignment result -45
assignment result -55
final sum:  -55 Is result: true
result of the monitored function:  I CHANGED THE VALUE
Result 2 I CHANGED THE VALUE
```

---

## What just happened?

The original function is still this:

```ts
const sumUp = (nums: number[]) => {
    let sum: number = zero;
    for (const num of nums) {
        sum += num;
    }
    return sum;
}
```

But when it runs through the monitored version, the interpreter gives us a chance to intercept the AST node for the assignment expression.

This line is the key:

```ts
event.node.operator = "-=";
```

That mutates the AST node itself.

So instead of executing:

```ts
sum += num
```

the interpreted execution effectively behaves like:

```ts
sum -= num
```

That is why the sum becomes `-55` instead of `55`.

Then the example intercepts the return statement and changes the final returned value:

```ts
visit.is('ReturnStatement', event => {
    const result = visit.execute();
    const finalSum = event.scope.variables.search('sum');

    console.log('final sum: ', finalSum, 'Is result:', finalSum === result.RES);
    result.RES = 'I CHANGED THE VALUE';
});
```

So the function started as a simple summing function, and without modifying the original source code, the monitored version returns:

```ts
"I CHANGED THE VALUE"
```

---

## A closer look at querying the scope

One subtle but powerful line in the example is this:

```ts
const finalSum = event.scope.variables.search('sum');
```

Here, `event.scope` gives us a snapshot of the interpreted function’s scope at the point where the `ReturnStatement` is being handled.

This snapshot is read-only and freshly allocated for the event, so it lets you inspect the function’s internal state without directly exposing or mutating the interpreter’s internals.

This searches the scope chain for a variable named `sum`

```ts
event.scope.variables.search('sum')
```

In this case, it finds the `sum` variable declared inside the monitored function:

```ts
let sum: number = zero;
```

By the time the return statement is reached, the loop has already finished executing, so `sum` holds the final interpreted value:

```ts
-55
```

That is why when we log this:

```ts
console.log('final sum: ', finalSum, 'Is result:', finalSum === result.RES);
```

we get: 
```text
final sum:  -55 Is result: true
```

At that moment, before we mutate the return value, the value inside the function scope and the value produced by the return statement are still the same.

Then we change the return result:

```ts
result.RES = 'I CHANGED THE VALUE';
```

So the function still completes normally from the caller’s perspective, but the value it returns has been replaced.

This is one of the nice things about the API:

You are not limited to inspecting AST nodes only.

You can also inspect the interpreted scope around the node you intercepted.

---

## Captures: bringing outside values into the interpreter context

In the example above, `sumUp` uses `zero`, which lives outside the function.

Because the function is executed by the interpreter, outside values need to be explicitly provided.

That’s what `captures` does:

```ts
main: {
    ref: sumUp,
    captures: {
        zero
    }
}
```

This maps the name `zero` to the actual value from the surrounding JavaScript environment.

This is one of the practical parts of the API:

- if your function depends on external primitives, objects, or functions
- and those dependencies are not embedded into the interpreter context
- you pass them in through `captures`

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

This kind of tool is especially interesting if you are building:

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