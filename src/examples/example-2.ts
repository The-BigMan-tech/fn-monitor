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

const monitoredFractalTest = monitor.fn({
    main:{
        ref:fractalTest,
    }
})

perf(()=>{
    fractalTest(60)
});
perf(()=>{
    monitoredFractalTest(60)
});