# @typescript-guy/fn-monitor

![npm](https://img.shields.io/npm/v/@typescript-guy%2Ffn-monitor)
![license](https://img.shields.io/npm/l/@typescript-guy%2Ffn-monitor)

An augmentation of the [`sval`](https://github.com/Siubaak/sval) JS-in-JS interpreter designed to monitor functions as they execute. 

This package allows developers to inspect, debug, or sandbox JavaScript functions at runtime by injecting hooks at any part of a function's lifecycle. It treats your hooks as first-class citizens within the interpreter, effectively turning your functions into white-boxes.

## Installation

```bash
npm install @typescript-guy/fn-monitor
```

## Quick Start

The core of the package is the `monitor` function. It accepts a configuration object and returns a new function that behaves exactly like the original, but is executed by the custom interpreter.

```typescript
import { monitor } from '@typescript-guy/fn-monitor';

function add(a: number, b: number) {
  return a + b;
}

// Create a monitored version of the function
const monitoredAdd = monitor({
  main: { ref: add },
  beforeEachCall: (a, b) => console.log(`Adding ${a} and ${b}`),
  afterEachCall: (result) => console.log(`Result: ${result}`),
});

monitoredAdd(2, 3); 
// Logs: Adding 2 and 3
// Logs: Result: 5
```

### Capturing External Variables
Because monitored functions run in an isolated interpreter context, external variables must be explicitly captured:

```typescript
const multiplier = 10;

const multiply = (x: number) => x * multiplier;

const monitoredMultiply = monitor({
  main: {
    ref: multiply,
    captures: { multiplier } // Map the variable name to its value
  }
});

monitoredMultiply(5); // Returns 50
```

## Advanced Usage

### Intercepting and Modifying the AST (Inspector Hook)
The `inspector` hook provides a rich `visit` object, allowing you to inspect nodes, modify them before execution, and manually execute nodes to observe or change their results.

```typescript
const monitoredSum = monitor({
  main: { ref: sumUp },
  inspector: (visit) => {
    // Intercept all assignment expressions
    visit.is('AssignmentExpression', (event) => {
      event.node.operator = "-="; // Silently change the operator
      console.log('Assignment result:', visit.execute());
    });

    // Intercept return statements
    visit.is('ReturnStatement', (event) => {
      const result = visit.execute();
      result.sum = 'INTERCEPTED'; // Modify the return value
    });
  }
});
```

### Execution Timeouts & Sandboxing (`onStep` Hook)
If you don't need deep AST inspection, use the lightweight `onStep` hook. It fires before each interpreted step without the overhead of allocating the `visit` object. This is perfect for implementing execution timeouts or simulating a sandbox.

```typescript
const timeoutTracker = { limitMs: 50, startTime: 0, stepCounter: 0 };

const safeFn = monitor({
  main: { ref: heavyComputation },
  beforeEachCall: () => {
    timeoutTracker.stepCounter = 0;
    timeoutTracker.startTime = performance.now();
  },
  onStep: () => {
    timeoutTracker.stepCounter++;
    // Bitmask check: Only evaluate time every 1024 steps for performance
    if ((timeoutTracker.stepCounter & 1023) === 0) {
      if (performance.now() - timeoutTracker.startTime > timeoutTracker.limitMs) {
        throw new Error('Max execution time exceeded!');
      }
    }
  }
});
```

### Embedding Functions & Extracting Source Code
You can embed external functions directly into the interpreter's context and extract the final generated code using `sourceOut`.

```typescript
const generatedCode = { value: '' };

const monitoredAsyncFn = monitor({
  main: { ref: async (a, b) => await log(a + b) },
  embed: {
    log: { ref: console.log } // Embed console.log into the interpreter context
  },
  sourceOut: generatedCode // Populates the generated code string
});

console.log(generatedCode.value); // Prints the interpreted JS code
```

---

## Full API Reference

### `monitor<T>(setup: MonitorFnSetup<T>)`
The main export. Returns the monitored function `T` augmented with an `alreadyMonitored: true` property.

#### `MonitorFnSetup` Configuration
| Property | Type | Description |
| :--- | :--- | :--- |
| `main` | `Metadata<T>` | **Required.** The main function to monitor and its captures. |
| `embed` | `Record<string, Metadata<Fn>>` | Alternative to capturing. Includes external functions' source code directly in the interpreter context. |
| `inspector` | `Inspector` | The main hook fed the interpreter's context (`visit` object) to inspect/modify nodes. |
| `onStep` | `OnStep` | Lightweight hook called before each step. No `visit` object. Much faster than `inspector`. |
| `sourceOut` | `{ value: string }` | Overwrites the `value` property with the generated code used in the interpreter. |
| `beforeEachCall` | `(...args) => void` | Hook called before each execution with the passed arguments. |
| `afterEachCall` | `(result \| Error) => void` | Hook called after each execution with the result or thrown error. |

#### `Metadata<T>`
| Property | Type | Description |
| :--- | :--- | :--- |
| `ref` | `T` | The reference to the function. |
| `captures` | `Record<string, any>` | Maps variable names to their outside-scope values. Follows copy-by-value/primitive and copy-by-reference/object semantics. |

### The `Visit` Object (Inspector Context)
Passed to the `inspector` hook. It is allocated once per monitored function (not per call) to save memory. **Must only be used strictly within the inspector hook.**

* **`visit.is(query, callback)`**: Registers a callback for specific AST node types (e.g., `'CallExpression'`, `'Any'`). If matched, it allocates a scope and event object.
* **`visit.execute()`**: Manually executes the current node and returns the result. For async nodes, it returns `LAZY_NODE` (requires the inspector to be a generator to `yield`).
* **`visit.localExeStack()`**: Returns a readonly stack of the latest evaluated child node results.
* **`visit.perExecution`**: A setter for a callback fired on each executed node. Short-lived; exists only for the current node and its children.

### Events and Queries
The `visit.is` method accepts a `Query` (any valid ESTree node type string, plus `'Any'`). The callback receives a specific `Event` object tailored to that node type (e.g., `CallExprEvent`, `BinaryExprEvent`), which contains:
* `node`: The AST node.
* `scope`: The safe scope object (`ScopeForEvent`), allowing you to search local variables and check scope depth.

### Utility Types
* **`QList<T>` / `ReadonlyQList<T>`**: Custom optimized dequeue with random array access. Used internally for the execution stack.
* **`Var`**: Represents a variable in the scope.
* **Symbols**: `NOT_ALLOCATED`, `LAZY_NODE`.
* **Events**: Over 30 specific event classes (e.g., `IfStmtEvent`, `ForStmtEvent`, `LiteralEvent`) extending the base `LangEvent`.

---

## How it Works (Architecture)

Under the hood, `@typescript-guy/fn-monitor` utilizes an **AST-walker interpreter** (rather than a bytecode implementation) to evaluate functions. 

* **Interpreter Isolation:** Each monitored function is assigned its own dedicated interpreter instance. While this incurs a slight memory overhead, it strictly prevents state collision between executions.
* **Reusables Architecture:** To share interpretation context with the inspector hook performantly, the implementation leverages internal "reusable" objects. This prevents the allocation of intermediate objects mid-evaluation. To handle complex async/await state transitions safely, it uses a "copy, then overwrite" pattern.
* **Single Parse:** A monitored function is parsed into an AST only once. The resulting nodes and scope objects are reused across all calls to maximize execution speed.

---

## Limitations & Important Notes

Please keep the following architectural constraints in mind when using this package:

1. **Debugging & Stack Traces:** Because monitored functions run in an isolated context, errors thrown within them will not map directly to their original source location in your editor. You should debug functions in their unmonitored state first. *(Note: The inspector hook itself runs in the native JS runtime, so it will still display a proper stack trace if the inspector throws an error).*
2. **AST Mutation Persistence:** Because the AST is parsed only once, **any mutations made to a node within the inspector will persist and reflect in all subsequent calls** to that function. 
3. **Sandboxing:** This monitor is not designed to act as a secure, impenetrable sandbox out-of-the-box. However, you can simulate a sandboxed environment by actively monitoring and intercepting nodes via the `inspector` and `onStep` hooks.
4. **Scope Limitations:** Do not attempt to expand this into a script-level or module-level monitor. The package is strictly designed around hidden function-context assumptions.

---

## Acknowledgements

The core execution engine of this project is a modified and extended version of [`sval`](https://github.com/Siubaak/sval), a JavaScript interpreter written in JavaScript, originally authored by Siubaak.

*Please note: This project is an independent extension and is not affiliated with, endorsed by, or sponsored by the original `sval` project or its authors.*

`sval` is licensed under the MIT License.

## Questions & Support

If you have questions about how to use `@typescript-guy/fn-monitor`, need help with a specific implementation, or want to discuss architecture:
* **Open a [GitHub Discussion](https://github.com/The-BigMan-tech/fn-monitor/discussions)**: This is the best place for Q&A and community help.
* **Open an [Issue](https://github.com/The-BigMan-tech/fn-monitor/issues)**: If you've found a bug or want to request a new feature.

*Note: This is an open-source project maintained in my free time. I will do my best to respond, but please allow a few days for a reply. Before opening a new thread, please check existing Discussions and Issues to see if your question has already been answered!*