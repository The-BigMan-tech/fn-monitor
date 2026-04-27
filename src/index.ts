import { getOwnNames, createSandBox, globalObj, assign } from './share/util.ts'
import { parse, Options, Node, Program } from 'acorn'
import { EXPORTS, IMPORT, STRICT } from './share/const.ts'
import Scope from './scope/index.ts'
import PkgJson from '../package.json' with { type: 'json' }

import { runAsync } from './share/async.ts'
import { hoist as hoistAsync } from './evaluate/helper.ts'
import { hoist } from './evaluate_n/helper.ts'
import evaluateAsync from './evaluate/index.ts'
import evaluate from './evaluate_n/index.ts'

export interface SvalOptions {
  ecmaVer?: Options['ecmaVersion']
  sourceType?: Options['sourceType']
  sandBox?: boolean
}

const latestVer = 15

function improveSyntaxError(err: SyntaxError & { pos?: number }, code: string): SyntaxError {
  if (typeof err.pos !== 'number' || !err.message.startsWith('Unexpected token')) return err
  const pos = err.pos
  const ch = pos < code.length ? code[pos] : undefined

  let ident: string | null = null

  if (ch !== undefined && /[a-zA-Z_$]/.test(ch)) {
    // error position is at the start of an identifier
    const m = code.slice(pos).match(/^[a-zA-Z_$][a-zA-Z0-9_$]*/)
    if (m) ident = m[0]
  } else if (ch === undefined || ch === '(') {
    // end of input or '(' — look backwards for a preceding identifier
    let end = pos
    while (end > 0 && /\s/.test(code[end - 1])) end--
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

class Sval {
  static version: string = PkgJson.version

  private options: Options = { ecmaVersion: 'latest' }
  private scope = new Scope(null, true,this)

  exports: Record<string, any> = {}

  constructor(options: SvalOptions = {}) {
    let { ecmaVer = 'latest', sandBox = true, sourceType = 'script' } = options

    if (typeof ecmaVer === 'number') {
      ecmaVer -= ecmaVer < 2015 ? 0 : 2009 // format ecma edition
    }

    if (ecmaVer !== 'latest' && ecmaVer !== 3 && (ecmaVer < 5 || ecmaVer > latestVer)) {
      throw new Error(`unsupported ecmaVer`)
    }

    this.options.ecmaVersion = ecmaVer as Options['ecmaVersion']
    this.options.sourceType = sourceType

    if (sandBox) {
      // Shallow clone to create a sandbox
      const win = createSandBox()
      this.scope.let('globalThis', win)
      this.scope.let('window', win)
      this.scope.let('self', win)
      // ES modules have undefined as the top-level this (strict mode)
      this.scope.let('this', sourceType === 'module' ? undefined : win)
    } else {
      this.scope.let('globalThis', globalObj)
      this.scope.let('window', globalObj)
      this.scope.let('self', globalObj)
      // ES modules have undefined as the top-level this (strict mode)
      this.scope.let('this', sourceType === 'module' ? undefined : globalObj)
    }

    this.scope.const(sourceType === 'module' ? EXPORTS : 'exports', this.exports = {})

    if (sourceType === 'module') {
      this.scope.const(STRICT, true)
    }
  }

  import(nameOrModules: string | Record<string, any>, mod?: any) {
    if (typeof nameOrModules === 'string') {
      nameOrModules = { [nameOrModules]: mod }
    }

    if (typeof nameOrModules !== 'object') return

    const names = getOwnNames(nameOrModules)

    for (let i = 0; i < names.length; i++) {
      const name = names[i]
      const modName = this.options.sourceType === 'module' ? IMPORT + name : name
      this.scope.var(modName, nameOrModules[name])
    }
  }

  parse(code: string, parser?: (code: string, options: Options) => Node) {
    if (typeof parser === 'function') {
      return parser(code, this.options)
    }
    try {
      return parse(code, this.options)
    } catch (err) {
      throw improveSyntaxError(err as SyntaxError & { pos?: number }, code)
    }
  }

  run(code: string | Node) {
    const ast = typeof code === 'string' ? this.parse(code) : code
    const scope = this.scope
    // check if top-level await supports
    if (this.options.sourceType === 'module' && (
      this.options.ecmaVersion === 'latest'
      || this.options.ecmaVersion >= 13
    )) {
      runAsync((function* () {
        yield* hoistAsync(ast as Program, scope)
        yield* evaluateAsync(ast, scope)
      })())
    } else {
      hoist(ast as Program, scope)
      evaluate(ast, scope)
    }
  }
}
//*-----------------MY LANGPOINT FUNCTION-------------------------------------------------------------------------
import chalk from "chalk";
import { Demand, LangListener, Products, Reusables, ScopeForEvent,SupplyForDemand, VariableForEvent } from './monitored-events.ts'

class SvalPlus extends Sval {
    public langListener:LangListener | null = null;
    public fnBeforeMonitoring:Fn | null = null;
    public supplyForDemand:null | SupplyForDemand<Demand> = null;

    constructor(args:{listener:LangListener,options:SvalOptions}) {
        super(args.options);
        this.langListener = args.listener;
    }
    public reusables:Reusables = {
        svalScope:null,
        node:null,
    }
    public scopeForEvent:ScopeForEvent = {
        find:(name:string):VariableForEvent | null =>{
            const variable = this.reusables.svalScope!.find(name);
            if (variable === null) return null;
    
            const variableForEvent = {
                value:()=>variable.get()
            }
            return variableForEvent
        }
    }
    public products:Products = {
        demand:(demand,onSupply)=>{
            const node = this.reusables.node!;
            if ((demand === "Any") || (node.type === demand)) {
                const supplyForDemand = this.supplyForDemand! as unknown as SupplyForDemand<typeof demand>
                supplyForDemand(demand,onSupply,node,this.scopeForEvent);
            }
        }
    }
    public setSupplyForDemand = (fn:SupplyForDemand<Demand>)=> {
        this.supplyForDemand = fn;
    }
}
type Fn = (...args:any[])=>any;
export type MonitoredFn<T extends Fn> = T & {
    beforeMonitoring:(fn:(...args:Parameters<T>)=>void) => void;
};

const monitoredFns = new WeakSet<Fn>();//to allow for garbage collection
const Colors = {
    orange:chalk.hex('#f6c098')
};

export const monitor = {
    fn<T extends Fn>(fn:T,listener:LangListener):MonitoredFn<T> {
        if (monitoredFns.has(fn)) {
            throw new Error(chalk.red(`You cannot monitor a monitored function`))
        }
        const interpreter = new SvalPlus({
            listener,
            options:{
                ecmaVer:2024, // Match your tsconfig target
                sandBox: true, // Standard for eDSLs/Sandboxes
            }
        });

        const fnString = fn.toString();
        let fnName = fn.name 
        let fnAssignment:string = '';

        if (fnName.length === 0) {
            const anonymous = 'anonymousFn';
            fnAssignment = `const ${anonymous} = ${fnString}`
            fnName = anonymous;
        }else if (!fnName.startsWith('function')) {
            fnAssignment = `const ${fnName} = ${fnString}`
        }else {
            fnAssignment = fnString;
        }

        interpreter.run(`${fnAssignment};`);
        
        const newFn = ((...args: any[]) => {
            if (interpreter.fnBeforeMonitoring !== null) {
                interpreter.fnBeforeMonitoring(...args);
            }
            try {
                interpreter.import({ args });
                interpreter.run(`exports.result = ${fnName}(...args);`);
                return interpreter.exports.result;
            }catch(err) {
                if (err instanceof ReferenceError) {
                    throw new Error(
                        chalk.red.underline(`\nReference Error`) +
                        Colors.orange(`\n-Monitored functions cannot access any non-default global variable.It must be passed as an argument.\n-If its a closure,the caller's details but not the internals,will be tracked by langListeners`) +
                        chalk.red.underline(`\n\nTrace`) + `\n${err}`
                    )
                }else throw err;
            }
        }) as MonitoredFn<T>;

        const fnBeforeMonitoring = (fn:Fn)=>{ 
            if (interpreter.fnBeforeMonitoring !== null) {
                throw new Error(chalk.red(`You can only set the function called before monitoring once.`))
            }
            interpreter.fnBeforeMonitoring = fn 
        };

        const propToDefine:keyof MonitoredFn<Fn> = "beforeMonitoring";
        Object.defineProperty(newFn,propToDefine, {
            value:fnBeforeMonitoring,
            writable: false,     // Prevents reassignment
            configurable: false, // Prevents deletion or changing attributes later
            enumerable: true     // Allows it to show up in loops
        });

        monitoredFns.add(newFn);
        return newFn ;
    }
}
export {
    type LangListener,
    type VariableForEvent,
    type ScopeForEvent,
    type Demand,
    type Supply,
    type Products,

    //Default Event
    LangEvent,

    // Expressions
    BinaryExprEvent,
    CallExprEvent,
    AssignExprEvent,
    UpdateExprEvent,
    LogicalExprEvent,
    MemberExprEvent,
    AwaitExprEvent,
    FuncExprEvent,

    // Statements & Control Flow
    ReturnStmtEvent,
    IfStmtEvent,
    SwitchStmtEvent,
    ThrowStmtEvent,
    TryStmtEvent,
    CatchClauseEvent,

    // Declarations
    VarDeclEvent,
    FuncDeclEvent,

    // Iteration
    ForStmtEvent,
    WhileStmtEvent,
    DoWhileStmtEvent,
    ForOfStmtEvent,
    ForInStmtEvent,

    // Data
    LiteralEvent
} from "./monitored-events.ts"