# Implementation Tasks

## 1. Test Infrastructure Setup

- [ ] 1.1 Create `tests/integration/ecosystem/` directory structure
- [ ] 1.2 Create `tests/fixtures/ecosystem/` for test project templates
- [ ] 1.3 Add integration test helper utilities for fixture setup
- [ ] 1.4 Update `vitest.config.ts` with integration test configuration

## 2. Monorepo Workspace Integration Tests

- [ ] 2.1 Create pnpm workspace fixture with 2+ packages
- [ ] 2.2 Create npm workspaces fixture
- [ ] 2.3 Test `workspace:*` protocol imports resolution
- [ ] 2.4 Test cross-package type imports and exports
- [ ] 2.5 Verify different tsconfigs per package work correctly

## 3. Framework Preset Integration Tests

- [ ] 3.1 Create Next.js fixture with `extends: "next"`
- [ ] 3.2 Create Vite fixture with `@tsconfig/vite` preset
- [ ] 3.3 Test framework-specific path aliases resolve
- [ ] 3.4 Test framework global types are available
- [ ] 3.5 Verify custom overrides on top of presets work

## 4. Project References Integration Tests

- [ ] 4.1 Create fixture with `composite: true` and references
- [ ] 4.2 Test cross-project type imports
- [ ] 4.3 Verify reference path resolution works
- [ ] 4.4 Test checking files from referenced projects

## 5. Performance and Scale Tests

- [ ] 5.1 Create fixture with 500+ TypeScript files
- [ ] 5.2 Measure command execution time (< 30s target)
- [ ] 5.3 Measure memory usage (< 512MB target)
- [ ] 5.4 Test Windows command line length limits
- [ ] 5.5 Test concurrent execution (multiple processes)

## 6. Generated Types Integration Tests

- [ ] 6.1 Create Prisma-style generated types fixture
- [ ] 6.2 Create GraphQL codegen pattern fixture
- [ ] 6.3 Test types in .gitignore but needed for checking
- [ ] 6.4 Verify node_modules generated types work
- [ ] 6.5 Test triple-slash type references (`/// <reference types="node" />`)
- [ ] 6.6 Test triple-slash path references (`/// <reference path="./types.d.ts" />`)

## 7. Modern Extensions Integration Tests

- [ ] 7.1 Test .mts (ES module) files
- [ ] 7.2 Test .cts (CommonJS) files
- [ ] 7.3 Test .d.mts declaration files
- [ ] 7.4 Test .d.cts declaration files
- [ ] 7.5 Test mixed .ts/.mts/.cts in same project

## 8. Test Framework Globals Integration Tests

- [ ] 8.1 Create Jest fixture with @types/jest globals
- [ ] 8.2 Create Playwright fixture with built-in globals
- [ ] 8.3 Create Cypress fixture with chainable types
- [ ] 8.4 Verify vitest globals still work (regression test)

## 9. Documentation and CI Integration

- [ ] 9.1 Document integration test patterns in docs/testing/
- [ ] 9.2 Add integration test CI job (separate from unit tests)
- [ ] 9.3 Update CONTRIBUTING.md with integration test guidelines
- [ ] 9.4 Add integration test examples to docs/

## 10. Validation and Cleanup

- [ ] 10.1 Run all integration tests locally (pnpm test:integration)
- [ ] 10.2 Verify CI integration tests pass on all platforms
- [ ] 10.3 Review and optimize slow tests (>5s each)
- [ ] 10.4 Update coverage targets if needed
