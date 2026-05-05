import { monitor } from "./index.ts";
import chalk from "chalk";
import { GenExe, LAZY_NODE } from "./monitored-events.ts";

//the perf profiles include the parsing and preprocessing step the monitor uses to build the code before it even executes it.Thanks to its caching,this only happens once and every call to that function takes significantly less time cuz it skips that step.

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


perf(() => {
    const add = monitor.fn({
        main:{
            ref:internalAdd, 
        },
        listener:(visit) => {
            visit.is('AssignmentExpression',event => {
                event.node.operator = "-=";//silently change the operator
                count += 1;
                console.log('Depth: ',event.scope.depth)
                console.log('assignment result',visit.execute());
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


perf(() => {
    const addClosure = monitor.fn({
        main:{
            ref:internalAdd2,
            captures:{ hello2 },
        },
        listener:()=>undefined,
    });
    const result = addClosure(1,3)
    console.log(result);
});

//INLINING
async function asyncHello() {
    console.log('hello world');
    return 'Was Called'
}

const start = performance.now();

const generatedCode = {value:''};
const addPseudoClosure = monitor.fn({
    main:{
        ref:async(a: number, b: number)=>{
            await asyncHello();
            const result = internalAdd2(a,b);
            console.log('RESULT:',result);
            return result;
        },
        captures:{
            asyncHello
        }
    },
    inlineFunctions:{
        internalAdd2:{
            ref:internalAdd2,
        },
        hello2:{
            ref:hello2,
            captures:{
                random
            }
        }
    },
    sendGeneratedCodeTo:generatedCode,

    listener:function* (visit):GenExe {
        let seenNode = false
        visit.is('AwaitExpression',()=> {
            seenNode = true;
        });
        if (seenNode) {//using a flag is an important pattern here to use yield visit.execute cuz the callback in visit.is isnt a generator and doesnt work with yield.its an intentional deisgn to prevent yield and function* coloring
            console.log('NODE EVAL: ',yield visit.execute());//see the result of deferred nodes like await expressions
        }
    },
    beforeEachCall:(a,b)=>{
        console.log(`Seen the numbers a:${a} and b:${b}`);
    }
});

const result = await addPseudoClosure(4,8);
console.log(result);

const end = performance.now();
console.log(chalk.green('\nFinished in ',end-start,' milliseconds\n'));

console.log(chalk.green('\nGenerated code:'));
console.log(generatedCode.value);


