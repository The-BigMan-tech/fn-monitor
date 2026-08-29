# @typescript-guy/fn-monitor

<p align="center">
    <img src="./logo.svg" width="120" 
      alt="fn-monitor logo featuring 'fn' with a cyan terminal cursor"
    />
</p>

<p align="center">
    <a  href="https://www.npmjs.com/package/@typescript-guy/fn-monitor"><img src="https://img.shields.io/npm/v/@typescript-guy%2Ffn-monitor?color=1d499b&labelColor=414952" alt="npm version" /></a>
     &nbsp;&nbsp;&nbsp;&nbsp;
    <a href="https://github.com/The-BigMan-tech/fn-monitor/blob/master/LICENSE.md"><img src="https://img.shields.io/npm/l/@typescript-guy%2Ffn-monitor?labelColor=414952" alt="license" /></a>
     &nbsp;&nbsp;&nbsp;&nbsp;
    <a href="https://github.com/The-BigMan-tech/fn-monitor/actions/workflows/test.yaml"><img src="https://github.com/The-BigMan-tech/fn-monitor/actions/workflows/test.yaml/badge.svg" alt="CI" /></a>
</p>

<p align="center">
    <a href="https://github.com/The-BigMan-tech/fn-monitor/blob/master/tsconfig.json"><img src="https://img.shields.io/badge/TypeScript-100%25-3178C6?logo=typescript&logoColor=c0dfff&labelColor=414952" alt="100% typescript"></a>
     &nbsp;&nbsp;&nbsp;&nbsp;
    <a href="https://npmx.dev/package-stats/@typescript-guy/fn-monitor/v/latest"><img src="https://img.shields.io/badge/npm_unpacked_size-320%20kB-1e7c8e?labelColor=414952" alt="npm unpacked size" /></a>
</p>

`fn-monitor` is an instrumentation layer over the `sval` JS-in-JS interpreter to monitor, intercept, and mutate a function's execution at the AST level. It allows developers to view their functions as white boxes at runtime by injecting first-class hooks into its custom execution layer.

## Table of Contents 📑

