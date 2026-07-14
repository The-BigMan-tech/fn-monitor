import chalk from "chalk";
import { monitor } from "../index.ts";


function perf(fn:(...args:any[])=>void) {
    const start = performance.now();
    fn();
    const end = performance.now();
    console.log(chalk.green('\nFinished in ',end-start,' milliseconds\n'));
};

function fractalTest(size:number)  {
    let checkSum = 0;
    const maxIterations = 300;
    
    for (let y = 0; y < size; y++) {
        const c_im = -1.2 + (y * 2.4) / size;
        
        for (let x = 0; x < size; x++) {
            const c_re = -2.0 + (x * 2.5) / size;
            let z_re = 0.0;
            let z_im = 0.0;
            let isMandelbrot = true;
            
            for (let i = 0; i < maxIterations; i++) {
                const z_re_new = z_re * z_re - z_im * z_im + c_re;
                z_im = 2.0 * z_re * z_im + c_im;
                z_re = z_re_new;
                
                if (z_re * z_re + z_im * z_im > 4.0) {
                    checkSum += i;
                    isMandelbrot = false;
                    break;
                }
            }
            if (isMandelbrot) checkSum += maxIterations;
        }
    }
    return checkSum;
};
perf(()=>{
    fractalTest(60)
});


const timeoutTracker = {
    limitMs: 50,       // 50ms absolute execution limit
    startTime: 0,
    stepCounter: 0
};

const monitoredFractalTest = monitor.fn({
    main: {
        ref: fractalTest,
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

perf(()=>{
    monitoredFractalTest(60)
});