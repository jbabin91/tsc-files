# Implementation Tasks

## 1. Core Implementation

- [x] 1.1 Add automatic tsBuildInfoFile configuration for composite projects
  - Location: `src/config/temp-config.ts` lines 188-235
  - Sets `tsBuildInfoFile` to `node_modules/.cache/tsc-files/tsconfig.tsbuildinfo`
  - Only when `composite: true` and user hasn't set it

- [x] 1.2 Change default cache directory to `node_modules/.cache/tsc-files/`
  - Location: `src/core/checker.ts` lines 107-120
  - Follows industry conventions (ESLint, Babel, Webpack)
  - All temp files (configs + tsBuildInfo) in one location

- [x] 1.3 Fix typeRoots logic to prevent scoped package scanning
  - Location: `src/config/temp-config.ts` lines 128-149
  - Only add typeRoots when cache is disabled (`--no-cache`)
  - Removed bare `node_modules` from typeRoots (was causing errors)
  - Fixed check for when cache is in project directory

## 2. Testing

- [x] 2.1 Add unit tests for tsBuildInfoFile auto-configuration
  - Location: `tests/unit/config/temp-config.test.ts` lines 265-301
  - Verifies automatic setting when composite is true
  - Verifies respect for user's explicit configuration

- [x] 2.2 Update unit tests for typeRoots behavior
  - Location: `tests/unit/config/temp-config.test.ts` lines 65-114
  - Tests both cache-enabled and cache-disabled scenarios
  - Verifies only `node_modules/@types` is added (not bare `node_modules`)

- [x] 2.3 Remove test workaround to verify production behavior
  - Location: `tests/integration/cli-package.test.ts` line 100
  - Removed `types: []` workaround from test tsconfig
  - Confirms real-world behavior with scoped packages

- [x] 2.4 Verify all tests pass
  - Unit tests: 543/543 passing
  - Integration tests: 24/24 passing
  - Total: 567/567 tests passing

## 3. Security Fixes (Bonus)

- [x] 3.1 Fix shell injection vulnerability in integration tests
  - Location: `tests/integration/cli-package.test.ts`
  - Changed from `execaCommand` with string interpolation to `execa` with array arguments
  - Prevents shell metacharacters in paths from being executed

- [x] 3.2 Fix test temp directory creation
  - Location: `tests/unit/config/dependency-discovery.test.ts`
  - Changed from creating dirs in project root to using `tmp` library
  - Proper cleanup of system temp directories

## 4. Documentation

- [x] 4.1 Add README section on clean temporary file management
  - Location: `README.md` lines 418-490
  - Explains cache directory location and benefits
  - Before/after examples showing the improvement

- [x] 4.2 Document TypeScript Project References support
  - Automatic tsBuildInfoFile configuration
  - How to manually override if needed

- [x] 4.3 Add recommended .gitignore patterns
  - `*.tsbuildinfo` catch-all pattern
  - Explanation of why it's useful

- [x] 4.4 Update comments in source code
  - Clear explanation of type resolution strategy
  - Benefits of cache directory approach
  - When typeRoots are needed vs default resolution

## 5. Quality Checks

- [x] 5.1 `pnpm lint` - zero errors/warnings
- [x] 5.2 `pnpm typecheck` - zero errors
- [x] 5.3 `pnpm test` - all tests passing (543/543)
- [x] 5.4 `pnpm test:integration` - all tests passing (24/24)
- [x] 5.5 `pnpm build` - clean build
- [x] 5.6 `pnpm lint:md` - markdown compliance
