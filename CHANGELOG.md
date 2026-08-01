
## v1.2.0...v1.2.1

[compare changes](https://github.com/The-BigMan-tech/fn-monitor/compare/v1.2.0...v1.2.1)

### 🩹 Fixes

- Capture the local reusables in the generator evaluator after advancing the generator. ([036f20b](https://github.com/The-BigMan-tech/fn-monitor/commit/036f20b))
- Make the generator evaluator to always copy the reusables ([cebd28c](https://github.com/The-BigMan-tech/fn-monitor/commit/cebd28c))
- Bump to v1.2.1 ([36b9deb](https://github.com/The-BigMan-tech/fn-monitor/commit/36b9deb))

### ♻️ Refactor

- **types:** Improve type quality of the handler function in the evaluators ([e05415e](https://github.com/The-BigMan-tech/fn-monitor/commit/e05415e))

### 📖 Documentation

- Update the changelog ([0688716](https://github.com/The-BigMan-tech/fn-monitor/commit/0688716))
- Improve maintainer's note ([52cb77b](https://github.com/The-BigMan-tech/fn-monitor/commit/52cb77b))

### ❤️ Contributors

- The-BigMan-tech

## v1.1.5...v1.2.0

[compare changes](https://github.com/The-BigMan-tech/fn-monitor/compare/v1.1.5...v1.2.0)

### 🚀 Features

- **YieldExprEvent:** ⚠️  Remove the YieldExprEvent because the package cannot monitor generators. ([eb5a78a](https://github.com/The-BigMan-tech/fn-monitor/commit/eb5a78a))
- Bump to v1.2.0 ([b01b549](https://github.com/The-BigMan-tech/fn-monitor/commit/b01b549))

### ⚡ Performance

- Lift a string used in a check to a constant ([56320df](https://github.com/The-BigMan-tech/fn-monitor/commit/56320df))
- Conditionally created the fnCall string ([5c72eaf](https://github.com/The-BigMan-tech/fn-monitor/commit/5c72eaf))
- Skip unnecessary copy op at root nodes ([58cdc02](https://github.com/The-BigMan-tech/fn-monitor/commit/58cdc02))

### 🩹 Fixes

- Make the string pre-processor to properly handle anonymous function declarations and not just arrow functions ([27b7ea9](https://github.com/The-BigMan-tech/fn-monitor/commit/27b7ea9))
- Ensured that the onStep hook is fired the exact number of times as the inspector hook ([6cf7b8a](https://github.com/The-BigMan-tech/fn-monitor/commit/6cf7b8a))
- Ensure that monitored funcs run in strict mode ([965cac9](https://github.com/The-BigMan-tech/fn-monitor/commit/965cac9))

### ♻️ Refactor

- Heavily improve the SvalPlus class ([f6a692d](https://github.com/The-BigMan-tech/fn-monitor/commit/f6a692d))
- Remove a type annotation that leaves clutter ([3f05e0f](https://github.com/The-BigMan-tech/fn-monitor/commit/3f05e0f))
- Simplify two lifecycle functions ([c961579](https://github.com/The-BigMan-tech/fn-monitor/commit/c961579))
- Remove an unnecessary null assertion ([d1662f0](https://github.com/The-BigMan-tech/fn-monitor/commit/d1662f0))
- Improve the reference error message ([bf798f1](https://github.com/The-BigMan-tech/fn-monitor/commit/bf798f1))
- Remove unnecessary IIFE and regex in the pre-processing step. ([08fb5f9](https://github.com/The-BigMan-tech/fn-monitor/commit/08fb5f9))
- Tweak the code generation ([fd6b54a](https://github.com/The-BigMan-tech/fn-monitor/commit/fd6b54a))
- Add a newline in the generated string ([d5879c0](https://github.com/The-BigMan-tech/fn-monitor/commit/d5879c0))
- Tweak the inspector type ([d87c7c9](https://github.com/The-BigMan-tech/fn-monitor/commit/d87c7c9))
- Restructure how the normalized evaluator branches ([555c899](https://github.com/The-BigMan-tech/fn-monitor/commit/555c899))
- Improve the formatting of a ternary ([a79a87c](https://github.com/The-BigMan-tech/fn-monitor/commit/a79a87c))
- Apply a parallel refactor of the normalized evaluator to the generator version ([d57e315](https://github.com/The-BigMan-tech/fn-monitor/commit/d57e315))

### 📖 Documentation

- **readme:** Clarify the behaviour of visit.is ([b0b1052](https://github.com/The-BigMan-tech/fn-monitor/commit/b0b1052))
- **readme:** Make it more concise and clear ([8fcdde9](https://github.com/The-BigMan-tech/fn-monitor/commit/8fcdde9))
- Improve example 3 in the README and script ([faf3793](https://github.com/The-BigMan-tech/fn-monitor/commit/faf3793))
- **readme:** Note that the package cannot monitor generators ([309201d](https://github.com/The-BigMan-tech/fn-monitor/commit/309201d))
- **comment:** Adjust a docstring ([e51c8cb](https://github.com/The-BigMan-tech/fn-monitor/commit/e51c8cb))
- Improve the test coverage note for the maintainer ([f466597](https://github.com/The-BigMan-tech/fn-monitor/commit/f466597))
- Improve maintainer note on test coverage ([35e939a](https://github.com/The-BigMan-tech/fn-monitor/commit/35e939a))
- Further clarify the visit.is behaviour ([c2cab29](https://github.com/The-BigMan-tech/fn-monitor/commit/c2cab29))
- Add to the clarity ([5f4f2f2](https://github.com/The-BigMan-tech/fn-monitor/commit/5f4f2f2))
- Comment on the esnode type export for maintainers ([5676cf0](https://github.com/The-BigMan-tech/fn-monitor/commit/5676cf0))
- **readme:** Add a note on the EsNode type ([e3a1f90](https://github.com/The-BigMan-tech/fn-monitor/commit/e3a1f90))
- **readme:** Clarify the different properties of scope.variables ([d4b25ea](https://github.com/The-BigMan-tech/fn-monitor/commit/d4b25ea))
- Update the test number mentioned in the maintainer's note ([e181b5c](https://github.com/The-BigMan-tech/fn-monitor/commit/e181b5c))
- **readme:** Add more context to how `captures` work ([7575bac](https://github.com/The-BigMan-tech/fn-monitor/commit/7575bac))
- Clarify the comment for labels in the SvalPlus class ([223159a](https://github.com/The-BigMan-tech/fn-monitor/commit/223159a))
- Properly format the examples ([46e11f3](https://github.com/The-BigMan-tech/fn-monitor/commit/46e11f3))
- **readme:** Adjust the examples ([cfd573a](https://github.com/The-BigMan-tech/fn-monitor/commit/cfd573a))
- Include one more example and shorten example 3 ([1be1ff1](https://github.com/The-BigMan-tech/fn-monitor/commit/1be1ff1))
- **readme:** Update an import statement ([f2d4f36](https://github.com/The-BigMan-tech/fn-monitor/commit/f2d4f36))
- **readme:** Small tweak ([6f6ad71](https://github.com/The-BigMan-tech/fn-monitor/commit/6f6ad71))
- Improve architectural note for maintainers ([b8f705b](https://github.com/The-BigMan-tech/fn-monitor/commit/b8f705b))
- **readme:** Give the README a final polish ([2d1d23b](https://github.com/The-BigMan-tech/fn-monitor/commit/2d1d23b))

#### ⚠️ Breaking Changes

- **YieldExprEvent:** ⚠️  Remove the YieldExprEvent because the package cannot monitor generators. ([eb5a78a](https://github.com/The-BigMan-tech/fn-monitor/commit/eb5a78a))

### ❤️ Contributors

- The-BigMan-tech

## v1.1.4...v1.1.5

[compare changes](https://github.com/The-BigMan-tech/fn-monitor/compare/v1.1.4...v1.1.5)

### 🩹 Fixes

- Clean the exeStack after function evaluation ([3f72d82](https://github.com/The-BigMan-tech/fn-monitor/commit/3f72d82))
- Remove the redundant exe stack clean up method. ([f1ecdd1](https://github.com/The-BigMan-tech/fn-monitor/commit/f1ecdd1))
- Properly push the result of the current node to the head of the exe stack ([eacd53e](https://github.com/The-BigMan-tech/fn-monitor/commit/eacd53e))
- Bump to v1.1.5 ([61be4d4](https://github.com/The-BigMan-tech/fn-monitor/commit/61be4d4))

### 📖 Documentation

- Improve architectural notes for maintainers ([14b3a1f](https://github.com/The-BigMan-tech/fn-monitor/commit/14b3a1f))
- Improve architectural note ([5c00628](https://github.com/The-BigMan-tech/fn-monitor/commit/5c00628))
- Update readme to reflect new exported type ([1072ce4](https://github.com/The-BigMan-tech/fn-monitor/commit/1072ce4))
- **readme:** Clarify some notes ([712cdec](https://github.com/The-BigMan-tech/fn-monitor/commit/712cdec))
- Improve note for maintainer ([258f5dd](https://github.com/The-BigMan-tech/fn-monitor/commit/258f5dd))
- Fix mior mistake in the maintainer note ([39bb269](https://github.com/The-BigMan-tech/fn-monitor/commit/39bb269))
- Improve a jsdoc ([ea8c1c9](https://github.com/The-BigMan-tech/fn-monitor/commit/ea8c1c9))
- Add a warning to the pushResult function ([beda8b2](https://github.com/The-BigMan-tech/fn-monitor/commit/beda8b2))
- **readme:** Improve clarity and conciseness ([a278349](https://github.com/The-BigMan-tech/fn-monitor/commit/a278349))
- Add a warning comment ([cec4e1a](https://github.com/The-BigMan-tech/fn-monitor/commit/cec4e1a))

### ❤️ Contributors

- The-BigMan-tech

