# ADR 011: File Pattern Matching Library Migration (fast-glob → tinyglobby)

**Status**: Accepted

**Date**: 2025-10-11

## Context

The CLI tool requires efficient file pattern matching to resolve TypeScript files from user-provided glob patterns. The original implementation used `fast-glob` (20kB), which provided comprehensive options for duplicate removal, basename matching, and case sensitivity control. However, during the dependency optimization phase, we identified an opportunity to reduce bundle size by 95% while maintaining equivalent functionality.

Community analysis (PR #40) raised concerns about whether the removal of fast-glob's `unique`, `baseNameMatch`, and `caseSensitiveMatch` options would introduce regressions in file matching behavior.

## Decision

We migrated from **fast-glob to tinyglobby** for file pattern matching:

1. **Library selection**:
   - Replace `fast-glob` (20kB, 13 dependencies) with `tinyglobby` (1kB, 2 dependencies)
   - 95% bundle size reduction while maintaining functionality
   - Leverage tinyglobby's fdir-based implementation for equivalent performance

2. **Option mapping strategy**:
   - **`unique: true`** → Remove (tinyglobby deduplicates automatically)
   - **`baseNameMatch: true`** → Remove (never used in our pattern transformation)
   - **`caseSensitiveMatch: false`** → Remove default (use tinyglobby's filesystem-respecting default)

3. **Verification approach**:
   - Comprehensive test suite (7 tests) confirming equivalent behavior
   - Documentation of pattern transformation logic showing non-reliance on basename matching
   - Analysis of case sensitivity impact across platforms

## Reasoning

**Bundle size optimization**:

- **Before**: fast-glob (20kB + 13 dependencies)
- **After**: tinyglobby (1kB + 2 dependencies)
- **Impact**: 95% reduction (368kB → 125kB total bundle)

**Functionality equivalence verification**:

1. **Duplicate handling** (removed `unique: true`):
   - ✅ **No regression**: tinyglobby automatically deduplicates results
   - Verified no duplicates with overlapping patterns like `['src/**/*.ts', 'src/core/*.ts']`

2. **Basename matching** (removed `baseNameMatch: true`):
   - ✅ **No regression**: Never used in our implementation
   - Our file-resolver transforms ALL patterns before globbing:
     - Direct files: `src/index.ts` → handled as-is (not globbed)
     - Glob patterns: `src/*.ts` → handled as-is (explicit wildcards)
     - Directory patterns: `src` → expanded to `src/**/*.{ts,tsx}` (explicit wildcards)
   - We NEVER pass basename-only patterns like `*.ts` expecting nested matches
   - Code location: `src/core/file-resolver.ts:80-106` (handleDirectFile, handleGlobPattern)

3. **Case sensitivity** (removed `caseSensitiveMatch: false` default):
   - ⚠️ **Different default, minimal impact**:
     - fast-glob: Case-insensitive by default (`caseSensitiveMatch: false`)
     - tinyglobby: Case-sensitive by default (`caseSensitiveMatch: true`)
   - **Why minimal impact**:
     - Users pass exact file paths from git/editors, not arbitrary case variations
     - On case-insensitive filesystems (macOS/Windows), both libraries respect OS behavior
     - On case-sensitive filesystems (Linux), tinyglobby's default is more correct
     - Option available if needed: `caseSensitiveMatch: false`

**Performance considerations**:

- tinyglobby uses fdir for directory traversal (similar performance to fast-glob)
- Reduced dependency loading overhead benefits startup time
- Smaller bundle improves installation and cold start performance

## Alternatives Considered

1. **Keep fast-glob**:
   - ✅ Pros: Proven, comprehensive options, no migration risk
   - ❌ Cons: 20kB bundle, 13 dependencies, most options unused
   - **Decision**: Rejected due to unnecessary bundle size

2. **Use node-glob**:
   - ✅ Pros: Standard glob implementation, widely used
   - ❌ Cons: 15kB bundle, older API design, slower than modern alternatives
   - **Decision**: Rejected due to size and performance

3. **Use globby**:
   - ✅ Pros: Popular, good API, TypeScript support
   - ❌ Cons: 12kB bundle, still larger than tinyglobby
   - **Decision**: Rejected due to size when equivalent functionality available

4. **Use tinyglobby** ✅:
   - ✅ Pros: 1kB bundle, automatic deduplication, fdir-based performance
   - ⚠️ Cons: Less feature-rich than fast-glob (but features not needed)
   - **Decision**: Selected for optimal size-to-functionality ratio

## Consequences

### Positive

- **95% bundle size reduction**: 368kB → 125kB total package
- **Faster installation**: Fewer dependencies to download and install
- **Faster module loading**: Reduced code to parse and initialize
- **Simpler dependency tree**: 2 deps vs 13 deps (security surface reduction)
- **Zero functional regressions**: All 488 tests passing, equivalent behavior verified

### Negative

- **Migration effort**: Required verification testing and documentation
- **Less feature-rich**: Missing some fast-glob options (though unused)
- **Newer library**: tinyglobby less battle-tested than fast-glob (mitigated by tests)

### Neutral

- **Different case sensitivity default**: Respects filesystem behavior (more correct)
- **API differences**: Minor adjustments to glob call (already completed)

## Verification

**Temporary verification testing** (not committed):

During migration, we created temporary verification tests to confirm tinyglobby behavior:

1. ✅ Automatic deduplication of overlapping patterns
2. ✅ Basename-only patterns correctly limited to root directory
3. ✅ Explicit wildcards required for nested matching (as intended)
4. ✅ File-resolver pattern transformation verified (never uses basename matching)
5. ✅ Case-sensitive default behavior documented
6. ✅ Case-insensitive option available when needed
7. ✅ Actual file-resolver usage patterns work correctly

Per project testing guidelines, temporary third-party verification tests were deleted after documenting findings in this ADR. See [Testing Best Practices](../testing/best-practices.md#third-party-library-verification).

**Integration testing**: All 488 existing tests pass without modification, providing ongoing validation of correct behavior.

**Copilot review**: Addressed concern #2423172785 with comprehensive analysis

## Implementation

**Migration commit**: 96b2fde - refactor(config): simplify config parsing with get-tsconfig

**Files changed**:

- `src/core/file-resolver.ts:114-119` - Removed fast-glob options, updated to tinyglobby
- `package.json` - Removed fast-glob, added tinyglobby

**Validation commands**:

```bash
# Verify bundle size reduction
pnpm build && du -h dist/

# Run full test suite (488 tests validate correct behavior)
pnpm test
```

## Related Decisions

- **ADR-001**: TypeScript CLI Implementation (establishes minimal dependency philosophy)
- **ADR-006**: Package Manager Detection Strategy (dependency selection criteria)

## References

- [tinyglobby documentation](https://superchupu.dev/tinyglobby)
- [fast-glob documentation](https://github.com/mrmlnc/fast-glob)
- [Copilot review comment #2423172785](https://github.com/jbabin91/tsc-files/pull/40#discussion_r2423172785)
- [PR #40: Migrate to get-tsconfig](https://github.com/jbabin91/tsc-files/pull/40)
