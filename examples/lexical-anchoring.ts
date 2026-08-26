import { monitor, LangEvent, Fn } from "../src/index.ts";

const roots: Partial<Record<string, number>> = {};

const anchor = {
    set: (fn: Fn, event: LangEvent) => {
        roots[fn.name] = event.scope.depth;
    },
    has: (fn:Fn) => {
        return roots[fn.name] !== undefined
    },
    getDepth: (fn: Fn, event: LangEvent): number | undefined => {
        const root = roots[fn.name];
        return root && (event.scope.depth - root)
    },
};

const fn = monitor({
    main: {
        ref: () => {
            const helper = () => {
                const inner = () => {
                    return 10;
                };
                return inner();
            };
            return helper();
        }
    },
    inspector: (visit): undefined => {
        const currentFn = visit.callStack().get(0);
        const fnName = currentFn.name;

        if (!anchor.has(currentFn)) {
            visit.is('Any', event => anchor.set(currentFn, event));
        }
        visit.is('ReturnStatement', event => {
            const depth = anchor.getDepth(currentFn, event);
            console.log(`Lexical depth of ${fnName}'s return statement: `, depth);
        });
    }
});

fn();

/**
 * Output
 * ------
 * Lexical depth of ref's return statement:  0
 * Lexical depth of helper's return statement:  0
 * Lexical depth of inner's return statement:  0
*/