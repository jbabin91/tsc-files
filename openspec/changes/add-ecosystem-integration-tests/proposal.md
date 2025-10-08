# Add Ecosystem Integration Tests

## Why

After fixing tsgo compatibility and type resolution, we need comprehensive integration tests to verify tsc-files works across the entire TypeScript ecosystem. Current testing (419 unit tests) validates individual components but doesn't verify real-world scenarios like:

- Monorepo workspace protocol imports (`workspace:*`, `@workspace/pkg`)
- Framework preset extends chains (Next.js, Vite, Astro)
- TypeScript project references with composite configs
- Large file lists (500+ files) that stress command line limits
- Generated type files (Prisma, GraphQL, Protobuf patterns)
- Modern file extensions (.mts, .cts, .d.mts, .d.cts)
- Different test framework globals (Jest, Playwright, Cypress)

Without these tests, we can't confidently claim tsc-files is "tsc --noEmit but for specific files" across all project types.

## What Changes

Add new `tests/integration/ecosystem/` directory with comprehensive integration tests covering:

1. **Monorepo workspace imports** - Verify cross-package imports resolve correctly
2. **Framework presets** - Test Next.js, Vite, and other framework extends chains
3. **Project references** - Validate composite configs with TypeScript references
4. **Performance/scale** - Test 500+ files for command line limits and memory usage
5. **Generated types** - Mock Prisma/GraphQL patterns to ensure generated types work
6. **Modern extensions** - Test .mts/.cts files with explicit module types
7. **Test framework globals** - Verify Jest, Playwright, Cypress global types work

These tests will use real project structures (not mocked) to catch integration issues early.

## Impact

**Affected specs:**

- `file-checking` - New integration test requirements
- `monorepo-support` - Enhanced with workspace protocol scenarios
- `configuration-management` - Framework preset and project reference scenarios

**Affected code:**

- `tests/integration/ecosystem/` - New test directory (7 test files)
- `tests/fixtures/` - New fixture projects for each scenario
- `vitest.config.ts` - Potential timeout adjustments for integration tests
- `package.json` - Potential test script additions

**Risk:** Integration tests will increase CI time (~2-3 minutes) but are essential for ecosystem confidence.

**Breaking changes:** None - this is test infrastructure only.
