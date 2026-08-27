// change the import to '@typescript-guy/fn-monitor' 

import { monitor } from '../src/index.ts';

// Typical javascript-obfuscator output: Hex-encoded strings and a math-based decoder

function obfuscatedSnippet() {
    const _0x2a1b = [
        '\x68\x65\x6c\x6c\x6f',          // "hello"
        '\x77\x6f\x72\x6c\x64',          // "world"
        '\x66\x6e\x2d\x6d\x6f\x6e\x69\x74\x6f\x72' // "fn-monitor"
    ];
    
    function _0xdecoder(idx: number, seed: number) {
        // Using modulo directly on the positive timestamp string
        const timeMask = seed % 3; 
        const targetIndex = (idx + timeMask) % 3;
        return _0x2a1b[targetIndex];
    }

    // The script calls the decoder passing the current timestamp live
    const part1 = _0xdecoder(0, Date.now()); 
    const part2 = _0xdecoder(1, Date.now()); 
    const part3 = _0xdecoder(2, Date.now()); 
    
    console.log(part1, part2, part3);
}


let decryptedList:any[] | null = null;
let lastDecryptedValue: unknown | null = null;

let argNodes: Set<any> = new Set();
let args: any[] = [];

const codeWatcher = monitor({
    main: { 
        ref: obfuscatedSnippet 
    },
    beforeEachCall: () => {
        lastDecryptedValue = null;
        decryptedList = null;
        argNodes.clear(); 
        args = [];
    },
    inspector: (visit): undefined => {
        if (!decryptedList) {
            visit.is('VariableDeclaration', event =>{
                visit.execute();
                decryptedList = event.scope.variables.search('_0x2a1b') as any[];
                console.log(`\n[DEOBFUSCATED LIST] [${decryptedList.join(', ')}]\n`);
            });
        }

        visit.is('CallExpression', event => {
            const callee = event.node.callee;
            if (callee.type !== "Identifier") return;
            if (callee.name !== '_0xdecoder') return;

            try {
                // Add all argument nodes to the Set
                event.node.arguments.forEach(node => argNodes.add(node));

                // Execute the call (which will trigger the 'Any' hook for the arguments)
                lastDecryptedValue = visit.execute();
                console.log(`[DEOBFUSCATED CALL] ${callee.name}(${args.join(',')}) -> "${lastDecryptedValue}"\n`);
            } finally {
                args = [];
                argNodes.clear();
            }
        });

        // Only query for 'Any' if we are meant to evaluate the arguments. Else, fn-monitor will allocate unnecessary event objects for unrequired nodes
        if (argNodes.size > 0) {
            visit.is('Any', event => {
                if (argNodes.has(event.node)) {
                    args.push(visit.execute());
                }
            });
        }
    }
});
codeWatcher();

/**
 * The actual output will vary because the obfuscated code checks the date in real time. But it should
 * look something like this:
 * 
 * Output
 * ------
 * [DEOBFUSCATED LIST] [hello, world, fn-monitor]
 * 
 * [DEOBFUSCATED CALL] _0xdecoder(0,1787862235676) -> "fn-monitor"
 *
 * [DEOBFUSCATED CALL] _0xdecoder(1,1787862235677) -> "world"
 *
 * [DEOBFUSCATED CALL] _0xdecoder(2,1787862235678) -> "hello"
 *
 * fn-monitor world hello
*/