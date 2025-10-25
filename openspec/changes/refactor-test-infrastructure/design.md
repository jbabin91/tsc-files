# Test Infrastructure Reorganization Design

## Context

The test infrastructure has grown organically from 247 unit tests + 19 integration tests to include custom matchers, fixtures, and helpers. The current single-file setup (593 lines) makes maintenance difficult and hides dependencies through global utilities. We need a more scalable, maintainable test architecture that follows our coding standards (explicit imports, `type` over `interface`, Zod validation where beneficial).

## Goals / Non-Goals

### Goals

- ✅ Separate test concerns by type (unit vs integration setup)
- ✅ Organize helpers into logical, discoverable modules
- ✅ Remove legacy global pattern for better IDE support
- ✅ Add runtime validation with Zod for test utilities
- ✅ Add package manager compatibility testing
- ✅ Follow project coding standards (`type` over `interface`)
- ✅ Maintain 100% test pass rate throughout migration

### Non-Goals

- ❌ Change test frameworks (staying with Vitest)
- ❌ Rewrite existing tests (only update imports)
- ❌ Add new test coverage beyond PM compatibility
- ❌ Change test project configuration (Vitest projects stay)

## Decisions

### Decision 1: Split Setup by Test Type

**What**: Create separate setup files for base, unit, and integration tests.

**Why**: Unit and integration tests have different needs:

- Unit tests: Fast, mocked, isolated
- Integration tests: Real package, slower, cross-platform

**Alternatives**:

1. Keep single setup file - ❌ Doesn't scale, already too large
2. Environment variables to configure - ❌ More complex, harder to debug
3. Separate setup files - ✅ Clear, explicit, maintainable

### Decision 2: Explicit Imports Over Globals

**What**: Remove `globalThis` utilities and `globals.d.ts`, require explicit imports.

**Why**:

- Better IDE support (autocomplete, go-to-definition)
- Clear dependencies (can see what each test uses)
- Easier to mock/stub (can control imports)
- Follows modern JavaScript best practices

**Alternatives**:

1. Keep globals - ❌ Poor maintainability, hidden dependencies
2. Vitest setup files only - ❌ Still unclear dependencies
3. Explicit imports - ✅ Best practice, clear, maintainable

### Decision 3: Selective Zod Validation

**What**: Use Zod schemas for CLI results, test fixtures, and helper parameters.

**Why**:

- Runtime safety catches unexpected data early
- Better error messages than TypeScript-only
- Self-documenting schemas
- Already using Zod in production code

**Where to Use**:

- ✅ CLI result validation
- ✅ Test fixture data structures
- ✅ Helper function parameters
- ❌ Simple internal types (plain TypeScript is fine)

**Alternatives**:

1. No runtime validation - ❌ Misses runtime errors
2. Custom validation - ❌ Reinventing the wheel
3. Zod everywhere - ❌ Overkill for simple types
4. Selective Zod - ✅ Balanced approach

### Decision 4: Package Manager Smoke Tests

**What**: Separate test file with lightweight smoke tests for each available PM.

**Why**:

- Validates PM → CLI invocation path
- Conditional on PM availability (developer-friendly)
- Faster than running all 19 tests per PM
- Matches GitHub Actions approach

**Implementation**:

```typescript
// Detect available PMs at runtime
const availablePMs = await detectAvailablePackageManagers();
// Returns: ['npx', 'pnpm', 'yarn', 'bun'] (conditional)

// Run 4 smoke tests per available PM
describe.each(availablePMs)('Package Manager: %s', (pm) => {
  it('should display version', async () => { ... });
  it('should display help', async () => { ... });
  it('should pass for valid TypeScript', async () => { ... });
  it('should fail for invalid TypeScript', async () => { ... });
});
```

**Test Count**: 4 tests × 4 PMs = 16 tests (but only runs available PMs locally)

## Architecture

### New Directory Structure

