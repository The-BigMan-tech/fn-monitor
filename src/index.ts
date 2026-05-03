import { getOwnNames, createSandBox, globalObj  } from './share/util.ts'
import { parse, Options, Node, Program } from 'acorn'
import { EXPORTS, IMPORT, STRICT } from './share/const.ts'
import Scope from './scope/index.ts'

import { runAsync } from './share/async.ts'
import { hoist as hoistAsync } from './evaluate/helper.ts'
import { hoist } from './evaluate_n/helper.ts'
import evaluateAsync from './evaluate/index.ts'
import evaluate from './evaluate_n/index.ts'
import { parse as meriyahParse,Options as MeriyahOptions } from 'meriyah';

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
//because the stack trace in the monitor isnt the same as the one it will be in a native environment,the stacktrace of the monitored function wont be helpful.It means that the unmonitored function must be used independently for debugging.But the langlistener will show a proper stack trace if it throws an error because its runs directly in the runtime,not the interpreter.

import chalk from "chalk";
import { LRUCache } from 'lru-cache'
import {sha256} from "js-sha256"
import { LangListener,Reusables, ScopeForEvent,VariableForEvent,Fn, createEvent, SvalVisit,SvalPlus as SvalPlusContract, UNASSIGNED, LAZY_NODE } from './monitored-events.ts'
import { isGenerator } from './monitor-functions.ts';
import jsBeatutify from "js-beautify";

class SvalPlus extends Sval implements SvalPlusContract {
    public langListener:LangListener | null = null;
    public fnBeforeEachCall:Fn | undefined = undefined;
    public astInUse:FnAst | null = null;

    public static readonly resultExport:string = 'result';
    public static readonly argsVar = SvalPlus.sha256Key('args');
    public static readonly capturesVar = SvalPlus.sha256Key('captures');
    private static fnAstCache =  new LRUCache<string,FnAst>({ max: 400 });

