import chalk from "chalk";

/**A custom optimized dequeue with the random access of an array in one data structure */
export class QList<T> {
    private static readonly EDGE_OF_HEAD = 0;
    private static readonly LEFT_SHIFT = -1;
    private static readonly RIGHT_SHIFT = 1;

    private static readonly LEAST_ARRAY_LENGTH:number = 5;
    private static readonly MAX_HEAD_TO_TAIL_RATIO = 2;
    private static readonly MEDIUM_ARRAY_SIZE = 50;

    private arr:(T | undefined)[] = [];
    private start:number = QList.EDGE_OF_HEAD;

    constructor(init?:T[]) {
        if (init) {
            for (const element of init) {
                this.push(element);
            }
        }
    }
    //HELPERS
    private tailSize() {
        return this.arr.length - this.start;
    }

    //ADDING ITEMS
    private expand(size:number):void {//O(n)
        if ((this.start === QList.EDGE_OF_HEAD) || (this.arr.length < QList.LEAST_ARRAY_LENGTH)){
            const TAIL_SIZE = this.tailSize(); // The amount of real data
            const newArrSize = Math.max(size + TAIL_SIZE, QList.LEAST_ARRAY_LENGTH);
            const newArr = new Array(newArrSize);

            // Copy only the valid data window
            for (let i = 0; i < TAIL_SIZE; i++) {
                newArr[size + i] = this.arr[this.start + i];
            }
            this.arr = newArr;
            this.start = size;
        }
    }
    public push(element:T):void {//O1
        this.arr.push(element);
    }
    public unshift(element:T):void {//O(1) with infrequent O(n) thanks to allocating the size of the array
        if (this.start === QList.EDGE_OF_HEAD) {
            const HALF_THE_TAIL_SIZE = this.tailSize() / 2;
            const EXPANSION_SIZE = Math.max(Math.ceil(HALF_THE_TAIL_SIZE), 1);
            this.expand(EXPANSION_SIZE)
        }
        this.start += QList.LEFT_SHIFT;
        this.arr[this.start] = element;
    }

    //REMOVING ITEMS
    private minimize():void {//O(n)
        if (this.arr.length > QList.MEDIUM_ARRAY_SIZE) { // Prevent NaN
            const HEAD_SIZE = this.start;
            const TAIL_SIZE = Math.max(this.tailSize(),1);

            if ((HEAD_SIZE/TAIL_SIZE) >= QList.MAX_HEAD_TO_TAIL_RATIO) {
                const NEW_EDGE_OF_HEAD = HEAD_SIZE-TAIL_SIZE;
                this.arr = this.arr.slice(NEW_EDGE_OF_HEAD);
                this.start = HEAD_SIZE - NEW_EDGE_OF_HEAD
            }
        }
    }
    public pop():T | undefined {//O1
        if (this.tailSize() === 0) return undefined
        const element = this.arr.pop() as T;
        this.minimize();
        return element;
    }
    public shift():T | undefined {//O1 with infrequent O(n)
        if (this.tailSize() === 0) return undefined;
        const element = this.arr[this.start];
        this.arr[this.start] = undefined; // Help garbage collector
        this.start += QList.RIGHT_SHIFT;
        this.minimize();
        return element
    }
    public clear():void {
        this.arr = [];
        this.start = QList.EDGE_OF_HEAD;
        this.expand(QList.LEAST_ARRAY_LENGTH);//create some headspace
    }
    

    //RANDOM ACCESS
    private validateIndex(i:number) {
        const ELEMENTS_IN_TAIL = this.tailSize() - 1;
        const isValid = ((i >= 0) && (i <= ELEMENTS_IN_TAIL));
        if (!isValid) {
            throw new Error(chalk.red(`\nInvalid random access in QList.Index ${i} isnt available`))
        }
    }
    public get(i:number):T {//O1
        this.validateIndex(i);
        const index = this.start + i;
        return this.arr[index] as T;
    }
    public set(i:number,element:T):undefined {//O1
        this.validateIndex(i)
        const index = this.start + i;
        this.arr[index] = element;
    }


    //GETTERS
    public* [Symbol.iterator]() {
        for (let i = 0; i < this.tailSize(); i++) {
            yield this.get(i);
        }
    }
    public* entries():Generator<[number,T], void, unknown> {
        for (let i = 0; i < this.tailSize(); i++) {
            yield [i,this.get(i)];
        }
    }
    public get length():number {//O1
        return this.tailSize()
    }
}