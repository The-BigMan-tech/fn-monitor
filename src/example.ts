import { CallExprEvent, monitor } from "./index.ts";
import chalk from "chalk";

function recordPerf(fn:(...args:any[])=>void) {
    const start = performance.now();
    fn();
    const end = performance.now();
    console.log(chalk.green('\nFinished in ',end-start,' milliseconds\n'));
}
function hello() {
    console.log('Hello function');
}
//Regular function
const arrToAdd = [1,2,3,4,5,6,7,8,9,10];

const internalAdd = (nums:number[],hello:()=>void)=> {
    hello();
    let sum:number = 0;
    for (const num of nums) {
        sum += num
    }
    return sum;
}
recordPerf(()=>{
    const result = internalAdd(arrToAdd,hello);
    console.log(result);
})

//Monitored function
let count = 0;
let otherNodes = 0;

const add = monitor.fn(internalAdd, (shop) => {
    //the monitor will only create the event object for a node if it meets the demand.its an alternative to instanceof checks
    shop.demand('AssignmentExpression', (event) => {
        count += 1;
    });
    if (shop.sales() < 1) {
        shop.demand('Any',(event)=>{
            otherNodes += 1;
        })
    }
});
monitor.header(add,()=>{
    console.log('Entered the monitored add function');
})

recordPerf(() => {
    const result = add(arrToAdd, hello);
    console.log('Final Result:', result, 'Interceptions:', count,'Other nodes',otherNodes);
});

const internalAdd2 = (a:number,b:number):number =>{
    hello();
    return a + b;
}
const addClosure = monitor.closure({hello},internalAdd2,()=>undefined);

recordPerf(() => {
    const result = addClosure(1,3)
    console.log(result);
});


