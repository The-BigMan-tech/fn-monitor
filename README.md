# @typescript-guy/fn-monitor

![npm](https://img.shields.io/npm/v/@typescript-guy%2Ffn-monitor)
![license](https://img.shields.io/npm/l/@typescript-guy%2Ffn-monitor)

`@typescript-guy/fn-monitor` is an augmentation of the `sval` JS-in-JS interpreter designed to monitor functions as they execute. It allows developers to inspect, debug, or sandbox JavaScript functions at runtime by injecting hooks at any part of a function's lifecycle, effectively turning your functions into white-boxes.


## Installation

```bash
npm install @typescript-guy/fn-monitor
```

## API Introduction

The core of the package is the `monitor` function. It accepts a configuration object (`MonitorFnSetup`) and returns a new function that behaves exactly like the original, but is executed by a custom interpreter rather than your JS engine directly. 

Because your hooks are treated as first-class citizens by the interpreter, you can inject lifecycle hooks (`beforeEachCall`, `afterEachCall`), a lightweight step hook (`onStep`), or a deep AST inspector (`inspector`) to observe, modify, and manually execute nodes in real-time.

## Quick Examples

### Showcase 1: Basic Usage & AST Inspection
This example demonstrates how to get started, capture external variables, and use the `inspector` hook to intercept and modify AST nodes during execution.

```typescript
import { type InspectorGenerator, monitor } from "@typescript-guy/fn-monitor";

//This shows how to get started and a general use case
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
            zero//since zero is used by sumUp and is outside its scope,we capture it into the interpreter's context
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
result of the monitored function:  I CHANGED THE VALUE
Result 2 I CHANGED THE VALUE
```

### Showcase 2: Embedding External Functions
This example focuses on embedding external functions used in the monitored function. It also demonstrates how to extract the generated code using `sourceOut`.

```typescript
import { type InspectorGenerator, monitor } from "@typescript-guy/fn-monitor";

//This example will focus on embedding external functions used in the monitored function.This example will not integrate the inspector hook to keep it simple
console.log('\n\nSHOWCASE 2');

const Printed = 'Printed: ';

function print(str:string) {
    console.log(Printed,str);
}
function sayHello() {
    print('Hello world')
};

const generatedCode = {value:''};

const monitoredSayHello = monitor({
    main:{
        ref:sayHello
    },
    embed:{
        print:{//the object that maps the function name to the reference
            ref:print,
            captures:{//it can also state its own captures.and if we want,we could embed more functions and have the embedded print function call that.But lets keep things simple
                Printed
            }
        }
    },
    sourceOut:generatedCode
});

monitoredSayHello();
console.log('Generated code: \n',generatedCode.value);
```

**Output:**
```text
SHOWCASE 2
Printed:  Hello world
Generated code: 
 const sayHello = (() => {
    const intermediateFn_generated_e5cfb848025ac6e4e2479f115f4e10c3d31fe67ef652c478bd92b7d844c05601 = (() => {
        function sayHello() {
            print('Hello world');
        };
        return sayHello
    })();
    return intermediateFn_generated_e5cfb848025ac6e4e2479f115f4e10c3d31fe67ef652c478bd92b7d844c05601;
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
    return print
})();;
//This is the code that is ran each time the monitored function is called and the result is returned through the exports variable.
exports.generated_f6a214f7a5fcda0c2cee9660b7fc29f5649e3c68aad48e20e950137c98913a68 = sayHello(...generated_090772cf4068973daad3f715eb788d39fe2c02be42efd86de81f0e59198d6237);
```

### Showcase 3: Async Execution & The Execution Stack
This example tests the execution stack (`localExeStack`) and the `execute` method to track all called functions during execution, specifically testing on async code to see its full capability.

```typescript
import { type InspectorGenerator, monitor } from "@typescript-guy/fn-monitor";

//Testing the exe stack and the execute method to get all the called functions during the function execution.We are testing this on async code to see the full capability
console.log('\n\nSHOWCASE 3');

const monitoredAsyncSqrt = monitor({
    main:{
        ref:async (a: number)=>{
            const sqrt = Math.sqrt(a);
            const rounded = Number(sqrt.toFixed(3))
            return await Promise.resolve(rounded);
        }
    },
    inspector:function* (visit):InspectorGenerator {
        visit.is('CallExpression',()=>{
            const stackLenAtCallee = visit.localExeStack().length;
            const callees = new Set()
            visit.perExecution = ()=>{
                const stack = visit.localExeStack();//we dont consume the whole thing into an array to save performance
                const element = stack.get(-(stackLenAtCallee + 1));//in the stack,the latest values stay at the front and the oldest stay at the back.The callee node will stay at the back as each execution inserts a new result to the stack
                if (!callees.has(element)) {
                    console.log('Callee:',element);
                    callees.add(element);
                    return
                }
            }
        });
        visit.is('ReturnStatement',()=>{
            visit.perExecution = ()=>{
                const stack = visit.localExeStack()
                console.log('seen awaited result: ',stack.get(0).evaluation);
            }
        })
        yield visit.execute();//for async functions,we want to yield the execution to pause the inspector till it fully executes.but since we cant yield in the 'is' method,we do it outside.We must set our perExe hook before calling visit.execute for the hook to fire.which is why this is at the bottom
    },
});
console.log('Monitored async sqrt: ',await monitoredAsyncSqrt(2)); 
```

**Output:**
```text
SHOWCASE 3
Callee: {
  evaluation: Object [Math] {},
  type: 'Identifier',
  node: {
    type: 'Identifier',
    name: 'Math',
    start: 178,
    end: 182,
    range: [ 178, 182 ],
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
    start: 214,
    end: 220,
    range: [ 214, 220 ],
    loc: { start: [Object], end: [Object] }
  },
  scope: Symbol(NOT_ALLOCATED)
}
Callee: {
  evaluation: 1.4142135623730951,
  type: 'Identifier',
  node: {
    type: 'Identifier',
    name: 'sqrt',
    start: 221,
    end: 225,
    range: [ 221, 225 ],
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
    start: 258,
    end: 265,
    range: [ 258, 265 ],
    loc: { start: [Object], end: [Object] }
  },
  scope: Symbol(NOT_ALLOCATED)
}
seen awaited result:  Promise { 1.414 }
seen awaited result:  { RES: 1.414 }
Monitored async sqrt:  1.414
```

### Showcase 4: High-Performance Timeouts
This example uses the `onStep` hook to implement a live timeout on a function, halting it if it attempts to hang the main thread.

```typescript
import { type InspectorGenerator, monitor } from "@typescript-guy/fn-monitor";

//Using the on step hook to implement a live timeout on a function to halt it if it attempts to hang the main thread.
console.log('\n\nSHOWCASE 4');

function calculateAverage(numbers: number[],caller:'monitor' | 'js'): number {
    if (caller === "monitor") {
        while (true) {}//simulate an infinite loop.calling this natively in js will hang the main thread.but our monitored function setup should halt it and throw an error.
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
            const shouldCheckBudget = (step & 1023) === 0;// Binary bitmask check: Only execute the inner code once every 1024 steps since perf.now is heavy
            if (shouldCheckBudget) checkBudget();
        },
        afterEachCall:(result)=>{
            if (!(result instanceof Error)) {//if the result is an error,we let the interpreter bubble it up
                checkBudget();//in case the function doesnt use up to the number of steps required to recheck the budget,we check the budget here to be accurate and safe
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
The monitored function used 61.844ms when only given a budget of 50.000ms.
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
| `is(query, callback)` | Registers a callback for specific AST node types. If matched, it allocates a scope and event object. |
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

#### `ScopeForEvent` & `VariableForEvent`
* **`ScopeForEvent`**: Contains `variables` (with a `search(name)` method and `local` record), `parent` scope, and `depth`.
* **`VariableForEvent`**: Contains a `value()` method to retrieve the variable's value.

### Utility Types & Classes

* **`QList<T>` / `ReadonlyQList<T>`**: Custom optimized dequeue with random array access. Used internally for the execution stack, but exposed for advanced type inference.
* **`Query`**: A string union of all possible ESTree node types you can query in `visit.is`, plus `'Any'`.
* **`EventMap`**: Maps each node query to its dedicated Event class for tailored intellisense.
* **Symbols**: `LAZY_NODE`, `NOT_ALLOCATED`, `UNASSIGNED`, `SEEN`.

### Event Classes
All events extend the base `LangEvent` class, which provides the `node` and `scope` properties. There are over 30 specific event classes, including:
`BinaryExprEvent`, `CallExprEvent`, `AssignmentExprEvent`, `UpdateExprEvent`, `LogicalExprEvent`, `MemberExprEvent`, `AwaitExprEvent`, `FuncExprEvent`, `ArrowFnExprEvent`, `TernaryExprEvent`, `NewExprEvent`, `YieldExprEvent`, `ReturnStmtEvent`, `IfStmtEvent`, `SwitchStmtEvent`, `ThrowStmtEvent`, `TryStmtEvent`, `CatchClauseEvent`, `VarDeclEvent`, `FuncDeclEvent`, `ForStmtEvent`, `WhileStmtEvent`, `DoWhileStmtEvent`, `ForOfStmtEvent`, `ForInStmtEvent`, `LabeledStmtEvent`, `BreakStmtEvent`, `ContinueStmtEvent`, `LiteralEvent`, `ExpressionStmtEvent`, `ArrayExprEvent`, `ObjectExprEvent`, `TemplateLiteralEvent`, `SequenceExprEvent`, `UnaryExprEvent`.

---

## How it Works

Under the hood, `@typescript-guy/fn-monitor` utilizes an **AST-walker interpreter** (rather than a bytecode implementation) to evaluate functions. 

* **Interpreter Isolation:** Each monitored function is assigned its own dedicated interpreter instance. While this incurs a slight memory overhead, it strictly prevents state collision between executions.
* **Reusables Architecture:** To share interpretation context with the inspector hook performantly, the implementation leverages internal "reusable" objects. This prevents the allocation of intermediate objects mid-evaluation. To handle complex async/await state transitions safely, it uses a "copy, then overwrite" pattern.
* **Single Parse:** A monitored function is parsed into an AST only once. The resulting nodes and scope objects are reused across all calls to maximize execution speed.

---

## Limitations & Important Notes

Please keep the following architectural constraints in mind when using this package:

1. **Debugging & Stack Traces:** Because monitored functions run in an isolated context, errors thrown within them will not map directly to their original source location in your editor. You should debug functions in their unmonitored state first. *(Note: The inspector hook itself runs in the native JS runtime, so it will still display a proper stack trace if the inspector throws an error).*
2. **AST Mutation Persistence:** Because the AST is parsed only once, **any mutations made to a node within the inspector will persist and reflect in all subsequent calls** to that function. 
3. **Sandboxing Context:** This monitor is not designed to act as a secure, impenetrable sandbox out-of-the-box. However, you can simulate a sandboxed environment by actively monitoring and intercepting nodes via the `inspector` and `onStep` hooks.
4. **Scope Limitations:** The monitor can accept any function except for another already monitored function.

---

## Questions & Support

If you want to play around with the package, there is an `examples` folder in the repository. *(Note: If you copy the examples, you will need to change the import from `'../index.ts'` to `'@typescript-guy/fn-monitor'`)*. 
🔗 **[View Examples](https://github.com/The-BigMan-tech/fn-monitor/tree/master/examples)**

If you have questions about how to use `@typescript-guy/fn-monitor`, need help with a specific implementation, or want to discuss architecture:
* **Open a [GitHub Discussion](https://github.com/The-BigMan-tech/fn-monitor/discussions)**: This is the best place for Q&A and community help.
* **Open an [Issue](https://github.com/The-BigMan-tech/fn-monitor/issues)**: If you've found a bug or want to request a new feature.

*Note: This is an open-source project maintained in my free time. I will do my best to respond, but please allow a few days for a reply. Before opening a new thread, please check existing Discussions and Issues to see if your question has already been answered!*

---

## Acknowledgements

The core execution engine of this project is a modified and extended version of [`sval`](https://github.com/Siubaak/sval), a JavaScript interpreter written in JavaScript, originally authored by Siubaak.

*Please note: This project is an independent extension and is not affiliated with, endorsed by, or sponsored by the original `sval` project or its authors.*

`sval` is licensed under the MIT License.