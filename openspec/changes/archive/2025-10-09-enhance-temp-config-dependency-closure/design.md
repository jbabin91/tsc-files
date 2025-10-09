## Context

The current temp config generation only includes the explicitly selected files plus broad include patterns (`**/*.d.ts`, `**/*.gen.ts`). This fails when:

- Generated modules (`.gen.ts`) provide types that selected files depend on
- Path-mapped imports resolve to files outside the broad patterns
- Project references create implicit dependencies

We need a way to compute the exact set of source files required for typechecking the selected roots.

## Goals / Non-Goals

### Goals

- Compute complete dependency closure for selected TypeScript files
- Maintain compatibility with both tsc and tsgo compilers
- Provide caching and diagnostics for performance and observability
- Fall back gracefully when discovery fails

### Non-Goals

- Change the public API or CLI interface
- Modify how tsconfig.json files are discovered or parsed
- Add new user-facing configuration options

## Decisions

### Dependency Discovery Strategy

**Decision**: Use TypeScript compiler API (`ts.createProgram`) to build a discovery program that computes the source file closure.

**Rationale**:

- TypeScript's own resolution logic ensures accuracy
- Handles all module resolution modes (classic, node, bundler)
- Automatically includes generated files, path mappings, and project references
- No need to reimplement complex resolution algorithms

**Implementation**:

1. Load original tsconfig.json with `ts.readConfigFile` + `ts.parseJsonConfigFileContent`
2. Override `files` array with selected root files
3. Create program with `ts.createProgram`
4. Extract source files from `program.getSourceFiles()`
5. Filter out node_modules and return the closure

### Caching Strategy

**Decision**: Cache dependency closures keyed by `{tsconfigHash, rootFilesHash, mtimeHash}`.

**Rationale**:

- Discovery is expensive and should be cached when possible
- Cache must invalidate when config or any dependency changes
- Hash-based keys are fast to compute and compare

**Cache Key Components**:

- `tsconfigHash`: SHA-256 of resolved tsconfig.json content
- `rootFilesHash`: SHA-256 of sorted root file paths
- `mtimeHash`: SHA-256 of modification times for all files in closure

**Cache Storage**: Use temp directory with structured filenames.

### Compiler Compatibility

**Decision**: Discovery program uses same compiler as final execution to ensure consistency.

**Rationale**:

- tsgo and tsc may have different resolution behavior
- Ensures the closure matches what the final compiler will see
- Avoids compatibility issues between discovery and execution

**Fallback Logic**:

- If discovery fails, fall back to current include patterns
- Log warning about incomplete dependency resolution
- Continue with type checking (better than failing)

## Risks / Trade-offs

### Performance Impact

- **Risk**: Discovery adds overhead to every run
- **Mitigation**: Aggressive caching, fast hash computation, early cache hits
- **Trade-off**: Accuracy vs speed - accept small performance hit for correct type checking

### Complexity

- **Risk**: TypeScript compiler API is complex and version-sensitive
- **Mitigation**: Isolate in dedicated module, add comprehensive tests
- **Trade-off**: Implementation complexity vs maintenance burden

### Cache Reliability

- **Risk**: Cache invalidation misses could lead to stale results
- **Mitigation**: Conservative invalidation, mtime-based checks
- **Trade-off**: Cache misses vs correctness

## Migration Plan

1. **Phase 1**: Implement discovery helper with fallback to current behavior
2. **Phase 2**: Integrate into temp config generation
3. **Phase 3**: Add caching and diagnostics
4. **Phase 4**: Remove `.gen.ts` include hack once proven reliable

## Open Questions

- How to handle circular dependencies in discovery?
- Should we expose discovery results in non-verbose mode?
- How to test discovery accuracy across different project structures?
