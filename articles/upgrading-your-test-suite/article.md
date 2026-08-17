---
title: Upgrade your Test Suite with fn-monitor
description: Combining Vitest with fn-monitor to assert not just what your functions return, but the work they actually do.
tags: javascript, typescript, testing, vitest
---

Modern JavaScript testing focuses heavily on testing public outputs and user behavior rather than chasing line-by-line or branch-by-branch coverage. This is because tests that check final outputs survive when you rewrite internal logic or change how a loop works, and they already catch the majority of regressions.

Despite this, if you write complex financial calculations, security rules, or state machines where an unhandled condition cannot be tolerated, then a green test on the final value is not the whole story. The same return value can be produced by two different executions — one correct, and one that silently skipped a critical step — and an assertion on the output alone cannot tell them apart. In those domains, you need to verify not just what the function returned, but the work it performed to get there.

That is the gap this article closes. We will combine Vitest with fn-monitor — a function-level execution monitor — and upgrade a suite from asserting outputs to asserting internal behavior: which calls ran, which were skipped, and which paths were taken.

## The project

The setup is deliberately minimal: two dependencies, one source file, one test file, and a handful of config lines. Create a folder (we'll call it `vitest-with-monitor`) with this structure:

```text
vitest-with-monitor/
├── src/
│   └── index.ts
├── tests/
│   └── index.test.ts
├── .gitignore
├── vitest.config.ts
└── package.json
```

## Setup

Install the two dependencies:

```shell
npm add -D vitest
npm add @typescript-guy/fn-monitor
```

Add node_modules to your .gitignore and write a minimal config:

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        include: ['tests/**/*.test.ts'],
    },
});
```

Setup is done. In the next section, we'll write the code under test. If you want to compare against the finished code, the full project is in the [repository](https://github.com/The-BigMan-tech/vitest-with-monitor)