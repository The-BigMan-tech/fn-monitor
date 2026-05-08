import { monitor,EsNode, ListenerGenerator } from "./index.ts";
import chalk from "chalk";

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
    return {sum:sum};
}
perf(()=>{
    const result = internalAdd(arrToAdd,hello);
    console.log(result);
})

//MONITORED FUNCTION
let count = 0;
let otherNodes = 0;


perf(() => {
    const add = monitor.fn({//monitored fns return functions that can be used seamlessly like their unmonitored counterparts
        main:{
            ref:internalAdd, 
        },
        listener:(visit) => {
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
const log = (...args:any[])=> {
    console.log(...args);
    return 'Was Called'
}

const start = performance.now();
const generatedCode = {value:''};

const addPseudoClosure = monitor.fn({
    main:{
        ref:async (a: number, b: number)=>{
            log('hello',Math.sqrt(4),a,b);
            return 14
        },
        captures:{log}
    },
    listener:function* (visit):ListenerGenerator {
        visit.is('Any',(event)=>console.log('DEPTH',event.scope.depth))
        visit.is('CallExpression',event=>{
            const calleeIndex = visit.localExeStack().length;
            const callees = new Set()

            visit.perExe = ()=>{
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
        console.log(yield visit.execute());//for async functions,we want to yield the execution to pause the listener till it fully executes.but since we cant yield in the is method,we do it outside and continue the remaining half of our logic in another is block of the same query.
        visit.is('CallExpression',()=>{
            // console.log('\nFULL EXECUTION TRACE:',[...visit.localExeStack()]);
        })
        
    },
    beforeEachCall:(a,b)=>{
        console.log(`Seen the numbers a:${a} and b:${b}`);
    },
    sendGeneratedCodeTo:generatedCode,
});

console.log(chalk.green('\nGenerated code:'));
console.log(generatedCode.value);

const result = addPseudoClosure(4,8);
console.log(result);

const end = performance.now();
console.log(chalk.green('\nFinished in ',end-start,' milliseconds\n'));




