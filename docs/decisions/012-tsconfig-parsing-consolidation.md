# ADR 012: TypeScript Configuration Parsing Consolidation (get-tsconfig)

**Status**: Accepted

**Date**: 2025-10-11

## Context

The original implementation used multiple libraries to handle TypeScript configuration discovery and parsing:

- **cosmiconfig**: Config file discovery
- **deepmerge**: Extends chain merging
- **fs-extra**: File system operations
- **tsconfig-paths**: Path resolution
- **strip-json-comments**: JSON parsing with comments

This resulted in:

1. **Fragmented logic**: Config discovery (discovery.ts) and parsing (parser.ts) separated
2. **Redundant operations**: Multiple file reads and parsing passes for validation
3. **Dependency bloat**: 6 dependencies (23kB) for tsconfig handling alone
4. **Complex maintenance**: Custom extends chain resolution with edge case handling
5. **Error handling gaps**: Multiple failure points across libraries

The tsc-files tool needs robust, efficient tsconfig parsing that respects the full TypeScript configuration specification while minimizing dependencies and complexity.

## Decision

We consolidated TypeScript configuration handling using **get-tsconfig**:

1. **Unified configuration layer**:
   - Replace `discovery.ts` + `parser.ts` with single `tsconfig-resolver.ts` (136 lines)
   - Delegate extends chain resolution to get-tsconfig's battle-tested implementation
   - Single source of truth for tsconfig discovery and parsing

2. **Dependency consolidation**:
   - **Remove 6 dependencies**: cosmiconfig, deepmerge, fs-extra, tsconfig-paths, strip-json-comments, fast-glob
   - **Add 1 dependency**: get-tsconfig v4.8.1 (zero dependencies, well-tested)
   - **Add 1 dependency**: tinyglobby v0.2.10 (minimal glob, replaces fast-glob)
   - **Net reduction**: -5 dependencies, 66% bundle size reduction (368kB → 125kB)

3. **API simplification**:
   - `findTsConfig(cwd, projectPath?)` - Find tsconfig.json with automatic traversal
   - `findTsConfigForFile(filePath, projectPath?)` - Per-file config resolution
   - `parseTypeScriptConfig(configPath)` - Parse with full extends chain resolution
   - `shouldIncludeJavaScript(config)` - Check allowJs/checkJs configuration

4. **Error handling improvements**:
   - Preserve original error messages from get-tsconfig for better debugging
   - Single parsing pass eliminates redundant validation failures
   - Early config validation before expensive file resolution
   - Forgiving JSON parser handles comments and trailing commas

5. **Performance optimization**:
   - Eliminate redundant tsconfig parsing (previously: validate, then parse again)
   - Early config validation before file resolution
   - Reduced dependency loading overhead
   - Single library call for discovery + parsing + extends resolution

## Reasoning

**get-tsconfig selection benefits**:

- **Zero dependencies**: No transitive dependency bloat (unlike cosmiconfig ecosystem)
- **Battle-tested**: Used by major tooling (Vite, tsup, tsx, etc.)
- **Specification-compliant**: Handles full TypeScript extends chain correctly
- **Forgiving parser**: Supports comments, trailing commas (using native JSON.parse strategy)
- **TypeScript-first**: Built specifically for TypeScript configuration
- **Active maintenance**: Part of get-tsconfig family (getTsconfig, parseTsconfig)

**Architecture improvements**:

1. **Single responsibility**: One module handles all tsconfig operations
2. **Reduced complexity**: 136 lines vs ~250 lines previously
3. **Better testability**: Fewer mocking surfaces, simpler test fixtures
4. **Clearer error paths**: Single library to wrap and contextualize
5. **Easier debugging**: One place to add logging and instrumentation

**Performance gains**:

- **Bundle size**: 66% reduction (368kB → 125kB)
- **Installation**: 5 fewer packages to download
- **Module loading**: Faster require/import resolution
- **Runtime**: Single parse instead of validate-then-parse pattern
- **Early validation**: Config errors caught before file system operations

## Alternatives Considered

1. **Keep existing implementation**:
   - ✅ Pros: Known behavior, no migration risk
   - ❌ Cons: 6 dependencies, complex maintenance, redundant parsing
   - **Decision**: Rejected due to unnecessary complexity and size

2. **Use @typescript/vfs or ts-morph**:
   - ✅ Pros: Official TypeScript ecosystem tools
   - ❌ Cons: Massive bundles (>1MB), overkill for config parsing
   - **Decision**: Rejected due to excessive size

