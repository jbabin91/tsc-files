# Implementation Tasks

## 1. Dependency Cleanup

- [ ] 1.1 Verify unused dependencies with grep search
- [ ] 1.2 Remove `cosmiconfig` from package.json
- [ ] 1.3 Remove `deepmerge` from package.json
- [ ] 1.4 Remove `fs-extra` from package.json
- [ ] 1.5 Remove `tsconfig-paths` from package.json
- [ ] 1.6 Remove `strip-json-comments` from package.json
- [ ] 1.7 Add `get-tsconfig` to package.json
- [ ] 1.8 Add `tinyglobby` to package.json
- [ ] 1.9 Remove `fast-glob` from package.json
- [ ] 1.10 Run `pnpm install` to update lockfile
- [ ] 1.11 Verify no broken imports with `pnpm typecheck`
- [ ] 1.12 Verify bundle size reduction with `pnpm check-exports`

## 2. Create TypeScript Config Module

- [ ] 2.1 Create `src/config/tsconfig-resolver.ts` with `get-tsconfig` integration
- [ ] 2.2 Implement `findTsConfig(cwd, projectPath?)` matching current API
- [ ] 2.3 Implement `findTsConfigForFile(filePath, projectPath?)` matching current API
- [ ] 2.4 Implement `parseTypeScriptConfig(configPath)` with extends resolution
- [ ] 2.5 Implement `shouldIncludeJavaScript(config)` helper
- [ ] 2.6 Implement `shouldIncludeJavaScriptFiles(tsconfigPath?)` helper
- [ ] 2.7 Add JSDoc documentation for all exported functions
- [ ] 2.8 Ensure TypeScript strict mode compliance

## 3. Migrate to tinyglobby

- [ ] 3.1 Update `src/core/file-resolver.ts` to import tinyglobby
- [ ] 3.2 Replace `fastGlob()` calls with `tinyglobby` equivalent
- [ ] 3.3 Verify options compatibility (cwd, absolute, onlyFiles)
- [ ] 3.4 Test glob pattern matching (\*_, _, negation patterns)
- [ ] 3.5 Verify TypeScript types are correct
- [ ] 3.6 Run `pnpm typecheck` to ensure no type errors

## 4. Update Imports

- [ ] 4.1 Update `src/config/temp-config.ts` imports
- [ ] 4.2 Update `src/config/dependency-discovery.ts` imports
- [ ] 4.3 Update `src/core/checker.ts` imports
- [ ] 4.4 Search codebase for any other imports from old config modules
- [ ] 4.5 Verify no import errors with `pnpm typecheck`

## 5. Update Tests

- [ ] 5.1 Create `tests/unit/config/tsconfig-resolver.test.ts`
- [ ] 5.2 Port relevant tests from `discovery.test.ts`
- [ ] 5.3 Port relevant tests from `parser.test.ts`
- [ ] 5.4 Add tests for extends chain resolution
- [ ] 5.5 Add tests for npm package extends (e.g., @tsconfig/node18)
- [ ] 5.6 Add tests for edge cases (missing config, malformed JSON, circular extends)
- [ ] 5.7 Update `temp-config.test.ts` for new imports
- [ ] 5.8 Update `tests/unit/core/file-resolver.test.ts` for tinyglobby
- [ ] 5.9 Add tests for glob pattern matching with tinyglobby
- [ ] 5.10 Add tests for cross-platform path handling
- [ ] 5.11 Remove `tests/unit/config/discovery.test.ts`
- [ ] 5.12 Remove `tests/unit/config/parser.test.ts`
- [ ] 5.13 Run `pnpm test` to ensure all tests pass
- [ ] 5.14 Run `pnpm test:coverage` to verify coverage maintained

## 6. Remove Old Modules

- [ ] 6.1 Delete `src/config/discovery.ts`
- [ ] 6.2 Delete `src/config/parser.ts`
- [ ] 6.3 Verify no remaining imports with grep search
- [ ] 6.4 Run `pnpm typecheck` to ensure no broken imports

