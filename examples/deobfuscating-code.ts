/**
 * ⚠️ SECURITY NOTE:
 * 
 * Scripts that deobfuscate untrusted or malicious code should **always** run within an isolated 
 * environment (e.g., `isolated-vm`, Docker, or a restricted Node.js process) to prevent potential 
 * sandbox escapes or environment exfiltration.
 * 
 * Note: The code in this specific example is completely safe and can be run directly 
 * in your environment.
*/

// change the import to '@typescript-guy/fn-monitor' 

import { monitor, EsNode } from '../src/index.ts';

// This is a typical javascript-obfuscator output. 
// It swaps the original source with Hex-encoded strings and a math-based decoder

function obfuscatedSnippet() {
    const _0x2a1b = [
        '\x68\x65' + '\x6c\x6c' + '\x6f',// "hello"
        '\x77\x6f' + '\x72\x6c' + '\x64',// "world"
        '\x66\x6e' + '\x2d\x6d' + '\x6f' + 
        '\x6e\x69' + '\x74\x6f' + '\x72' // "fn-monitor"
    ];
    
    function _0xdecoder(idx: number, seed: number) {
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


/**
 * This is how we will use fn-monitor to deobfuscate the code through runtime analysis. 
 * For a complete deobfuscation suite, you should pair this with existing tools like REstringer.
*/

let foundTargetCall = false;

let argNodes = new Set<EsNode>();
let args: unknown[] = [];

let decryptedList: unknown[] | null = null;
let lastDecryptedValue: unknown | null = null;

const analyzeCode = monitor({
    main: { 
        ref: obfuscatedSnippet 
    },

    // Reset state after each function invocation to prevent memory leaks or stale data
    afterEachCall: () => {
        foundTargetCall = false;
        argNodes.clear(); 
        args = [];
        lastDecryptedValue = null;
        decryptedList = null;
    },

    /** 
     * NOTE:
     * 
     * - The inspector callback fires for EVERY single AST node as the interpreter 
     * walks the tree from top to bottom. 
     * 
     *  - `visit.is` is a SINGLE, IMMEDIATE check against the CURRENT node. 
     *  It evaluates the query, fires the callback if it matches and discards it instantly.
    */
    inspector: (visit): undefined => {
        /**
         * [Performance]: Only query for 'VariableDeclaration' nodes until we find the array. 
         * Once `decryptedList` is set, this block is skipped for all subsequent nodes.
        */
        if (!decryptedList) {
            visit.is('VariableDeclaration', event => {
                visit.execute(); // Ensure the array is evaluated and populated in scope

                const search = event.scope.variables.search;
                const list = search('_0x2a1b');

                if (list) {
                    decryptedList = list as typeof decryptedList;
                    console.log(`\n[DEOBFUSCATED LIST] [${decryptedList!.join(', ')}]`);
                    console.log(`[SOURCE] ${event.getSrc()}\n`);
                }
            });
        }

        /**
         * [Performance]: Skip querying for 'CallExpression' nodes if we have already found our target
        */
        if (!foundTargetCall) {
            visit.is('CallExpression', event => {
                const callee = event.node.callee;
                if (callee.type !== "Identifier") return;
                if (callee.name !== '_0xdecoder') return;

                foundTargetCall = true;

                try {
                    // Capture the exact AST node references of the arguments BEFORE execution
                    event.node.arguments.forEach(node => argNodes.add(node));

                    // Manually execute the CallExpression. 
                    // This will cause it to recursively call the inspector and hit the 'Any' query for all its arguments.
                    lastDecryptedValue = visit.execute();

                    console.log(`[DEOBFUSCATED CALL] ${callee.name}(${args.join(',')}) -> "${lastDecryptedValue}"`);
                    console.log(`[SOURCE] ${event.getSrc()}\n`);
                } 
                finally {
                    // Clean up immediately after execution to prevent state bleed
                    args = [];
                    argNodes.clear();
                    foundTargetCall = false;
                }
            });
        }
        /**
         * [Performance]: Conditionally query for 'Any' ONLY when actively tracking arguments.
         * This prevents fn-monitor from allocating unnecessary event objects for every unrelated node.
        */
        if (argNodes.size > 0) {
            visit.is('Any', event => {
                // Check if the interpreter is currently evaluating one of our saved argument nodes
                if (argNodes.has(event.node)) {
                    args.push(visit.execute());
                }
            });
        }
    }
});

analyzeCode();

/**
 * The actual output will vary because the obfuscated code checks the date in real time. 
 * But it should look something like this:
 * 
 * Output
 * ------
 * 
 * [DEOBFUSCATED LIST] [hello, world, fn-monitor]
 * [SOURCE] const _0x2a1b = ["he" + "ll" + "o", "wo" + "rl" + "d", "fn" + "-m" + "o" + "ni" + "to" + "r"];
 *
 * [DEOBFUSCATED CALL] _0xdecoder(0,1788284215450) -> "world"
 * [SOURCE] _0xdecoder(0, Date.now())
 *
 * [DEOBFUSCATED CALL] _0xdecoder(1,1788284215451) -> "hello"
 * [SOURCE] _0xdecoder(1, Date.now())
 *
 * [DEOBFUSCATED CALL] _0xdecoder(2,1788284215452) -> "fn-monitor"
 * [SOURCE] _0xdecoder(2, Date.now())
 * 
 * world hello fn-monitor
*/


/**
 * 🛡️ FOOTNOTE ON SECURITY BOUNDARIES:
 *  
 * `fn-monitor` is best used in this domain as a runtime analysis tool, not 
 * a cryptographically secure sandbox. 
 * 
 * One of its behaviors worth noting is that it isolates internal state within 
 * the same interpreted context that runs your monitored code, using deterministic 
 * hash keys.
 * 
 * Because these keys are hashed, it prevents accidental variable collisions, and 
 * their determinism maximizes AST cache hit rates across multiple `monitor()` calls.
 *
 * In 99% of normal use cases, this is perfectly safe, and you will practically 
 * never encounter these hashes naturally in your own code. 
 * 
 * However, if you are analyzing a highly sophisticated, actively hostile payload 
 * that has specifically reverse-engineered this package, the subject could spoof 
 * these internal variables to poison the analysis environment.
 * 
 * 🔐 Mitigation:
 * 
 * Because of this and other interpreter behaviors, ensure that the code you are 
 * analyzing is pre-sanitized by other tools in your deobfuscation pipeline. 
 * 
 * If you are dealing with targeted, adversarial payloads, consider forking the 
 * package and adding a simple, instance-specific salt to the internal hashes to 
 * neutralize spoofing attempts. You can easily tailor the package to suit your 
 * specific security needs.
*/