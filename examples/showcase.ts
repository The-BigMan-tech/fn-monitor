import { type InspectorGenerator, monitor } from "../src/index.ts";


//SHOWCASE 1
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

//SHOWCASE 2
//This example will focus on embedding external functions used in the monitored function.This example will not integrate the inspector hook to keep it simple

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

//SHOWCASE 3
//Testing the exe stack and the execute method to get all the callees during the function execution.
//We are testing this on async code to see the full capability

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

                //in the stack,the latest values stay at the head/left end and the oldest stay at the tail/right end.The callee node will stay at the tail as each execution inserts a new result to the stack
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

//SHOWCASE 4
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
}

const timedAvg = timeFn(calculateAverage,50);
const avg2 = timedAvg(listForAvg,'monitor');
console.log('\nThe average from the timed fn is: ',avg2);