## 7. Integration Testing

- [ ] 7.1 Test with simple tsconfig.json
- [ ] 7.2 Test with extends chain (2+ levels)
- [ ] 7.3 Test with npm package extends (@tsconfig/node18)
- [ ] 7.4 Test with path aliases (baseUrl, paths)
- [ ] 7.5 Test with allowJs/checkJs configurations
- [ ] 7.6 Test glob patterns with tinyglobby (\*_, _, negation)
- [ ] 7.7 Test file extension filtering
- [ ] 7.8 Run full integration test suite

### 7.9 Monorepo Testing (PRIORITY 1)

- [ ] 7.9.1 Per-file tsconfig resolution: Test files from packages/core/ and packages/ui/ each resolve their own tsconfig
- [ ] 7.9.2 Multiple packages with different configs: Verify strict mode variations across packages
- [ ] 7.9.3 Project references: Test tsconfig with references field respects boundaries
- [ ] 7.9.4 Nested monorepo: Test packages/backend/core/ and packages/backend/api/ resolution
- [ ] 7.9.5 Cross-package invocation: Test single command with files from multiple packages
- [ ] 7.9.6 Workspace glob patterns: Test packages/\*/src/\*\*/\*.ts expands across all packages
- [ ] 7.9.7 Root vs package configs: Verify closest tsconfig.json is used for each file
- [ ] 7.9.8 Explicit --project in monorepo: Test --project flag overrides per-file resolution
- [ ] 7.9.9 Monorepo with extends chains: Test package tsconfig extends root tsconfig
- [ ] 7.9.10 Monorepo with path aliases: Test path mappings resolve correctly per package
- [ ] 7.9.11 File grouping by tsconfig: Verify files are grouped by associated config
- [ ] 7.9.12 Cross-platform monorepo: Test Windows backslash paths in multi-package structure
- [ ] 7.9.13 Monorepo deduplication: Test same file matched by multiple patterns deduplicates
- [ ] 7.9.14 Mixed package patterns: Test absolute, relative, and glob patterns across packages

## 8. Documentation Updates

- [ ] 8.1 Update `openspec/project.md` tech stack section
- [ ] 8.2 Update `README.md` dependencies if needed
- [ ] 8.3 Update `docs/architecture/README.md` config resolution section
- [ ] 8.4 Update `docs/architecture/details.md` if needed
- [ ] 8.5 Update inline code comments for clarity
- [ ] 8.6 Verify all doc links still work

## 9. Quality Validation

- [ ] 9.1 Run `pnpm lint` - zero warnings/errors
- [ ] 9.2 Run `pnpm typecheck` - zero TypeScript errors
- [ ] 9.3 Run `pnpm test` - all tests passing
- [ ] 9.4 Run `pnpm test:coverage` - coverage thresholds met
- [ ] 9.5 Run `pnpm build` - clean build success
- [ ] 9.6 Run `pnpm lint:md` - markdown compliance
- [ ] 9.7 Verify bundle size with `pnpm check-exports`
- [ ] 9.8 Compare bundle size before/after (expect 66% reduction)
- [ ] 9.9 Run ALL 19 existing integration tests (.github/actions/integration-tests/) - MUST pass
- [ ] 9.10 Verify coverage thresholds maintained/increased (CLI 89%, Core 85%, Utils 90%)

## 10. Final Verification

- [ ] 10.1 Test CLI with real projects
- [ ] 10.2 Verify temp config generation still works
- [ ] 10.3 Verify dependency discovery still works
- [ ] 10.4 Verify glob pattern matching works correctly
- [ ] 10.5 Verify error messages are helpful
- [ ] 10.6 Check for any regression in functionality
- [ ] 10.7 Verify cross-platform compatibility (Windows/macOS/Linux)
