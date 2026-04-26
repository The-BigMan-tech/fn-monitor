import { langPoint } from "./index.ts";

function h() {
    console.log('hello world');
}
const internalAdd = (a:number,b:number,h:()=>void)=> {
    h()
    return a + b;
}

const add = langPoint(internalAdd,()=>{//langpoints dont modify the original function
    console.log('found a node A');
})
const sub = langPoint(add,()=>{
    console.log('found a node B');
})

const result = add(1,2,h);
console.log(result);

const result2 = sub(2,3,h);
console.log(result2);

