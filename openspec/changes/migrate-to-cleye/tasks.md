# Implementation Tasks

## 0. Pre-Implementation Research (CRITICAL - MUST COMPLETE FIRST)

- [x] 0.1 Research cleye's error handling API (throw vs return, error types)
- [x] 0.2 Research cleye's environment variable support (`TSC_PROJECT` equivalent)
- [x] 0.3 Research cleye's validation API (validate property vs argParser)
- [x] 0.4 Research cleye's lifecycle hooks or alternative patterns (preAction equivalent)
- [x] 0.5 Research cleye's help text customization API
- [x] 0.6 Research cleye's error output customization
- [x] 0.7 Research cleye's parse API and return structure
- [x] 0.8 Research cleye's required parameter enforcement
- [x] 0.9 Document cleye API equivalents for all commander features used
- [x] 0.10 Create cleye API reference document for team review

**Key Findings**:

- ✅ Cleye has direct equivalents for most commander features
- ❌ No `exitOverride()` equivalent - need try-catch wrapper
- ❌ No built-in env var support - need manual `default: process.env.TSC_PROJECT`
- ❌ No pre-action hooks - need manual implementation in callback
- ❌ No error output customization - need manual error handling
- ✅ Help text customization via `help` configuration object
- ✅ Validation via `validate` function property
- ✅ Return structure: `result._` (files), `result.flags` (options)

## 1. Dependency Swap

- [ ] 1.1 Add `cleye` (^1.3.2) to package.json dependencies
- [ ] 1.2 Remove `commander` (^14.0.1) from package.json
- [ ] 1.3 Run `pnpm install` to update lockfile
- [ ] 1.4 Verify no broken imports with `pnpm typecheck`

## 2. Rewrite CLI Command Module

- [ ] 2.1 Update imports in `src/cli/command.ts` (replace commander with cleye)
- [ ] 2.2 Convert `createProgram()` to use `cli()` function
- [ ] 2.3 Rewrite option declarations using cleye's declarative syntax
- [ ] 2.4 Implement custom validation for `--project` flag
- [ ] 2.5 Configure help text styling with cleye's API
- [ ] 2.6 Implement pre-action hook for verbose logging
- [ ] 2.7 Add examples section to help text
- [ ] 2.8 Ensure all 13 options are preserved with identical behavior
- [ ] 2.9 Verify exit code handling (0, 1, 2, 3)
- [ ] 2.10 Run `pnpm typecheck` to ensure no type errors
- [ ] 2.11 Implement cleye error handling to replace `exitOverride()` mechanism
- [ ] 2.12 Create `handleCleyeError()` function with cleye error patterns
- [ ] 2.13 Implement manual `TSC_PROJECT` env var reading with correct precedence
- [ ] 2.14 Update verbose logging for env var display (cleye equivalent of preAction)
- [ ] 2.15 Migrate validation logic to cleye's validation approach
- [ ] 2.16 Implement pre-action logging without hook (inline or wrapper pattern)
- [ ] 2.17 Migrate help text styling to cleye's API
- [ ] 2.18 Implement error output coloring with kleur
- [ ] 2.19 Add "show help" hint after validation errors
- [ ] 2.20 Handle no-files-argument scenario explicitly

## 3. Update Type Definitions

- [ ] 3.1 Review `src/types/cli.ts` and update `RawCliOptions` interface
- [ ] 3.2 Leverage cleye's type inference for option types
- [ ] 3.3 Remove commander-specific type workarounds
- [ ] 3.4 Ensure type compatibility with existing code
- [ ] 3.5 Run `pnpm typecheck` to verify types

## 4. Update CLI Runner

- [ ] 4.1 Review `src/cli/main.ts` for any commander-specific logic
- [ ] 4.2 Update argument parsing to use cleye's API
- [ ] 4.3 Verify error handling remains consistent
- [ ] 4.4 Test with various argument combinations

## 5. Update Tests

- [ ] 5.1 Update `tests/unit/cli/command.test.ts` imports
- [ ] 5.2 Adapt test cases to cleye's command API
- [ ] 5.3 Update mocking strategy for cleye (if needed)
- [ ] 5.4 Add new test cases for cleye-specific behavior
- [ ] 5.5 Ensure 100% coverage for command module
- [ ] 5.6 Update `tests/setup.ts` if commander mocks exist
- [ ] 5.7 Run `pnpm test` to ensure all tests pass
- [ ] 5.8 Test cleye error handling for all commander error scenarios
- [ ] 5.9 Test TSC_PROJECT env var with and without --project flag
- [ ] 5.10 Test env var precedence (flag > env var)
- [ ] 5.11 Test validation errors match current format
- [ ] 5.12 Test verbose logging shows env var value
- [ ] 5.13 Test help text format matches current output
- [ ] 5.14 Test error output uses red coloring
- [ ] 5.15 Test "show help" hint appears after errors
- [ ] 5.16 Test no-files-argument displays help and exits with code 1

## 6. Integration Testing

