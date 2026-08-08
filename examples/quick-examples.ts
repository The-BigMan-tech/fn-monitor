import { 
    monitor,
    type InspectorGenerator,
    type ExeResult 
} from "../src/index"

console.log('\nQUICK EXAMPLE 1');

const zero = 0;

const sumUp = (nums: number[]) => {
    let sum: number = zero;
    for (const num of nums) {
        sum += num;
    }
    return sum;
};

const monitoredSumUp = monitor({
    main: {
        ref: sumUp,
        captures:{
            zero
        }
    },
    beforeEachCall:(nums)=>{
        console.log('Logging args: ',nums);
    },
    afterEachCall:(result)=>{
        if (!(result instanceof Error)) {
            console.log('Logging result: ',result);
        }
    },
    inspector: (visit) => {
        visit.is('AssignmentExpression', event => {
            event.node.operator = "-="; // silently change the operator
            console.log('intermediate result: ',visit.execute());
        });

        visit.is('ReturnStatement', event => {
            const result = visit.execute();
            const finalSum = event.scope.variables.search('sum');

            console.log('final sum: ', finalSum);
            result.RES = 'I CHANGED THE VALUE';
        });
    }
});

console.log('Result: ',monitoredSumUp([1,2,3,4,5]));


console.log('\nQUICK EXAMPLE 2');

const Printed = 'Printed: ';

function print(str:string) {
    console.log(Printed,str);
}
function printName(name:string) {
    console.log('Hello ',name);
}

function sayHello(name:string) {
    print('Hello world')
    printName(name)
}

const monitoredSayHello = monitor({
    main:{
        ref:sayHello,
        captures:{
            printName
        }
    },
    embed:{
        print:{
            ref:print,
            captures:{
                Printed
            }
        }
    }
})

monitoredSayHello('person');


console.log('\nQUICK EXAMPLE 3');

const exeHistory:ExeResult[] = [];

const fn = monitor({
    main:{
        ref:(a:number,b:number)=>{
            const result = (a + b) * (a - b);
            return result;
        }
    },
    inspector:(visit)=>{
        visit.is('Any',()=>undefined);

        visit.perExecution = ()=>{
            const stack = visit.localExeStack();
            const head = stack.get(0)
            exeHistory.push(head);
        }
    }
})
fn(2,3);
console.log(exeHistory);


console.log('\nQUICK EXAMPLE 4');

const fetchPrice = monitor({
    main:{
        //it uses dummy calculations to keep the example simple
        ref:async (item:string)=>{
            const price = await Promise.resolve(10)
            return await Promise.resolve(price**2);
        }
    },
    inspector:function* (visit):InspectorGenerator {
        const result = yield visit.execute();
        
        visit.is('AwaitExpression',()=>{
            console.log('Awaited promise: ',result);
        })
    },
});
await fetchPrice('flour')


console.log('\nQUICK EXAMPLE 5');

function getSqrt(num: number) {
    const squareRoot = Math.sqrt(num);
    const rounded = Number(squareRoot.toFixed(3));
    return rounded;
}

const callees = new Set();

const monitoredGetSqrt = monitor({
    main: {
        ref: getSqrt
    },
    inspector:(visit):undefined => {
        visit.is('CallExpression', (event) => {
            const scope = event.scope;
            const search = scope.variables.search;

            const callee = event.node.callee;

            switch(callee.type) {
                case "Identifier":
                    const func = search(callee.name);
                    callees.add(func)
                    break

                case "MemberExpression":
                    const calleeObj = callee.object;     

                    if (calleeObj.type === "Identifier") {
                        const obj = search(calleeObj.name) as any;
                        const property = callee.property;

                        if (property.type === "Identifier") {
                            const func = obj[property.name];
                            callees.add(func)
                        }
                    }
                    break  
            }
        });
    },
});

monitoredGetSqrt(2);
console.log('Callees during execution: ', callees);


console.log('\nQUICK EXAMPLE 6');

type milliseconds = number;
type Fn = (...args:any[])=>void

function timeFn<T extends Fn>(fn:T,budget:milliseconds):T {
    const graceTime = 0.5 as milliseconds;

    let startTime = 0 as milliseconds;
    let usedTime = 0 as milliseconds;
    let step = 0;

    const checkBudget = ()=>{
        const currentTime = performance.now();
        usedTime = (currentTime - startTime);

        const timeIsUp = usedTime > (budget + graceTime)
        if (timeIsUp) {
            throw new Error(`The monitored function used ${usedTime.toFixed(3)}ms when only given a budget of ${budget.toFixed(3)}ms.`);
        };
    };

    const monitoredFn = monitor({
        main:{
            ref:fn,
        },
        beforeEachCall: () => {
            startTime = performance.now()
            usedTime = 0;
            step = 0;
        },

        onStep:() => {
            step += 1;
            const shouldCheckBudget = (step & 1023) === 0;
            if (shouldCheckBudget) checkBudget();
        },
        afterEachCall:(result)=>{
            if (!(result instanceof Error)) {
                checkBudget();
            }
        }
    });
    return monitoredFn
};
function getPrice(item?:string):number {
    if (!item) {
        while (true) {
            //simulate the function hanging forever in an attempt to fetch the price of an undefined item
        }
    }
    return 10
}
const timedGetPrice = timeFn(getPrice,50);
timedGetPrice()