    constructor(args:{listener:LangListener,options:SvalOptions,fnBeforeEachCall:Fn | undefined}) {
        super(args.options);
        this.fnBeforeEachCall = args.fnBeforeEachCall;
        this.langListener = args.listener;
    }
    public reusables:Reusables = {
        evalStack:0,
        svalScope:null,
        node:null,
        result:UNASSIGNED,
        thrown:UNASSIGNED,
        handler:null
    }
    public scopeForEvent:ScopeForEvent = {
        variables:{
            search:(name:string):VariableForEvent | null =>{
                const variable = this.reusables.svalScope!.find(name);
                if (variable === null) return null;
                
                const variableForEvent = { value:()=>variable.get() }
                return variableForEvent
            },
            local:()=>this.reusables.svalScope!.scopeContext
        },
        parent:()=>this.reusables.svalScope!.scopeParent,//it has to be a method to always use the latest scope
        depth:()=>this.reusables.svalScope!.getDepth()
    }
    public svalVisit:SvalVisit = {
        matched:false,
        is:(query,cb)=>{//the monitor will only create the event object for a node if it meets the demand.using this method is an alternative to instanceof checks
            const node = this.reusables.node!;
            if ((query === "Any") || (node.type === query)) {
                cb(createEvent(query,node,this));
                this.svalVisit.matched = true;
            }
        },
    }
    public visit = {//Even if each listener gets a shared visit object that reflects the latest values for performance,i wont freeze its properties to allow possible external wrappers to customize it
        is:this.svalVisit.is,
        matched:()=>this.svalVisit.matched,
        execute:()=>{
            const handler = this.reusables.handler;
            if (handler !== null) {
                let resultToRetun:typeof UNASSIGNED | any = UNASSIGNED;
                try {
                    if (this.reusables.result !== UNASSIGNED) {
                        throw new Error(chalk.red(`A node can only be executed once`))
                    }
                    this.reusables.result = handler(this.reusables.node!,this.reusables.svalScope!);
                    resultToRetun = isGenerator(this.reusables.result)
                        ?LAZY_NODE
                        :this.reusables.result
                }catch(e) {
                    if (e instanceof Error) {
                        throw e
                    }else {
                        this.reusables.thrown = e;//this catches throws that arent errors like symbol throwing for domain purposes
                    }
                }
                return resultToRetun
            }
        }
    }
    public getFnSrc(fn:Fn,capturesVar:string):FnSrc  {
        const fnString = fn.toString();
        const hash = SvalPlus.sha256Key(fnString);
        const isDeclaration = /^(async\s+)?function(\s*\*|\s+|$)/.test(fnString);

        const intermediateFn:string = 'intermediateFn_' + hash;
        let intermediateFnCode:string = '';

        if (isDeclaration) {//handle function definition
            intermediateFnCode = `\nconst ${intermediateFn} = (()=>{
                ${fnString};
                return ${fn.name}
            })();`
        }else {//handle unassigned anonymous functions
            intermediateFnCode = `\nconst ${intermediateFn} = ${fnString};`
        }  

        const capturedKeys = (capturesVar !== null) ?Object.keys(this.exports[capturesVar]).sort():[];//i used sort here to increase the cache hit rate
        const storeCaptures = (capturedKeys.length > 0) 
            ?`\nconst {${capturedKeys.join(',')}} = exports.${capturesVar};`
            :'';

        const finalFnName = (fn.name.length > 0)?fn.name:'anonymousFn_' + hash;
        const finalFnCode = `\nconst ${finalFnName} = (()=>{
            ${storeCaptures}
            ${intermediateFnCode}
            return ${intermediateFn};
        })();`

        return { 
            fnCode:finalFnCode,
            fnName:finalFnName 
        };
    }
    public getInlinedFunctions(inlineFns:Record<string,Metadata<Fn>> | undefined):string {
        let fnCode:string = '';

        if (inlineFns !== undefined) {
            let declarations = '';
            let assignments = '';

            for (const [index,name] of Object.keys(inlineFns).sort().entries()) {//used sort here to increase the cache hit rate
                const inlineFn = inlineFns[name];

                const inlineCapturesVar = SvalPlus.sha256Key(`inlineCaptures_${index}`)
                this.exports[inlineCapturesVar] = inlineFn.captures || Object.create(null);

                const inlineFnSrc = this.getFnSrc(inlineFn.ref,inlineCapturesVar);//passing undefined here prevents infinite recursion

                //doing this ensures that functions with the same but different namespaces dont collide and that they wont be unexpectedly accessible in the monitored fn
                const scopedFn = `(()=>{ 
                    ${inlineFnSrc.fnCode}
                    return ${inlineFnSrc.fnName};
                })();`
                declarations += `\nvar ${name};`;
                assignments += `\n${name} = ${scopedFn};`;
            }
            // Prepend inlined logic so it's available to the main function
            fnCode = declarations + assignments;
        }
        return fnCode;
    }
    public getMonitoredFn = (...args:any[])=>{
        if (this.fnBeforeEachCall !== undefined) {
            this.fnBeforeEachCall(...args);
        }
        try {
            this.import({ [SvalPlus.argsVar]:args });
            this.run(this.astInUse!.fnCall);
            return this.exports[SvalPlus.resultExport];
        }catch(err) {
            if (err instanceof ReferenceError) {
                throw new Error(SvalPlus.refErrMsg(err))
            }else throw new Error(chalk.red.underline(`\nError in Monitored Function:`) + `\n${err}`);
        };
    }
    public static meriyahParseOptions:MeriyahOptions = {
        module:false,    //Since im just parsing functions,i dont need the extra overhead of a module parser
        next: true,      // Modern ES support
        loc: true,       // Essential for your shop.demand tracking
        ranges: true,    // Good for error reporting
        lexical: true    // Helps Sval understand 'let/const' vs 'var'
    }
    public static defaultOptions:SvalOptions = {
        sourceType:"script",//use the normalized and faster evaluator at the cost of not using esm import syntax which i dont even need anyway in a function.And some of the monitor's generated code wont work with modules
        ecmaVer:2024, 
        sandBox: true, // Standard for eDSLs/Sandboxes,
    };
    public static sha256Key(str:string):string {
        return 'generated_' + sha256.create().update(str).hex();
    }
    public static getFnAst(fnSrc:FnSrc):FnAst {
        const fnCodeHash = SvalPlus.sha256Key(fnSrc.fnCode);
        const cached = SvalPlus.fnAstCache.get(fnCodeHash);
        if (cached) {
            return cached;
        }
        const fnCodeAst = meriyahParse(fnSrc.fnCode, SvalPlus.meriyahParseOptions);
        const fnCallAst = meriyahParse(`\nexports.${SvalPlus.resultExport} = ${fnSrc.fnName!}(...${SvalPlus.argsVar});`, SvalPlus.meriyahParseOptions);
        
        const ast = { fnCode: fnCodeAst as Node, fnCall: fnCallAst as Node };
        SvalPlus.fnAstCache.set(fnCodeHash, ast);

        return ast;
    }
    public static refErrMsg(err:ReferenceError) {
        return (
            chalk.red.underline(`\nReference Error`) +
            Colors.orange(`\n-Monitored functions cannot access data outside the isolated interpreter.\n\n-The data must be either be passed as an argument on each call,captured into the monitored fn on creation or have its source inlined if its a function.\n\n-Captured variables are handled outside the interpreter and thus,outside the monitor's tracking system but inlined functions can be monitored.`) +
            chalk.red.underline(`\n\nTrace`) + `\n${err}`
        )
    }
}
const Colors = {
    orange:chalk.hex('#f6c098')
};
interface FnSrc {
    fnCode:string,
    fnName:string 
}
interface FnAst {
    fnCode:Node,
    fnCall:Node
}
declare const __brand: unique symbol;

