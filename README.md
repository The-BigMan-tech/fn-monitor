# @typescript-guy/fn-monitor

<p align="center">
    <img src="./logo.svg" width="120" 
      alt="fn-monitor logo featuring 'fn' with a cyan terminal cursor"
    />
</p>

<p align="center">
    <a href="https://www.npmjs.com/package/@typescript-guy/fn-monitor">
        <img src="https://img.shields.io/npm/v/@typescript-guy%2Ffn-monitor" alt="npm version" />
    </a>
     &nbsp;&nbsp;&nbsp;&nbsp;
    <a href="https://github.com/The-BigMan-tech/fn-monitor/blob/master/LICENSE.md">
        <img src="https://img.shields.io/npm/l/@typescript-guy%2Ffn-monitor" alt="license" />
    </a>
     &nbsp;&nbsp;&nbsp;&nbsp;
    <a href="https://github.com/The-BigMan-tech/fn-monitor/actions/workflows/test.yaml">
        <img src="https://github.com/The-BigMan-tech/fn-monitor/actions/workflows/test.yaml/badge.svg" alt="CI" />
    </a>
</p>

<p align="center">
    <a href="https://github.com/The-BigMan-tech/fn-monitor/blob/master/tsconfig.json">
        <img src="https://img.shields.io/badge/TypeScript-100%25-3178C6?logo=typescript&logoColor=white" alt="100% typescript">
    </a>
     &nbsp;&nbsp;&nbsp;&nbsp;
    <a href="https://bundlephobia.com/package/@typescript-guy/fn-monitor">
        <img src="https://img.shields.io/badge/minzipped-127%20kB-3178C6" alt="bundle size" />
    </a>
</p>

`fn-monitor` is an augmentation of the `sval` JS-in-JS interpreter designed to monitor functions as they execute. It allows developers to deeply inspect, debug, and control JavaScript functions at runtime by injecting hooks at any part of their lifecycle, effectively turning them into white-boxes.

## Table of Contents 📑

