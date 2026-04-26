import { monitor } from "./index.ts";
import chalk from "chalk";

function hello() {
    console.log('hello world');
}
//Regular function
const internalAdd = (a:number,b:number,hello:()=>void)=> {
    console.log('Entered the internal add function');
    hello()
    return a + b;
}
const start1 = performance.now();

const result = internalAdd(1,2,hello);
console.log(result);

const end1 = performance.now();
console.log(chalk.green('\nA:Finished in ',end1-start1,' milliseconds\n'));


//Monitored function
const add = monitor.fn(internalAdd,(demand)=>{//monitored fns dont modify the original function
    demand.add('BinaryExpression',(event)=>{
        
    })
})
add.beforeMonitoring(()=>{
    console.log('Entered the monitored add function');
})

const start2 = performance.now();

const result2 = add(3,5,hello);
console.log(result2);

const end2 = performance.now();
console.log(chalk.green('\nB:Finished in ',end2-start2,' milliseconds'));



