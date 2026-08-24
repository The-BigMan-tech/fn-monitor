import { getOwnNames, createSandBox, globalObj  } from './share/util.ts'
import { parse, Options, Node as AcornNode, Program } from 'acorn'
import { EXPORTS, IMPORT, STRICT } from './share/const.ts'
import Scope from './scope/index.ts'
import {Node as EsNode} from "estree";

import { runAsync } from './share/runner.ts'
import { hoist as hoistAsync } from './evaluate/helper.ts'
import { hoist } from './evaluate_n/helper.ts'
import evaluateAsync from './evaluate/index.ts'
import evaluate from './evaluate_n/index.ts'

export interface SvalOptions {
    ecmaVer?: Options['ecmaVersion']
    sourceType?: Options['sourceType']
    sandBox?: boolean
}

function improveSyntaxError(err: SyntaxError & { pos?: number }, code: string): SyntaxError {
    if (typeof err.pos !== 'number' || !err.message.startsWith('Unexpected token')) return err
    const pos = err.pos
    const ch = pos < code.length ? code[pos] : undefined

    let ident: string | null = null

    if (ch !== undefined && /[a-zA-Z_$]/.test(ch)) {
        // error position is at the start of an identifier
        const m = code.slice(pos).match(/^[a-zA-Z_$][a-zA-Z0-9_$]*/)
        if (m) ident = m[0]
    }
    else if (ch === undefined || ch === '(') {
        // end of input or '(' — look backwards for a preceding identifier
        let end = pos
        while (end > 0 && /\s/.test(code[end - 1])) end--;

        if (end > 0 && /[a-zA-Z0-9_$]/.test(code[end - 1])) {
            let start = end
            while (start > 0 && /[a-zA-Z0-9_$]/.test(code[start - 1])) start--
            const candidate = code.slice(start, end)
            if (/^[a-zA-Z_$]/.test(candidate)) ident = candidate
        }
    }

    if (ident) return new SyntaxError(`Unexpected identifier '${ident}'`)
    return err
}

export class Sval {
    public exports: Record<string, any> = {}

    private options: Options = { ecmaVersion: 'latest' }
    private rootScope = new Scope(null,true,this)
    private static latestVersion = 15

    constructor(options: SvalOptions = {}) {
        let { ecmaVer = 'latest', sandBox = true, sourceType = 'script' } = options
        
        if (typeof ecmaVer === 'number') {
          ecmaVer -= ecmaVer < 2015 ? 0 : 2009 // format ecma edition
        }

        const versionIsUnsupported =(
            (ecmaVer !== 'latest') && 
            (ecmaVer !== 3) && 
            ((ecmaVer < 5) || (ecmaVer > Sval.latestVersion))
        )
        if (versionIsUnsupported) {
            throw new Error(`unsupported ecmaVer`)
        }

        this.options.ecmaVersion = ecmaVer as Options['ecmaVersion']
        this.options.sourceType = sourceType
        this.options.ranges = true;
        this.options.locations = true;
        this.options.preserveParens = false;

        if (sandBox) {
            // Shallow clone to create a sandbox
            const win = createSandBox()
            this.rootScope.let('globalThis', win)
            this.rootScope.let('window', win)
            this.rootScope.let('self', win)
            // ES modules have undefined as the top-level this (strict mode)
            this.rootScope.let('this', sourceType === 'module' ? undefined : win)
        }else {
            this.rootScope.let('globalThis', globalObj)
            this.rootScope.let('window', globalObj)
            this.rootScope.let('self', globalObj)
            // ES modules have undefined as the top-level this (strict mode)
            this.rootScope.let('this', sourceType === 'module' ? undefined : globalObj)
        }

        this.rootScope.const(sourceType === 'module' ? EXPORTS : 'exports', this.exports = {})
        if (sourceType === 'module') {
            this.rootScope.const(STRICT, true)
        }
    }

    public import(nameOrModules: string | Record<string, any>, mod?: any) {
        if (typeof nameOrModules === 'string') {
            nameOrModules = { [nameOrModules]: mod }
        }

        if (typeof nameOrModules !== 'object') return

        const names = getOwnNames(nameOrModules)

        for (let i = 0; i < names.length; i++) {
            const name = names[i]
            const modName = this.options.sourceType === 'module' ? IMPORT + name : name
            this.rootScope.var(modName, nameOrModules[name])
        }
    }

    public parse(code: string, parser?: (code: string, options: Options) => AcornNode) {
        if (typeof parser === 'function') {
            return parser(code, this.options)
        }
        try {
            return parse(code, this.options)
        }catch (err) {
            throw improveSyntaxError(err as SyntaxError & { pos?: number }, code)
        }
    }

    private* useGenEvaluator(ast:Program,scope:Scope) {
        yield* hoistAsync(ast, scope)
        yield* evaluateAsync(ast, scope)
    }
    private useSyncEvaluator(ast:Program,scope:Scope) {
        hoist(ast, scope)
        evaluate(ast, scope)
    }

    public run(code: string | AcornNode | EsNode):void {
        const ast = typeof code === 'string' ? this.parse(code) : code

        const versionHandlesTopAwait = (
            this.options.ecmaVersion === 'latest'|| 
            this.options.ecmaVersion >= 13
        )
        const useAsyncForTopLevel = (
            versionHandlesTopAwait &&
            (this.options.sourceType === 'module')
        );

        if (useAsyncForTopLevel){//this branch will fire and forget the promise. 
            runAsync(this.useGenEvaluator(ast as Program,this.rootScope))
        }else {
            this.useSyncEvaluator(ast as Program,this.rootScope)
        }
    }
}