- [Installation](#installation-)
- [API Introduction](#api-introduction-)
- [Quick Examples](#quick-examples-)
- [Full API Reference](#full-api-reference-)
- [Mechanics](#mechanics-️)
- [Important Notes & Limitations](#important-notes--limitations-️)
- [Questions & Support](#questions--support-)
- [Contributing](#contributing-)
- [Brand & Forking Guidelines](#brand--forking-guidelines-️)
- [Inspiration](#inspiration-)
- [Acknowledgements](#acknowledgements-)
  
## Installation 📦

```bash
npm install @typescript-guy/fn-monitor
```

> 📌 **If you are integrating this package for production:** Please review the [Important Notes & Limitations](#important-notes--limitations-️) section to understand key behavioral nuances such as AST mutation persistence and dynamic imports.

---


## API Introduction ✨

The core of the package is the `monitor` function. It accepts a configuration object of the type,   `MonitorFnSetup` and returns a new function with an identical call signature to the original, but it is executed by a custom interpreter rather than your JS engine. 


## Quick Examples ⚡

These are snippets that you can quickly copy and paste to see what the package can do.

The details on how they work are included under each subheading either as notes or a link.

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

### Capturing values and Embedding Functions

Because monitored functions run in an interpreted context, they need a way to access external values. That is where we introduce capturing and embedding:

- Capturing simply gives the interpreter direct references or values and it works for all data types. They are injected into the context as constants. So you can't reassign them.
  
- Embedding is exclusive to functions and it tells the interpreter to copy its source code into the context and parse it together with your monitored function.<br>The advantage to embedding is that when the monitored function calls it, it will run in the interpreted context rather than natively in your JS engine. This allows hooks like `onStep` and `inspector` to see through the function.

In this example, `printName` is captured (runs natively, not intercepted), while `print` is embedded (runs in the interpreted context and is intercepted). `print` captures `label` because it depends on it.

The value of `currentFn` is wrapped in an object because of how captured variables are injected. We also capture it into `sayHello` and `print`.

The output shows that only `sayHello` and `print` appear in the intercepted set.


```typescript
import { monitor } from "@typescript-guy/fn-monitor";

const currentFn = {value:'' as any}
const interceptedFns = new Set();

const label = 'Printed: ';

function print(str:string) {
    currentFn.value = "print";

    console.log(label,str);

    currentFn.value = undefined
}

function printName(name:string) {
    currentFn.value = "printName"

    console.log('Hello ',name);

    currentFn.value = undefined
}

const sayHello = monitor({
    main:{
        ref:(name:string)=>{
            currentFn.value = "sayHello";

            printName(name)
            print('Hello world');

            currentFn.value = undefined
        },
        captures:{
            printName,
            currentFn
        }
    },
    embed:{
        print:{
            ref:print,
            captures:{
                label,
                currentFn
            }
        }
    },
    onStep:()=>{
        if (currentFn.value) {
            interceptedFns.add(currentFn.value)
        }
    }
});

sayHello('person');
console.log('Intercepted functions: ',interceptedFns);

```

#### Output

```text
Hello  person
Printed:  Hello world
Intercepted functions:  Set(2) { 'sayHello', 'print' }
```

### Scoping: Captures vs Embedding

Within the interpreted context of a monitored function, it is important to understand how scoping works for each approach:

- Captures are function-scoped. They are bound directly to the specific function they are passed to. A captured variable in one function is not automatically available to another. 

- Embedded functions are context-scoped. This means not only can the main function call it, but any other embedded function can call it too.

This example emphasizes the scoping mechanics of embedding

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
Hello world
```

### Getting the full execution history of a function call

We first call `visit.is('Any',...)` to force the interpreter to allocate every scope object. This is because the interpreter, by default, doesn't allocate a scope for a node unless you query for it.

So what this basically does is that for every executed node, it will query the execution stack for the head element. This is because the latest evaluation is always inserted at the head/left end of the stack. It will then push that result to our custom array.

```typescript
import { monitor,type ExeResult } from "@typescript-guy/fn-monitor";

const exeHistory:ExeResult[] = [];

const fn = monitor({
    main:{
        ref:(a:number,b:number)=>{
            const result = (a + b) * (a - b);
            return result;
        }
    },
    inspector:(visit)=>{
        visit.is('Any',()=>undefined);

        visit.perExecution = ()=>{
            const stack = visit.localExeStack();
            const head = stack.get(0)
            exeHistory.push(head);
        }
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
      start: 192,
      end: 193,
      range: [Array],
      loc: [Object]
    },
    scope: EventScope { depth: 0, variables: [Object] }
  },
  {
    evaluation: 3,
    type: 'Identifier',
    node: {
      type: 'Identifier',
      name: 'b',
      start: 196,
      end: 197,
      range: [Array],
      loc: [Object]
    },
    scope: EventScope { depth: 0, variables: [Object] }
  },
  {
    evaluation: 5,
    type: 'BinaryExpression',
    node: {
      type: 'BinaryExpression',
      left: [Object],
      right: [Object],
      operator: '+',
      start: 192,
      end: 197,
      range: [Array],
      loc: [Object]
    },
    scope: EventScope { depth: 0, variables: [Object] }
  },
  {
    evaluation: 2,
    type: 'Identifier',
    node: {
      type: 'Identifier',
      name: 'a',
      start: 202,
      end: 203,
      range: [Array],
      loc: [Object]
    },
    scope: EventScope { depth: 0, variables: [Object] }
  },
  {
    evaluation: 3,
    type: 'Identifier',
    node: {
      type: 'Identifier',
      name: 'b',
      start: 206,
      end: 207,
      range: [Array],
      loc: [Object]
    },
    scope: EventScope { depth: 0, variables: [Object] }
  },
  {
    evaluation: -1,
    type: 'BinaryExpression',
    node: {
      type: 'BinaryExpression',
      left: [Object],
      right: [Object],
      operator: '-',
      start: 202,
      end: 207,
      range: [Array],
      loc: [Object]
    },
    scope: EventScope { depth: 0, variables: [Object] }
  },
  {
    evaluation: -5,
    type: 'BinaryExpression',
    node: {
      type: 'BinaryExpression',
      left: [Object],
      right: [Object],
      operator: '*',
      start: 191,
      end: 208,
      range: [Array],
      loc: [Object]
    },
    scope: EventScope { depth: 0, variables: [Object] }
  },
  {
    evaluation: undefined,
    type: 'VariableDeclaration',
    node: {
      type: 'VariableDeclaration',
      kind: 'const',
      declarations: [Array],
      start: 176,
      end: 209,
      range: [Array],
      loc: [Object]
    },
    scope: EventScope { depth: 0, variables: [Object] }
  },
  {
    evaluation: -5,
    type: 'Identifier',
    node: {
      type: 'Identifier',
      name: 'result',
      start: 223,
      end: 229,
      range: [Array],
      loc: [Object]
    },
    scope: EventScope { depth: 0, variables: [Object] }
  },
  {
    evaluation: { RES: -5 },
    type: 'ReturnStatement',
    node: {
      type: 'ReturnStatement',
      argument: [Object],
      start: 216,
      end: 230,
      range: [Array],
      loc: [Object]
    },
    scope: EventScope { depth: 0, variables: [Object] }
  }
]
```
</details>

### Seeing the result of every awaited promise in a function call

This example is unique because it uses a generator as the inspector rather than a regular function.

This is important because when the interpreter walks through an async node like an `AwaitExpression`, `visit.execute` becomes lazy.

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
- crawl through the event object to retrieve its scope 
- store the `search` method of the scope
- store the callee
- perform a switch statement on the callee
    - If the callee is an `Identifier`, it will search for its name in the scope and add it to the `callees` set.
  
    - Else if it is a `MemberExpression`, which is the node type for method calls, it retrieves the object, searches it up in the scope only if it's an `Identifier`, then accesses the method through the callee's property.
  

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

                    if (calleeObj.type === "Identifier") {
                        const obj = search(calleeObj.name) as any;
                        const property = callee.property;

                        if (property.type === "Identifier") {
                            const func = obj[property.name];
                            callees.add(func)
                        }
                    }
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
type Fn = (...args:any[])=>void

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
timedGetPrice()
```

#### Output

```text
Error: The monitored function used 50.745ms when only given a budget of 50.000ms.
....
```

---

>💡 **All examples** are available in [this file](https://github.com/The-BigMan-tech/fn-monitor/blob/master/examples/quick-examples.ts). *(Note: If you copy the code, change the import from `'../src/index.ts'` to `'@typescript-guy/fn-monitor'`)*.

---


## Full API Reference 📚 

### Core Functions

#### `monitor<T>(setup: MonitorFnSetup<T>)`
The main export. Accepts a configuration object and returns a new function with an identical call signature to the original, but executed by the custom interpreter.

#### `MonitorFnSetup<T>`
| Property | Type | Description |
| --- | --- | --- |
| `main` | `Metadata<T>` | **Required.** The configuration for the main function to monitor. |
| `embed` | `Record<string, Metadata<Fn>>` | Alternative to capturing. Directly includes a function's source code in the interpreter context so it can also be monitored. |
| `inspector` | `Inspector` | The main hook passed the interpreter's context (`visit` object). Can be a regular function or a generator. *(See note below)*. |
| `onStep` | `OnStep` | Lightweight hook called before each interpreted step. Does not receive the `visit` object, making it significantly faster than `inspector`. |
| `sourceOut` | `{ value: string }` | Overwrites the `value` property with the generated code used in the interpreter. |
| `beforeEachCall` | `(...args) => void` | Hook called before each execution with the passed arguments. |
| `afterEachCall` | `(result \| Error) => void` | Hook called after each execution with the result or thrown error. |

> 💡 **Inspector Type Clarification:** You do **not** need to use a generator inspector for async functions or a normal function inspector for sync code. Any type works for any function. The only difference is how you handle `visit.execute()` on async nodes (generators can `yield` the `LAZY_NODE` symbol to defer the result).

#### `Metadata<T>`
| Property | Type | Description |
| --- | --- | --- |
| `ref` | `T` | The reference to the function to be included in the interpreter context. |
| `captures` | `Record<string, any>` | Maps variable names to their values stored outside the wrapped function's scope. Follows standard JS copy-by-value (primitives) and copy-by-reference (objects) semantics. |

---

### The Inspector Context: `Visit`

The rich object that gives inspectors their ability to participate in the interpretation. Every monitored function has exactly one `visit` object allocated to save memory. It must be used strictly within the `inspector` hook.

| Method/Property | Description |
| --- | --- |
| `is(query, callback)` | Evaluates the query against the **current** node. If it matches, it allocates a scope, wraps it with the node in an event object, and fires the callback.<br><br>⚠️ **Important:** This does **not** register a persistent hook for future nodes. It is an **eager, single-use check** against the node currently being evaluated. Once checked, the callback is discarded. This keeps the interpreter fast and memory-efficient. |
| `set perExecution(fn)` | A setter for a callback fired on each executed child node. It is short-lived and discarded after evaluating the current node and its children. |
| `execute()` | Manually executes the current node and returns the result. For async nodes (like `await`), it defers execution and returns the `LAZY_NODE` symbol. |
| `localExeStack()` | Returns a live, read-only reference to a stack of the latest evaluated child node results, with indexed access to older entries. |

#### `ExeResult`
| Property | Type | Description |
| --- | --- | --- |
| `evaluation` | `unknown` | The result of the node's evaluation. |
| `type` | `EsNode['type']` | The type of the AST node. |
| `node` | `EsNode` | The AST node itself. |
| `scope` | `ScopeForEvent \| NOT_ALLOCATED` | The safe, read-only scope snapshot created for the caller. |

---

### Utility Types & Classes

- **`EsNode`**: Union of all AST nodes (alias to `Node` from `estree`).
  
- **`ScopeForEvent`**: A freshly allocated, read-only snapshot of the scope. `variables.local` holds local variables, while `variables.search(name)` searches up the scope chain. `depth` is strictly 0-indexed from the wrapped function's root.
  
- **`LocalExeStack`**: A custom, optimized deque with random array access, exposed as a read-only view.
  
- **`Query`**: String union of all possible `EsNode` types for `visit.is`. Includes `'Any'` to match all nodes.
  
- **`NOT_ALLOCATED`**: Symbol marking scopes that weren't allocated. Use `visit.is('Any', ...)` to forcefully allocate scope objects for all nodes.
  
- **Event Classes**: Over 30 specific event classes extending `LangEvent` (e.g., `BinaryExprEvent`, `CallExprEvent`, `AwaitExprEvent`, `ReturnStmtEvent`, etc.) providing tailored intellisense.

---


## Mechanics ⚙️

- **Interpreter Isolation:** Each monitored function is assigned its own dedicated interpreter instance. While this incurs a slight memory overhead, it strictly prevents state collision between executions.
  
- **Single Parse:** A monitored function is parsed into an AST only once. The resulting nodes are reused across all calls to maximize execution speed.
  
- **Reusables Architecture:** To share interpretation context with the inspector hook performantly, the implementation leverages internal reusable objects, preventing the allocation of intermediate objects mid-evaluation. The async evaluator safely copies and restores these objects across event loop pauses.
  
- **Strict Mode Enforcement:** All generated wrapper code is executed in strict mode.
  
- **Scope Allocation & Safety:** Unlike AST nodes (which are parsed once and reused), the scope objects exposed to the inspector are always freshly allocated for each event. This prevents accidental mutations of the interpreter's internal state.

---


## Important Notes & Limitations ⚠️

Please keep the following architectural constraints in mind when using this package:

1. **ES2024 Support:** The interpreter supports JavaScript syntax up to the ES2024 specification.

2. **Zero-Dependency Runtime:** This is a pure JavaScript AST-walking engine. It does not rely on native binaries or environment-specific APIs and its only dependencies run in pure JS.
   
3. **Native Generator Functions (`function*`):** Although you can directly pass a generator to `main.ref`, calling the monitored function immediately returns an Iterator object without executing the body. The interpreter cannot intercept any of its code during the subsequent `.next()` calls because they are driven by the native JS engine.
   
    >💡 **Tip:** There is a workaround. 
    >
    > If a monitored sync or async function **consumes** a generator that was **embedded** (rather than captured), the generator's internals — including `YieldExpression` nodes — become visible to the inspector. See the [workaround](https://github.com/The-BigMan-tech/fn-monitor/blob/master/examples/generator-workaround.ts) example for a quick demonstration.
    > 
    > Make sure to change the import from `'../src/index.ts'` to `'@typescript-guy/fn-monitor'` if you are copying it to a local script.

4. **AST Mutation Persistence:** Because the code is parsed into an AST only once, any mutations made to an AST node within the inspector hook will persist and affect all subsequent calls to that function.

5. **Performance Critical:** The `monitor()` function incurs overhead from AST parsing and interpreter instantiation. Always call `monitor()` once outside of hot loops, and execute the returned function inside your loops or handlers. (Optimization: The package automatically caches the parsed AST based on the generated source code, reusing it for identical functions to minimize redundant parsing.)

6. **Dynamic Imports:** The interpreter intentionally does not support dynamic `import()` calls within monitored functions. You must lift your imports to the native scope and pass the resolved modules via the `captures` property.
   
7. **Wrapper Constraints:** A monitored function cannot be passed to the `ref` property of either `main` or any function within `embed`. However, you *can* include an already-monitored function in any of their `captures` objects, as it will execute natively.

8. **Debugging & Stack Traces:** Errors thrown inside monitored functions will not map directly to their original source locations in your editor. Debug functions in their unmonitored state first. (Note: The `inspector` hook itself runs in the native JS runtime and will display a standard stack trace if it throws).

9.  **Execution Control & Isolation:** This package is not designed to act as a strict, secure sandbox out-of-the-box. However, you can simulate strict execution boundaries by actively monitoring and intercepting execution via the `inspector` and `onStep` hooks.

---


## Questions & Support 💬

- 👥 **Questions & Feature Requests:** You can read my [articles](https://dev.to/typescript-guy) or open a [GitHub Discussion](https://github.com/The-BigMan-tech/fn-monitor/discussions).
  
- 🐛 **Bugs:** Open an [Issue](https://github.com/The-BigMan-tech/fn-monitor/issues).

*Note: This is an open-source project maintained in my free time. I will do my best to respond, but please allow a few days for a reply. Before opening a new thread, please check existing Discussions and Issues!*

---


## Contributing 🤝

Pull requests are welcome! Before opening one, please read the [maintainer's note](https://github.com/The-BigMan-tech/fn-monitor/blob/master/src/index.ts) at the top of `src/index.ts`. It outlines critical architectural invariants that all contributions must preserve.

---


## Brand & Forking Guidelines 🛡️

This project actively encourages community forks, variations, and modifications! To prevent user confusion and maintain project clarity, you are requested to follow these simple guidelines if you publish a variation:

* **Naming:** Please publish your version under your own npm scope or use a distinct name (e.g., `@your-scope/fn-monitor-extended`).
  
* **Branding:** Please remove or replace the official project logo in your documentation so users know they are interacting with a custom variation.
  
* **License:** The source code remains open under the MIT license, but the project name and logo are reserved for the official release.

---


## Inspiration 🎯

I built this package because I needed a reliable way to throw an error if an arbitrary function uses loops at runtime. My goal wasn't just to prevent a function from hanging the main thread—I needed to literally ban the presence of loops in the code itself. 

Existing solutions could only enforce this at build time. I later grew `fn-monitor` into a general-purpose tool for runtime AST control, far beyond that original use case.

---


## Acknowledgements 🙏

The core execution engine of this project is a modified and extended version of [sval](https://github.com/Siubaak/sval), a JavaScript interpreter written in JavaScript, originally authored by Siubaak. 

*Please note: This project is an independent extension and is not affiliated with, endorsed by, or sponsored by the original `sval` project or its authors. `sval` is licensed under the MIT License.*