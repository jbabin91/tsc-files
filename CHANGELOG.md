# @jbabin91/tsc-files

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
