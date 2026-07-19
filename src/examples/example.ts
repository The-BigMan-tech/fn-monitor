import { monitor,EsNode,InspectorGenerator } from "../index.ts";
import ansis from "ansis";

function perf(fn:(...args:any[])=>void) {
    const start = performance.now();
    fn();
    const end = performance.now();
    console.log(ansis.green(`\nFinished in ${end-start} milliseconds\n`));
}
function sayHello() {
    console.log('Hello function');
}


//NATIVE FUNCTION
const arrToSum = [1,2,3,4,5,6,7,8,9,10];

const sumUp = (nums:number[],sayHello:()=>void)=> {
    sayHello();
    let sum:number = 0;
    for (const num of nums) {
        sum += num
    }
    return {sum:sum};
}
perf(()=>{
    const result = sumUp(arrToSum,sayHello);
    console.log(result);
})

//MONITORED FUNCTION
let count = 0;
let otherNodes = 0;


perf(() => {
    const monitoredSumUp = monitor({
        main:{
            ref:sumUp, 
        },
        beforeEachCall:()=>{
            console.log('Entered the monitored sum up function');
        },
        inspector:(visit) => {
            let matched = false;

            visit.is('AssignmentExpression',event => {
                event.node.operator = "-=";//silently change the operator
                count += 1;
                console.log('Depth: ',event.scope.depth)
                console.log('assignment result',visit.execute());
                matched = true;
            })
            visit.is('ReturnStatement',event=>{
                const result = visit.execute();
                result.RES.sum = 'I CHANGED THE VALUE';
            })
            if (!matched) {
                visit.is('Any',event=>{
                    otherNodes += 1;
                })
            }
        },
    });
    const result = monitoredSumUp(arrToSum,sayHello);//because monitored fns are isolated,we can pass outside data as arguments
    console.log('Final Result:', result, 'Interceptions:', count,'Other nodes',otherNodes);
});

const random = Math.round(Math.random() * 100);
function sayHelloRandom() {
    console.log('Hello random number: ',random);
}

//CAPTURING
const addNums = (a:number,b:number):number =>{
    sayHelloRandom();
    return a + b;
}


perf(() => {
    const monitoredAddNums = monitor({
        main:{
            ref:addNums,//the fn we want to monitor
            captures:{ 
                sayHelloRandom//instead of passing this as an arg on each call,we can capture the ref from the outside.But it will run oustdie of the interpreter and cant be monitored
            },
        },
    });
    const result = monitoredAddNums(1,3)
    console.log(result);
});

//Embedding external functions directly in the interpreter's context
const WasCalled = 'Was Called';
const HelloStr = "hello";

const log = async (...args:any[])=> {
    console.log(...args);
    return WasCalled
}

const start = performance.now();
const generatedCode = {value:''};


const monitoredAsyncAdd = monitor({
    main:{
        ref:async (a: number, b: number)=>{
            await log(HelloStr,Math.sqrt(4),a,b);
            return a + b
        },
        captures:{
            HelloStr
        }
    },
    embed:{
        log:{//create a function in the interpreter's context called log.
            ref:log,//pass in the ref to use to get the src code for the embedded function
            captures:{
                WasCalled//optionally include anything it should capture since it is also isolated
            }
        }
    },
    inspector:function* (visit):InspectorGenerator {
        visit.is('CallExpression',event=>{
            const calleeIndex = visit.localExeStack().length;
            const callees = new Set()

            visit.perExecution = ()=>{
                const stack = visit.localExeStack();//we dont consume the whole thing into an array to save performance
                const element = stack.get(-(calleeIndex + 1));
                // console.log('RESULT:',stack.get(0).evaluation);
                if (!callees.has(element)) {
                    console.log('Callee:',element);
                    callees.add(element);
                    return
                }
            }
        });
        yield visit.execute();//for async functions,we want to yield the execution to pause the inspector till it fully executes.but since we cant yield in the is method,we do it outside and continue the remaining half of our logic in another is block of the same query.
        visit.is('CallExpression',()=>{
            // console.log('\nFULL EXECUTION TRACE:',[...visit.localExeStack()]);
        })
    },
    beforeEachCall:(a,b)=>{
        console.log(`Seen the numbers a:${a} and b:${b}`);
    },
    sourceOut:generatedCode,
});

console.log(ansis.green('\nGenerated code:'));
console.log(generatedCode.value);

const result = monitoredAsyncAdd(4,8);
const result2 = await monitoredAsyncAdd(5,6);

console.log('RESULT 1 FROM FN',await result);
console.log('RESULT 2 FROM FN',result2);

const end = performance.now();
console.log(ansis.green(`\nFinished in ${end-start} milliseconds\n`));


