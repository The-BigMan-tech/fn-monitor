
## v1.7.0...v1.8.0

[compare changes](https://github.com/The-BigMan-tech/fn-monitor/compare/v1.7.0...v1.8.0)

### 🚀 Features

- **core:** Add 'bind' support for instance methods and refactor the code generator ([b63dd27](https://github.com/The-BigMan-tech/fn-monitor/commit/b63dd27))
- Bump to v1.8.0 ([a156187](https://github.com/The-BigMan-tech/fn-monitor/commit/a156187))

### 🩹 Fixes

- Throw custom WrapperError for unsupported shorthand method syntax ([4bdc0c2](https://github.com/The-BigMan-tech/fn-monitor/commit/4bdc0c2))
- Prevent raw parser crashes for bound functions ([f65f181](https://github.com/The-BigMan-tech/fn-monitor/commit/f65f181))

### ♻️ Refactor

- Lift a block to a function ([d66b53c](https://github.com/The-BigMan-tech/fn-monitor/commit/d66b53c))

### 📖 Documentation

- **changeog:** Update changelog for v1.7.0 ([e2e150c](https://github.com/The-BigMan-tech/fn-monitor/commit/e2e150c))
- **examples:** Add a tip ([5591688](https://github.com/The-BigMan-tech/fn-monitor/commit/5591688))
- **example:** Add an example to show how fn-monitor can help with deobfuscation ([cbb89b6](https://github.com/The-BigMan-tech/fn-monitor/commit/cbb89b6))
- **deobfuscation:** Improve the example ([20d8b69](https://github.com/The-BigMan-tech/fn-monitor/commit/20d8b69))
- **example:** Update the deobfuscation example to use a set ([58b258d](https://github.com/The-BigMan-tech/fn-monitor/commit/58b258d))
- **deobfuscation-example:** Improve the example ([55df65b](https://github.com/The-BigMan-tech/fn-monitor/commit/55df65b))
- **deobfuscation-example:** Add comments ([cd49baa](https://github.com/The-BigMan-tech/fn-monitor/commit/cd49baa))
- **deobfuscation-example:** Clean the imports ([8588308](https://github.com/The-BigMan-tech/fn-monitor/commit/8588308))
- **readme:** Update the capabilities section ([c989393](https://github.com/The-BigMan-tech/fn-monitor/commit/c989393))
- **readme:** Add back the capabilities anchor link ([932e216](https://github.com/The-BigMan-tech/fn-monitor/commit/932e216))
- **readme:** Tighten the capabilities section ([eacf355](https://github.com/The-BigMan-tech/fn-monitor/commit/eacf355))
- **deobfuscation-example:** Add a warning note ([ab21de0](https://github.com/The-BigMan-tech/fn-monitor/commit/ab21de0))
- **readme:** Upgrade the advanced behaviour section ([200fe87](https://github.com/The-BigMan-tech/fn-monitor/commit/200fe87))
- **readme:** Update the bug report section ([d1b9ecb](https://github.com/The-BigMan-tech/fn-monitor/commit/d1b9ecb))
- **readme:** Improve the bug report section ([6e6f43a](https://github.com/The-BigMan-tech/fn-monitor/commit/6e6f43a))
- **readme:** Clarify the sandbox part ([62df8b1](https://github.com/The-BigMan-tech/fn-monitor/commit/62df8b1))
- **readme:** Fix broken links ([127b3e2](https://github.com/The-BigMan-tech/fn-monitor/commit/127b3e2))

### ❤️ Contributors

- The-BigMan-tech

## v1.6.0...v1.7.0

[compare changes](https://github.com/The-BigMan-tech/fn-monitor/compare/v1.6.0...v1.7.0)

### 🚀 Features

- Add 10 new AST event classes for enhanced query support ([0de20df](https://github.com/The-BigMan-tech/fn-monitor/commit/0de20df))
- Bump to v1.7.0 ([56375b2](https://github.com/The-BigMan-tech/fn-monitor/commit/56375b2))

### ♻️ Refactor

- Change the origin used in the SvalPlus constructor ([123410d](https://github.com/The-BigMan-tech/fn-monitor/commit/123410d))
- Make the code generator easier to read ([6f96a31](https://github.com/The-BigMan-tech/fn-monitor/commit/6f96a31))
- Pack both sval and meriyah options under one object ([d3bd5f7](https://github.com/The-BigMan-tech/fn-monitor/commit/d3bd5f7))
- Make a default case to throw a clear error if a query matches a node but lacks a corresponding event class mapping. ([50b1a4e](https://github.com/The-BigMan-tech/fn-monitor/commit/50b1a4e))

### 📖 Documentation

- **changelog:** Update changelog for v1.6.0 ([f598a53](https://github.com/The-BigMan-tech/fn-monitor/commit/f598a53))
- **readme:** Add bacticks to a type ([5ad1d66](https://github.com/The-BigMan-tech/fn-monitor/commit/5ad1d66))
- **test-suite-article:** Tighten the intro ([0bb9216](https://github.com/The-BigMan-tech/fn-monitor/commit/0bb9216))
- **readme:** Improve the clarity of the callstack ([2611557](https://github.com/The-BigMan-tech/fn-monitor/commit/2611557))
- **readme:** Clarify the behavior of the depth counter ([7dda046](https://github.com/The-BigMan-tech/fn-monitor/commit/7dda046))
- **lexical-anchoring:** Heavily simplify the example while retaining correctness ([6e9c638](https://github.com/The-BigMan-tech/fn-monitor/commit/6e9c638))
- **lexical-anchoring:** Remove a comment ([46a938b](https://github.com/The-BigMan-tech/fn-monitor/commit/46a938b))
- **lexical-anchroing:** Make the example tighter ([fd2220e](https://github.com/The-BigMan-tech/fn-monitor/commit/fd2220e))
- **lexical-anchoring:** Use a weakmap instead of an object to be robust against anonymous funcs ([c0dd451](https://github.com/The-BigMan-tech/fn-monitor/commit/c0dd451))
- **docstring:** Tweak the js-docs ([687f57c](https://github.com/The-BigMan-tech/fn-monitor/commit/687f57c))
- **readme:** Update the unpacked size badge ([f209853](https://github.com/The-BigMan-tech/fn-monitor/commit/f209853))
- **readme:** Add a short helpful note ([0215037](https://github.com/The-BigMan-tech/fn-monitor/commit/0215037))
- **readme:** Add extra clarity to the scope for event type ([9a22d35](https://github.com/The-BigMan-tech/fn-monitor/commit/9a22d35))

### 🎨 Styles

- **quick-examples:** Wrap the final fn call in a try catch block to make the terminal clean ([c01f453](https://github.com/The-BigMan-tech/fn-monitor/commit/c01f453))

### ❤️ Contributors

- The-BigMan-tech

## v1.5.0...v1.6.0

[compare changes](https://github.com/The-BigMan-tech/fn-monitor/compare/v1.5.0...v1.6.0)

### 🚀 Features

- Expose a read-only call stack to the inspector through the visit object ([a01d2c7](https://github.com/The-BigMan-tech/fn-monitor/commit/a01d2c7))
- **api:** Map the elements in the callStack back to their original function references ([b394ec8](https://github.com/The-BigMan-tech/fn-monitor/commit/b394ec8))
- Bump to v1.6.0 ([08501d6](https://github.com/The-BigMan-tech/fn-monitor/commit/08501d6))

### 🩹 Fixes

- Change how the call depth is tracked fundamentally ([da48e21](https://github.com/The-BigMan-tech/fn-monitor/commit/da48e21))
- **callStack:** Map the `main`` function wrapper to its original reference ([6ead74c](https://github.com/The-BigMan-tech/fn-monitor/commit/6ead74c))

### ♻️ Refactor

- Change the Node type used in SvalPlus to EsNode ([0bf472a](https://github.com/The-BigMan-tech/fn-monitor/commit/0bf472a))
- Guarantee at runtime that when a scope has an interpreter, it is from the SvalPlus class ([d15f298](https://github.com/The-BigMan-tech/fn-monitor/commit/d15f298))
- Use a QList to track the call stack. ([7f01f1b](https://github.com/The-BigMan-tech/fn-monitor/commit/7f01f1b))
- Insert the main function first in the callstack ([804e7e8](https://github.com/The-BigMan-tech/fn-monitor/commit/804e7e8))
- Add ts-nocheck to the expression handlers ([0ce6921](https://github.com/The-BigMan-tech/fn-monitor/commit/0ce6921))
- Lift the call stack handling from the expression handlers to a centralized function ([ff618d6](https://github.com/The-BigMan-tech/fn-monitor/commit/ff618d6))

### 🧹 Chore

- Update the package's description and include all the files that will be in the final package even if it's redundant. ([5477b58](https://github.com/The-BigMan-tech/fn-monitor/commit/5477b58))
- Include the vscode's debugging configuration ([83f41cd](https://github.com/The-BigMan-tech/fn-monitor/commit/83f41cd))
  
### 📖 Documentation

<details>
<summary><strong>Click to expand</strong></summary>

- **changelog:** Update changelog for v1.5.0 ([065955e](https://github.com/The-BigMan-tech/fn-monitor/commit/065955e))
- **readme:** Improve the flow of technical details ([dfbf4e8](https://github.com/The-BigMan-tech/fn-monitor/commit/dfbf4e8))
- **ast-mutation.md:** Update the last part ([aa59c4e](https://github.com/The-BigMan-tech/fn-monitor/commit/aa59c4e))
- **readme:** Fix the layout of the last documented advanced behavior ([c9b88bd](https://github.com/The-BigMan-tech/fn-monitor/commit/c9b88bd))
- **readme:** Fix the flow of other points ([434a775](https://github.com/The-BigMan-tech/fn-monitor/commit/434a775))
- **readme:** Update the capabilities ([fbb79ec](https://github.com/The-BigMan-tech/fn-monitor/commit/fbb79ec))
- **preventing-lag.md:** Improve the pacing in the intro ([aeeb035](https://github.com/The-BigMan-tech/fn-monitor/commit/aeeb035))
- **readme:** Update the utility types section ([7b0b977](https://github.com/The-BigMan-tech/fn-monitor/commit/7b0b977))
- **example:** Tweak a comment ([0a58c81](https://github.com/The-BigMan-tech/fn-monitor/commit/0a58c81))
- **examples:** Remove a blank line ([fbdea27](https://github.com/The-BigMan-tech/fn-monitor/commit/fbdea27))
- Tweak the deprecation warning ([25928fb](https://github.com/The-BigMan-tech/fn-monitor/commit/25928fb))
- **ast-mutation.md:** Polish the article ([dd1371a](https://github.com/The-BigMan-tech/fn-monitor/commit/dd1371a))
- **ast-mutation.md:** Clear any ambiguity in the 'what this package is not' section ([c803b24](https://github.com/The-BigMan-tech/fn-monitor/commit/c803b24))
- **contributing.md:** Clarify a sentence ([e630286](https://github.com/The-BigMan-tech/fn-monitor/commit/e630286))
- **preventing-lag.md:** Polish the article ([ce27b7b](https://github.com/The-BigMan-tech/fn-monitor/commit/ce27b7b))
- **article:** Tweak a phrase ([c262ede](https://github.com/The-BigMan-tech/fn-monitor/commit/c262ede))
- **readme:** Lift the branding guidelines to a separate file and polish the README ([cbcbffe](https://github.com/The-BigMan-tech/fn-monitor/commit/cbcbffe))
- **preventing-lag.md:** Polish a prose ([a37dca9](https://github.com/The-BigMan-tech/fn-monitor/commit/a37dca9))
- **preventing-lag.md:** Update the peek section ([2df73c9](https://github.com/The-BigMan-tech/fn-monitor/commit/2df73c9))
- **preventing-lag.md:** Polish the conclusion ([0aa887c](https://github.com/The-BigMan-tech/fn-monitor/commit/0aa887c))
- **readme:** Clarify the explanation of an example ([d7266b8](https://github.com/The-BigMan-tech/fn-monitor/commit/d7266b8))
- **readme:** Tweak a sentence in an example ([de2693f](https://github.com/The-BigMan-tech/fn-monitor/commit/de2693f))
- **readme:** Polish an example's explanation ([1d3bc34](https://github.com/The-BigMan-tech/fn-monitor/commit/1d3bc34))
- **readme:** Add minor touches ([a753494](https://github.com/The-BigMan-tech/fn-monitor/commit/a753494))
- **test-article.md:** Polish the article ([9817784](https://github.com/The-BigMan-tech/fn-monitor/commit/9817784))
- **test-article:** Improve the size of the headings ([6dcac5a](https://github.com/The-BigMan-tech/fn-monitor/commit/6dcac5a))
- **test-article:** Improve pacing and grammatical precision ([c7c73d5](https://github.com/The-BigMan-tech/fn-monitor/commit/c7c73d5))
- **test-article:** Improve a tip ([5672198](https://github.com/The-BigMan-tech/fn-monitor/commit/5672198))
- **readme:** Update the wording in the api intro ([08bf4e7](https://github.com/The-BigMan-tech/fn-monitor/commit/08bf4e7))
- **readme:** Tighten the api intro ([795bbab](https://github.com/The-BigMan-tech/fn-monitor/commit/795bbab))
- **test-article:** Improve the tip ([5bdd009](https://github.com/The-BigMan-tech/fn-monitor/commit/5bdd009))
- **test-article:** Tweak a sentence ([7431cfd](https://github.com/The-BigMan-tech/fn-monitor/commit/7431cfd))
- **readme:** Tighten the explanations ([414de22](https://github.com/The-BigMan-tech/fn-monitor/commit/414de22))
- **ast-mutation.md:** Tighten the article ([90f370d](https://github.com/The-BigMan-tech/fn-monitor/commit/90f370d))
- **timeout-article:** Tighten the article ([8300a57](https://github.com/The-BigMan-tech/fn-monitor/commit/8300a57))
- **article:** Clarify an intro ([a909edf](https://github.com/The-BigMan-tech/fn-monitor/commit/a909edf))
- **article:** Improve a title ([ef9b95c](https://github.com/The-BigMan-tech/fn-monitor/commit/ef9b95c))
- **example:** Remove unnecessary comments ([c3db6af](https://github.com/The-BigMan-tech/fn-monitor/commit/c3db6af))
- **example:** Remove an unnecessary comment ([d958268](https://github.com/The-BigMan-tech/fn-monitor/commit/d958268))
- **readme:** Add some tweaks ([1c6e583](https://github.com/The-BigMan-tech/fn-monitor/commit/1c6e583))
- **perExe-migration:** Heavily improve the code for readability ([43590ad](https://github.com/The-BigMan-tech/fn-monitor/commit/43590ad))
- **readme:** Add an important note about the exe stack ([18dc838](https://github.com/The-BigMan-tech/fn-monitor/commit/18dc838))
- **readme:** Add a warning about ScopeForEvent ([8ec765a](https://github.com/The-BigMan-tech/fn-monitor/commit/8ec765a))
- **generator-workaround.ts:** Inline the output ([a13d12d](https://github.com/The-BigMan-tech/fn-monitor/commit/a13d12d))
- **readme:** Clarify the ScopeForEvent doc ([d5cd53d](https://github.com/The-BigMan-tech/fn-monitor/commit/d5cd53d))
- **readme:** Improve the advanced behavior section ([dd67585](https://github.com/The-BigMan-tech/fn-monitor/commit/dd67585))
- **readme:** Update the `capturing` section ([8d8c38c](https://github.com/The-BigMan-tech/fn-monitor/commit/8d8c38c))
- **lexical-anchoring.ts:** Insert the output ([755dbc2](https://github.com/The-BigMan-tech/fn-monitor/commit/755dbc2))
- **contributing:** Tighten it and improve clarity ([70d7136](https://github.com/The-BigMan-tech/fn-monitor/commit/70d7136))
- **readme:** Add the call stack to the docs and examples ([6409409](https://github.com/The-BigMan-tech/fn-monitor/commit/6409409))
- **readme:** Improve the intros ([15f4887](https://github.com/The-BigMan-tech/fn-monitor/commit/15f4887))
- **readme:** Improve the quick examples intro ([7b82f78](https://github.com/The-BigMan-tech/fn-monitor/commit/7b82f78))
- **readme:** Add clarity to visit.execute ([024727c](https://github.com/The-BigMan-tech/fn-monitor/commit/024727c))
- **article:** Improve a block ([f8be81a](https://github.com/The-BigMan-tech/fn-monitor/commit/f8be81a))
- **example:** Use the yield expr query in the generator workaround ([2467822](https://github.com/The-BigMan-tech/fn-monitor/commit/2467822))
- **docstring:** Tighten the js-doc of the visit object ([99143da](https://github.com/The-BigMan-tech/fn-monitor/commit/99143da))
- **docstring:** Tighten the js-doc of the main interface ([b8856e2](https://github.com/The-BigMan-tech/fn-monitor/commit/b8856e2))

</details>

### ❤️ Contributors

- The-BigMan-tech

## v1.4.3...v1.5.0

[compare changes](https://github.com/The-BigMan-tech/fn-monitor/compare/v1.4.3...v1.5.0)

### 🚀 Features

- **api:** Deprecate visit.perExecution in favor of an explicit pattern with visit.execute ([9e00207](https://github.com/The-BigMan-tech/fn-monitor/commit/9e00207))
- Bump to v1.5.0 ([cd34d4c](https://github.com/The-BigMan-tech/fn-monitor/commit/cd34d4c))

### 🩹 Fixes

- **lifecycle:** Resolve perExe state corruption and reduce GC overhead ([2fcaea5](https://github.com/The-BigMan-tech/fn-monitor/commit/2fcaea5))

### ♻️ Refactor

- Share execution state by reference in reusables ([5a43a82](https://github.com/The-BigMan-tech/fn-monitor/commit/5a43a82))
- Update the test suite and the README to use visit.execute rather than the perExe hook ([bbb5371](https://github.com/The-BigMan-tech/fn-monitor/commit/bbb5371))
- **article:** Rename a folder ([f497b09](https://github.com/The-BigMan-tech/fn-monitor/commit/f497b09))

### 🛠️ Build

- Remove swc because the legacy build script inherited from sval that relied on it has been dropped since the alpha version ([2e33444](https://github.com/The-BigMan-tech/fn-monitor/commit/2e33444))

### 🧹 Chore

- Update the changelog config ([477de63](https://github.com/The-BigMan-tech/fn-monitor/commit/477de63))
- Upgrade dependencies for stability ([15fca8d](https://github.com/The-BigMan-tech/fn-monitor/commit/15fca8d))

### 🎨 Styles

- **readme:** Change the color of a badge ([2a104e4](https://github.com/The-BigMan-tech/fn-monitor/commit/2a104e4))
- Adjust the color of the badges by making their left parts darker ([ef6c6a1](https://github.com/The-BigMan-tech/fn-monitor/commit/ef6c6a1))
- Adjust the color of the badges ([e7c92f7](https://github.com/The-BigMan-tech/fn-monitor/commit/e7c92f7))

### 📖 Documentation

<details>
<summary><strong>Click to expand</strong></summary>

- **readme:** Update the bundle size badge to reflect the size of the newest version to be released. ([b1a5e73](https://github.com/The-BigMan-tech/fn-monitor/commit/b1a5e73))
- **readme:** Fix a mistake in the bundle size badge url ([9be8213](https://github.com/The-BigMan-tech/fn-monitor/commit/9be8213))
- **readme:** Adjust two badges ([1f575f4](https://github.com/The-BigMan-tech/fn-monitor/commit/1f575f4))
- **readme:** Remove the space between the anchor and image tags in an attempt to remove the extra underscore showing in github's md renderer ([3488b88](https://github.com/The-BigMan-tech/fn-monitor/commit/3488b88))
- **readme:** Remove the extra space between the anchor and image tags in the other badges ([47f99d8](https://github.com/The-BigMan-tech/fn-monitor/commit/47f99d8))
- **changelog:** Update changelog for v1.4.3 ([a745a2c](https://github.com/The-BigMan-tech/fn-monitor/commit/a745a2c))
- **readme:** Clear every ambiguity in the wrapper constraints ([83dc869](https://github.com/The-BigMan-tech/fn-monitor/commit/83dc869))
- **readme:** Clarify certain limitations ([6803170](https://github.com/The-BigMan-tech/fn-monitor/commit/6803170))
- Remove extra nestig in an example ([633d985](https://github.com/The-BigMan-tech/fn-monitor/commit/633d985))
- **examples:** Change a return statement to a break ([8b510c1](https://github.com/The-BigMan-tech/fn-monitor/commit/8b510c1))
- **articles:** Rename a file ([2937cc0](https://github.com/The-BigMan-tech/fn-monitor/commit/2937cc0))
- **articles:** Add an article showing how to upgrade a codebase's test suite with fn-monitor ([91736a9](https://github.com/The-BigMan-tech/fn-monitor/commit/91736a9))
- **article:** Finish the draft of upgrading test suite.md ([6b47763](https://github.com/The-BigMan-tech/fn-monitor/commit/6b47763))
- Slightly improve the article ([e6fb0c2](https://github.com/The-BigMan-tech/fn-monitor/commit/e6fb0c2))
- **article:** Add minor refinements ([30f9f4a](https://github.com/The-BigMan-tech/fn-monitor/commit/30f9f4a))
- **article:** Wrap a word in backticks ([f126e3c](https://github.com/The-BigMan-tech/fn-monitor/commit/f126e3c))
- **articles:** Wrap more words in backticks ([c499981](https://github.com/The-BigMan-tech/fn-monitor/commit/c499981))
- **article:** Add the cover-image ([ed0dd6d](https://github.com/The-BigMan-tech/fn-monitor/commit/ed0dd6d))
- **article:** Backlink to the last two articles ([e11cb86](https://github.com/The-BigMan-tech/fn-monitor/commit/e11cb86))
- **article:** Tweak a sentence ([1695b24](https://github.com/The-BigMan-tech/fn-monitor/commit/1695b24))
- **article:** Fix the flaw in the calculateTax function ([19e3c9a](https://github.com/The-BigMan-tech/fn-monitor/commit/19e3c9a))
- **article:** Instruct the reader to install fn-monitor as a devDependency ([2fb0607](https://github.com/The-BigMan-tech/fn-monitor/commit/2fb0607))
- **article:** Improve the code to imitate a real world scenario ([87bcd47](https://github.com/The-BigMan-tech/fn-monitor/commit/87bcd47))
- **article:** Make a sentence tighter ([c16144b](https://github.com/The-BigMan-tech/fn-monitor/commit/c16144b))
- **article:** Fix a grammatical inaccuracy ([786a0bc](https://github.com/The-BigMan-tech/fn-monitor/commit/786a0bc))
- **article:** Add an extra clause ([db21033](https://github.com/The-BigMan-tech/fn-monitor/commit/db21033))
- **preventing-hang.md:** Polish the article ([9c729d7](https://github.com/The-BigMan-tech/fn-monitor/commit/9c729d7))
- **article:** Update a stale comment ([85ef4ac](https://github.com/The-BigMan-tech/fn-monitor/commit/85ef4ac))
- **article:** Omit a limitation because it can't really be explained properly in one sentence without ambiguity. The reader will discover a better explanation in the README ([068553a](https://github.com/The-BigMan-tech/fn-monitor/commit/068553a))
- **article:** Add an apostrophe ([32a4b75](https://github.com/The-BigMan-tech/fn-monitor/commit/32a4b75))
- **article:** Update a framing in the test suite article ([2408454](https://github.com/The-BigMan-tech/fn-monitor/commit/2408454))
- **readme:** Update the link in the unpacked size badge to point to package stats and use a blank target in the anchor tags for good UX ([6148155](https://github.com/The-BigMan-tech/fn-monitor/commit/6148155))
- **readme:** Remove the attributes in the anchor tags because sanitizers strip them away ([acca206](https://github.com/The-BigMan-tech/fn-monitor/commit/acca206))
- **readme:** Update the explanation of a quick example to reflect the new code ([ec841ae](https://github.com/The-BigMan-tech/fn-monitor/commit/ec841ae))
- **article:** Encourage users to open a discussion in the test suite article ([8fd4e2c](https://github.com/The-BigMan-tech/fn-monitor/commit/8fd4e2c))
- **article:** Update the conclusion of the lag article ([fd97af5](https://github.com/The-BigMan-tech/fn-monitor/commit/fd97af5))
- **article:** Update the conclusion of the ast mutation article ([209a797](https://github.com/The-BigMan-tech/fn-monitor/commit/209a797))
- **example:** Add a footer to a note ([9434f7b](https://github.com/The-BigMan-tech/fn-monitor/commit/9434f7b))
- **readme:** Update a type ([b658e84](https://github.com/The-BigMan-tech/fn-monitor/commit/b658e84))

</details>

### ❤️ Contributors

- The-BigMan-tech

## v1.4.2...v1.4.3

[compare changes](https://github.com/The-BigMan-tech/fn-monitor/compare/v1.4.2...v1.4.3)

### ⚡ Performance

- Replace js-beautify with astring for sourceOut generation ([027953d](https://github.com/The-BigMan-tech/fn-monitor/commit/027953d))
- Bump to v1.4.3 ([f555afd](https://github.com/The-BigMan-tech/fn-monitor/commit/f555afd))

### 📖 Documentation

- **changelog:** Update changelog for v1.4.2 ([cb690bc](https://github.com/The-BigMan-tech/fn-monitor/commit/cb690bc))
- **contributing:** Lift the contributing guidelines from a source file to CONTRIBUTING.md ([ba16318](https://github.com/The-BigMan-tech/fn-monitor/commit/ba16318))
- **contributing:** Adjust the wording ([08e3982](https://github.com/The-BigMan-tech/fn-monitor/commit/08e3982))
- **contributing:** Change a word ([ee9f8e1](https://github.com/The-BigMan-tech/fn-monitor/commit/ee9f8e1))
- **readme:** Remove a duplicate word ([7896a4a](https://github.com/The-BigMan-tech/fn-monitor/commit/7896a4a))
- **contributing:** Document on the unminified bundle distribution and safety contributions ([8d15e6e](https://github.com/The-BigMan-tech/fn-monitor/commit/8d15e6e))

### ❤️ Contributors

- The-BigMan-tech

## v1.4.1...v1.4.2

[compare changes](https://github.com/The-BigMan-tech/fn-monitor/compare/v1.4.1...v1.4.2)

### 🩹 Fixes

- Throw clear error on dynamic imports and document toolchain AST drift ([19ac4cd](https://github.com/The-BigMan-tech/fn-monitor/commit/19ac4cd))
- Scope dynamic import ban to monitoring mode ([846b285](https://github.com/The-BigMan-tech/fn-monitor/commit/846b285))
- Export YieldExpr event class for instanceof checks ([45f9774](https://github.com/The-BigMan-tech/fn-monitor/commit/45f9774))
- Bump to v1.4.2 ([30323e9](https://github.com/The-BigMan-tech/fn-monitor/commit/30323e9))

### ♻️ Refactor

- Rename scope to rootScope and clarify top-level await logic ([4045c25](https://github.com/The-BigMan-tech/fn-monitor/commit/4045c25))
- Explicitly check for the target mode in `useModifiedEvaluator` ([14bfed4](https://github.com/The-BigMan-tech/fn-monitor/commit/14bfed4))
- Update internal terminology ([d55780c](https://github.com/The-BigMan-tech/fn-monitor/commit/d55780c))
- Lift the function assembly process from `monitor` to `SvalPlus` ([a46b042](https://github.com/The-BigMan-tech/fn-monitor/commit/a46b042))
- Remove an old comment that encouraged a fragile pattern ([b7f932d](https://github.com/The-BigMan-tech/fn-monitor/commit/b7f932d))
- Adjust a comment ([6e31315](https://github.com/The-BigMan-tech/fn-monitor/commit/6e31315))

### 📖 Documentation

- **readme:** Add a link to the CTA part ([4322fa7](https://github.com/The-BigMan-tech/fn-monitor/commit/4322fa7))
- **example:** Tweak a comment ([f56135b](https://github.com/The-BigMan-tech/fn-monitor/commit/f56135b))
- **types:** Add type safety to the exports prop of SvalPlus ([17945d5](https://github.com/The-BigMan-tech/fn-monitor/commit/17945d5))
- **readme:** Explain the pre-processing mechanic ([bee8f82](https://github.com/The-BigMan-tech/fn-monitor/commit/bee8f82))
- Improve the presentation of the maintainer's note ([d68fe3d](https://github.com/The-BigMan-tech/fn-monitor/commit/d68fe3d))
- Re-format point 4 of the maintainer's note ([84df08e](https://github.com/The-BigMan-tech/fn-monitor/commit/84df08e))
- **readme:** Document on standard builtins that dont need to be captured ([cd06066](https://github.com/The-BigMan-tech/fn-monitor/commit/cd06066))
- Clarify on the dual nature of SvalPlus ([9a0c773](https://github.com/The-BigMan-tech/fn-monitor/commit/9a0c773))
- **examples:** Showcase how to properly capture exports from packages into the interpreter's context ([d0a6430](https://github.com/The-BigMan-tech/fn-monitor/commit/d0a6430))
- **example:** Update the handling-modules example ([5185024](https://github.com/The-BigMan-tech/fn-monitor/commit/5185024))
- **readme:** Explain the limitation on capturing libraries ([896f27e](https://github.com/The-BigMan-tech/fn-monitor/commit/896f27e))
- **example:** Rename a file ([6fef37b](https://github.com/The-BigMan-tech/fn-monitor/commit/6fef37b))

### 🛠️ Build

- Fix a typo in the changelog script ([8646c85](https://github.com/The-BigMan-tech/fn-monitor/commit/8646c85))
- Update changelog for v1.4.1 ([d33e574](https://github.com/The-BigMan-tech/fn-monitor/commit/d33e574))
- Change the environment config in vitest ([6357363](https://github.com/The-BigMan-tech/fn-monitor/commit/6357363))
- Change back the env config in vitest ([c5df04f](https://github.com/The-BigMan-tech/fn-monitor/commit/c5df04f))

### 🎨 Styles

- Remove an extra empty line ([2960472](https://github.com/The-BigMan-tech/fn-monitor/commit/2960472))
- Export Sval as a named export ([c4943d2](https://github.com/The-BigMan-tech/fn-monitor/commit/c4943d2))
- Moved the module-level `latestVer` constant into the class as a private static property, making the class fully  self-contained and hiding the implementation detail. ([5b6ec82](https://github.com/The-BigMan-tech/fn-monitor/commit/5b6ec82))
- Remove some trailing commas ([a862b56](https://github.com/The-BigMan-tech/fn-monitor/commit/a862b56))

### ❤️ Contributors

- The-BigMan-tech

## v1.4.0...v1.4.1

[compare changes](https://github.com/The-BigMan-tech/fn-monitor/compare/v1.4.0...v1.4.1)

### 📖 Documentation

- **readme:** Remove a feature promise in the readme since the version is already about to be released ([72a1aaa](https://github.com/The-BigMan-tech/fn-monitor/commit/72a1aaa))
- **changelog:** Update changelog for v1.4.0 ([3223979](https://github.com/The-BigMan-tech/fn-monitor/commit/3223979))
- **articles:** Adjust a sentence in the writer's notes ([11aa42c](https://github.com/The-BigMan-tech/fn-monitor/commit/11aa42c))
- **readme:** Slightly re-order the examples and add a CTA component ([27f6a95](https://github.com/The-BigMan-tech/fn-monitor/commit/27f6a95))
- **readme:** Make minor grammatical adjustments ([211f366](https://github.com/The-BigMan-tech/fn-monitor/commit/211f366))
- **readme:** Use anchor tags to link the headings to the table of contents ([f245731](https://github.com/The-BigMan-tech/fn-monitor/commit/f245731))

### 🛠️ Build

- Update the changelog config ([b477adb](https://github.com/The-BigMan-tech/fn-monitor/commit/b477adb))
- Add a pre-publish script ([c0b35a9](https://github.com/The-BigMan-tech/fn-monitor/commit/c0b35a9))
- Remove ts7 and ts6 alias in favor of just having ts6 standalone ([c40d362](https://github.com/The-BigMan-tech/fn-monitor/commit/c40d362))
- Bump to v1.4.1 ([2550cea](https://github.com/The-BigMan-tech/fn-monitor/commit/2550cea))

### ❤️ Contributors

- The-BigMan-tech

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

