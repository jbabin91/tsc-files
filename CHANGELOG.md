# @jbabin91/tsc-files

## 0.4.2

### Patch Changes

- [`388b40b`](https://github.com/jbabin91/tsc-files/commit/388b40be24f534898037f2981ed1cbcf689bfb72) Thanks [@jbabin91](https://github.com/jbabin91)! - ### 🐛 Bug Fixes
  - **changeset**: :bug: include all conventional commits in changelog while only bumping for feat/fix/perf
  - **changeset**: :bug: only bump version for feat/fix/perf, not refactor/revert
  - **parser**: :bug: add JSONC support for tsconfig.json with comments and trailing commas
  - **lint**: :bug: enforce zero-tolerance policy for any types
  - **claude**: :bug: use @ imports to load files into Claude Code context

  ### 🔧 Miscellaneous Chores

  - **repo**: :hammer: bump dependencies
  - **repo**: :hammer: bump dependencies

  ### 📝 Documentation

  - **cleanup**: :memo: streamline documentation structure
  - **claude**: :memo: add changeset:auto and troubleshooting commands
  - **claude**: :memo: restore essential commands to CLAUDE.md for quick access
  - **duplication**: :memo: eliminate duplication by referencing source of truth
  - **coverage**: :memo: reference vitest.config.ts instead of duplicating thresholds
  - **quality**: :memo: add test coverage to quality gate requirements
  - **standards**: :memo: align coding standards with actual ESLint/Prettier config
  - **workflows**: :memo: update claude-code-workflows.md with new doc structure
  - **navigation**: :memo: enhance documentation navigation and cross-references
  - **structure**: :memo: reorganize documentation into logical directories
  - **openspec**: :memo: migrate to OpenSpec for spec-driven development

## 0.4.1

### Patch Changes

- [`a286a7c`](https://github.com/jbabin91/tsc-files/commit/a286a7c7c3ea48c61411e7da03614901477c4d12) Thanks [@jbabin91](https://github.com/jbabin91)! - fix: add JSONC support for tsconfig.json files with comments and trailing commas

  TypeScript's tsconfig.json files support comments and trailing commas (JSONC format), but strict JSON.parse() doesn't. This fix adds `strip-json-comments` to properly parse tsconfig.json files that contain:
  - Single-line comments (`//`)
  - Block comments (`/* */`)
  - Trailing commas

  This resolves parsing errors when using tsconfig.json files with these valid TypeScript configuration features.

## 0.4.0

### Minor Changes

- [`281a104`](https://github.com/jbabin91/tsc-files/commit/281a10438dab1984ee799d5f22638114af981c6d) Thanks [@jbabin91](https://github.com/jbabin91)! - ### ✨ Features
  - **core**: :sparkles: implement proactive tsgo compatibility checking
  - **core**: :sparkles: implement user environment preservation for TypeScript checking
  - **cli**: ✨ enhance CLI with TypeScript compiler education and fallback

  ### 🐛 Bug Fixes

  - **lint**: :bug: resolve TypeScript type issues and ESLint violations

## 0.3.0

### Minor Changes

- [`03a8b69`](https://github.com/jbabin91/tsc-files/commit/03a8b693e54ee588b2054c3a2e91205fd5d5ab44) Thanks [@jbabin91](https://github.com/jbabin91)! - ### ♻️ Code Refactoring
  - **ci**: :recycle: rename Fast Integration Tests to Integration Tests
  - **ci**: :recycle: simplify integration tests to use actual package only
  - **cli**: :recycle: simplify version handling with JSON import
  - **core**: :recycle: extract utility modules for better code organization

  ### 🐛 Bug Fixes

  - **test**: :white_check_mark: replace unsafe any type with proper Result type
  - **cli**: :bug: resolve duplicate error output and implement Commander.js best practices
  - **cli**: :bug: resolve duplicate version/help output issue
  - **cli**: :bug: resolve version output and integration test patterns

  ### ✨ Features

  - **cli**: :sparkles: add advanced Commander.js features and proper logging integration
  - :sparkles: add issue and pull request templates for better contribution guidelines
  - :sparkles: add clean script and improve test coverage metrics
  - **cli**: :sparkles: enhance CLI architecture with modular components

## 0.2.0

### Minor Changes

- [`e332c27`](https://github.com/jbabin91/tsc-files/commit/e332c27fa03be6c6e644dbc1d54749c8b99cd35e) Thanks [@jbabin91](https://github.com/jbabin91)! - ### ♻️ Code Refactoring
  - :recycle: final comment cleanup and update package manager priorities
  - :recycle: remove uninformative comments across codebase
  - **test**: :recycle: remove verbose comments from detectors tests

  ### 🐛 Bug Fixes

  - **ci**: :bug: ensure tsconfig.json exists when recreating integration test directories
  - **ci**: :bug: fix integration test directory persistence across GitHub Actions steps
  - **build**: :bug: move lefthook install from postinstall to prepare script
  - **ci**: :bug: isolate integration tests to prevent packageManager conflicts

  ### ✨ Features

  - **core**: :sparkles: enhance typescript file resolution and javascript support
  - **detectors**: :sparkles: implement package manager detection and TypeScript compiler optimization
  - **core**: :sparkles: implement Phase 2.3 monorepo support with file grouping
  - **core**: :sparkles: implement tsconfig.json context detection with directory traversal
  - **test**: :sparkles: implement enhanced CLI testing framework with custom matchers
  - **cli**: :sparkles: complete Phase 2.1 CLI enhancement with professional UX
  - **docs**: :sparkles: complete Phase 2 dependency strategy and CLI research
  - :sparkles: implement Phase 1 core reliability improvements
  - **core**: :sparkles: complete TypeScript file checker implementation

## 0.1.6

### Patch Changes

- [`c3c03a6`](https://github.com/jbabin91/tsc-files/commit/c3c03a69b8916b1867749d09910827bb312b3bb1) Thanks [@jbabin91](https://github.com/jbabin91)! - ### 🧪 Testing
  - Test npm built-in provenance configuration

## 0.1.5

### Patch Changes

- [`61fc744`](https://github.com/jbabin91/tsc-files/commit/61fc744df3980667db25338da6e6996243b115c6) Thanks [@jbabin91](https://github.com/jbabin91)! - ### 🐛 Bug Fixes
  - use proper npm authentication approach

- [`c0f9e6d`](https://github.com/jbabin91/tsc-files/commit/c0f9e6dc74085585c4590b30596cf5a0c81f85d4) Thanks [@jbabin91](https://github.com/jbabin91)! - ### 🔧 Improvements
  - Update lefthook configuration to format YAML files in pre-commit hooks

## 0.1.4

### Patch Changes

- [`23f99e5`](https://github.com/jbabin91/tsc-files/commit/23f99e5a0af12a16f6a84f161cf056b7edfdac54) Thanks [@jbabin91](https://github.com/jbabin91)! - Test complete GitHub App automation with signed commits

## 0.1.3

### Patch Changes

- [`5981292`](https://github.com/jbabin91/tsc-files/commit/5981292e2849c4b80d84d746c1f94de049648b87) Thanks [@jbabin91](https://github.com/jbabin91)! - Test that trusted publishing works now that registry issues are resolved

## 0.1.2

### Patch Changes

- [`7a1bff3`](https://github.com/jbabin91/tsc-files/commit/7a1bff3d3183712efd9c1c527616d7a9ed1679fb) Thanks [@jbabin91](https://github.com/jbabin91)! - Minimal test to verify trusted publishing works correctly

## 0.1.1

### Patch Changes

- [`cae403e`](https://github.com/jbabin91/tsc-files/commit/cae403ee1aeb11e01f44e5910746c079a3163275) Thanks [@jbabin91](https://github.com/jbabin91)! - Test trusted publishing configuration and workflow

## 0.1.1

### Patch Changes

- Add comprehensive security improvements including npm provenance, trusted publishing, automated security workflows, and enhanced CI/CD pipeline with dependency auditing and secrets scanning.
