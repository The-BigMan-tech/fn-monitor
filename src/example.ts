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
const add = monitor.fn(internalAdd, (products) => {
    products.demand('AssignmentExpression', (event) => {
        count++; // Tiny operation, no I/O
    });
});
add.beforeMonitoring(()=>{
    console.log('Entered the monitored add function');
})
recordPerf(() => {
    const result = add(arrToAdd, hello);
    console.log('Final Result:', result, 'Interceptions:', count);
});



