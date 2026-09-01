# Edge Cases & Advanced Behavior 🔍

This document covers specific interpreter behaviors, edge cases, and toolchain interactions in `fn-monitor`:

1. **`Visit` Object Nuances:**
   
   - `visit.is()` does **not** register a persistent hook for future nodes. It is an **immediate, single-use check** against the current node being evaluated. Once checked, the callback is discarded. This keeps the interpreter fast and memory-efficient.

   <a id="deprecated-perExecution-hook"></a>

   - `visit.perExecution` is a single-slot API. Each assignment silently overwrites the previous owner and closure. The same behavior can be achieved more explicitly with `visit.execute()`. See [the migration guide](https://github.com/The-BigMan-tech/fn-monitor/blob/master/examples/migrating-from-perExe.ts). *Note: This property is deprecated and will be removed in a future major release.*

   - `visit.localExeStack()` is ephemeral; it is mutated and cleared as the interpreter moves between node subtrees. Copy or harvest elements immediately if you need persistent history. See this [example](https://github.com/The-BigMan-tech/fn-monitor/blob/master/README.md#getting-the-full-execution-history-of-a-function-call)

2. **`ScopeForEvent` Nuances:**
   
   - **Type vs. Runtime Class:** `ScopeForEvent` defines the compile-time contract for the scope. At runtime, the actual class implementing it may have a different name (e.g., `EventScope`), which is what you will see when logging the object.
  
   - **Snapshot Safety:** Reassigning top-level properties on `variables.local` is safe and has no effect on the interpreter's execution. However, the values are not deeply copied. Mutating an object’s nested properties *will* cause side effects in your live application code.
   
   - **Lexical Depth Counter:** It is strictly relative to the `main` or an `embedded` function. Entering the scope of any function defined **inside** them will not reset it to 0. This static mapping provides maximum stability for the interpreter and avoids a whole class of runtime edge cases. If you need the nesting depth relative to a specific nested helper, see this [example](https://github.com/The-BigMan-tech/fn-monitor/blob/master/examples/lexical-anchoring.ts) to utilize the package's API to build your own solutions.
  
3. **AST Mutation Persistence:** Because the code is parsed into an AST only once, any mutations made to an AST node within the `inspector` hook will persist. This mutation will affect all subsequent calls, as well as any new monitored functions that share the same cached AST.

4. **Wrapper Constraints:** A monitored function cannot be passed to the `ref` property of either `main` or any function within `embed` when creating *another* monitored function. However, you *can* include an already-monitored function in any of the `captures` objects, as it will be treated like a native object outside the interpreter's context.

5. **Monitoring Native Generators (`function*`):** Although you can directly pass a generator to `main.ref`, calling the monitored function immediately returns an Iterator object without executing the body. The interpreter cannot intercept any of its code during subsequent `.next()` calls because they are driven by the native JS engine.
   
   > 💡 **Tip:** There is a workaround. 
   >
   > If a monitored sync or async function **consumes** a generator that was **embedded** (rather than captured), the generator's internals — including `YieldExpression` nodes — become visible to the `inspector`. See the [workaround example](https://github.com/The-BigMan-tech/fn-monitor/blob/master/examples/generator-workaround.ts) for a quick demonstration.

<a id="monitoring-methods"></a>

6. **Monitoring Class/Instance Methods:** 

   - **Syntax Rules:** You can monitor methods, but they must **not** be defined using shorthand syntax (`myMethod() {}`). It will throw a `WrapperError`. Only arrow function syntax (`myMethod = () => {}`) and function expression syntax (`myMethod = function() {}`) will work. If the package tried to handle shorthand syntax, it would force the internal code generator to parse complex edge cases (getters, setters, constructors), which is highly error-prone. 
 
   - **Preserving the `this` Context:** The correct way to safely monitor an instance method while preserving its `this` context is to use the dedicated `bind` property when setting up the monitored function. See this [example](https://github.com/The-BigMan-tech/fn-monitor/blob/master/examples/monitoring-methods.ts).
    
   > ⚠️ **Warning:** You **cannot** pass `obj.method.bind(obj)` directly to a `ref` property. It will throw a `WrapperError` 
   >
   > This is because it injects invalid syntax (e.g., `const bound methodName = ...`) and JavaScript engines permanently conceal the source code of bound functions making AST extraction impossible.

7. **Dynamic Imports:** The interpreter intentionally does not support dynamic `import()` calls within monitored functions. Attempting to handle dynamic imports internally would lead to endless environment-specific bugs. It will throw an error if it detects them and you must lift your imports to the native scope and pass the resolved modules via the `captures` property. 
   
   > 💡 **The exact error you get depends on your toolchain.**
   >
   > `fn-monitor` can only detect an import if it still exists as an `ImportExpression` node when it parses your function's source code. It will throw a clear `ForbiddenDynamicImport` error for toolchains that preserve native `import()` (e.g., Node, Bun, tsx) . 
   >
   > However, some tools (e.g., jiti, Vite/Vitest, bundlers) rewrite `import()` into an internal helper call *before* the interpreter ever sees it. Because the import no longer exists in the source string, the failure surfaces as a `ReferenceError` for that tool's internal helper instead. Either way, the fix is the same: use `captures`.

8. **Complex External Dependencies:** Capturing entire library objects (which may rely on proxies, getters, or fluent chaining) or functions with hidden closure dependencies may throw an unexpected `TypeError` or `ReferenceError` at runtime. This occurs because the underlying interpreter cannot always preserve complex internal structures across the execution boundary. 

   > 💡 **Tip:** For these dependencies, there is a workaround. Instead of capturing the object or function itself, create a lightweight wrapper in your outer scope and capture the wrapper.
   >
   > See this [example](https://github.com/The-BigMan-tech/fn-monitor/blob/master/examples/handling-libraries.ts) for a quick demonstration.

9. **Build Tool Transformations:** Bundlers and JavaScript runtimes often transform source code before execution. This alters how `fn.toString()` behaves, meaning the AST nodes your inspector sees may structurally differ from the original code you wrote in your editor.

10. **AST Location (`loc`) Mapping:** The `loc` and `range` properties on the AST nodes map to an intermediate, generated code structure, not your original editor file or the formatted code generated from `sourceOut`. Relying on string slicing with these values is fragile. Instead, use the built-in `getSrc()` method of the event object to accurately generate the source code for that specific node.