// 2. Create a reusable Brand utility
export type Brand<T, B> = T & { readonly [__brand]:B };
export type MonitoredFn<T extends Fn> = Brand<T,'MonitoredFn'>;

interface Metadata<T extends Fn> {
    ref:T extends MonitoredFn<Fn> ? never : T,
    captures?:Record<string,any>
}
interface MonitorFnSetup<T extends Fn> {
    main:Metadata<T>,
    listener:LangListener,
    inlineFunctions?:Record<string,Metadata<Fn>>
    beforeEachCall?:(...args:Parameters<T>)=>void
}

//the paradigm for monitored functions is one interpreter per function to ensure complete isolation,predictability and zero side effects across different functions
//The monitor uses an ast walker interpreter to walk cuz a bytecode version will make it impossible to setup step by step monitoring

export const monitor = {
    fn<T extends Fn>(setup:MonitorFnSetup<T>):MonitoredFn<T> {
        const {ref:fn,captures} = setup.main;
        const {listener,beforeEachCall,inlineFunctions} = setup;

        const interpreter = new SvalPlus({
            listener,
            fnBeforeEachCall:beforeEachCall,
            options:SvalPlus.defaultOptions
        });
        interpreter.exports[SvalPlus.capturesVar] = captures || Object.create(null);

        const fnSrc = interpreter.getFnSrc(fn,SvalPlus.capturesVar);
        fnSrc.fnCode += interpreter.getInlinedFunctions(inlineFunctions);

        const ast = SvalPlus.getFnAst(fnSrc);
        interpreter.run(ast.fnCode);

        // console.log(jsBeatutify(fnSrc.fnCode,{indent_size:4})); //for debubgging the generated code
        interpreter.astInUse = ast;
        return interpreter.getMonitoredFn as MonitoredFn<T>;
    },
}

export { Var } from './scope/variable.ts'

export {
    type LangListener,
    type VariableForEvent,
    type ScopeForEvent,
    type Query,
    type EventMap,
    type Visit,

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
    NewExprEvent,
    ArrowFnExprEvent,
    TernaryExprEvent,
    YieldExprEvent,

    // Statements & Control Flow
    ReturnStmtEvent,
    IfStmtEvent,
    SwitchStmtEvent,
    ThrowStmtEvent,
    TryStmtEvent,
    CatchClauseEvent,
    LabeledStmtEvent,
    BreakStmtEvent,
    ContinueStmtEvent,

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