import chalk from "chalk";
import { monitor } from "../index.ts";


function perf(fn:(...args:any[])=>void) {
    const start = performance.now();
    fn();
    const end = performance.now();
    console.log(chalk.green('\nFinished in ',end-start,' milliseconds\n'));
};

function calculateAverage(numbers: number[]): number {
    if (!numbers || numbers.length === 0) {
        return 0;
    }
    
    let sum = 0;
    for (let i = 0; i < numbers.length; i++) {
        sum += numbers[i];
    }
    return Number((sum / numbers.length).toFixed(3));
}
function heavySortTest(count: number): any[] {
    // Generate a pseudo-random list of player objects
    const list: any[] = [];
    for (let i = 0; i < count; i++) {
        list.push({
            id: i,
            score: (i * 33 + 7) % 100 // Creates a deterministic jumbled list of scores
        });
    }

    // Heavy Nested Bubble Sort Loop - Triggers massive AST mutations and steps
    const len = list.length;
    for (let i = 0; i < len; i++) {
        for (let j = 0; j < len - 1 - i; j++) {
            if (list[j].score > list[j + 1].score) {
                // Swap structural object elements
                const temp = list[j];
                list[j] = list[j + 1];
                list[j + 1] = temp;
            }
        }
    }
    return list;
}


perf(()=>{
    const result = calculateAverage([20,30,70,88,91,72]);
    console.log('\nThe average is: ',result);
});
// perf(()=>{
//     heavySortTest(100)
// });


const timeoutTracker = {
    limitMs: 50,       // 50ms absolute execution limit
    startTime: 0,
    stepCounter: 0
};

const fnBuilsStart = performance.now();

const monitoredFnTest = monitor.fn({
    main: {
        ref:calculateAverage,
    },
    onStep: () => {
        timeoutTracker.stepCounter++;
        
        // Binary bitmask check: Only execute the inner code once every 1024 steps
        if ((timeoutTracker.stepCounter & 1023) === 0) {
            const totalTime = performance.now() - timeoutTracker.startTime;
            if (totalTime > timeoutTracker.limitMs) {
                throw new Error(`Max execution time exceeded.Used ${totalTime.toFixed(3)}ms when only given ${timeoutTracker.limitMs.toFixed(3)}ms`);
            }
        }
    },
    beforeEachCall: () => {
        timeoutTracker.stepCounter = 0;
        timeoutTracker.startTime = performance.now();
    }
});

console.log(chalk.green(`Finished building the fn in ${(performance.now()-fnBuilsStart).toFixed(3)}ms`));
perf(()=>{
    const result = monitoredFnTest([20,30,70,88,91,72]);
    console.log('\nThe average is: ',result);
});