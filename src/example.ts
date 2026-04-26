import { LangListener, SvalPlus } from "./index.ts";

type Fn = (...args:any[])=>any;

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
        interpreter.run(code);
        return interpreter.exports.result;
    };

    interpreter.langListener = listener;
    return newFn as T;
}

const internalAdd = (a:number,b:number)=> {
    return a + b
}
const add = langPoint(internalAdd,()=>{

})
const result = add(1,2);
console.log(result);

const result2 = add(2,3);
console.log(result2);