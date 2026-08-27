// change the import to '@typescript-guy/fn-monitor' 

import { monitor, CallExprEvent } from '../src/index.ts';

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

let argNodes: any[] = [];
let args:any[] = [];
let lastDecryptedValue:unknown | null = null;

const codeWatcher = monitor({
    main: { 
        ref: obfuscatedSnippet
    },
    beforeEachCall:()=>{
        argNodes = [];
        args = [];
        lastDecryptedValue = null
    },
    inspector: (visit):undefined => {
        // Intercept the decoder function calls
        visit.is('CallExpression', (event: CallExprEvent) => {
            const callee = event.node.callee;
            if (callee.type !== "Identifier") return;

            if (callee.name === '_0xdecoder') {
                try {
                    argNodes = event.node.arguments;
                    lastDecryptedValue = visit.execute();
                    console.log(`\n[DEOBFUSCATED CALL] ${callee.name}(${args.join(',')}) -> "${lastDecryptedValue}"`);
                }finally {
                    args = [];
                    argNodes = [];
                }
            }
        });
        if (argNodes.length > 0) {
            visit.is('Any', event=>{
                argNodes.forEach(node =>{
                    if (event.node === node) {
                        args.push(visit.execute())
                    }
                })
            })
        }
    }
});
codeWatcher();

/**
 * The actual output will vary because the obfuscated code uses the live date. But it should
 * look something like this:
 * 
 * Output
 * ------
 * [DEOBFUSCATED CALL] _0xdecoder(0,1787861555751) -> "hello"
 *
 * [DEOBFUSCATED CALL] _0xdecoder(1,1787861555752) -> "fn-monitor"
 *
 * [DEOBFUSCATED CALL] _0xdecoder(2,1787861555752) -> "hello"
 * hello fn-monitor hello
*/