3. **Use cosmiconfig + custom parser**:
   - ✅ Pros: Flexible, well-known API
   - ❌ Cons: Still requires deepmerge for extends, 4+ dependencies
   - **Decision**: Rejected in favor of specialized TypeScript tool

4. **Use get-tsconfig** ✅:
   - ✅ Pros: Zero deps, TypeScript-specific, proven, comprehensive
   - ⚠️ Cons: Requires migration of existing code
   - **Decision**: Selected for optimal trade-off

## Consequences

### Positive

- **66% bundle size reduction**: 368kB → 125kB (net -243kB)
- **5 fewer dependencies**: Reduced security surface and maintenance burden
- **Simpler architecture**: Single module (136 lines) vs fragmented logic
- **Better error messages**: Preserved original context from get-tsconfig
- **Eliminated redundant parsing**: Single parse instead of validate-then-parse
- **Specification compliance**: get-tsconfig handles edge cases correctly
- **100% API compatibility**: All 488 tests passing without breaking changes
- **Improved coverage**: 88.92% statements (+4.92% above threshold)

### Negative

- **Migration effort**: Replaced 2 modules, updated tests
- **Learning curve**: Team needs to understand get-tsconfig API (minimal impact)
- **Less flexibility**: get-tsconfig is opinionated (but matches our needs)

### Neutral

- **Forgiving JSON parsing**: get-tsconfig allows comments/trailing commas (TypeScript-compliant)
- **Discovery behavior**: Slightly different from cosmiconfig (still standard traversal)

## Implementation Details

**Files created**:

- `src/config/tsconfig-resolver.ts` (136 lines) - Unified config handling

**Files removed**:

- `src/config/discovery.ts` - Replaced by get-tsconfig's getTsconfig
- `src/config/parser.ts` - Replaced by get-tsconfig's parseTsconfig

**Files updated**:

- `src/core/checker.ts` - Use new API, early validation
- `src/core/file-resolver.ts` - Simplified config reading
- `tests/unit/config/tsconfig-resolver.test.ts` - New test suite

**API migration**:

Before:

```typescript
// Multiple steps, multiple libraries
import { findTsConfig } from './config/discovery';
import { parseTypeScriptConfig } from './config/parser';

const configPath = await findTsConfig(cwd, projectPath);
const config = await parseTypeScriptConfig(configPath); // Redundant parse
```

After:

```typescript
// Single library, single parse
import {
  findTsConfig,
  parseTypeScriptConfig,
} from './config/tsconfig-resolver';

const configPath = findTsConfig(cwd, projectPath);
const config = parseTypeScriptConfig(configPath); // Only parse once
```

**Migration commit**: 96b2fde - refactor(config): simplify config parsing with get-tsconfig

## Verification

**Test coverage**: 28 tests for tsconfig-resolver (all passing)

1. ✅ `findTsConfig` - Automatic discovery and traversal
2. ✅ `findTsConfigForFile` - Per-file resolution
3. ✅ `parseTypeScriptConfig` - Full extends chain handling
4. ✅ `shouldIncludeJavaScript` - allowJs/checkJs detection
5. ✅ Error handling - Clear messages with preserved context

**Integration testing**: All 488 tests pass (up from 460)

- Core functionality unchanged
- Monorepo scenarios verified
- JavaScript inclusion respected
- Error paths validated

**Bundle analysis**:

```bash
# Before: 368kB with 6 config dependencies
# After: 125kB with 1 config dependency
pnpm build && du -h dist/
```

**Coverage validation**:

```bash
# Before: 84% statements
# After: 88.92% statements (+4.92% improvement)
pnpm test:coverage
```

## Related Decisions

- **ADR-001**: TypeScript CLI Implementation (establishes minimal dependency philosophy)
- **ADR-007**: Monorepo Support Architecture (per-file config resolution)
- **ADR-011**: File Pattern Matching Library Migration (companion optimization)

## Future Considerations

1. **TypeScript 5.x features**: get-tsconfig stays current with TypeScript spec
2. **Configuration caching**: get-tsconfig's discovery can be cached for performance
3. **Project references**: get-tsconfig supports TypeScript project references
4. **Custom extensions**: get-tsconfig allows custom extends resolution if needed

## References

- [get-tsconfig documentation](https://github.com/privatenumber/get-tsconfig)
- [TypeScript configuration reference](https://www.typescriptlang.org/tsconfig)
- [PR #40: Migrate to get-tsconfig](https://github.com/jbabin91/tsc-files/pull/40)
- [Changeset: migrate-to-get-tsconfig.md](.changeset/migrate-to-get-tsconfig.md)
