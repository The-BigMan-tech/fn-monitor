# Contributing to fn-monitor

This document outlines the architectural invariants, design decisions, and 
contribution guidelines for `fn-monitor`. All contributions — whether bug fixes, 
features, or refactors — will be evaluated against these rules to preserve the 
library's identity and the trust of its users.

## Purpose Limitations

Do not expand this into a script-level or module-level monitor. Doing so will 
break the hidden function-context assumptions used throughout this codebase.

## TypeScript Complaints

Parts of the codebase that consist of pure, unmodified `sval` code may have 
TypeScript complaints. Since they function correctly, they have been left as-is 
to preserve the original behavior and are marked with `@ts-nocheck`.

## EsNode Export

The `@types/estree` package is intentionally installed as a production dependency 
(not a devDependency) because the codebase directly exports its `Node` type as 
`EsNode` for public intellisense. This prevents users from having to install an 
extra package just to get full type support.

## Interpreter Implementation

- The package will continue to use AST-walking to interpret code and will not 
  transition to a bytecode implementation.

- This is an intentional architectural choice: AST-walking preserves the high-level 
  node structure, allowing the `inspector` hook to intercept, mutate, and query 
  individual nodes mid-execution — something a compiled bytecode VM cannot easily 
  replicate.

## Sval Compatibility

- The extended interpreter class, `SvalPlus`, is a dual-mode wrapper around Sval.
  It is NOT a pure superset (like TypeScript over JavaScript). Instead, it 
  operates in one of two mutually exclusive modes determined by whether the 
  `useExtensions` flag is set to `true` in the constructor arguments.

  - **Backward-compatible mode:** Extensions disabled. Identical to Sval and used 
    solely to run the inherited sval test suite unmodified.

  - **Monitoring mode:** Extensions enabled. Used by `monitor()` and all 
    user-facing code.

  These modes cannot be mixed within a single execution context.

- In backward-compatible mode, `SvalPlus` must act as a strict drop-in 
  replacement for `Sval`. Its constructor and public API must be strictly 
  identical or additive to ensure upstream `sval` test suites run seamlessly.

- Avoid breaking changes to core internals unless rigorously tested to 
  preserve compatibility (e.g., the evaluator modifications).

- As a result of this compatibility, you will see `acorn` and `estree` node 
  types being used interchangeably. This introduces some type redundancy, but 
  it won't affect runtime behavior and is required to maintain upstream 
  compatibility.

## Intentional Parser Redundancy

The package uses `meriyah` to parse user functions for speed, but retains `acorn` 
to avoid breaking or heavily refactoring inherited `sval` code. While carrying 
two parsers might be viewed by some as "bloat", it is an intentional trade-off 
that guarantees stability and upstream compatibility without requiring a massive, 
risky rewrite of the core evaluator. Do not remove `acorn`.

## Test Coverage and Evaluator Architecture

- The interpreter has two evaluator implementations:
  1. **Normalized** (`evaluate_n` folder): Processes synchronous nodes.
  2. **Generator** (`evaluate` folder): Processes asynchronous nodes.

  Custom modifications live in their respective `index.ts` files; 
  everything else is inherited from `sval` and left untouched.

- Modifications also exist in the Scope class (`scope/index.ts`) and the 
  Sval class (`sval.ts`).

- **Test Suite Structure:**
  - `interpreter` tests: 200+ tests inherited from `sval`.
  - `modifications` tests: 60+ tests written for the custom modifications.

- **Modification Test Prefixes:**
  - `[Sync]`: Targets the normalized evaluator. (An `[Async]` counterpart should exist).
  - `[Async]`: Targets the generator evaluator. (A `[Sync]` counterpart should exist).
  - `[Sync-only]`: Strictly for the normalized evaluator. (No async counterpart needed).
  - `[Async-only]`: Strictly for the generator evaluator. (No sync counterpart needed).
  - `[Wrap]`: Tests the wrapping/parsing step, not runtime execution.