```sh
tests/
├── setup/                    # Test configuration
│   ├── base.ts              # Shared: Vitest config, temp dirs
│   ├── unit.ts              # Unit: Fast mocks, test fixtures
│   ├── integration.ts       # Integration: Real package setup
│   └── matchers.ts          # Custom: toHaveExitCode, etc.
│
├── helpers/                  # Utility functions
│   ├── cli.ts               # runCli, parseCLIOutput
│   ├── filesystem.ts        # createTempDir, writeTestFile
│   ├── fixtures.ts          # createTestProject, loadFixture
│   └── package-manager.ts   # detectPMs, runWithPM
│
├── types/                    # Test-specific types
│   ├── schemas.ts           # Zod schemas
│   └── index.ts             # Type exports (z.infer)
│
├── fixtures/                 # Reusable test data
│   ├── tsconfigs/           # Sample configurations
│   └── files/               # Test file templates
│
├── unit/                     # Unit tests (existing)
├── integration/              # Integration tests (existing)
│   ├── cli-package.test.ts          # Comprehensive (19 tests)
│   └── cli-package-managers.test.ts # PM smoke tests (NEW)
│
└── vitest.setup.ts           # Entry point
```

### Module Responsibilities

**tests/setup/base.ts**:

- Vitest global configuration
- Temp directory fixtures
- Common test utilities

**tests/setup/unit.ts**:

- Unit test optimizations
- Fast mocking setup
- Imports base setup

**tests/setup/integration.ts**:

- Real package packing
- Cross-platform setup
- Imports base setup

**tests/setup/matchers.ts**:

- Custom Vitest matchers
- CLI-specific assertions
- Imported by base setup

**tests/helpers/package-manager.ts**:

```typescript
export async function detectAvailablePackageManagers(): Promise<
  PackageManager[]
>;
export async function runWithPackageManager(
  pm: PackageManager,
  command: string,
  options: PMExecuteOptions,
): Promise<CLIResult>;
export function getPackageManagerCommand(pm: PackageManager): string;
```

**tests/types/schemas.ts**:

```typescript
export const CLIResultSchema = z.object({ stdout, stderr, exitCode, duration? })
export const PackageManagerSchema = z.enum(['npx', 'pnpm', 'yarn', 'bun'])
export const TestProjectSchema = z.object({ tempDir, srcDir, tsconfig })
```

## Migration Plan

### Phase 1: Create Infrastructure (No Breaking Changes)

1. Create new directories
2. Add new helper modules alongside existing code
3. Add Zod schema definitions
4. Add PM integration test file
5. Tests still use old setup - nothing broken

### Phase 2: Migrate Tests Incrementally

1. Update 5 test files at a time
2. Run test suite after each batch
3. Fix any import issues immediately
4. Track progress in tasks.md

### Phase 3: Remove Legacy Code

1. Delete `globals.d.ts`
2. Remove `globalThis` assignments
3. Archive old `setup.ts`
4. Update `vitest.config.ts`

### Rollback Strategy

If migration fails:

1. Git revert to last working state
2. Old setup.ts is still in repo history
3. Can restore incrementally
4. No data loss (tests are deterministic)

## Risks / Trade-offs

### Risk: Test Import Updates

**Risk**: Updating ~30 test files for explicit imports could introduce errors.

**Mitigation**:

- Automated find/replace where possible
- Batch updates (5 files at a time)
- Run tests after each batch
- Can write codemod if needed

### Risk: Developer Disruption

**Risk**: Developers with in-flight branches will have merge conflicts.

**Mitigation**:

- Announce change in advance
- Provide migration guide
- Offer to help with rebases
- Keep old setup.ts in git history for reference

### Trade-off: More Files

**Benefit**: Better organization, easier to find utilities
**Cost**: More files to navigate initially

**Verdict**: Worth it - clear structure beats single mega-file

### Trade-off: Explicit Imports

**Benefit**: Clear dependencies, better IDE support
**Cost**: Slightly more typing (import statements)

**Verdict**: Worth it - follows modern best practices

## Performance Impact

### Setup Time

- **Before**: Single 593-line file parse
- **After**: Multiple smaller files (200 lines each)
- **Impact**: Negligible (milliseconds difference)

### Test Runtime

- **Unit tests**: No change (same tests, different imports)
- **Integration tests**: +20-30s for PM smoke tests
- **Total**: ~70s instead of ~50s (40% increase, acceptable)

## Open Questions

None - design is complete and approved.
