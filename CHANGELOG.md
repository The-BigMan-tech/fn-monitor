
## v1.3.0...v1.4.0

[compare changes](https://github.com/The-BigMan-tech/fn-monitor/compare/v1.3.0...v1.4.0)

### 🚀 Features

- Add a new property to the event's scope type to return the call stack size ([4b9603c](https://github.com/The-BigMan-tech/fn-monitor/commit/4b9603c))
- Bump to v1.4.0 ([7481f74](https://github.com/The-BigMan-tech/fn-monitor/commit/7481f74))

### ⚡ Performance

- Ensure that the depth of a scope object is only calculated once ([b1bcf46](https://github.com/The-BigMan-tech/fn-monitor/commit/b1bcf46))
- Make the .depth calculation O1 ([034e37f](https://github.com/The-BigMan-tech/fn-monitor/commit/034e37f))
- Prevented redundant lookups when calling inUserCode ([e3e7154](https://github.com/The-BigMan-tech/fn-monitor/commit/e3e7154))

### 🩹 Fixes

- Make the inUserCode function to use runtime calculations over an unreliable static value to check the boundary ([a14c530](https://github.com/The-BigMan-tech/fn-monitor/commit/a14c530))
- Scoped the depth calculation to individual Scope objects ([7b831db](https://github.com/The-BigMan-tech/fn-monitor/commit/7b831db))
- Adjust the func declr regex to ignore anonymous func expressions ([5e06470](https://github.com/The-BigMan-tech/fn-monitor/commit/5e06470))
- Make the funcDeclr regex check for generators ([bb4716d](https://github.com/The-BigMan-tech/fn-monitor/commit/bb4716d))
- Correct a variable in the inUserCode func that remained stale after a calculation. ([148e64f](https://github.com/The-BigMan-tech/fn-monitor/commit/148e64f))
- **callDepth:** Track runtime call stack dynamically rather than using a structural guess ([ec183f1](https://github.com/The-BigMan-tech/fn-monitor/commit/ec183f1))

### ♻️ Refactor

- Rename the properties in the Reusables type for clarity ([e89ed1f](https://github.com/The-BigMan-tech/fn-monitor/commit/e89ed1f))
- Rename a function for clarity ([0eed734](https://github.com/The-BigMan-tech/fn-monitor/commit/0eed734))
- **types:** Add strict type definitions for the evaluator ([bdc239b](https://github.com/The-BigMan-tech/fn-monitor/commit/bdc239b))
- Change an if-check to an assertion ([a53ba8e](https://github.com/The-BigMan-tech/fn-monitor/commit/a53ba8e))
- **types:** Make visit.execute return a union of LAZY_NODE ([9cad967](https://github.com/The-BigMan-tech/fn-monitor/commit/9cad967))
- **types:** Improve InspectorGenerator ([5992f66](https://github.com/The-BigMan-tech/fn-monitor/commit/5992f66))
- **types:** Update a function signature ([f522e27](https://github.com/The-BigMan-tech/fn-monitor/commit/f522e27))
- Re-indent the Scope class ([4e5df71](https://github.com/The-BigMan-tech/fn-monitor/commit/4e5df71))
- Improve an error msg and add a comment ([dcfc030](https://github.com/The-BigMan-tech/fn-monitor/commit/dcfc030))
- Lift a condition to a variable ([0a63d02](https://github.com/The-BigMan-tech/fn-monitor/commit/0a63d02))
- Rename some internal methods of the Scope class ([1b0c1db](https://github.com/The-BigMan-tech/fn-monitor/commit/1b0c1db))
- Modify a comment ([723f02e](https://github.com/The-BigMan-tech/fn-monitor/commit/723f02e))
- Lift a comment from the user's generated code ([f913fca](https://github.com/The-BigMan-tech/fn-monitor/commit/f913fca))
- Change the placement of a function ([79d981e](https://github.com/The-BigMan-tech/fn-monitor/commit/79d981e))
- Took the refErrMsg value in the EventScope class from an instance prop to a constant to prevent it from showing to the user ([f6652c7](https://github.com/The-BigMan-tech/fn-monitor/commit/f6652c7))

### 📖 Documentation

- **changelog:** Update CHANGELOG.md for v1.3.0 ([1bed3cf](https://github.com/The-BigMan-tech/fn-monitor/commit/1bed3cf))
- Update the maintainer's note ([18d0b80](https://github.com/The-BigMan-tech/fn-monitor/commit/18d0b80))
- Add a comment ([d54735c](https://github.com/The-BigMan-tech/fn-monitor/commit/d54735c))
- Improve maintainer's note ([b16ba47](https://github.com/The-BigMan-tech/fn-monitor/commit/b16ba47))
- **readme:** Clarify how depth works ([3de0ce2](https://github.com/The-BigMan-tech/fn-monitor/commit/3de0ce2))
- **readme:** Adjust a sentence ([2163989](https://github.com/The-BigMan-tech/fn-monitor/commit/2163989))
- **readme:** Adjust a sentence ([f6ced19](https://github.com/The-BigMan-tech/fn-monitor/commit/f6ced19))
- **readme:** Further clarify the depth and callDepth properties ([c6ecbaa](https://github.com/The-BigMan-tech/fn-monitor/commit/c6ecbaa))
- Document on the parser in the maintainer's note ([44bef3b](https://github.com/The-BigMan-tech/fn-monitor/commit/44bef3b))
- Mistakenly left out the new change to the maintainer's note from the last commit ([58115b8](https://github.com/The-BigMan-tech/fn-monitor/commit/58115b8))

### 🎨 Styles

- Adjust logo color ([9475fc3](https://github.com/The-BigMan-tech/fn-monitor/commit/9475fc3))
- Tweak the logo color ([28c2563](https://github.com/The-BigMan-tech/fn-monitor/commit/28c2563))

### ❤️ Contributors

- The-BigMan-tech

## v1.2.2...v1.3.0

[compare changes](https://github.com/The-BigMan-tech/fn-monitor/compare/v1.2.2...v1.3.0)

### 🚀 Features

- Add back support for YieldExprEvent. The reason will be later explained in the next few commits ([ad9bb8a](https://github.com/The-BigMan-tech/fn-monitor/commit/ad9bb8a))
- Bump to v1.3.0 ([2048d57](https://github.com/The-BigMan-tech/fn-monitor/commit/2048d57))

### 🩹 Fixes

- **core:** Resolve LAZY_NODE leak by tracking evaluator context ([0057580](https://github.com/The-BigMan-tech/fn-monitor/commit/0057580))

### ♻️ Refactor

- Remove the unnecessary heading in a ReferenceError message ([4f5628e](https://github.com/The-BigMan-tech/fn-monitor/commit/4f5628e))
- Remove double use of 'be' in an err msg ([43df293](https://github.com/The-BigMan-tech/fn-monitor/commit/43df293))
- Make the reference err msg more helpful ([ad0c933](https://github.com/The-BigMan-tech/fn-monitor/commit/ad0c933))
- Rename the lifecycle-functions file ([d8e8bea](https://github.com/The-BigMan-tech/fn-monitor/commit/d8e8bea))

### 📖 Documentation

<details>
<summary>Click to expand</summary>

- **changelog:** Update changelog.md for v1.2.2 ([9f2b76e](https://github.com/The-BigMan-tech/fn-monitor/commit/9f2b76e))
- **readme:** Bolden a subheading ([ae777b5](https://github.com/The-BigMan-tech/fn-monitor/commit/ae777b5))
- Add logo and polish README header ([a3d6296](https://github.com/The-BigMan-tech/fn-monitor/commit/a3d6296))
- Improve a comment in the vite config file ([dc8445c](https://github.com/The-BigMan-tech/fn-monitor/commit/dc8445c))
- Rename "How it Works" to "Mechanics" in the README and change the background color of the logo ([21daeb9](https://github.com/The-BigMan-tech/fn-monitor/commit/21daeb9))
- Include the articles in the repo and tweak a note in the README ([059ecb1](https://github.com/The-BigMan-tech/fn-monitor/commit/059ecb1))
- **article:** Add a period ([9778d9d](https://github.com/The-BigMan-tech/fn-monitor/commit/9778d9d))
- **article:** Add the cover image for the second article ([a111154](https://github.com/The-BigMan-tech/fn-monitor/commit/a111154))
- **article:** Rename a folder and add rough content for the second article ([d5d22dc](https://github.com/The-BigMan-tech/fn-monitor/commit/d5d22dc))
- **article:** Write a draft of the second article ([c20485e](https://github.com/The-BigMan-tech/fn-monitor/commit/c20485e))
- **article:** Polish the intro of the 2nd article ([d21670e](https://github.com/The-BigMan-tech/fn-monitor/commit/d21670e))
- **article:** Polish the body of the 2nd article ([aac4153](https://github.com/The-BigMan-tech/fn-monitor/commit/aac4153))
- **article:** Improve the title of the 2nd articl ([683667b](https://github.com/The-BigMan-tech/fn-monitor/commit/683667b))
- **article:** Improve the code example in the 2nd article ([9c6e757](https://github.com/The-BigMan-tech/fn-monitor/commit/9c6e757))
- **article:** Overhaul the 2nd article ([8f37d47](https://github.com/The-BigMan-tech/fn-monitor/commit/8f37d47))
- **article:** Add minor touches to the 2nd articl ([55cb961](https://github.com/The-BigMan-tech/fn-monitor/commit/55cb961))
- **readme:** Add a link to the articles ([e3ea1e5](https://github.com/The-BigMan-tech/fn-monitor/commit/e3ea1e5))
- **article:** Add final touches to the 2nd article ([0bb6a87](https://github.com/The-BigMan-tech/fn-monitor/commit/0bb6a87))
- **article:** Complete the ReferenceError output ([b9b5ad7](https://github.com/The-BigMan-tech/fn-monitor/commit/b9b5ad7))
- **article:** Add a period ([a33e0ed](https://github.com/The-BigMan-tech/fn-monitor/commit/a33e0ed))
- **article:** Fix the web workers tag ([621fade](https://github.com/The-BigMan-tech/fn-monitor/commit/621fade))
- **article:** Improve formatting of the lag handling article ([7066028](https://github.com/The-BigMan-tech/fn-monitor/commit/7066028))
- **article:** Heavily improve the ast mutation article ([3acf478](https://github.com/The-BigMan-tech/fn-monitor/commit/3acf478))
- **article:** Remove a comment in the preventing-hang article and place directly in its text ([4aeb078](https://github.com/The-BigMan-tech/fn-monitor/commit/4aeb078))
- **article:** Ast-mutation.md, add adjustments and restore back a block ([1269e72](https://github.com/The-BigMan-tech/fn-monitor/commit/1269e72))
- **article:** Ast-mutation.md, make final adjustments ([6683f7e](https://github.com/The-BigMan-tech/fn-monitor/commit/6683f7e))
- **article:** Ast-mutation.md, remove an extra space ([c065a13](https://github.com/The-BigMan-tech/fn-monitor/commit/c065a13))
- **article:** Preventing-hang.md, improve grammar ([70616c8](https://github.com/The-BigMan-tech/fn-monitor/commit/70616c8))
- **article:** Preventing-hang.md, add a space after a comma ([0f37d3c](https://github.com/The-BigMan-tech/fn-monitor/commit/0f37d3c))
- **examples:** Remove the showcase.ts file in favor of a more concise and cleaner version ([520612e](https://github.com/The-BigMan-tech/fn-monitor/commit/520612e))
- **examples:** Update the 2nd quick example to log the intercepted functions ([dc8e548](https://github.com/The-BigMan-tech/fn-monitor/commit/dc8e548))
- **readme:** Heavily improve the readme ([1ddb1bc](https://github.com/The-BigMan-tech/fn-monitor/commit/1ddb1bc))
- **readme:** Add minor touches ([e708ef8](https://github.com/The-BigMan-tech/fn-monitor/commit/e708ef8))
- **article:** Add a note explaining the constraints for the maintainer of the articles page ([1ddaccc](https://github.com/The-BigMan-tech/fn-monitor/commit/1ddaccc))
- **article:** Add final touches to the writer's note ([8d001ca](https://github.com/The-BigMan-tech/fn-monitor/commit/8d001ca))
- **readme:** Add a note about gen inspectors ([f751316](https://github.com/The-BigMan-tech/fn-monitor/commit/f751316))
- **readme:** Add emojis to the headings. ([7ce1f1c](https://github.com/The-BigMan-tech/fn-monitor/commit/7ce1f1c))
- **readme:** Uncollapse the quick examples section. The reason for collapsing it was to preserve space but it ruins the reader's experience ([7ba9aff](https://github.com/The-BigMan-tech/fn-monitor/commit/7ba9aff))
- **readme:** Remove a lingering details tag ([dda7f09](https://github.com/The-BigMan-tech/fn-monitor/commit/dda7f09))
- **readme:** Fix the details tag rendering for the quick example ([89a6d3f](https://github.com/The-BigMan-tech/fn-monitor/commit/89a6d3f))
- **readme:** Fix an internal markdown link ([9d4d65d](https://github.com/The-BigMan-tech/fn-monitor/commit/9d4d65d))
- **readme:** Add a badge for the CI ([c7d8b4c](https://github.com/The-BigMan-tech/fn-monitor/commit/c7d8b4c))
- **readme:** Add space between the badges ([ebcaf38](https://github.com/The-BigMan-tech/fn-monitor/commit/ebcaf38))
- **readme:** Add a note explaining the nuance about monitoring generators ([9ed12f1](https://github.com/The-BigMan-tech/fn-monitor/commit/9ed12f1))
- **readme:** Fix a broken link ([19f2fc0](https://github.com/The-BigMan-tech/fn-monitor/commit/19f2fc0))
- **readme:** Change a link's name ([d5c8267](https://github.com/The-BigMan-tech/fn-monitor/commit/d5c8267))
- **article:** Add a note for the article writer ([79e16c0](https://github.com/The-BigMan-tech/fn-monitor/commit/79e16c0))
- **articles:** Update the articles to reflect the new nuance discovered with generators ([13b929e](https://github.com/The-BigMan-tech/fn-monitor/commit/13b929e))
- **readme:** Explicitly document on branding and logo ([f455563](https://github.com/The-BigMan-tech/fn-monitor/commit/f455563))
- **readme:** Remove an extra bullet point ([0d2632f](https://github.com/The-BigMan-tech/fn-monitor/commit/0d2632f))
- **example:** Update the generator-workaround to use visit.is 'Any' to prevent type errors when pasting it to the v1.2.x series ([daa0bc4](https://github.com/The-BigMan-tech/fn-monitor/commit/daa0bc4))
- **example:** Add a comment to the workaround ([bc146e6](https://github.com/The-BigMan-tech/fn-monitor/commit/bc146e6))
- **example:** Improve the generator workaround ([1f29853](https://github.com/The-BigMan-tech/fn-monitor/commit/1f29853))
- **example:** Make the comment in the generator workaround example neater ([7dff485](https://github.com/The-BigMan-tech/fn-monitor/commit/7dff485))
- **readme:** Add another row of badges, improve a sentence. ([43faa7b](https://github.com/The-BigMan-tech/fn-monitor/commit/43faa7b))
- **readme:** Polish the README ([7e99751](https://github.com/The-BigMan-tech/fn-monitor/commit/7e99751))
- **readme:** Make extra grammar adjustments ([167b8d7](https://github.com/The-BigMan-tech/fn-monitor/commit/167b8d7))
- **readme:** Add table of contents ([2a0d33b](https://github.com/The-BigMan-tech/fn-monitor/commit/2a0d33b))
- **readme:** Visually pop up the tip to the examples file ([f33deb9](https://github.com/The-BigMan-tech/fn-monitor/commit/f33deb9))
- **readme:** Clarify the semantics of the exe stack ([673043d](https://github.com/The-BigMan-tech/fn-monitor/commit/673043d))
- **examples:** Rename a function in the generator workaround ([b513b97](https://github.com/The-BigMan-tech/fn-monitor/commit/b513b97))
- Update the package description ([580faaf](https://github.com/The-BigMan-tech/fn-monitor/commit/580faaf))
- **readme:** Add backticks to a word ([3f2a0d6](https://github.com/The-BigMan-tech/fn-monitor/commit/3f2a0d6))

</details>

### 🤖 CI

- Add GitHub Actions workflow to run the test suite ([6046eed](https://github.com/The-BigMan-tech/fn-monitor/commit/6046eed))
- Comment out the local repo in the .npmrc file ([6a74e6e](https://github.com/The-BigMan-tech/fn-monitor/commit/6a74e6e))
- Change install cmd in test file in an attempt to fix an issue ([ee70dde](https://github.com/The-BigMan-tech/fn-monitor/commit/ee70dde))
- Change my test ci file to use npm ([eec08d6](https://github.com/The-BigMan-tech/fn-monitor/commit/eec08d6))

### ❤️ Contributors

- The-BigMan-tech

## v1.2.1...v1.2.2

[compare changes](https://github.com/The-BigMan-tech/fn-monitor/compare/v1.2.1...v1.2.2)

### ♻️ Refactor

- Make a ternary op neater ([abb06fb](https://github.com/The-BigMan-tech/fn-monitor/commit/abb06fb))
- Add an assertion about the evalStack value ([7bc7b99](https://github.com/The-BigMan-tech/fn-monitor/commit/7bc7b99))
- Rename a variable ([d7f889b](https://github.com/The-BigMan-tech/fn-monitor/commit/d7f889b))
- Bump to v1.2.2 ([b9c536d](https://github.com/The-BigMan-tech/fn-monitor/commit/b9c536d))

### 📖 Documentation

- **comment:** Clarify the difference between the evalStack and the exeStack ([055e8e5](https://github.com/The-BigMan-tech/fn-monitor/commit/055e8e5))
- **readme:** Make the performance critical note punchier ([e98cf34](https://github.com/The-BigMan-tech/fn-monitor/commit/e98cf34))

### ❤️ Contributors

- The-BigMan-tech

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

