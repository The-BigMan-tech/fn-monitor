import { executedManually, inLazyMode, pushResult } from "./lifecycle.ts";
import Scope from "./scope/index.ts";
import ansis from "ansis";

import { 
    createEvent,
    EventMap,
    LAZY_NODE,
    PerExeFn,
    ScopeForEvent, 
    SvalPlus,
    Visit as VisitContract,
    VisitExecutionError, 
} from "./custom-types.ts";

export class EventScope implements ScopeForEvent {
    #scope:Scope;

    public variables:ScopeForEvent['variables'];

    public depth:number;
    public callDepth:number;

    constructor(interpreter:SvalPlus) {
        this.#scope = interpreter.reusables.scope!;

        const userRootDepth = this.#scope.userRoot.depth;
        const rootDepthErrMsg = ansis.red(`Internal logic error: Cannot allocate a scope for an event if null is given as the user's root depth`)

        if (userRootDepth === null) {
            throw new Error(rootDepthErrMsg)
        };

        this.depth = this.#scope.depth - userRootDepth;
        this.callDepth = interpreter.userRoot.callStack.length - 1;

        const local:ScopeForEvent['variables']['local'] = Object.create(null)
        for (const k in this.#scope.local) {
            local[k] = this.#scope.local[k].get()
        };
        
        this.variables = {
            // Create a fresh closure so that it can be destructured as seen in the examples
            search:(name:string):unknown | undefined => {
                const variable = this.#scope.find(name);
                return (variable === null)?undefined:variable.get();
            },
            local
        }
    }
} 
export class Visit implements VisitContract {
    #interpreter:SvalPlus

    constructor(interpreter:SvalPlus) {
        this.#interpreter = interpreter;
    }
    public localExeStack = ()=>{
        return this.#interpreter.reusables.execution.readonlyExeStack;
    }
    public callStack = ()=>{
        return this.#interpreter.userRoot.readonlyCallStack;
    }
    // The method should only create an event object for a node if it matches the query
    public is:VisitContract['is'] = (query,cb)=>{
        const node = this.#interpreter.reusables.node!;

        if ((query === "Any") || (node.type === query)) {
            const event:EventMap[typeof query] = createEvent(query,this.#interpreter)
            cb(event);
            this.#interpreter.reusables.event = event;
        }
    };

    public execute = () =>{
        const handler = this.#interpreter.reusables.handler;

        if (handler === null) {
            throw new Error(ansis.red(`Cannot use visit.execute because it received null as the handler`))
        };
        if (executedManually(this.#interpreter.reusables.result)) {
            throw new VisitExecutionError(ansis.red(`A node can only be executed once`))
        };

        // The node cannot be null if the handler is not null. If it is, it will rightfully fail with a loud type error
        this.#interpreter.reusables.result = handler(
            this.#interpreter.reusables.node!,
            this.#interpreter.reusables.scope!
        );

        if (inLazyMode(this.#interpreter)) {
            return LAZY_NODE;
        }else {
            pushResult(this.#interpreter,this.#interpreter.reusables.result);
            return this.#interpreter.reusables.result;
        }
    };
    set perExecution(fn:PerExeFn) {
        const reusables = this.#interpreter.reusables
        const perExe = reusables.execution.perExe;

        perExe.fn = fn;
        perExe.owner = reusables.node!;
    }
} 