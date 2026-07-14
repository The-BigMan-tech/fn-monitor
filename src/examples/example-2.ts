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
    return sum / numbers.length;
}

perf(()=>{
    calculateAverage([20,30,70,88,91,72])
});


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
    monitoredFnTest([20,30,70,88,91,72])
});