- [ ] 6.1 Test basic invocation: `tsc-files src/index.ts`
- [ ] 6.2 Test glob patterns: `tsc-files "src/**/*.ts"`
- [ ] 6.3 Test `--project` flag with valid path
- [ ] 6.4 Test `--project` flag with invalid path (expect error)
- [ ] 6.5 Test `TSC_PROJECT` environment variable
- [ ] 6.6 Test `--verbose` output
- [ ] 6.7 Test `--json` output format
- [ ] 6.8 Test `--help` and `--version` flags
- [ ] 6.9 Test compiler selection flags (`--use-tsc`, `--use-tsgo`)
- [ ] 6.10 Test performance flags (`--skip-lib-check`, `--no-cache`)
- [ ] 6.11 Test educational flags (`--tips`, `--show-compiler`, `--benchmark`)
- [ ] 6.12 Test `--include` flag with additional files
- [ ] 6.13 Test conflicting options error handling
- [ ] 6.14 Verify all exit codes (0, 1, 2, 3)

### 6.15 Monorepo Testing (PRIORITY 1)

- [ ] 6.15.1 Per-file tsconfig resolution: Test cleye CLI with files from packages/core/ and packages/ui/
- [ ] 6.15.2 Multiple packages with different configs: Verify CLI respects per-package compiler options
- [ ] 6.15.3 Project references: Test --project flag with monorepo references field
- [ ] 6.15.4 Nested monorepo: Test CLI with packages/backend/core/ and packages/backend/api/
- [ ] 6.15.5 Cross-package invocation: Test single cleye CLI command with files from multiple packages
- [ ] 6.15.6 Workspace glob patterns: Test cleye with packages/\*/src/\*\*/\*.ts patterns
- [ ] 6.15.7 Root vs package configs: Verify CLI uses closest tsconfig.json for each file
- [ ] 6.15.8 Explicit --project in monorepo: Test CLI --project flag overrides per-file resolution
- [ ] 6.15.9 Monorepo with extends chains: Test CLI handles package tsconfig extending root config
- [ ] 6.15.10 Monorepo with path aliases: Test CLI resolves path mappings correctly per package
- [ ] 6.15.11 File grouping by tsconfig: Verify CLI groups files by associated config
- [ ] 6.15.12 Cross-platform monorepo: Test cleye on Windows with backslash paths in multi-package structure
- [ ] 6.15.13 Monorepo deduplication: Test CLI deduplicates same file matched by multiple patterns
- [ ] 6.15.14 Mixed package patterns: Test cleye with absolute, relative, and glob patterns across packages
- [ ] 6.15.15 Test error exit codes match across Node.js and Bun
- [ ] 6.15.16 Test env var support works under Bun runtime
- [ ] 6.15.17 Test validation errors work under Bun runtime
- [ ] 6.15.18 Test help text renders correctly under Bun
- [ ] 6.15.19 Test verbose logging works under Bun
- [ ] 6.15.20 Test colored output works under Bun

## 7. Cross-Platform Verification

- [ ] 7.1 Test on macOS with various shell environments
- [ ] 7.2 Test on Linux (Ubuntu) via CI
- [ ] 7.3 Test on Windows via CI
- [ ] 7.4 Verify path handling across platforms
- [ ] 7.5 Verify colored output works on all platforms

## 8. Documentation Updates

- [ ] 8.1 Update `openspec/project.md` tech stack (commander → cleye)
- [ ] 8.2 Review `docs/api.md` for CLI examples (should be unchanged)
- [ ] 8.3 Review `docs/architecture/README.md` for CLI layer description
- [ ] 8.4 Update inline code comments for clarity
- [ ] 8.5 Verify all doc links still work

## 9. Quality Validation

- [ ] 9.1 Run `pnpm lint` - zero warnings/errors
- [ ] 9.2 Run `pnpm typecheck` - zero TypeScript errors
- [ ] 9.3 Run `pnpm test` - all tests passing
- [ ] 9.4 Run `pnpm test:coverage` - coverage thresholds met (89% CLI layer)
- [ ] 9.5 Run `pnpm build` - clean build success
- [ ] 9.6 Run `pnpm lint:md` - markdown compliance
- [ ] 9.7 Run `pnpm check-exports` - package exports valid
- [ ] 9.8 Compare bundle size before/after (expect 25kB reduction)
- [ ] 9.9 Run ALL 19 existing integration tests (.github/actions/integration-tests/) - MUST pass
- [ ] 9.10 Verify coverage thresholds maintained/increased (CLI 89%, Core 85%, Utils 90%)

## 10. Final Verification

- [ ] 10.1 Test real-world git hook scenario (lint-staged)
- [ ] 10.2 Test CI/CD JSON output parsing
- [ ] 10.3 Verify help text readability and completeness
- [ ] 10.4 Verify error messages are helpful and accurate
- [ ] 10.5 Check for any regression in functionality
- [ ] 10.6 Verify colored output disabled in non-TTY environments
- [ ] 10.7 Ensure no breaking changes for end users
