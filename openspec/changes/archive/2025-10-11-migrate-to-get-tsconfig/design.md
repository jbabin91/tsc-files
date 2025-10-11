# Dependency Optimization Design

## Context

Comprehensive dependency audit revealed three categories of issues:

### 1. Unused Dependencies (Critical Waste)

Five dependencies listed but never imported:

- `cosmiconfig` (200kB) - 0 imports
- `deepmerge` (5kB) - 0 imports
- `fs-extra` (15kB) - 0 imports
- `tsconfig-paths` (10kB) - 0 imports
- `strip-json-comments` (1kB) - replaced by get-tsconfig

**Total waste**: 231kB + unnecessary supply chain risk

### 2. Suboptimal Glob Implementation

- `fast-glob` (20kB, 17 subdependencies)
- Heavy dependency footprint
- Can be replaced with battle-tested alternative

### 3. Fragmented TypeScript Config Handling

- Config discovery and parsing spread across multiple modules
- Manual JSONC parsing vs. proven solutions
- Inconsistent extends support

**Current State** (368kB total):

- `cosmiconfig` (200kB) - unused
- `deepmerge` (5kB) - unused
- `fs-extra` (15kB) - unused
- `tsconfig-paths` (10kB) - unused
- `strip-json-comments` (1kB) - manual JSONC parsing
- `fast-glob` (20kB, 17 deps) - glob operations
- `discovery.ts` - manual directory traversal
- `parser.ts` - manual JSON parsing without extends support

**Target State** (125kB total):

- `get-tsconfig` (7kB, 0 deps) - All config operations
- `tinyglobby` (1kB, 2 deps) - All glob operations
- `tsconfig-resolver.ts` - Unified config module
- TypeScript API still used in `dependency-discovery.ts` for program creation

## Goals

1. **Remove waste**: Eliminate 231kB of unused dependencies
2. **Reduce bundle size**: 368kB → 125kB (66% reduction)
3. **Improve security**: 40+ subdeps → 12 subdeps (70% reduction)
4. **Simplify codebase**: Consolidate fragmented modules
5. **Better extends support**: Automatic, tested extends chain resolution
6. **Proven alternatives**: Use battle-tested replacements (Vite uses tinyglobby)
7. **Maintain API compatibility**: No breaking changes to public API
8. **Improve type safety**: TypeScript-first tools
9. **Ecosystem consistency**: privatenumber tools (get-tsconfig, tsdown, tsx)

## Non-Goals

- Changing public API signatures
- Modifying dependency discovery logic (keep TypeScript API usage)
- Adding new configuration features
- CLI framework changes (commander stays for now - see separate cleye proposal)

## Decisions

### Decision 1: Use get-tsconfig for Config Operations

**Chosen**: Replace manual parsing/discovery with `get-tsconfig`

**Rationale**:

- Zero dependencies = smaller bundle, less supply chain risk
- Well-maintained by privatenumber (tsx, tsdown author)
- Widely used in ecosystem (proven reliability)
- Better extends support than our manual implementation
- Native TypeScript support (better types)

**Alternatives considered**:

- Keep current implementation + fix extends support
  - ❌ More code to maintain
  - ❌ Still fragmented across modules
  - ❌ Missing features (file matching, path resolution)
- Use TypeScript API everywhere
  - ❌ Heavy dependency on TS compiler
  - ❌ Overkill for simple config parsing
  - ❌ Harder to test

### Decision 2: Replace fast-glob with tinyglobby

**Chosen**: Switch to `tinyglobby` for glob operations

**Rationale**:

- **Vite adoption**: Recently migrated to tinyglobby (major validation signal)
- **95% smaller**: 20kB → 1kB bundle size
- **88% fewer subdeps**: 17 → 2 subdependencies
- **Proven at scale**: 836K weekly downloads
- **API-compatible**: Drop-in replacement for fast-glob
- **Security**: Reduces supply chain attack surface significantly