- [Installation](#installation)
- [API Introduction](#api-introduction)
- [Quick Examples](#quick-examples)
- [Capabilities](#capabilities)
- [Full API Reference](#full-api-reference)
- [Important Limitations](#important-limitations)
- [Advanced Behavior](#advanced-behavior)
- [Mechanics](#mechanics)
- [Questions & Support](#questions--support)
- [Contributing](#contributing)
- [Brand & Forking Guidelines](#brand--forking-guidelines)
- [Inspiration](#inspiration)
- [Acknowledgements](#acknowledgements)

<a id="installation"></a>

## Installation 📦

```bash
npm install @typescript-guy/fn-monitor
```

> 📌 **Before integrating this package into any project,** please read the [Important Limitations](#important-limitations) section to understand key behavioral nuances such as execution cost and debugging.

---

<a id="api-introduction"></a>

## API Introduction ✨

The core of the package is the `monitor` function. It accepts a function through an object and returns a new function that runs through a custom interpretation layer while retaining the original's call signature.

```typescript
const originalFn = ()=>{
    return 'Hello World'
}

const monitoredFn = monitor({
    main: {
        ref: originalFn
    }
})

console.log(monitoredFn());
```

### Output

```text
Hello World
```

<a id="quick-examples"></a>

## Quick Examples ⚡

Ready-to-run snippets with inline context. Copy, paste, and see runtime instrumentation in action.

### Using the `inspector` hook to intercept and modify AST nodes during execution.

A deep dive into this is available in this [article](https://dev.to/typescript-guy/rewrite-javascript-behavior-at-runtime-with-ast-mutation-from-the-same-thread-5gh6)

```typescript
import { monitor } from "@typescript-guy/fn-monitor"

const sumUp = (nums: number[]) => {
    let sum: number = 0;
    for (const num of nums) {
        sum += num;
    }
    return sum;
};

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

console.log('Result: ',monitoredSumUp([1,2,3,4,5]));
```

#### Output

```text
intermediate result:  -1
intermediate result:  -3
intermediate result:  -6
intermediate result:  -10
intermediate result:  -15
Result:  -15
```

### Getting the full execution history of a function call

Our main interest here is the execution stack, which is accessible with `visit.localExeStack()`. Every time a node is evaluated, a rich object containing the result is inserted at the head (index 0) of the stack. So we simply use the `inspector` to retrieve the head element as each node gets executed.

It is important that we first call `visit.execute()` to eagerly evaluate the node and its children. If we skip this step, indexing into the stack will throw an error because it is initially empty.

One of the properties in those objects is the scope for that node. For each visited node that matches a `visit.is()` query, the interpreter will allocate a scope object, which is a safe view of the node's scope.

So if you need to include every scope as well, make sure to call `visit.is('Any',...)` as the very first step. It works because it matches every node type.

```typescript
import { monitor,type ExeResult } from "@typescript-guy/fn-monitor";

const exeHistory: ExeResult[] = []; 

const fn = monitor({
    main:{
        ref:(a:number,b:number)=>{
            const result = (a + b) * (a - b);
            return result;
        }
    },
    inspector:(visit)=>{
        visit.is('Any',()=>undefined)
        visit.execute();

        const stack = visit.localExeStack();
        const head = stack.get(0)
        exeHistory.push(head);
    }
})
fn(2,3);
console.log(exeHistory);

```

#### Output

<details>
<summary><strong>Click to expand</strong></summary>

```typescript
[
  {
    evaluation: 2,
    type: 'Identifier',
    node: {
      type: 'Identifier',
      name: 'a',
      start: 515,
      end: 516,
      range: [Array],
      loc: [Object]
    },
    scope: EventScope { variables: [Object], depth: 0, callDepth: 0 }
  },
  {
    evaluation: 3,
    type: 'Identifier',
    node: {
      type: 'Identifier',
      name: 'b',
      start: 519,
      end: 520,
      range: [Array],
      loc: [Object]
    },
    scope: EventScope { variables: [Object], depth: 0, callDepth: 0 }
  },
  {
    evaluation: 5,
    type: 'BinaryExpression',
    node: {
      type: 'BinaryExpression',
      left: [Object],
      right: [Object],
      operator: '+',
      start: 515,
      end: 520,
      range: [Array],
      loc: [Object]
    },
    scope: EventScope { variables: [Object], depth: 0, callDepth: 0 }
  },
  {
    evaluation: 2,
    type: 'Identifier',
    node: {
      type: 'Identifier',
      name: 'a',
      start: 525,
      end: 526,
      range: [Array],
      loc: [Object]
    },
    scope: EventScope { variables: [Object], depth: 0, callDepth: 0 }
  },
  {
    evaluation: 3,
    type: 'Identifier',
    node: {
      type: 'Identifier',
      name: 'b',
      start: 529,
      end: 530,
      range: [Array],
      loc: [Object]
    },
    scope: EventScope { variables: [Object], depth: 0, callDepth: 0 }
  },
  {
    evaluation: -1,
    type: 'BinaryExpression',
    node: {
      type: 'BinaryExpression',
      left: [Object],
      right: [Object],
      operator: '-',
      start: 525,
      end: 530,
      range: [Array],
      loc: [Object]
    },
    scope: EventScope { variables: [Object], depth: 0, callDepth: 0 }
  },
  {
    evaluation: -5,
    type: 'BinaryExpression',
    node: {
      type: 'BinaryExpression',
      left: [Object],
      right: [Object],
      operator: '*',
      start: 514,
      end: 531,
      range: [Array],
      loc: [Object]
    },
    scope: EventScope { variables: [Object], depth: 0, callDepth: 0 }
  },
  {
    evaluation: undefined,
    type: 'VariableDeclaration',
    node: {
      type: 'VariableDeclaration',
      kind: 'const',
      declarations: [Array],
      start: 499,
      end: 532,
      range: [Array],
      loc: [Object]
    },
    scope: EventScope { variables: [Object], depth: 0, callDepth: 0 }
  },
  {
    evaluation: -5,
    type: 'Identifier',
    node: {
      type: 'Identifier',
      name: 'result',
      start: 546,
      end: 552,
      range: [Array],
      loc: [Object]
    },
    scope: EventScope { variables: [Object], depth: 0, callDepth: 0 }
  },
  {
    evaluation: { RES: -5 },
    type: 'ReturnStatement',
    node: {
      type: 'ReturnStatement',
      argument: [Object],
      start: 539,
      end: 553,
      range: [Array],
      loc: [Object]
    },
    scope: EventScope { variables: [Object], depth: 0, callDepth: 0 }
  }
]
```
</details>

> ⭐ **Enjoying** `fn-monitor`? Show your support **by** starring the [repository](https://github.com/The-BigMan-tech/fn-monitor) on GitHub! It helps the project grow and keeps the updates coming.

### Capturing values and Embedding Functions

Because a monitored function runs in an interpreted context, it needs a way to access external values. This is where we introduce the `captures` and `embed` properties when creating the function:

| Capturing | Embedding |
| --- | --- |
| Works for all data types; gives the interpreter direct references or values. | Exclusive to functions; copies the function's source code into the context to be parsed alongside the `main` function. |
| Injects values into the context as constants. | Injects functions into the context as top-level variables. |
| Captured functions run natively in your JS engine when called. | Embedded functions run in the interpreted context, allowing hooks like `onStep` and `inspector` to see through them. |

In this example, `main` captures `printName` (runs natively, not intercepted), while `print` is embedded (runs in the interpreted context and is intercepted). `print` captures `label` because it depends on it.

In the `inspector`, we add the function currently at the head of the call stack to a `Set`. The call stack shares the same API as `visit.localExeStack`, but instead of tracking AST evaluations, it tracks the hierarchy of function calls. The most recently called function is always at the head (index 0).

The output shows that only `sayHello` and `print` appear in the intercepted set because the `inspector` won't be able to see the captured function:

```typescript
import { monitor } from "@typescript-guy/fn-monitor";


const interceptedFns = new Set();

function sayHello(name:string) {
    printName(name)
    print('Hello world');
}
function printName(name:string) {
    console.log('Hello ',name);
}
const label = 'Printed: ';

function print(str:string) {
    console.log(label,str);
}

const mainFn = monitor({
    main:{
        ref:sayHello,
        captures:{
            printName
        }
    },
    embed:{
        print:{
            ref:print,
            captures:{
                label
            }
        }
    },
    inspector:(visit)=>{
        interceptedFns.add(visit.callStack().get(0));
    }
});

mainFn('person');
console.log('Intercepted functions: ',interceptedFns);

```

#### Output

```text
Hello  person
Printed:  Hello world
Intercepted functions:  Set(2) { 
    [Function: sayHello], 
    [Function: print] 
}
```

> 💡 Monitored functions automatically have access to all standard JavaScript built-in globals. 
> You **do not** need to capture these — they're injected by the interpreter and available immediately.
> 
> This includes `Math`, `JSON`, `Promise`, `Array`, `Object`, `Date`, `RegExp`, `Map`, `Set`, `console`, etc. You only need to capture values from your own codebase — variables or helper functions.

### Scoping: Capturing vs Embedding

Within the interpreted context of a monitored function, it is important to understand how scoping works for each approach:

- Captures are function-scoped. As shown in the last example, they are bound directly to the specific function they are passed to. A captured variable in one function is not automatically available to another. 

- Embedded functions are context-scoped. This means not only can the `main` function call them, but any other embedded function can call them too.

This example emphasizes the scoping mechanics of embedding:

```typescript
import { monitor } from "@typescript-guy/fn-monitor"

const nested = ()=>{
    return 'Hello World'
}

const inner = ()=>{
    return nested()
}

const outer = monitor({
    main:{
        ref:()=>inner(),
    },
    embed:{
        inner:{
            ref:inner
        },
        nested:{
            ref:nested
        }
    }
});
console.log(outer());
```

#### Output

```text
Hello World
```

### Seeing the result of every awaited promise in a function call

This example is unique because it uses a generator as the inspector rather than a regular function.

This is important because when the interpreter walks through an `AwaitExpression` node, `visit.execute` becomes lazy.

Yielding it is the only way to get the resolved value but we have to yield it directly in the inspector's body and not in any `visit.is` query.

```typescript 
import { monitor,type InspectorGenerator } from "@typescript-guy/fn-monitor";

const fetchPrice = monitor({
    main:{
        //it uses dummy calculations to keep the example simple
        ref:async (item:string)=>{
            const price = await Promise.resolve(10)
            return await Promise.resolve(price**2);
        }
    },
    inspector:function* (visit):InspectorGenerator {
        const result = yield visit.execute();
        
        visit.is('AwaitExpression',()=>{
            console.log('Awaited promise: ',result);
        })
    },
});
await fetchPrice('flour')
```

#### Output

```text
Awaited promise:  10
Awaited promise:  100
```

> 💡 **Note:** The monitored function will use additional memory if its `inspector` is a generator.

### Tracking all function calls during the execution of a function including methods

This example is quite advanced, but all it does is to:

- query for all `CallExpression` nodes
- retrieve the scope from the event object
- store the `search` method of the scope to prevent long property chains
- store the callee
- perform a switch statement on the callee's node type:
    - If it is an `Identifier`, it will use the scope to search for the called function through its name and add it to the `callees` set.
  
    - If it is a `MemberExpression`, which indicates a method call, it will use the scope to search for the instance through the name of the callee's object, then use the callee's property to retrieve the method from that instance.

```typescript
import { monitor } from "@typescript-guy/fn-monitor";

function getSqrt(num: number) {
    const squareRoot = Math.sqrt(num);
    const rounded = Number(squareRoot.toFixed(3));
    return rounded;
}

const callees = new Set();

const monitoredGetSqrt = monitor({
    main: {
        ref: getSqrt
    },
    inspector:(visit):undefined => {
        visit.is('CallExpression', (event) => {
            const scope = event.scope;
            const search = scope.variables.search;

            const callee = event.node.callee;

            switch(callee.type) {
                case "Identifier":
                    const func = search(callee.name);
                    callees.add(func)
                    break

                case "MemberExpression":
                    const calleeObj = callee.object;     
                    if (calleeObj.type !== "Identifier") break;

                    const obj = search(calleeObj.name) as any;
                    const property = callee.property;

                    if (property.type !== "Identifier") break;
                        
                    const method = obj[property.name];
                    callees.add(method)

                    break  
            }
        });
    },
});

monitoredGetSqrt(2);
console.log('Callees during execution: ', callees);

```

#### Output

```text
Callees during execution:  Set(3) { 
    [Function: sqrt], 
    [Function: Number], 
    [Function: toFixed] 
}
```

### Using the `onStep` hook to implement a live timeout on a function, halting it if it attempts to hang the main thread.

A deep dive into this is available in this [article](https://dev.to/typescript-guy/stop-a-function-call-from-hanging-the-main-thread-without-using-web-workers-15me)

```typescript
import { monitor } from "@typescript-guy/fn-monitor";

type milliseconds = number;
type Fn = (...args:any[])=>any

function timeFn<T extends Fn>(fn:T,budget:milliseconds):T {
    const graceTime = 0.5 as milliseconds;

    let startTime = 0 as milliseconds;
    let usedTime = 0 as milliseconds;
    let step = 0;

    const checkBudget = ()=>{
        const currentTime = performance.now();
        usedTime = (currentTime - startTime);

        const timeIsUp = usedTime > (budget + graceTime)
        if (timeIsUp) {
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
            const shouldCheckBudget = (step & 1023) === 0;
            if (shouldCheckBudget) checkBudget();
        },
        afterEachCall:(result)=>{
            if (!(result instanceof Error)) {
                checkBudget();
            }
        }
    });
    return monitoredFn
};
function getPrice(item?:string):number {
    if (!item) {
        while (true) {
            //simulate the function hanging forever in an attempt to fetch the price of an undefined item
        }
    }
    return 10
}

const timedGetPrice = timeFn(getPrice,50);
try {
    timedGetPrice()
}catch(err) {
    console.log('Error: ',(err as Error).message);
}
```

#### Output

```text
Error: The monitored function used 50.745ms when only given a budget of 50.000ms.
```

---

>💡 **All examples** are available in [this file](https://github.com/The-BigMan-tech/fn-monitor/blob/master/examples/quick-examples.ts).

---

<a id="capabilities"></a>

## Capabilities 💪

1. **Ergonomic API:** Ships a clean, intuitive interface that can be used to mutate execution, enforce timeouts, and trace state without needing to understand the underlying mechanics.

2. **Unopinionated:** Makes no assumptions about your problem domain. It provides raw, flexible primitives that can be used anywhere runtime AST analysis is required.
   
   > 💡 If your problem domain is deobfuscation, see this [Runtime Deobfuscation Example](https://github.com/The-BigMan-tech/fn-monitor/blob/master/examples/deobfuscating-code.ts)
   
3. **ES2024 Support:** The interpreter fully supports JavaScript syntax up to the ES2024 specification.

4. **Zero-Dependency Runtime:** A pure JavaScript AST-walking interpreter. It does not rely on native binaries or environment-specific APIs, and its only dependencies run in pure JS.
   
5. **Sync & Async Support:** Seamlessly interprets and monitors both synchronous and asynchronous functions.

6. **Class Method Support:** You can monitor class and instance methods just like regular functions. To preserve the `this` context safely without encountering runtime crashes, simply use the `bind` property alongside `ref` when configuring the monitored function. See the [Monitoring Methods](https://github.com/The-BigMan-tech/fn-monitor/blob/master/EDGE-CASES.md#monitoring-methods) guide for exact syntax requirements.
   
---

<a id="full-api-reference"></a>

## Full API Reference 📚 

### Core Configuration

#### monitor`<T>`(setup: MonitorFnSetup`<T>`)
The main export. Accepts a configuration object containing the target function and returns a new function that is executed by the interpreter while retaining the call signature of the target.

#### MonitorFnSetup`<T>`
| Property | Type | Description |
| --- | --- | --- |
| `main` | `Metadata<T>` | **Required.** The configuration for the main function to monitor. |
| `embed` | `Record<string, Metadata<T>` | Alternative to capturing. Directly includes a function's source code in the interpreter context so it can also be monitored. |
| `inspector` | `Inspector` | The main hook passed the interpreter's context (`visit` object). Can be a regular function or a generator. *(See note below).* |
| `onStep` | `OnStep` | Lightweight hook called before each interpreted step. Does not receive the `visit` object, making it significantly faster than `inspector`. |
| `sourceOut` | `{ value: string }` | If provided, the interpreter writes the generated source code into this object's `value` property. |
| `beforeEachCall` | `(...args) => void` | Hook called before each execution with the passed arguments. |
| `afterEachCall` | `(result \| Error) => void` | Hook called after each execution with the result or thrown error. |

> 💡 **Inspector Type Clarification:** You do **not** need to use a generator inspector for async functions or a normal function inspector for sync code. Any type works for any function. The only difference is how you handle `visit.execute()` on lazy nodes (generators can `yield` the `LAZY_NODE` symbol to defer the result).

#### Metadata`<T>`
| Property | Type | Description |
| --- | --- | --- |
| `ref` | `T` | The reference to the function to be included in the interpreter context. |
| `captures` | `Record<string, any>` | Maps variable names to their values stored outside the wrapped function's scope. Follows standard JS copy-by-value (primitives) and copy-by-reference (objects) semantics. |
| `bind` | `unknown` | The `this` context to bind to the generated function. Required when monitoring instance methods to preserve the `this` reference safely. |

---

### The Inspector Context: `Visit`

The rich object that gives inspectors their ability to participate in the interpretation. Every monitored function has exactly one `visit` object allocated to save memory. It must be used strictly within the `inspector` hook.

| Method/Property | Description |
| --- | --- |
| `is(query, callback)` | Evaluates the query against the **current** node. If it matches, it allocates a scope, wraps it with the node in an event object, and fires the callback. |
| `execute()` | Manually executes the current node and returns the result. Calling this is optional; if omitted, the interpreter executes the node normally after the `inspector` finishes.<br>Lazy nodes like `AwaitExpression`, `YieldExpression` and an awaited `ForOfStatement` defer the execution and cause it to return the `LAZY_NODE` symbol. |
| `localExeStack()` | Returns a live, read-only reference to a stack of the latest evaluated child node results. Supports indexed access to previous results and is iterable. |
| `callStack()` | Returns a read-only reference to the stack of active function calls with the latest call at the head. It holds the original function references and not internal wrappers. Supports indexed access to previous calls and is iterable. |
| ~~`set perExecution(fn)`~~ | A setter for a callback fired after each executed node within the current node's subtree (including the current node itself). It is short-lived and consumed after the owner node completes. <br>It is currently deprecated. Check this [note](https://github.com/The-BigMan-tech/fn-monitor/blob/master/EDGE-CASES.md#deprecated-perexecution-hook) for more detail. |

#### ExeResult
| Property | Type | Description |
| --- | --- | --- |
| `evaluation` | `unknown` | The result of the node's evaluation. |
| `type` | `EsNode['type']` | The type of the AST node. |
| `node` | `EsNode` | The AST node itself. |
| `scope` | `ScopeForEvent \| NOT_ALLOCATED` | A safe snapshot of the scope created for the result. |

---

### Utility Types & Classes

- **`EsNode`**: Union of all AST nodes (alias to `Node` from `estree`).
  
- **Event Classes**: Over **40** specific event classes extending `LangEvent` (e.g., `BinaryExprEvent`, `CallExprEvent`, `AwaitExprEvent`, `ReturnStmtEvent`, etc.) providing tailored intellisense.

- **`Query`**: String union of all possible `EsNode` types for `visit.is`. Includes `'Any'` to match all nodes including those that don't have an event class.
  
- **`LocalExeStack` and `CallStack`**: The type of the values returned from `visit.localExeStack` and `visit.callStack` respectively. They use the same underlying data structure: an optimized deque that supports random array access and iteration.
  
- **`Fn`**: A type that matches all function types. It is used internally for the `Metadata<T>` and `CallStack` types.
  
- **`InspectorGenerator`**: The return type for generator-based inspectors. Used for type-safe `yield` expressions with `visit.execute()`.
  
- **`NOT_ALLOCATED`**: Symbol marking scopes that weren't allocated. Use `visit.is('Any', ...)` to forcefully allocate scope objects for all nodes.
  
- **`ScopeForEvent`**: A freshly allocated snapshot of the scope. 
    - `variables.local` is an object that maps variable identifiers to their values.
    - `variables.search(name)` searches up the live scope chain for a variable through its identifier. 
    - `depth` is a 0-indexed measure of lexical nesting. It maps directly to the physical structure of the AST and is measured relative to the root of the `main` function or any `embedded` function.
    - `callDepth` is a 0-indexed value representing the current depth of the call stack starting from the monitored `main` function.

---

<a id="important-limitations"></a>

## Important Limitations ⚠️

These are the critical constraints to understand before using `fn-monitor`:

1. **Setup Cost:** The `monitor()` function incurs overhead from AST parsing and interpreter instantiation. If you need to monitor a function across multiple calls, call `monitor()` **once** outside the loop and invoke the returned function inside it.
   
   > 💡 **Optimization:** The package automatically caches the parsed AST based 
   > on the generated source code, reusing it for identical functions to minimize 
   > redundant parsing.

2. **Execution Cost:** Because `fn-monitor` interprets your function step-by-step through an interpreter, each monitored call incurs overhead compared to native execution. This is the fundamental cost of AST-level observability.
   
   > ⚠️ **Do not use `fn-monitor` inside high-throughput loops, real-time request 
   > handlers, or any code path where microsecond-level latency matters.** It is designed for functions that are already slow (100ms+), run infrequently, and would be catastrophic if they hung forever.

3. **Debugging & Stack Traces:** Errors thrown inside monitored functions will not map directly to their original source locations in your editor. You may need to temporarily switch to your original function to fix any of its issues. The switching cost is minimal because you can simply change the name 
at the call site or where you refer to it in your code.
   
   > 💡 **Note:** The `inspector` hook itself runs in the native JS runtime and will display a standard stack trace if it throws anything.
   
4. **Not a Secure Sandbox:** Although monitored functions are lexically isolated from the host, the package is not designed to act as a strict, secure sandbox out-of-the-box. You can simulate strict execution boundaries via the `inspector` and `onStep` hooks, but do not rely on the package to sandbox untrusted code against malicious actors.

---

<a id="advanced-behavior"></a>

## Advanced Behavior 🧐

Because `fn-monitor` interprets code directly at the AST level, working with specific runtime features (such as class methods, native generators, or dynamic imports) requires specialized handling. Additionally, internal concepts like the `visit` object and `ScopeForEvent` carry specific execution rules.

If you encounter unexpected behavior, it is likely documented in the **[Advanced Behavior Guide](https://github.com/The-BigMan-tech/fn-monitor/blob/master/EDGE-CASES.md)**.

---

<a id="mechanics"></a>

## Mechanics ⚙️

- **Interpreter Isolation:** Each monitored function is assigned its own dedicated interpreter instance. While this incurs a slight memory overhead, it strictly prevents state collision between executions.
  
- **Single Parse:** A monitored function is parsed into an AST only once. The resulting nodes are reused across all calls to maximize execution speed.
  
- **Scope Allocation & Safety:** Unlike AST nodes (which are parsed once and reused), the scope objects exposed to the inspector are always freshly allocated for each event. This prevents accidental mutations of the interpreter's internal state.
  
- **Dynamic Code Generation:** Before the AST parser runs, raw function strings are passed through a deterministic code generator that constructs an IIFE wrapper. This safely injects `captures` as constants and stitches `embed` sources into the execution context, ensuring strict lexical boundaries before interpretation begins.
  
- **Strict Mode Enforcement:** All generated source code is run in strict mode.
  
- **Reusables Architecture:** To share interpretation context with the inspector hook performantly, the implementation leverages internal reusable objects, preventing the allocation of intermediate objects mid-evaluation. The async evaluator safely copies and restores these objects across event loop pauses.

---

<a id="questions--support"></a>

## Questions & Support 💬

- 👥 **Questions & Feature Requests:** You can read my [articles](https://dev.to/typescript-guy) or open a [GitHub Discussion](https://github.com/The-BigMan-tech/fn-monitor/discussions).
  
- 🐛 **Bugs:** Although the core API is stable, JavaScript interpreters inherently have deep edge cases. If you encounter unexpected behavior that isn't already explained in the [Important Limitations](#important-limitations) or [Advanced Behaviour](#advanced-behavior) sections, please open an [Issue](https://github.com/The-BigMan-tech/fn-monitor/issues).

*Note: This is an open-source project maintained in my free time. I will do my best to respond, but please allow a few days for a reply. Before opening a new thread, please check existing Discussions and Issues!*

---

<a id="contributing"></a>

## Contributing 🤝

Contributions are welcome! Before opening a pull request, please read the [Contributing Guidelines](https://github.com/The-BigMan-tech/fn-monitor/blob/master/CONTRIBUTING.md). It outlines critical architectural invariants that all contributions must preserve.

---

<a id="brand--forking-guidelines"></a>

## Brand & Forking Guidelines 🛡️

This project encourages community forks and variations. Before you fork, please see [BRANDING.md](https://github.com/The-BigMan-tech/fn-monitor/blob/master/BRANDING.md) for the branding guidelines.

---

<a id="inspiration"></a>

## Inspiration 🎯

I built this package because I needed a reliable way to throw an error if an arbitrary function uses loops at runtime. My goal wasn't just to prevent a function from hanging the main thread — I needed to literally ban the presence of loops in the code itself. 

Existing solutions could only enforce this at build time. I later grew `fn-monitor` into a general-purpose tool for runtime AST control, far beyond that original use case. If you've ever needed to implement similar constraints, this package is for you.

---

<a id="acknowledgements"></a>

## Acknowledgements 🙏

The core execution engine of this project is a modified and extended version of [sval](https://github.com/Siubaak/sval), a JavaScript interpreter written in JavaScript, originally authored by Siubaak. 

*Please note: This project is an independent extension and is not affiliated with, endorsed by, or sponsored by the original `sval` project or its authors. `sval` is licensed under the MIT License.*