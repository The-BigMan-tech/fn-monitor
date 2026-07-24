# @typescript-guy/fn-monitor

![npm](https://img.shields.io/npm/v/@typescript-guy%2Ffn-monitor)
![license](https://img.shields.io/npm/l/@typescript-guy%2Ffn-monitor)

`@typescript-guy/fn-monitor` is an augmentation of the `sval` JS-in-JS interpreter designed to monitor functions as they execute. It allows developers to deeply inspect, debug, and control JavaScript functions at runtime by injecting hooks at any part of their lifecycle, effectively turning them into white-boxes.


## Installation

```bash
npm install @typescript-guy/fn-monitor
```


## API Introduction

The core of the package is the `monitor` function. It accepts a configuration object (`MonitorFnSetup`) and returns a new function with an identical call signature to the original, but it is executed by a custom interpreter rather than your JS engine. 

> 📌 Before integrating this package, please review the [Important Notes & Limitations](#important-notes--limitations) section to understand key behavioral nuances such as AST mutation persistence and dynamic imports



## Quick Examples

### Showcase 1: Basic Usage & AST Inspection
This example demonstrates how to get started, capture external variables, and use the `inspector` hook to intercept and modify AST nodes during execution.

```typescript
import { monitor } from "@typescript-guy/fn-monitor";

console.log('\n\nSHOWCASE 1');

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

console.log('\n\nSHOWCASE 2');

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
 const sayHello = (() => {

    const {
        printName
    } = exports.generated_2d9457560f1192de6a8da998971a4cfc3c773887307d984c32cb5701ca397688;

    const intermediateFn_generated_785f6d12aca06b1fbcacb04fbde1d2c3a721a2f45e737bd2c6e8bc9c1f4fff6d = (() => {
        function sayHello(name) {
            print('Hello world');
            printName(name);
        };
        return sayHello
    })();
    return intermediateFn_generated_785f6d12aca06b1fbcacb04fbde1d2c3a721a2f45e737bd2c6e8bc9c1f4fff6d;
})();
var print;
print = (() => {

    const print = (() => {

        const {
            Printed
        } = exports.generated_fb3b5ed8b028f3b1a1075a448cde71ecb3b8e731a2493d3f9880e5d6c4b4ee20;

        const intermediateFn_generated_bd04ecec97eacf8f3168937c0f0b67b96bc144540b9c918765cf4237dc2bbfee = (() => {
            function print(str) {
                console.log(Printed, str);
            };
            return print
        })();
        return intermediateFn_generated_bd04ecec97eacf8f3168937c0f0b67b96bc144540b9c918765cf4237dc2bbfee;
    })();
    return print;
})();;

//This is the code that is ran each time the monitored function is called and the result is returned through the exports variable.

exports.generated_f6a214f7a5fcda0c2cee9660b7fc29f5649e3c68aad48e20e950137c98913a68 = sayHello(...generated_090772cf4068973daad3f715eb788d39fe2c02be42efd86de81f0e59198d6237);

```

### Showcase 3: Async Execution & The Execution Stack
This example tests the execution stack (`localExeStack`) and the `execute` method to track all called functions during execution, specifically testing on async code to see its full capability.

```typescript
import { type InspectorGenerator, monitor } from "@typescript-guy/fn-monitor";

console.log('\n\nSHOWCASE 3');

const monitoredAsyncSqrt = monitor({
    main:{
        ref:async (a: number)=>{
            const sqrtFn = Math.sqrt;
            const sqrt = sqrtFn(a);
            const rounded = Number(sqrt.toFixed(3))
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

                //in the stack, the latest values stay at the head/left end and the oldest stay at the tail/right end.The callee node will stay at the tail as each execution inserts a new result to the stack
                const element = stack.get(-(stackLenAtCallee + 1));
                const isFunction = typeof element.evaluation === 'function';

                if (isFunction && !callees.has(element)) {
                    console.log('Callee:',element);
                    callees.add(element);
                    return
                }
            }
        });
        visit.is('ReturnStatement',()=>{
            visit.perExecution = ()=>{
                const stack = visit.localExeStack()
                console.log('node evaluated during return: ',stack.get(0).evaluation);
            }
        })
        //for async functions,we want to yield the execution to pause the inspector till it fully executes.but since we cant yield in the 'is' method,we do it outside.We must set our perExe hook before calling visit.execute for the hook to fire.which is why this is at the bottom
        yield visit.execute();
    },
});

console.log('Monitored async sqrt: ',await monitoredAsyncSqrt(2)); 
```

**Output:**
```text
SHOWCASE 3

Callee: {
  evaluation: [Function: sqrt],
  type: 'Identifier',
  node: {
    type: 'Identifier',
    name: 'sqrtFn',
    start: 210,
    end: 216,
    range: [ 210, 216 ],
    loc: { start: [Object], end: [Object] }
  },
  scope: Symbol(NOT_ALLOCATED)
}
Callee: {
  evaluation: [Function: Number],
  type: 'Identifier',
  node: {
    type: 'Identifier',
    name: 'Number',
    start: 243,
    end: 249,
    range: [ 243, 249 ],
    loc: { start: [Object], end: [Object] }
  },
  scope: Symbol(NOT_ALLOCATED)
}
Callee: {
  evaluation: [Function: Promise],
  type: 'Identifier',
  node: {
    type: 'Identifier',
    name: 'Promise',
    start: 287,
    end: 294,
    range: [ 287, 294 ],
    loc: { start: [Object], end: [Object] }
  },
  scope: Symbol(NOT_ALLOCATED)
}
node evaluated during return:  Promise { 1.414 }
node evaluated during return:  { RES: 1.414 }
Monitored async sqrt:  1.414
```

### Showcase 4: High-Performance Timeouts
This example uses the `onStep` hook to implement a live timeout on a function, halting it if it attempts to hang the main thread.

```typescript
import { monitor } from "@typescript-guy/fn-monitor";

console.log('\n\nSHOWCASE 4');

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
SHOWCASE 4

The average is:  61.833
Finished building the fn in 3.393ms
Error: 
Error in Monitored Function:
The monitored function used 50.580ms when only given a budget of 50.000ms.
....
```

---


## Full API Reference

### Core Functions & Interfaces

#### `monitor<T>(setup: MonitorFnSetup<T>)`
The main export. Accepts a configuration object and returns a new function that can be called exactly as the original, but is executed by the custom interpreter. The returned function is augmented with an `alreadyMonitored: true` property.

#### `MonitorFnSetup<T>`
| Property | Type | Description |
| :--- | :--- | :--- |
| `main` | `Metadata<T>` | **Required.** The configuration for the main function to monitor. |
| `embed` | `Record<string, Metadata<Fn>>` | Alternative to capturing. Directly includes a function's source code in the same interpreter context. |
| `inspector` | `Inspector` | The main hook fed the interpreter's context (`visit` object) to inspect, modify, and manually execute nodes. |
| `onStep` | `OnStep` | Lightweight hook called before each interpreted step. Does not get the rich `visit` object, making it significantly faster. |
| `sourceOut` | `{ value: string }` | Overwrites the `value` property with the generated code used in the interpreter. |
| `beforeEachCall` | `(...args) => void` | Hook called before each execution with the passed arguments. |
| `afterEachCall` | `(result \| Error) => void` | Hook called after each execution with the result or thrown error. |

#### `Metadata<T>`
| Property | Type | Description |
| :--- | :--- | :--- |
| `ref` | `T` | The reference to the function to be included in the interpreter context. |
| `captures` | `Record<string, any>` | Maps variable names to their outside-scope values. Follows copy-by-value (primitives) and copy-by-reference (objects) semantics. |


### The Inspector Context

#### `Visit`
The rich object that gives inspectors their ability to participate in the interpretation. Every monitored function has exactly one `visit` object allocated to save memory. **It must be used strictly within the `inspector` hook.**

| Method/Property | Description |
| :--- | :--- |
| `is(query, callback)` | Registers a callback for specific AST node types. If matched, it allocates a scope, wraps it together with the respective node in an event object, and fires the callback with it. |
| `set perExecution(fn)` | A setter for a callback fired on each executed node. Short-lived; exists only for the current node and its children. |
| `execute()` | Manually executes the current node and returns the result. For async nodes, returns `LAZY_NODE` (requires `yield`). |
| `localExeStack()` | Returns a readonly stack of the latest evaluated child node results. |

#### `ExeResult`
| Property | Type | Description |
| :--- | :--- | :--- |
| `evaluation` | `unknown` | The result of the node's evaluation. |
| `type` | `EsNode['type']` | The type of the node. |
| `node` | `EsNode` | The AST node itself. |
| `scope` | `ScopeForEvent \| typeof NOT_ALLOCATED` | The safe scope created for the caller. |

#### `ScopeForEvent`
* **`ScopeForEvent`**: A freshly allocated, read-only snapshot of the scope. `variables.local` and `variables.search(name)` return the raw values directly (no wrappers), and `depth` is strictly 0-indexed. It starts from the wrapped function's root.



### Utility Types & Classes

* **`QList<T>` / `ReadonlyQList<T>`**: Custom optimized dequeue with random array access. Used internally for the execution stack, but the types are exposed for advanced type inference.
  
* **`Query`**: A string union of all possible EsNode types you can query in a `visit.is` query. It also includes `'Any'` , which matches all nodes and node types that did not get their own explicit classes.
  
* **`EventMap`**: Maps each node query to its dedicated Event class for tailored intellisense.
  
* **Symbols**: 
    - `LAZY_NODE` is returned when you call visit.execute on an async node like an await call.
  
    - `NOT_ALLOCATED` is used to mark scopes that were not allocated when their respective nodes were visited. The interpreter only allocates scopes that match a visit.is() query.You can use visit.is('Any',...) to forcefully allocate scope objects for all nodes


### Event Classes
All events extend the base `LangEvent` class, which provides the `node` and `scope` properties. There are over 30 specific event classes, including:

`BinaryExprEvent`, `CallExprEvent`, `AssignmentExprEvent`, 

`UpdateExprEvent`, `LogicalExprEvent`, `MemberExprEvent`, 

`AwaitExprEvent`, `FuncExprEvent`, `ArrowFnExprEvent`, 

`TernaryExprEvent`, `NewExprEvent`, `YieldExprEvent`, 

`ReturnStmtEvent`, `IfStmtEvent`, `SwitchStmtEvent`, 

`ThrowStmtEvent`, `TryStmtEvent`, `CatchClauseEvent`, 

`VarDeclEvent`, `FuncDeclEvent`, `ForStmtEvent`, 

`WhileStmtEvent`, `DoWhileStmtEvent`, `ForOfStmtEvent`,

`ForInStmtEvent`, `LabeledStmtEvent`, `BreakStmtEvent`, 

`ContinueStmtEvent`, `LiteralEvent`, `ExpressionStmtEvent`, 

`ArrayExprEvent`, `ObjectExprEvent`, `TemplateLiteralEvent`, 

`SequenceExprEvent`, `UnaryExprEvent`.

---


## How it Works

Under the hood, this package utilizes an **AST-walker interpreter** (rather than a bytecode implementation) to evaluate functions. 

- **Interpreter Isolation:** Each monitored function is assigned its own dedicated interpreter instance. While this incurs a slight memory overhead, it strictly prevents state collision between executions.
  
- **Reusables Architecture:** 
    - To share interpretation context with the inspector hook performantly, the implementation leverages internal reusable objects. This prevents the allocation of intermediate objects mid-evaluation.
    
    - To safely handle complex async/await state transitions while sharing objects, the interpreter creates snapshots by copying them at certain points, and restores the original values once it finishes working with the overwritten state.
  
- **Single Parse:** A monitored function is parsed into an AST only once. The resulting nodes and scope objects are reused across all calls to maximize execution speed.

- **Scope Allocation & Safety:** While the interpreter heavily relies on reusable objects to maximize performance, the `scope` object provided to the inspector is a deliberate exception. Unlike AST nodes (which are parsed once and reused), the scope object is always freshly allocated for each event. This design choice guarantees predictability and prevents accidental mutations of the interpreter's internal state.

---


## Important Notes & Limitations

Please keep the following architectural constraints in mind when using this package:

- **ES2024 Support:** The interpreter supports JavaScript syntax up to the ES2024 specification.

- **Runtime-Agnostic Architecture:** The interpreter is built on a pure JavaScript AST-walking engine and was not designed to rely on any environment-specific APIs, binaries, or global objects (such as Node's `vm`/`fs` or the browser's `window`/`document`).

- **Debugging & Stack Traces:** Because monitored functions execute within an isolated interpreter context, errors thrown inside them will not map directly to their original source locations in your editor. It is highly recommended to debug functions in their unmonitored state first. *(Note: The inspector hook itself runs in the native JS runtime, so it will still display a standard stack trace if the inspector throws an error.)*

- **AST Mutation Persistence:** To maximize performance, the monitored function's code is parsed into an AST only once. Consequently, any mutations made to an AST node within the inspector hook will persist and affect all subsequent calls to that function.

- **Performance Critical:** The monitor() function performs heavy AST parsing and interpreter instantiation. Calling it inside a loop, request handler, or component render cycle will cause performance bottlenecks. **Always call `monitor()` outside of hot loops**, and execute the *returned* function in your loops or handlers.

- **Execution Control & Isolation:** This package is not designed to act as a strict, secure sandbox out-of-the-box. However, you can simulate strict execution boundaries by actively monitoring and intercepting nodes via the `inspector` and `onStep` hooks.

- **Wrapper Constraints:** The `monitor` function accepts any standard JavaScript function, but it **cannot** accept a function that has already been wrapped by `monitor` (i.e., you cannot double-wrap a function via the `ref` property). However, you **can** include an already-monitored function within the `captures` object. This is fully supported because captured functions execute in the native JavaScript runtime, completely outside the AST interpreter's context.

- **Dynamic Imports:** The interpreter intentionally blocks dynamic `import()` calls within monitored functions. You must lift your imports to the native scope and pass the resolved modules via the `captures` property. This design decision ensures that module resolution remains handled by your native JS engine, preserving the interpreter's isolation and preventing unexpected network or filesystem side-effects during execution.
  
---


## Questions & Support

If you want to play around with the package, there is an `examples` folder in the repository. *(Note: If you copy the examples, you will need to change the import from `'../src/index.ts'` to `'@typescript-guy/fn-monitor'`)*. 

🔗 **[View Examples](https://github.com/The-BigMan-tech/fn-monitor/tree/master/examples)**

If you have questions about how to use this package, need help with a specific implementation, or want to discuss architecture:
* **Open a [GitHub Discussion](https://github.com/The-BigMan-tech/fn-monitor/discussions)**: This is the best place for Q&A and community help.
  
* **Open an [Issue](https://github.com/The-BigMan-tech/fn-monitor/issues)**: If you've found a bug or want to request a new feature.

*Note: This is an open-source project maintained in my free time. I will do my best to respond, but please allow a few days for a reply. Before opening a new thread, please check existing Discussions and Issues to see if your question has already been answered!*

---


## Acknowledgements

The core execution engine of this project is a modified and extended version of [`sval`](https://github.com/Siubaak/sval), a JavaScript interpreter written in JavaScript, originally authored by Siubaak.

*Please note: This project is an independent extension and is not affiliated with, endorsed by, or sponsored by the original `sval` project or its authors.*

`sval` is licensed under the MIT License.