import { monitor } from "./index.ts";
import chalk from "chalk";
import { GenExe, LAZY_NODE } from "./monitored-events.ts";

//the perf profiles dont include the parsing step.but thanks to meriyah,this is decently fast and its cached 

function perf(fn:(...args:any[])=>void) {
    const start = performance.now();
    fn();
    const end = performance.now();
    console.log(chalk.green('\nFinished in ',end-start,' milliseconds\n'));
}
function hello() {
    console.log('Hello function');
}


//NATIVE FUNCTION
const arrToAdd = [1,2,3,4,5,6,7,8,9,10];

const internalAdd = (nums:number[],hello:()=>void)=> {
    hello();
    let sum:number = 0;
    for (const num of nums) {
        sum += num
    }
    return sum;
}
perf(()=>{
    const result = internalAdd(arrToAdd,hello);
    console.log(result);
})

//MONITORED FUNCTION
let count = 0;
let otherNodes = 0;

const add = monitor.fn({
    main:{
        ref:internalAdd, 
    },
    listener:(visit) => {
        visit.is('AssignmentExpression',event => {
            count += 1;
        })
        if (!visit.matched()) {
            visit.is('Any',event=>{
                otherNodes += 1;
            })
        }
    },
    beforeEachCall:()=>{
        console.log('Entered the monitored add function');
    }
});

perf(() => {
    const result = add(arrToAdd, hello);//passing an external dependency through its arguments
    console.log('Final Result:', result, 'Interceptions:', count,'Other nodes',otherNodes);
});

const random = Math.round(Math.random() * 100);
function hello2() {
    console.log('Hello random number: ',random);
}

//CAPTURING
const internalAdd2 = (a:number,b:number):number =>{
    hello2();
    return a + b;
}
const addClosure = monitor.fn({
    main:{
        ref:internalAdd2,
        captures:{ hello2 },
    },
    listener:()=>undefined,
});

perf(() => {
    const result = addClosure(1,3)
    console.log(result);
});

//INLINING
async function asyncHello() {
    console.log('hello world');
}
const addPseudoClosure = monitor.fn({
    main:{
        ref:async(a: number, b: number)=>{
            await asyncHello();
            const result = internalAdd2(a,b);
            console.log('RESULT:',result);
            return result;
        },
        captures:{asyncHello}
    },
    listener:function (visit) {
        console.log('NODE EVAL: ',visit.execute());
    },
    inlineFunctions:{
        internalAdd2:{
            ref:internalAdd2,
        },
        hello2:{
            ref:hello2,
            captures:{random}
        }
    },
});
const start = performance.now();

const result = await addPseudoClosure(4,8);
console.log(result);

const end = performance.now();
console.log(chalk.green('\nFinished in ',end-start,' milliseconds\n'));



