import { monitor } from "./index.ts";
import chalk from "chalk";

function h() {
    console.log('hello world');
}
const internalAdd = (a:number,b:number,h:()=>void)=> {
    h()
    return a + b;
}
const add = monitor.fn(internalAdd,(event)=>{//monitored fns dont modify the original function
    console.log('found a node A',event.node.type);
})

const start1 = performance.now();

const result = internalAdd(1,2,h);
console.log(result);

const end1 = performance.now();
console.log(chalk.green('\nA:Finished in ',end1-start1,' milliseconds\n'));


const start2 = performance.now();

const result2 = add(1,2,h);
console.log(result2);

const end2 = performance.now();
console.log(chalk.green('\nB:Finished in ',end2-start2,' milliseconds'));



