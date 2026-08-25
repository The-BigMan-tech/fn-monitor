import { 
    monitor,
    type InspectorGenerator,
    type ExeResult
} from "../src/index.ts"

console.log('\nUsing the `inspector` hook to intercept and modify AST nodes during execution'.toUpperCase());

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


console.log('\nGetting the full execution history of a function call'.toUpperCase());

const exeHistory:ExeResult[] = [];

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


console.log('\nCapturing values and Embedding Functions'.toUpperCase());

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


console.log('\nScoping: Capturing vs Embedding'.toUpperCase());

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


console.log('\nSeeing the result of every awaited promise in a function call'.toUpperCase());

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


console.log('\nTracking all function calls during the execution of a function including methods'.toUpperCase());

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


console.log('\nUsing the `onStep` hook to implement a live timeout on a function, halting it if it attempts to hang the main thread.'.toUpperCase());

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
timedGetPrice()