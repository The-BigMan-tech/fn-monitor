import { monitor } from "./index.ts";
import chalk from "chalk";

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
    fn:internalAdd, 
    listener:(shop) => {
        shop.demand('AssignmentExpression', (getEvent) => {
            count += 1;
        });
        if (shop.sales() < 1) {
            shop.demand('Any',(getEvent)=>{
                otherNodes += 1;
            })
        }
    }
});
monitor.preMonitoring(add,()=>{
    console.log('Entered the monitored add function');
})

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
    fn:internalAdd2,
    listener:()=>undefined,
    dependencies:{
        captures:{ hello2 },
        inlineFns:null
    }
});

perf(() => {
    const result = addClosure(1,3)
    console.log(result);
});


//INLINING
const addPseudoClosure = monitor.fn({
    fn:internalAdd2,
    listener:()=>undefined,
    dependencies:{
        captures:null,
        inlineFns:{
            hello2:{
                ref:hello2,
                captures:{random}
            }
        }
    }
});
perf(() => {
    const result = addPseudoClosure(4,8);
    console.log(result);
});



