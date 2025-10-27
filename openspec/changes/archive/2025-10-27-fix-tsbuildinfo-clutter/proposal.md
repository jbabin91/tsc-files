# Fix tsBuildInfo File Clutter in Project Root

## Why

When using TypeScript Project References (`composite: true`), tsc-files creates `.tsbuildinfo` files with random suffixes in the project root directory, which:

1. **Clutters the project root** with temporary compiler artifacts
2. **Not gitignored by default** - Most projects only ignore `tsconfig.tsbuildinfo`, not random-suffixed variants
3. **Accumulates over time** - Each run potentially creates a new file (e.g., `tsconfig.-13004-EnSa1Zt7Fgvi-.tsbuildinfo`)
4. **Requires manual cleanup** - Users need to find and delete these files periodically

This is particularly problematic for:

- Git hooks (pre-commit, post-edit)
- Watch mode / file watchers
- IDE integrations
- CI/CD pipelines

Users reported this issue and requested automatic management following industry conventions (ESLint, Babel, Webpack all use `node_modules/.cache/`).

## What Changes

### Automatic tsBuildInfo Management

- **ADDED**: Automatic `tsBuildInfoFile` configuration when `composite: true` is detected
- **Location**: `node_modules/.cache/tsc-files/tsconfig.tsbuildinfo`
- **Behavior**: Only sets automatically when user hasn't explicitly configured `tsBuildInfoFile`
- **Benefit**: Single fixed location instead of random-suffixed files in project root

### Cache Directory Standardization

- **MODIFIED**: Default cache directory from system temp to `node_modules/.cache/tsc-files/`
- **Applies to**: Both temporary config files AND tsBuildInfo files
- **Benefit**: All temporary files in one clean, gitignored location

### TypeScript Type Resolution Fix

- **FIXED**: TypeRoots logic that incorrectly scanned scoped packages as type libraries
- **Old behavior**: Added `typeRoots = [node_modules/@types, node_modules]` when using `--use-tsc`
- **New behavior**: Only adds `typeRoots = [node_modules/@types]` when cache is disabled (`--no-cache`)
- **Benefit**: No more "Cannot find type definition file for '@scope'" errors

### Documentation

- **ADDED**: Comprehensive README section on clean temporary file management
- **ADDED**: Documentation of TypeScript Project References support
- **ADDED**: Recommended `.gitignore` patterns

## Impact

### Affected Specs

- `configuration-management` - temp config creation, tsBuildInfoFile handling

### Affected Code

- `src/config/temp-config.ts` - tsBuildInfoFile auto-configuration and typeRoots fix
- `src/core/checker.ts` - default cache directory change
- `tests/unit/config/temp-config.test.ts` - updated tests for new behavior
- `tests/integration/cli-package.test.ts` - removed workaround, tests real production behavior
- `README.md` - added comprehensive documentation section

### Breaking Changes

**NONE** - All changes are backwards compatible:

- Only affects projects that don't explicitly set `tsBuildInfoFile`
- Respects user's explicit configuration when provided
- No changes to public API or CLI flags

### User Benefits

- ✅ Clean project root (no file clutter)
- ✅ Automatic gitignore (via `node_modules/`)
- ✅ Industry-standard convention
- ✅ Faster incremental builds (persisted cache)
- ✅ No configuration required