- **Coverage Status:**

  Because each evaluator has its own copy of the node handlers, tests must be 
  explicitly written to cover both the generator and the normalized evaluator 
  individually.

  Most tests in both the `interpreter` and `modifications` suites are currently heavily 
  skewed toward the normalized evaluator and coverage for the generator version is 
  incomplete. This means that a change to the generator version can pass the entire 
  test suite while silently breaking it. 

  **Passing the suite is NOT proof that the async path is unaffected.**

  The goal is to ensure that for all modification tests, `[Sync]` tests have 
  `[Async]` equivalents and vice versa. Contributions that help close this 
  coverage gap are especially welcome.

  As for the interpreter tests, plans to complete coverage are postponed until 
  modification tests have received full coverage.

## Environment-Agnostic Runtime

This package must not use any runtime dependency specific to a particular 
environment (Node.js, Deno, Bun, browser, etc.). It should run in any JavaScript 
runtime that supports ES2024. This ensures portability and prevents environment 
lock-in.

## No Dynamic Import Support

This package will NOT support dynamic imports (`import()`). This is an intentional 
limitation documented in the README. Supporting dynamic imports would require 
implementing a module loader, which is out of scope for a function-level 
monitoring tool.

## Isolation vs. Hard Sandboxing

This package is NOT a security sandbox (like SES or LavaMoat). It will not chase 
hard sandboxing guarantees. However, contributions that enhance lexical isolation 
(like the hashed capture keys) are welcome, provided they do not violate the design 
philosophy as later outlined.

## ECMAScript (ES) Version Support & Upgrades

The package currently targets ES2024 (`ecmaVer: 2024`). The parser (`meriyah` 
with `next: true`) is configured to parse modern and upcoming ES features into 
an AST without issues.

However, *parsing* is only half the battle; the underlying evaluator (`sval`) 
must also know how to execute the resulting AST nodes.

When a new ECMAScript version is finalized:

- Do not simply bump the `ecmaVer` or assume support solely because the parser 
  succeeds.

- Contributors must verify that `sval`'s evaluator supports the new node types.
  
- If a new feature is parsed but cannot be evaluated by the interpreter, it must be patched  
  in **both** the normalized (`evaluate_n`) and generator (`evaluate`) folders (as outlined 
  in the "Test Coverage and Evaluator Architecture" section above) before the 
  target ES version can be officially bumped.

## Unminified, Unbundled Distribution

The `dist` folder is a direct mirror of the `src` folder. TypeScript files 
are compiled to `.js` and `.d.ts` files with no bundling, no minification, 
and no source maps.

This is an intentional decision, not a missing build step.

**Why:**

- **Transparency:** This package is an interpreter that executes arbitrary 
  JavaScript code. Users must be able to open `dist/` and read every line 
  of code that runs on their system. Minified output would undermine that 
  trust.

- **Debuggability:** Without minification, stack traces point directly to 
  readable code. Users can set breakpoints in `node_modules` and step 
  through the interpreter without needing source maps.

- **Tree-shaking:** Unbundled output allows downstream bundlers (webpack, 
  rollup, esbuild) to tree-shake unused modules. A single bundled file 
  would defeat this.

**Do not submit PRs that bundle, minify, or add source maps to the build 
output.** The transparency and debuggability of the unminified mirror is 
a deliberate safety decision that outweighs the marginal bundle size savings.

## Design Philosophy — The Decision Framework

`fn-monitor` prioritizes four values in strict order:

> **Safety > Control > Performance > Convenience**

This ordering is not aspirational — it is the decision framework behind every 
architectural choice in this codebase. When two values conflict, the 
higher-priority value always wins.

### Decision Checklist

When facing a new design decision, ask:

1. Does this compromise **safety**? If yes, **reject it**.
2. Does this reduce user **control**? If yes, only accept it if safety demands it.
3. Does this hurt **performance**? If yes, only accept it if safety and control 
   are unaffected.
4. Does this sacrifice **convenience**? If yes, only accept it if safety, control, 
   and performance are all preserved.

### A Note on Safety Contributions

Safety is the highest priority, but this does not mean every change labeled 
"safety" is automatically welcome. A safety contribution must:

- Make incorrect behavior impossible or correct behavior easier, **without** 
  regressing Control or Performance.

- If regressing Control or Performance is truly unavoidable, it must address 
  a **concrete, demonstrable harm** — not a hypothetical one.

Contributions that violate either of these criteria will be rejected.