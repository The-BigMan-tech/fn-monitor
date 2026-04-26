import { LangListener, SvalPlus } from "./index.ts";
import chalk from "chalk";

type Fn = (...args:any[])=>any;
const Colors = {
    orange:chalk.hex('#f6c098')
}
export function langPoint<T extends Fn>(fn:T,listener:LangListener):T {
    const interpreter = new SvalPlus({
        ecmaVer:"latest", // Match your tsconfig target
        sandBox: true, // Standard for eDSLs/Sandboxes
    });

    const fnString = fn.toString();
    let fnName = fn.name 
    let fnAssignment:string = '';

    if (fnName.length === 0) {
        const anonymous = 'anonymousFn';
        fnAssignment = `var ${anonymous} = ${fnString}`
        fnName = anonymous;
    }else if (!fnName.startsWith('function')) {
        fnAssignment = `var ${fnName} = ${fnString}`
    }else {
        fnAssignment = fnString;
    }

    const code = `
        ${fnAssignment};
        exports.result = ${fnName}(...args);
    `
    const newFn = (...args: any[]) => {
        interpreter.import({ args });
        try {
            interpreter.run(code);
            return interpreter.exports.result;
        }catch(err) {
            if (err instanceof ReferenceError) {
                throw new Error(
                    chalk.red.underline(`\nReference Error`) +
                    Colors.orange(`\n-Functions marked with a langPoint cannot access any global variable.It must be passed as an argument.\n-If its a closure,the caller's details but not the internals can be tracked by langlisteners`) +
                    chalk.red.underline(`\n\nTrace`) + `\n${err}`
                )
            }else throw err;
        }
    };

    interpreter.langListener = listener;
    return newFn as T;
}
function h() {
    console.log('hello world');
}
const internalAdd = (a:number,b:number)=> {
    h()
    return a + b;
}
const add = langPoint(internalAdd,()=>{
    
})
const result = add(1,2);
console.log(result);

const result2 = add(2,3);
console.log(result2);