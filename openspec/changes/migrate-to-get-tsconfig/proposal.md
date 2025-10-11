# Dependency Optimization: Modern Tooling & Cleanup

## Why

Comprehensive dependency audit revealed significant optimization opportunities:

### 1. Unused Dependencies (Critical Issue)

Five dependencies are listed but **never imported**, wasting 231kB and increasing supply chain risk:

- `cosmiconfig` (v9.0.0) - ~200kB, 0 imports
- `deepmerge` (v4.3.1) - ~5kB, 0 imports
- `fs-extra` (v11.3.2) - ~15kB, 0 imports
- `tsconfig-paths` (v4.2.0) - ~10kB, 0 imports
- `strip-json-comments` - ~1kB, replaced by get-tsconfig

### 2. Suboptimal Glob Implementation

`fast-glob` (20kB, 17 subdependencies) can be replaced with `tinyglobby`:

- Recently adopted by **Vite** (major validation)
- 95% smaller (20kB → 1kB)
- 88% fewer subdependencies (17 → 2)
- 836K weekly downloads
- Drop-in API compatible

### 3. Fragmented TypeScript Config Handling

- Config discovery and parsing spread across multiple modules
- Manual JSONC parsing vs. battle-tested solution
- Incomplete extends support in `parser.ts`

### Modern Solutions

**get-tsconfig** (by privatenumber, author of tsx/tsdown):

- Zero dependencies, 7kB size
- Complete extends chain resolution
- Full JSONC support
- Automatic discovery with clean API
- Ecosystem consistency (same author as tsdown)

**tinyglobby** (by SuperchupuDev):

- Minimal footprint (1kB, 2 deps)
- Proven at scale (Vite, 836K weekly downloads)
- Same API as fast-glob
- Active maintenance

## What Changes

### Dependencies

**REMOVE (5 packages):**

- `cosmiconfig` (~200kB, unused)
- `deepmerge` (~5kB, unused)
- `fs-extra` (~15kB, unused)
- `tsconfig-paths` (~10kB, unused)
- `strip-json-comments` (~1kB, replaced)

**REPLACE:**

- `fast-glob` (20kB, 17 deps) → `tinyglobby` (1kB, 2 deps)

**ADD:**

- `get-tsconfig` (7kB, 0 deps)

**Bundle size impact**:

- Before: ~368kB total dependencies
- After: ~125kB total dependencies
- **Reduction: 243kB (66% smaller)**

**Supply chain impact**:

- Before: 40+ subdependencies
- After: ~12 subdependencies
- **Reduction: 70% fewer dependencies**

### Code Changes

**Config Module Consolidation**:

- **REMOVE**: `src/config/discovery.ts` (54 lines)
- **REMOVE**: `src/config/parser.ts` (87 lines)
- **ADD**: `src/config/tsconfig-resolver.ts` (~80 lines, cleaner implementation)
- **UPDATE**: `src/config/dependency-discovery.ts` (import path changes only)
- **UPDATE**: `src/config/temp-config.ts` (import path changes only)
- **KEEP**: `src/config/tsgo-compatibility.ts` (no changes)

**Glob Module Update**:

- **UPDATE**: `src/core/file-resolver.ts` (replace fast-glob → tinyglobby)
- API-compatible, minimal changes required

### Breaking Changes

**None** - This is an internal refactoring with no public API changes.

All exported functions maintain identical signatures:

- `findTsConfig(cwd, projectPath?)`
- `findTsConfigForFile(filePath, projectPath?)`
- `parseTypeScriptConfig(configPath)`
- `shouldIncludeJavaScript(config)`
- `shouldIncludeJavaScriptFiles(tsconfigPath?)`

## Impact

**Affected specs**:

- `configuration-management` - Core config resolution and parsing
- `file-checking` - File pattern matching and resolution

**Affected code**:

- `src/config/discovery.ts` - Removed (replaced)
- `src/config/parser.ts` - Removed (replaced)
- `src/config/tsconfig-resolver.ts` - New unified module
- `src/core/file-resolver.ts` - Update glob implementation
- `src/config/temp-config.ts` - Import path updates
- `src/core/checker.ts` - Import path updates
- `tests/unit/config/` - Test updates for new implementation
- `tests/unit/core/file-resolver.test.ts` - Test updates for tinyglobby

**Benefits**:

- **66% smaller bundle** (368kB → 125kB)
- **70% fewer subdependencies** (40+ → 12)
- **Improved security** (smaller attack surface)
- **Faster installs** (less to download)
- **Better extends chain support** (automatic, tested, complete)
- **Simpler codebase** (~60 fewer lines of config code)
- **Better type safety** (TypeScript-first tools)
- **Ecosystem consistency** (privatenumber tools: tsdown, tsx, get-tsconfig)
- **Proven at scale** (Vite uses tinyglobby)

**Risks**:

- **LOW**: All changes are internal refactoring or direct replacements
- **get-tsconfig**: Widely used, zero dependencies, TypeScript-first
- **tinyglobby**: Vite-validated, 836K weekly downloads, API-compatible
- Comprehensive test coverage will ensure compatibility