**Alternatives considered**:

- Keep fast-glob
  - ❌ Heavy dependency footprint (20kB, 17 subdeps)
  - ❌ Larger supply chain risk
- tiny-glob
  - ❌ Different API, would require more refactoring
  - ❌ Less proven at scale
- globby (sindresorhus)
  - ❌ Even heavier than fast-glob

### Decision 3: Remove All Unused Dependencies

**Chosen**: Remove cosmiconfig, deepmerge, fs-extra, tsconfig-paths, strip-json-comments

**Rationale**:

- **Zero imports**: Grep searches confirmed no usage in src/
- **231kB waste**: Significant bundle size bloat
- **Supply chain risk**: Unnecessary security exposure
- **No breaking changes**: Not used by codebase
- **Zero effort, zero risk**: Safe immediate removal

**Validation strategy**:

```bash
# Verified no imports found:
rg "from ['\"](cosmiconfig|deepmerge|fs-extra|tsconfig-paths|strip-json-comments)" src/
rg "require\(['\"](cosmiconfig|deepmerge|fs-extra|tsconfig-paths|strip-json-comments)" src/
```

**Migration**: None needed (dependencies never used)

### Decision 4: Keep TypeScript API in dependency-discovery.ts

**Chosen**: Continue using `ts.readConfigFile` + `ts.parseJsonConfigFileContent` for dependency discovery

**Rationale**:

- Dependency discovery requires `ts.Program` creation
- get-tsconfig only parses config, doesn't create programs
- This separation is clean: get-tsconfig for parsing, TS API for program analysis

**Alternatives considered**:

- Replace everything with get-tsconfig
  - ❌ Can't create programs for dependency analysis
  - ❌ Would lose dependency closure feature
- Use TypeScript API everywhere
  - ❌ Heavier than needed for simple operations

### Decision 5: Consolidate into Single Module

**Chosen**: Create `tsconfig-resolver.ts` replacing both `discovery.ts` and `parser.ts`

**Rationale**:

- Discovery and parsing are tightly coupled operations
- get-tsconfig handles both in single API call
- Reduces cognitive load (one place to look)
- Eliminates duplication

**File structure**:

```sh
src/config/
├── tsconfig-resolver.ts      # NEW: Discovery + parsing
├── dependency-discovery.ts   # KEEP: TypeScript program analysis
├── temp-config.ts            # KEEP: Temp file generation
└── tsgo-compatibility.ts     # KEEP: Tsgo compatibility checks
```

### Decision 6: Maintain API Compatibility

**Chosen**: Keep identical function signatures for exported APIs

**Current API** (must preserve):

```typescript
export function findTsConfig(cwd: string, projectPath?: string): string;
export function findTsConfigForFile(
  filePath: string,
  projectPath?: string,
): string;
export function parseTypeScriptConfig(configPath: string): TypeScriptConfig;
export function shouldIncludeJavaScript(config: TypeScriptConfig): boolean;
export function shouldIncludeJavaScriptFiles(tsconfigPath?: string): boolean;
```

**Rationale**:

- No breaking changes for consumers
- Easier testing (can compare old vs new behavior)
- Gradual migration path if needed

### Decision 7: Type Safety Implementation Pattern

**Chosen**: Use TypeScript type inference and avoid explicit type assertions

**Type Safety Hierarchy**:

1. 🥇 **Type Inference** (preferred) - Let TypeScript infer types automatically
2. 🥈 **satisfies** - Validation without losing inference
3. 🥉 **:** (colon) - Explicit typing only when inference fails
4. ⛔ **as** - Avoid unless absolutely necessary
5. 🚫 **any** - NEVER in production code

**Rationale**:

- **get-tsconfig is TypeScript-first**: Returns strongly typed `TsConfigResult | null`
- **Automatic inference works**: `const result = getTsconfig(cwd)` infers correctly
- **Better maintainability**: Fewer manual type annotations to keep in sync
- **Prevents regressions**: No `any` types means no type safety holes
- **User requirement**: "not just using as, :, any for our types"

