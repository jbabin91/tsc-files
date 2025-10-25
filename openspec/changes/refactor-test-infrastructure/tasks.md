# Implementation Tasks

## 1. Create New Directory Structure

- [ ] 1.1 Create `tests/setup/` directory
- [ ] 1.2 Create `tests/helpers/` directory
- [ ] 1.3 Create `tests/types/` directory
- [ ] 1.4 Create `tests/fixtures/` directory structure

## 2. Extract and Organize Setup Files

- [ ] 2.1 Create `tests/setup/base.ts` with shared Vitest configuration
- [ ] 2.2 Create `tests/setup/unit.ts` with unit test setup
- [ ] 2.3 Create `tests/setup/integration.ts` with integration test setup
- [ ] 2.4 Create `tests/setup/matchers.ts` with custom Vitest matchers
- [ ] 2.5 Create `tests/vitest.setup.ts` as entry point

## 3. Create Helper Modules

- [ ] 3.1 Create `tests/helpers/cli.ts` - Extract CLI execution utilities
- [ ] 3.2 Create `tests/helpers/filesystem.ts` - Extract file/directory utilities
- [ ] 3.3 Create `tests/helpers/fixtures.ts` - Extract test fixture creation
- [ ] 3.4 Create `tests/helpers/package-manager.ts` - Add PM detection and execution

## 4. Add Zod Schema Validation

- [ ] 4.1 Create `tests/types/schemas.ts` with Zod schemas
  - [ ] CLIResultSchema
  - [ ] CLIExecuteOptionsSchema
  - [ ] PackageManagerSchema
  - [ ] TestProjectSchema
- [ ] 4.2 Create `tests/types/index.ts` with type exports using `z.infer`
- [ ] 4.3 Update helpers to use schema validation

## 5. Create Test Fixtures

- [ ] 5.1 Create `tests/fixtures/tsconfigs/` with reusable configs
  - [ ] strict.json
  - [ ] loose.json
  - [ ] with-aliases.json
  - [ ] monorepo.json
- [ ] 5.2 Create `tests/fixtures/files/` with test file templates
  - [ ] valid.ts
  - [ ] error.ts
  - [ ] complex.ts

## 6. Add Package Manager Integration Tests

- [ ] 6.1 Create `tests/integration/cli-package-managers.test.ts`
- [ ] 6.2 Implement PM detection in helper
- [ ] 6.3 Add conditional test execution based on available PMs
- [ ] 6.4 Add 4 smoke tests per PM (version, help, valid, error)

## 7. Migrate Existing Tests

- [ ] 7.1 Update unit tests to use explicit imports (batch update)
- [ ] 7.2 Update integration tests to use explicit imports
- [ ] 7.3 Run full test suite after each batch
- [ ] 7.4 Fix any import issues

## 8. Remove Legacy Code

- [ ] 8.1 Delete `tests/globals.d.ts`
- [ ] 8.2 Remove `globalThis` assignments from old setup
- [ ] 8.3 Archive old `tests/setup.ts` for reference
- [ ] 8.4 Update `vitest.config.ts` to point to new setup

## 9. Update Configuration

- [ ] 9.1 Update `vitest.config.ts` setupFiles paths
- [ ] 9.2 Update `tsconfig.json` if needed for test paths
- [ ] 9.3 Verify path aliases work with new structure

## 10. Documentation

- [ ] 10.1 Update `openspec/AGENTS.md` with new test structure
- [ ] 10.2 Update `docs/testing/README.md` with examples
- [ ] 10.3 Update `docs/contributing/coding-standards.md` if needed
- [ ] 10.4 Add migration guide for developers with in-flight branches

## 11. Quality Checks (run AFTER all migration)

- [ ] 11.1 `pnpm lint` - zero errors/warnings
- [ ] 11.2 `pnpm typecheck` - zero errors
- [ ] 11.3 `pnpm test` - all unit tests passing
- [ ] 11.4 `pnpm test:all` - all tests passing (unit + integration)
- [ ] 11.5 `pnpm test:coverage` - coverage thresholds met
- [ ] 11.6 `pnpm build` - clean build
- [ ] 11.7 `pnpm lint:md` - markdown compliance
