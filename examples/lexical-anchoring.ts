// change the import path to '@typescript-guy/fn-monitor' 

import { monitor, LangEvent, Fn } from "../src/index.ts";

const roots = new WeakMap<Fn, number>();

const anchor = {
    set: (fn: Fn, event: LangEvent) => {
        roots.set(fn, event.scope.depth);
    },
    has: (fn: Fn) => {
        return roots.has(fn);
    },
    getDepth: (fn: Fn, event: LangEvent): number | undefined => {
        const root = roots.get(fn);
        return root !== undefined ? (event.scope.depth - root) : undefined;
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

        if (!anchor.has(currentFn)) {
            visit.is('Any', event => anchor.set(currentFn, event));
        }
        visit.is('ReturnStatement', event => {
            const depth = anchor.getDepth(currentFn, event);
            console.log(`Relative depth of ${currentFn.name}'s return statement to its function definition: `, depth);
        });
    }
});

fn();

/**
 * Output
 * ------
 * Relative depth of ref's return statement to its function definition:  0
 * Relative depth of helper's return statement to its function definition:  0
 * Relative depth of inner's return statement to its function definition:  0
*/