import { getOwnNames, createSandBox, globalObj  } from './share/util.ts'
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
    this.options.ranges = true;
    this.options.locations = true;
    this.options.preserveParens = false;

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
//*-----------------MY MONITOR-------------------------------------------------------------------------
// the monitor is only very fast because it does zero unnecessary allocations

import chalk from "chalk";
import { Demand, LangListener,Reusables, ScopeForEvent,SupplyForDemand, VariableForEvent, SvalShop, UserShop, Fn, captures } from './monitored-events.ts'

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
        variables:{
            search:(name:string):VariableForEvent | null =>{
                const variable = this.reusables.svalScope!.find(name);
                if (variable === null) return null;
                
                const variableForEvent = {
                    value:()=>variable.get()
                }
                return variableForEvent
            },
            local:()=>this.reusables.svalScope!.getContext()
        },
        depth:()=>this.reusables.svalScope!.getDepth()
    }
    public shop:SvalShop = {
        sales:0,
        demand:(demand,onSupply)=>{
            const node = this.reusables.node!;
            if ((demand === "Any") || (node.type === demand)) {
                const supplyForDemand = this.supplyForDemand! as unknown as SupplyForDemand<typeof demand>
                supplyForDemand(demand,onSupply,node,this.scopeForEvent);
                this.shop.sales += 1;
            }
        },
    }
    public userShop:UserShop = {
        demand:this.shop.demand,
        sales:()=>this.shop.sales
    }
    public setSupplyForDemand = (fn:SupplyForDemand<Demand>)=> {
        this.supplyForDemand = fn;
    }
}
declare const __brand: unique symbol;

// 2. Create a reusable Brand utility
export type Brand<T, B> = T & { readonly [__brand]:B };
export type MonitoredFn<T extends Fn> = Brand<T,'MonitoredFn'>

const monitoredFns = new WeakMap<Fn,SvalPlus>();//to allow for garbage collection

const Colors = {
    orange:chalk.hex('#f6c098')
};

export const monitor = {
    header:(fn:MonitoredFn<Fn>,cb:Fn)=>{
        if (!monitoredFns.has(fn)) {
            throw new Error(chalk.red(`The beforeMonitoring hook of the monitor can only be used on a monitored function`))
        }
        const interpreter = monitoredFns.get(fn)!
        if (interpreter.fnBeforeMonitoring !== null) {
            throw new Error(chalk.red(`You can only set the function called before monitoring once.`))
        }
        interpreter.fnBeforeMonitoring = cb;
    },
    fn<T extends Fn>(fn:T,listener:LangListener):MonitoredFn<T> {
        if (monitoredFns.has(fn)) {
            throw new Error(chalk.red(`You cannot monitor a monitored function`))
        }
        const interpreter = new SvalPlus({
            listener,
            options:{
                ecmaVer:2024, // Match your tsconfig target
                sandBox: true, // Standard for eDSLs/Sandboxes,
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
                        Colors.orange(`\n-Monitored functions cannot access any non-default global variable.It must be passed as an argument.\n-If its an external closure,the caller's details but not the internals,will be tracked by the monitor.\n-You can use monitored closures if you want to capture any global variable into the monitored function once.`) +
                        chalk.red.underline(`\n\nTrace`) + `\n${err}`
                    )
                }else throw err;
            }
        }) as MonitoredFn<T>;

        monitoredFns.set(newFn,interpreter);
        return newFn ;
    },
    closure:<T extends Record<any,any>,U extends Fn>(variables:T,fn:U,listener:LangListener)=> {
        const capture = new Capture(variables);
        return capture.closure(fn,listener);
    }
}
class Capture {
    public capturedScope:Record<any,any> = Object.create(null);

    constructor(capturedScope:Record<any,any>) {
        this.capturedScope = Object.assign(this.capturedScope,capturedScope);
    }
    public closure = <T extends Fn>(fn:T,listener:LangListener):MonitoredFn<T> => {
        const monitoredFn = monitor.fn(fn,listener);
        captures.set(monitoredFns.get(monitoredFn)!,this);
        return monitoredFn;
    }
}
export { Var } from './scope/variable.ts'

export {
    type LangListener,
    type VariableForEvent,
    type ScopeForEvent,
    type Demand,
    type Supply,
    type UserShop,

    //the reason why i didnt export these as just types is because of instance-of checks
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