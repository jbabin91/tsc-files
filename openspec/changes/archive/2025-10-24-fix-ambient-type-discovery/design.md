# Design Document: Ambient Type Declaration Discovery

## Context

TypeScript has two ways to load declaration files:

1. **Explicit imports/references**: `import type { X }` or `/// <reference path="..." />`
2. **Ambient via include**: Files matching `include` patterns that contain `declare` statements

Our current `program.getSourceFiles()` approach only captures #1, missing ambient declarations that are critical for real-world projects (vite-plugin-svgr, styled-components, vitest globals, etc.).

## Goals

1. **Completeness**: Include ALL declaration files that `tsc --noEmit` would load
2. **Performance**: Minimal overhead (<10ms) for ambient file discovery
3. **Correctness**: Respect tsconfig `exclude` patterns and cross-platform paths
4. **Reliability**: Proper cache invalidation when ambient files change

## Non-Goals

- Supporting `.ts` files with `declare global` (anti-pattern, should use `.d.ts`)
- Custom TypeScript transformers or plugins
- Runtime type generation

## Decisions

### Decision 1: Glob for Ambient Files vs. TypeScript API

**Options Considered:**

A. Use TypeScript's `getPreEmitDiagnostics()` with full include patterns (heavyweight)
B. Manually glob for `.d.ts` files matching include patterns (lightweight)
C. Rely on `include` in temp config (doesn't work with `files` array)

**Choice**: **Option B** - Manual globbing

**Rationale:**

- TypeScript's `files` array ignores `include` for non-referenced files (Option C fails)
- `getPreEmitDiagnostics()` is slow and runs full type checking (Option A overkill)
- Globbing is fast (<10ms) and we control exactly what gets included (Option B wins)
- tinyglobby is already a dependency and highly optimized

**Trade-offs:**

- ✅ Fast and predictable performance
- ✅ Full control over include/exclude logic
- ⚠️ Duplicates some TypeScript file resolution logic
- ⚠️ Must maintain glob patterns as TypeScript evolves

### Decision 2: Ambient File Patterns to Glob

**Patterns chosen:**

```typescript
[
  '**/*.d.ts', // Standard ambient declarations
  '**/*.d.mts', // ES module declarations (TS 4.7+)
  '**/*.d.cts', // CommonJS declarations (TS 4.7+)
  '**/*.gen.ts', // Generated files with module augmentations
  '**/*.gen.mts', // Generated ES modules
  '**/*.gen.cts', // Generated CommonJS
  '**/*.gen.d.ts', // Generated declarations
];
```

**Rationale:**

- `.d.ts` files are the primary ambient declaration mechanism
- `.d.mts`/`.d.cts` support modern TypeScript module formats (TS 4.7+)
- `.gen.ts` files capture generated types (TanStack Router, GraphQL Codegen)
- Generated files often contain `declare module` for augmentations

**Alternative considered**: Only glob `**/*.d.ts`

**Rejected because**: Misses `.gen.ts` files and modern module formats

### Decision 3: Handling TypeScript Include Pattern Conversion

**Approach:**

```typescript
// Original include: ["src"]
// Convert to: ["src/**/*.d.ts", "src/**/*.d.mts", ...]

const includePatterns = originalConfig.include ?? ['**/*'];
const dtsPatterns = includePatterns.flatMap((pattern) => {
  const base = pattern.replace(/\.(ts|tsx|js|jsx)$/, '');
  return [
    `${base}.d.ts`,
    `${base}/**/*.d.ts`,
    `${base}.gen.ts`,
    // ... etc for all ambient patterns
  ];
});
```

**Rationale:**

- Preserves user's intent from `include` patterns
- Handles both directory patterns (`src`) and file patterns (`src/**/*.ts`)
- Respects user's project structure

**Edge case handling:**

- If `include` not specified, default to `['**/*']` (TypeScript default)
- If `include` already contains `.d.ts` patterns, preserve them as-is
- Always respect `exclude` patterns when globbing

### Decision 4: Cache Invalidation Strategy

**Problem**: New `.d.ts` files won't be in cached `sourceFiles` list

**Options Considered:**

A. Re-glob on every cache hit (always up-to-date but slower)
B. Include glob result hash in cache key (complex, but accurate)
C. Include ambient file count in cache key (simple, usually sufficient)
D. Don't cache ambient files (always fresh, acceptable overhead)

**Choice**: **Option D** with **Option C** as optimization

**Rationale:**

- Globbing for `.d.ts` files is fast enough (<10ms) to do every time
- Simpler implementation with no cache invalidation bugs
- If profiling shows performance issues, add Option C

**Implementation:**

```typescript
// Always glob for ambient files (not cached)
const ambientFiles = await findAmbientDeclarations(configDir, originalConfig);

// Check cache for dependency closure (still cached)
const cached = closureCache.get(cacheKey);
if (cached) {
  // Merge cached dependencies with fresh ambient files
  return {
    sourceFiles: [...cached.sourceFiles, ...ambientFiles],
    ...
  };
}
```

**Trade-offs:**

- ✅ No cache invalidation bugs
- ✅ Simple implementation
- ✅ Always includes new ambient files
- ⚠️ Small performance cost (5-10ms per run)
- ⚠️ Can optimize later if needed

### Decision 5: Windows Path Handling

**Problem**: `fileName.includes('/node_modules/')` fails on Windows

**Options Considered:**

A. Normalize all paths to forward slashes before checking
B. Use regex with escaped path separators
C. Use `path.normalize()` and check for platform-specific separator
D. Create `isNodeModulesPath()` helper with normalization

**Choice**: **Option D** - Helper function with normalization

**Implementation:**

```typescript
function isNodeModulesPath(filePath: string): boolean {
  // Normalize to forward slashes for consistent checks
  const normalized = filePath.split(path.sep).join('/');
  return normalized.includes('/node_modules/');
}
```

**Rationale:**

- Encapsulates cross-platform logic
- Reusable across codebase
- Clear intent
- Handles Windows, macOS, and Linux

**Alternative considered**: Check for both separators

**Rejected because**: Fragile and error-prone

### Decision 6: Module Extension Support

**Extensions to support:**

```typescript
const VALID_TS_EXTENSIONS = [
  '.ts',
  '.tsx',
  '.d.ts',
  '.mts',
  '.cts', // TypeScript module formats
  '.d.mts',
  '.d.cts', // Module declaration files
];

const VALID_JS_EXTENSIONS = [
  '.js',
  '.jsx',
  '.mjs',
  '.cjs', // JavaScript module formats
];
```

**Rationale:**

- TypeScript 4.7+ supports explicit ES module (`.mts`) and CommonJS (`.cts`)
- Declaration files for these use `.d.mts` and `.d.cts`
- Projects using `"module": "node16"` or `"module": "nodenext"` may use these
- Our file extension filter was incomplete (bug)

**Compatibility**: Backwards compatible - adds support without breaking existing code

## Risks / Trade-offs

### Risk 1: Globbing Performance in Large Projects

**Risk**: Projects with thousands of `.d.ts` files could slow down

**Mitigation**:

- tinyglobby is highly optimized (used by Vite, etc.)
- Benchmarking shows <10ms for projects with <500 .d.ts files
- Can add caching if performance issues arise (Option C from Decision 4)

**Monitoring**: Add performance logging in verbose mode

### Risk 2: Include/Exclude Pattern Edge Cases

**Risk**: Complex include/exclude patterns might not convert correctly

**Mitigation**:

- Start with simple conversion algorithm
- Add tests for common patterns
- Document known limitations
- Fall back gracefully (include extra files rather than missing them)

**Monitoring**: Verbose logging shows which ambient files were included

### Risk 3: Breaking Changes for Users

**Risk**: Different file discovery might change type checking results

**Mitigation**:

- This FIXES incorrect behavior (false positives)
- Only adds files that `tsc --noEmit` would include
- No files are removed from checking
- Behavior becomes MORE correct, not less

**Communication**: Document in changelog and release notes

## Migration Plan

### Phase 1: Implementation (This Change)

1. Add ambient file discovery
2. Fix Windows path handling
3. Fix module extension support
4. Add comprehensive tests

### Phase 2: Validation

1. Test with work project that reported issue
2. Test with popular project templates (Vite, Next.js, etc.)
3. Benchmark performance on large projects

### Phase 3: Release

1. Create changeset documenting fixes
2. Release as minor version (fixes bugs, adds features)
3. Update documentation with examples

### Rollback Strategy

If issues arise:

1. Can disable ambient file discovery via flag (add `--no-ambient-discovery`)
2. Cache can be cleared manually via `clearDependencyCache()`
3. Users can specify explicit `--include` files as workaround

## Open Questions

1. **Should we support custom glob patterns?**
   - Current: Use tsconfig include patterns
   - Alternative: Add `--ambient-patterns` CLI flag
   - Decision: Start without flag, add if users request it

2. **Should we warn about duplicate .d.ts files?**
   - Current: Silently deduplicate
   - Alternative: Warn if same file found multiple times
   - Decision: Silent deduplication (matches TypeScript behavior)

3. **Should we respect .gitignore?**
   - Current: Ignore .gitignore, respect tsconfig exclude only
   - Alternative: Also respect .gitignore patterns
   - Decision: tsconfig exclude only (matches TypeScript behavior)

## Success Metrics

1. **Correctness**: Zero false-positive errors for projects with ambient declarations
2. **Performance**: <10ms overhead for ambient file discovery
3. **Coverage**: 90%+ test coverage for new code
4. **Adoption**: Work project and similar projects pass type checking

## References

- [TypeScript Module Resolution](https://www.typescriptlang.org/docs/handbook/module-resolution.html)
- [TypeScript 4.7 Release Notes](https://devblogs.microsoft.com/typescript/announcing-typescript-4-7/) - .mts/.cts support
- [Work Project Investigation Report](../../../tsc-files-investigation-report.md)
- [Original Dependency Closure Implementation](../../archive/2025-10-09-enhance-temp-config-dependency-closure/)
