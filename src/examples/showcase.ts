import { monitor } from "../index.ts";

const zero = 0;

const sumUp = (nums:number[])=> {
    let sum:number = zero;
    for (const num of nums) {
        sum += num
    }
    return sum;
}
const monitoredSumUp = monitor({
    main:{
        ref:sumUp,
        captures:{
            zero//since zero is used by sumUp and is outside its scope,we capture it into the interpreter's context
        } 
    },
    beforeEachCall:(nums)=>{
        console.log('Entered the monitored sum up function with the nums: ',nums);
    },
    inspector:(visit) => {
        visit.is('AssignmentExpression',event => {
            event.node.operator = "-=";//silently change the operator
            console.log('assignment result',visit.execute());
        })
        visit.is('ReturnStatement',event=>{
            const result = visit.execute();
            result.RES = 'I CHANGED THE VALUE';
        })
    },
    afterEachCall:(result)=>{
        console.log('result of the monitored function: ',result);
    }
});

const arrToSum = [1,2,3,4,5,6,7,8,9,10];

const result1 = sumUp(arrToSum)
console.log('Result 1',result1);

const result2 = monitoredSumUp(arrToSum)
console.log('Result 2',result2);

