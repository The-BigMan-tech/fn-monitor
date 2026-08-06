# @typescript-guy/fn-monitor

<p align="center">
    <img 
      src="./logo.svg" 
      width="120" 
      alt="fn-monitor logo featuring 'fn' with a cyan terminal cursor"
    />
</p>

<p align="center">
    <a href="https://www.npmjs.com/package/@typescript-guy/fn-monitor">
        <img src="https://img.shields.io/npm/v/@typescript-guy%2Ffn-monitor" alt="npm version" />
    </a>
    <a href="https://github.com/The-BigMan-tech/fn-monitor/blob/master/LICENSE.md">
        <img src="https://img.shields.io/npm/l/@typescript-guy%2Ffn-monitor" alt="license" />
    </a>
</p>

`@typescript-guy/fn-monitor` is an augmentation of the `sval` JS-in-JS interpreter designed to monitor functions as they execute. It allows developers to deeply inspect, debug, and control JavaScript functions at runtime by injecting hooks at any part of their lifecycle, effectively turning them into white-boxes.


## Installation

```bash
npm install @typescript-guy/fn-monitor
```

> 📌 **If you are integrating this package for production:** Please review the [Important Notes & Limitations](#important-notes--limitations) section to understand key behavioral nuances such as AST mutation persistence and dynamic imports.

---


## API Introduction

The core of the package is the `monitor` function. It accepts a configuration object (`MonitorFnSetup`) and returns a new function with an identical call signature to the original, but it is executed by a custom interpreter rather than your JS engine. 


## Quick Examples

### Showcase 1: Basic Usage & AST Inspection
This example demonstrates how to get started, capture external variables, and use the `inspector` hook to intercept and modify AST nodes during execution.

```typescript
import { monitor } from "@typescript-guy/fn-monitor";

console.log('\n\nSHOWCASE 1\n');

const zero = 0;

const sumUp = (nums:number[])=> {
    let sum:number = zero;
    for (const num of nums) {
        sum += num
    }
    return sum;
}
const monitoredSumUp = monitor({
    main:{
        ref:sumUp,
        captures:{
             //since 'zero' is used by sumUp and is outside its scope,we capture it into the interpreter's context
            zero
        } 
    },
    beforeEachCall:(nums)=>{
        console.log('Entered the monitored sum up function with the nums: ',nums);
    },
    inspector:(visit) => {
        visit.is('AssignmentExpression',event => {
            event.node.operator = "-=";//silently change the operator
            console.log('assignment result',visit.execute());
        })
        visit.is('ReturnStatement',event=>{
            const result = visit.execute();
            const finalSum = event.scope.variables.search('sum');

            console.log('final sum: ',finalSum,'Is result:',finalSum===result.RES);
            result.RES = 'I CHANGED THE VALUE';
        })
    },
    afterEachCall:(result)=>{
        console.log('result of the monitored function: ',result);
    }
});

const arrToSum = [1,2,3,4,5,6,7,8,9,10];

const result1 = sumUp(arrToSum)
console.log('Result 1',result1);

const result2 = monitoredSumUp(arrToSum)//the exact same call signature
console.log('Result 2',result2);
```

**Output:**
```text
SHOWCASE 1

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

### Showcase 2: Embedding External Functions
This example focuses on embedding external functions that are called in the monitored function and how they are different from captured ones.

It also demonstrates how to extract the generated code used in the interpreter using `sourceOut`. 


```typescript
import { monitor } from "@typescript-guy/fn-monitor";

console.log('\n\nSHOWCASE 2\n');

const Printed = 'Printed: ';

function print(str:string) {
    console.log(Printed,str);
}
function printName(name:string) {
    console.log('Hello ',name);
}

function sayHello(name:string) {
    print('Hello world')
    printName(name)
}

const generatedCode = {value:''}

const monitoredSayHello = monitor({
    main:{
        ref:sayHello,
        captures:{
            //since this function is captured directly,it will run in your js engine when called.
            printName
        }
    },

    //'embed' is an object that maps a name to a function's reference and captured variables.

    // It tells the interpreter to directly include each of their source code in the same context which allows us to also monitor it when it is called by our main function.But we will not use the inspector hook here to keep it simple.

    embed:{
        print:{
            ref:print,
            //It can also state its own captures.
            //If we want,we could embed more functions and have the embedded print function call that.But lets keep things simple.
            captures:{
                Printed
            }
        }
    },
    sourceOut:generatedCode
})

monitoredSayHello('person');
console.log('\nGenerated code: \n',generatedCode.value);

```

**Output:**
```text
SHOWCASE 2

Printed:  Hello world
Hello  person

Generated code: 
 'use strict'

const sayHello = (() => {

    const {
        printName
    } = exports.generated_0249747779b91d28bdf9a5b9a54b1a4b77419d023e5a8fcb9c0998ceedab858e;

    const intermediateFn_generated_785f6d12aca06b1fbcacb04fbde1d2c3a721a2f45e737bd2c6e8bc9c1f4fff6d =
        function sayHello(name) {
            print('Hello world');
            printName(name);
        };
    return intermediateFn_generated_785f6d12aca06b1fbcacb04fbde1d2c3a721a2f45e737bd2c6e8bc9c1f4fff6d;
})();

var print;
print = (() => {

    const print = (() => {

        const {
            Printed
        } = exports.generated_611bd43541d359f16acc4603b22fa7b216bf07433ea52afa710ed34bea12a6a7;

        const intermediateFn_generated_bd04ecec97eacf8f3168937c0f0b67b96bc144540b9c918765cf4237dc2bbfee =
            function print(str) {
                console.log(Printed, str);
            };
        return intermediateFn_generated_bd04ecec97eacf8f3168937c0f0b67b96bc144540b9c918765cf4237dc2bbfee;
    })();
    return print;
})();;

//This is the code that is ran each time the monitored function is called and the result is returned through the exports variable.

exports.generated_f6a214f7a5fcda0c2cee9660b7fc29f5649e3c68aad48e20e950137c98913a68 = sayHello(...generated_090772cf4068973daad3f715eb788d39fe2c02be42efd86de81f0e59198d6237);

```

### Showcase 3: Async Execution & The Execution Stack
This example tests the execution stack (`localExeStack`) to track all called functions during execution, specifically testing on async code to see its full capability.

```typescript
import { type InspectorGenerator, monitor } from "@typescript-guy/fn-monitor";

console.log('\n\nSHOWCASE 3\n');

const monitoredAsyncSqrt = monitor({
    main:{
        ref:async (a: number)=>{
            const sqrtFn = Math.sqrt;
            const sqrtResult = sqrtFn(a);
            const rounded = Number(sqrtResult.toFixed(3))
            return await Promise.resolve(rounded);
        }
    },
    inspector:function* (visit):InspectorGenerator {
        visit.is('CallExpression',()=>{
            const stackLenAtCallee = visit.localExeStack().length;
            const callees = new Set()

            //by setting perExecution here,we guarantee that the hook will only fire from this particular CallExpr node going forward.
            
            //After the interpreter has branched to other nodes while evaluating this one,it will terminate the hook once it has arrived back to this specific CallExpr node.This makes the hook short-lived and focused
            
            visit.perExecution = ()=>{
                const stack = visit.localExeStack();//we dont consume the whole thing into an array to save performance

                //in the stack,the latest values stay at the head/left end and the oldest stay at the tail/right end.The callee node will stay at the tail as each execution inserts a new result to the stack
                const element = stack.get(-(stackLenAtCallee + 1));
                const evaluation = element.evaluation;
                const isFunction = typeof evaluation === 'function';

                if (isFunction && !callees.has(element)) {
                    console.log('Callee:',evaluation);
                    callees.add(element);
                    return
                }
            }
        });
        
        const result = yield visit.execute();//we yield outside visit.is queries
        visit.is('AwaitExpression',()=>{
            console.log('Awaited result: ',result);
        })
    },
});

console.log('Monitored async sqrt: ',await monitoredAsyncSqrt(2)); 
```

**Output:**
```text
SHOWCASE 3

Callee: [Function: sqrt]
Callee: [Function: Number]
Callee: [Function: Promise]
Awaited result:  1.414
Monitored async sqrt:  1.414
```

### Showcase 4: Execution History
This example will focus on getting the full execution history of a fn call

```typescript
import { type ExeResult, monitor } from "@typescript-guy/fn-monitor";

console.log('\n\nSHOWCASE 4\n');

const exeHistory:ExeResult[] = [];

const fn = monitor({
    main:{
        ref:(a:number,b:number)=>{
            const result = (a + b) * (a - b);
            return result;
        }
    },
    inspector:(visit)=>{
        visit.is('Any',()=>undefined);//force the interprter to allocate all the scopes

        //Wrapping our exe history logic under perExecution is important to 
        //ensure that we are only querying the stack when the executed results of 
        // the node have actually been inserted

        visit.perExecution = ()=>{
            const head = visit.localExeStack().get(0)
            exeHistory.push(head);
        }
    }
})
fn(2,3);
console.log('Execution history:\n',exeHistory);
```

**Output:**
```text
SHOWCASE 4

Execution history:
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

### Showcase 5: High-Performance Timeouts
This example uses the `onStep` hook to implement a live timeout on a function, halting it if it attempts to hang the main thread.

```typescript
import { monitor } from "@typescript-guy/fn-monitor";

console.log('\n\nSHOWCASE 5\n');

function calculateAverage(numbers: number[],caller:'monitor' | 'js'): number {
    if (caller === "monitor") {
        //simulate an infinite loop.calling this natively in js will hang the main thread.but our monitored function setup should halt it and throw an error.
        while (true) {}
    }
    if (!numbers || numbers.length === 0) {
        return 0;
    }
    let sum = 0;
    for (let i = 0; i < numbers.length; i++) {
        sum += numbers[i];
    }
    return Number((sum / numbers.length).toFixed(3));
}

const listForAvg = [20,30,70,88,91,72]

const avg = calculateAverage(listForAvg,'js');
console.log('\nThe average is: ',avg);


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
            // Binary bitmask check: Only execute the inner code once every 1024 steps since perf.now is heavy
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
    console.log(`Finished building the fn in ${(performance.now()-fnBuildStart).toFixed(3)}ms`);
    return monitoredFn
};

const timedAvg = timeFn(calculateAverage,50);
const avg2 = timedAvg(listForAvg,'monitor');

console.log('\nThe average from the timed fn is: ',avg2);
```

**Output:**
```text
SHOWCASE 5

The average is:  61.833
Finished building the fn in 1.736ms
Error: The monitored function used 50.521ms when only given a budget of 50.000ms.
....
```

---


## Full API Reference

### Core Functions

#### `monitor<T>(setup: MonitorFnSetup<T>)`
The main export. Accepts a configuration object and returns a new function with an identical call signature to the original, but executed by the custom interpreter.

#### `MonitorFnSetup<T>`
| Property | Type | Description |
| --- | --- | --- |
| `main` | `Metadata<T>` | **Required.** The configuration for the main function to monitor. |
| `embed` | `Record<string, Metadata<Fn>>` | Alternative to capturing. Directly includes a function's source code in the interpreter context so it can also be monitored. |
| `inspector` | `Inspector` | The main hook fed the interpreter's context (`visit` object). Can be a regular function or a generator. *(See note below)*. |
| `onStep` | `OnStep` | Lightweight hook called before each interpreted step. Does not receive the `visit` object, making it significantly faster than `inspector`. |
| `sourceOut` | `{ value: string }` | Overwrites the `value` property with the generated code used in the interpreter. |
| `beforeEachCall` | `(...args) => void` | Hook called before each execution with the passed arguments. |
| `afterEachCall` | `(result \| Error) => void` | Hook called after each execution with the result or thrown error. |

> 💡 **Inspector Type Clarification:** You do **not** need to use a generator inspector for async functions or a normal function inspector for sync code. Any type works for any function. The only difference is how you handle `visit.execute()` on async nodes (generators can `yield` the `LAZY_NODE` symbol to await the result).

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
| `localExeStack()` | Returns a readonly stack (deque) of the latest evaluated child node results. |

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


## Mechanics

- **Interpreter Isolation:** Each monitored function is assigned its own dedicated interpreter instance. While this incurs a slight memory overhead, it strictly prevents state collision between executions.
  
- **Single Parse:** A monitored function is parsed into an AST only once. The resulting nodes are reused across all calls to maximize execution speed.
  
- **Reusables Architecture:** To share interpretation context with the inspector hook performantly, the implementation leverages internal reusable objects, preventing the allocation of intermediate objects mid-evaluation. The async evaluator safely copies and restores these objects across event loop pauses.
  
- **Strict Mode Enforcement:** All generated wrapper code is executed in strict mode.
  
- **Scope Allocation & Safety:** Unlike AST nodes (which are parsed once and reused), the scope objects exposed to the inspector are always freshly allocated for each event. This prevents accidental mutations of the interpreter's internal state.

---


## Important Notes & Limitations

Please keep the following architectural constraints in mind when using this package:

1. **ES2024 Support:** The interpreter supports JavaScript syntax up to the ES2024 specification.

2. **Zero-Dependency Runtime:** This is a pure JavaScript AST-walking engine. It does not rely on native binaries or environment-specific APIs and its only dependencies run in pure js.
    
3. **Native Generator Functions (`function*`):** Deep, step-by-step monitoring of native generators is **not supported**. Because calling a native generator immediately returns an Iterator object without executing the body, the interpreter cannot intercept the subsequent `.next()` calls driven by the JS engine.

4. **AST Mutation Persistence:** Because the code is parsed into an AST only once, any mutations made to an AST node within the inspector hook will persist and affect all subsequent calls to that function.

5. **Performance Critical:** The monitor() function incurs overhead from AST parsing and interpreter instantiation. Always call monitor() once outside of hot loops, and execute the returned function inside your loops or handlers. (Optimization: The package automatically caches the parsed AST based on the generated source code, reusing it for identical functions to minimize redundant parsing overhead.)

6. **Dynamic Imports:** The interpreter intentionally blocks dynamic `import()` calls within monitored functions. You must lift your imports to the native scope and pass the resolved modules via the `captures` property.
   
7. **Wrapper Constraints:** You cannot double-wrap a function via the `ref` property (a monitored function cannot be passed as `ref` to another `monitor`). However, you *can* include an already-monitored function within the `captures` object, as it will execute natively.

8. **Debugging & Stack Traces:** Errors thrown inside monitored functions will not map directly to their original source locations in your editor. Debug functions in their unmonitored state first. (Note: The `inspector` hook itself runs in the native JS runtime and will display a standard stack trace if it throws).

9.  **Execution Control & Isolation:** This package is not designed to act as a strict, secure sandbox out-of-the-box. However, you can simulate strict execution boundaries by actively monitoring and intercepting execution via the `inspector` and `onStep` hooks.

---


## Questions & Support

Want to play around with the package? Check out the [`examples`](https://github.com/The-BigMan-tech/fn-monitor/tree/master/examples) folder in the repository. *(Note: If you copy the examples, change the import from `'../src/index.ts'` to `'@typescript-guy/fn-monitor'`)*.

- 💬 **Questions & Help:** Open a [GitHub Discussion](https://github.com/The-BigMan-tech/fn-monitor/discussions).
- 🐛 **Bugs & Features:** Open an [Issue](https://github.com/The-BigMan-tech/fn-monitor/issues).

*Note: This is an open-source project maintained in my free time. I will do my best to respond, but please allow a few days for a reply. Before opening a new thread, please check existing Discussions and Issues!*

---


## Acknowledgements

The core execution engine of this project is a modified and extended version of [`sval`](https://github.com/Siubaak/sval), a JavaScript interpreter written in JavaScript, originally authored by Siubaak. 

*Please note: This project is an independent extension and is not affiliated with, endorsed by, or sponsored by the original `sval` project or its authors. `sval` is licensed under the MIT License.*