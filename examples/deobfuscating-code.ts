// change the import to '@typescript-guy/fn-monitor' 

import { monitor, CallExprEvent } from '../src/index.ts';

// Typical javascript-obfuscator output: Hex-encoded strings and a math-based decoder

function obfuscatedLogic() {
    const _0x2a1b = [
        '\x68\x65\x6c\x6c\x6f',          // "hello"
        '\x77\x6f\x72\x6c\x64',          // "world"
        '\x66\x6e\x2d\x6d\x6f\x6e\x69\x74\x6f\x72' // "fn-monitor"
    ];
    
    // Advanced decoder: XORs the index to hide the direct mapping
    function _0xdecoder(idx: number, key: number) {
        return _0x2a1b[idx ^ key];
    }

    const part1 = _0xdecoder(0, 0); // 0 ^ 0 = 0 -> "hello"
    const part2 = _0xdecoder(3, 2); // 3 ^ 2 = 1 -> "world"
    const part3 = _0xdecoder(1, 3); // 1 ^ 3 = 2 -> "fn-monitor"
    
    console.log(part1, part2, part3);
}

let argNodes: any[] = [];
let args:any[] = [];
let lastDecryptedValue:unknown | null = null;

const fn = monitor({
    main: { 
        ref: obfuscatedLogic 
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
                    console.log(`\n[DEOBFUSCATED CALL] ${callee.name}(${args.join(',')}) dynamically resolved to: "${lastDecryptedValue}"`);
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

fn();

/**
 * Output:
 * -------
 * [DEOBFUSCATED CALL] _0xdecoder(0,0) dynamically resolved to: "hello"
 * 
 * [DEOBFUSCATED CALL] _0xdecoder(3,2) dynamically resolved to: "world"
 * 
 * [DEOBFUSCATED CALL] _0xdecoder(1,3) dynamically resolved to: "fn-monitor"
 * hello world fn-monitor
*/