**Implementation patterns**:

```typescript
// ✅ EXCELLENT: Automatic type inference
const result = getTsconfig(cwd);  // TsConfigResult | null (inferred!)
if (!result) throw new Error('Not found');
const config = result.config;  // TsConfigJsonResolved (inferred!)

// ✅ GOOD: Type guards for narrowing
if (!result) throw new Error('Not found');
// result is now TsConfigResult (narrowed by type guard)

// ✅ GOOD: Use satisfies for validation
const tempConfig = { ...options } satisfies Partial<TsConfigJsonResolved>;

// ❌ AVOID: Manual type assertions
const config = result as TsConfigJsonResolved;  // Loses null checking

// 🚫 NEVER: any types in production
function parseConfig(config: any) { ... }  // PROHIBITED
```

**Testing exception**: Test mocks may use `any` for simplicity, but production code must be strictly typed.

### Decision 8: Bun Runtime Support (MANDATORY)

**Chosen**: Bun runtime support is MANDATORY, not optional

**Rationale**:

- **User requirement**: "We need to support bun" (explicit)
- **get-tsconfig compatibility**: Confirmed compatible with Bun runtime
- **tinyglobby compatibility**: Confirmed compatible with Bun filesystem APIs
- **Integration tests**: Bun test marked "if available" → changed to MANDATORY
- **Future-proofing**: Bun adoption growing rapidly in TypeScript ecosystem

**Implementation requirements**:

1. **Runtime detection**: Check `process.versions.bun` for Bun runtime
2. **Package manager detection**: Check `bun.lockb` for Bun package manager
3. **Cross-runtime consistency**: Same config resolution under Node.js and Bun
4. **Integration tests**: Bun tests MUST pass (not optional)
5. **Documentation**: Clearly state Bun as supported runtime

**Validation strategy**:

```bash
# Test under Bun runtime
bun run tsc-files src/**/*.ts

# Verify lockfile detection
test -f bun.lockb && echo "Bun detected"

# Test config parsing consistency
node cli.js --project tsconfig.json file.ts > node.out
bun cli.js --project tsconfig.json file.ts > bun.out
diff node.out bun.out  # Should be identical
```

**Breaking if not supported**: Projects using Bun would have degraded experience or failures. This is unacceptable for a modern TypeScript tool.

## Implementation Strategy

### Phase 1: Dependency Cleanup & Swap

1. **Remove unused dependencies** from `package.json`:
   - Remove `cosmiconfig` (200kB, unused)
   - Remove `deepmerge` (5kB, unused)
   - Remove `fs-extra` (15kB, unused)
   - Remove `tsconfig-paths` (10kB, unused)
   - Remove `strip-json-comments` (1kB, replaced by get-tsconfig)
2. **Add new dependencies**:
   - Add `get-tsconfig` (7kB, 0 deps)
   - Add `tinyglobby` (1kB, 2 deps)
3. **Remove old dependency**:
   - Remove `fast-glob` (20kB, 17 deps)
4. Run `pnpm install` to update lockfile
5. Verify no broken imports with `pnpm typecheck`

### Phase 2: Create New Module

Create `src/config/tsconfig-resolver.ts`:

```typescript
import { getTsconfig, parseTsconfig } from 'get-tsconfig';
import path from 'node:path';

/**
 * Find tsconfig.json file with context detection up directory tree
 */
export function findTsConfig(cwd: string, projectPath?: string): string {
  if (projectPath) {
    const resolvedPath = path.resolve(cwd, projectPath);
    const result = parseTsconfig(resolvedPath);
    if (!result) {
      throw new Error(`TypeScript config not found: ${resolvedPath}`);
    }
    return result.path;
  }

  const result = getTsconfig(cwd);
  if (!result) {
    throw new Error(
      'No tsconfig.json found in current directory or any parent directories. Use --project to specify path.',
    );
  }
  return result.path;
}

/**
 * Find tsconfig.json for a specific file path
 */
export function findTsConfigForFile(
  filePath: string,
  projectPath?: string,
): string {
  if (projectPath) {
    return findTsConfig(path.dirname(filePath), projectPath);
  }

  const result = getTsconfig(path.dirname(filePath));
  if (!result) {
    throw new Error(
      `No tsconfig.json found for file: ${filePath}. Use --project to specify path.`,
    );
  }
  return result.path;
}

/**
 * Parse TypeScript configuration file with extends resolution
 */
export function parseTypeScriptConfig(configPath: string): TypeScriptConfig {
  const result = parseTsconfig(configPath);
  if (!result) {
    throw new Error(`TypeScript config not found: ${configPath}`);
  }

  // get-tsconfig returns fully resolved config with extends merged
  return result.config as TypeScriptConfig;
}

/**
 * Check if JavaScript files should be included based on TypeScript configuration
 */
export function shouldIncludeJavaScript(config: TypeScriptConfig): boolean {
  const compilerOptions = config.compilerOptions;
  if (!compilerOptions) {
    return false;
  }

  return Boolean(
    (compilerOptions.allowJs ?? false) || (compilerOptions.checkJs ?? false),
  );
}

/**
 * Check if JavaScript files should be included based on TypeScript configuration file
 */
export function shouldIncludeJavaScriptFiles(tsconfigPath?: string): boolean {
  if (!tsconfigPath) {
    return false;
  }

  try {
    const config = parseTypeScriptConfig(tsconfigPath);
    return shouldIncludeJavaScript(config);
  } catch {
    return false;
  }
}
```

### Phase 3: Migrate to tinyglobby

Update `src/core/file-resolver.ts` to use tinyglobby:

1. **Replace import**:

```typescript
// Old
import fastGlob from 'fast-glob';

// New
import { glob } from 'tinyglobby';
```

2. **Update function calls** (API-compatible):

```typescript
// tinyglobby uses same options as fast-glob
const files = await glob(patterns, {
  cwd,
  absolute: true,
  onlyFiles: true,
});
```

3. **Verify behavior**:
   - Test glob pattern matching (\*_, _, negation patterns)
   - Test cross-platform path handling
   - Ensure TypeScript types are correct

4. **Update tests** in `tests/unit/core/file-resolver.test.ts`:
   - Verify pattern matching behavior
   - Test edge cases (empty patterns, invalid patterns)
   - Confirm performance characteristics

### Phase 4: Update Imports

Update all modules importing from old config modules:

```typescript
// Old imports
import { findTsConfig, parseTypeScriptConfig } from '@/config/discovery';
import { shouldIncludeJavaScript } from '@/config/parser';

// New imports
import {
  findTsConfig,
  parseTypeScriptConfig,
  shouldIncludeJavaScript,
} from '@/config/tsconfig-resolver';
```

**Affected files**:

- `src/config/temp-config.ts`
- `src/config/dependency-discovery.ts`
- `src/core/checker.ts`
- `src/core/file-resolver.ts`

### Phase 5: Test Migration

**Test strategy**:

1. Port existing tests from `discovery.test.ts` and `parser.test.ts`
2. Add new tests for extends chain scenarios
3. Add tests for npm package extends (e.g., `@tsconfig/node18`)
4. Verify edge cases (missing config, malformed JSON, circular extends)
5. Add tinyglobby pattern matching tests
6. Ensure integration tests pass

**Coverage targets**:

- Maintain existing coverage levels (84%+ core)
- New module should have 90%+ coverage
- File resolver module maintains 85%+ coverage

### Phase 6: Remove Old Code

1. Delete `src/config/discovery.ts`
2. Delete `src/config/parser.ts`
3. Delete corresponding test files
4. Verify no remaining imports

## Migration Path

This is a **non-breaking internal refactoring**:

1. All public APIs remain unchanged
2. Consumers won't notice any difference
3. Can be done in single PR
4. No deprecation period needed

## Risks & Mitigations

### Risk 1: get-tsconfig behavior differs from manual parsing

**Likelihood**: Low
**Impact**: Medium

**Mitigation**:

- Comprehensive test suite covering all scenarios
- Integration tests with real projects
- Manual testing before release

### Risk 2: Missing extends chain scenarios

**Likelihood**: Low (get-tsconfig is battle-tested)
**Impact**: Medium

**Mitigation**:

- Explicit tests for:
  - Single level extends
  - Multi-level extends chains
  - npm package extends
  - Circular extends detection

### Risk 3: tinyglobby behavior differs from fast-glob

**Likelihood**: Very Low (API-compatible, Vite-validated)
**Impact**: Low

**Mitigation**:

- Comprehensive glob pattern testing
- Cross-platform path handling tests
- Integration tests with real projects
- Vite's successful migration provides validation

### Risk 4: Bundle size increase from new dependencies

**Likelihood**: None (net reduction of 243kB)
**Impact**: N/A

**Validation**: Verify with `pnpm check-exports` after migration

### Risk 5: TypeScript API compatibility in dependency-discovery.ts

**Likelihood**: None (no changes to this module)
**Impact**: N/A

**Validation**: Existing tests ensure compatibility

## Testing Strategy

### Unit Tests

**Config Resolution**:

- [x] Find tsconfig.json in current directory
- [x] Find tsconfig.json in parent directories
- [x] Handle explicit `--project` path
- [x] Handle `TSC_PROJECT` environment variable
- [x] Error when no config found
- [x] Find config for specific file path

**Config Parsing**:

- [x] Parse valid tsconfig.json
- [x] Resolve single-level extends
- [x] Resolve multi-level extends chain
- [x] Resolve npm package extends
- [x] Detect circular extends
- [x] Handle malformed JSON
- [x] Handle missing compilerOptions
- [x] Extract allowJs/checkJs settings

### Integration Tests

- [ ] Real project with extends chain
- [ ] Monorepo with multiple tsconfigs
- [ ] Project with path aliases
- [ ] Project with allowJs/checkJs
- [ ] Cross-platform path handling

## Rollback Plan

If issues discovered after merge:

1. **Revert PR**: Git history allows clean revert
2. **Temporary fix**: Can keep get-tsconfig but add compatibility layer
3. **Gradual rollback**: Can revert file-by-file if needed

All old code preserved in git history for reference.

## Success Criteria

- [ ] All quality gates pass (lint, typecheck, test, build)
- [ ] Bundle size reduced by ~243kB (66% reduction: 368kB → 125kB)
- [ ] Subdependencies reduced by 70% (40+ → 12)
- [ ] Test coverage maintained at 84%+ core
- [ ] No breaking changes to public API
- [ ] All unused dependencies removed (cosmiconfig, deepmerge, fs-extra, tsconfig-paths, strip-json-comments)
- [ ] fast-glob successfully replaced with tinyglobby
- [ ] get-tsconfig successfully replaces manual config parsing
- [ ] Integration tests pass
- [ ] Documentation updated
- [ ] No regression in functionality

## Open Questions

**Q: Should we remove strip-json-comments entirely?**
A: Yes - confirmed unused except in parser.ts. Safe to remove.

**Q: Should we expose get-tsconfig's additional features (file matching, path resolution)?**
A: Out of scope for this migration. Can be added in separate proposal if needed.

**Q: What about caching of parsed configs?**
A: get-tsconfig handles caching internally. No additional caching layer needed for basic operations. dependency-discovery.ts has its own cache.

**Q: Are there any glob pattern differences between fast-glob and tinyglobby?**
A: API is compatible. Vite's successful migration validates reliability. Will verify with comprehensive tests.

**Q: Should we migrate any other dependencies?**
A: CLI framework (commander → cleye) deferred to separate proposal. All other dependencies validated and kept.
