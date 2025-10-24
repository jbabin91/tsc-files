# Enhance Ambient Type Declaration Discovery

## Why

The current dependency discovery implementation uses `program.getSourceFiles()` which only returns files that are explicitly imported or referenced. This misses **ambient declaration files** (`.d.ts`) that are:

1. Not imported by any file
2. Only loaded via tsconfig `include` patterns
3. Contain ambient type declarations or module augmentations

This causes **false-positive type errors** in real-world projects that use:

- **vite-plugin-svgr**: SVG module declarations in `custom.d.ts`
- **styled-components**: Theme augmentations in `styled.d.ts`
- **vitest globals**: Global test functions via `/// <reference types="vitest/globals" />`
- **TanStack Router**: Generated route types in `routeTree.gen.ts`
- **GraphQL Codegen**: Generated types in `.gen.ts` files

The work project investigation revealed that `tsc-files` reports ~30 errors while `tsc --noEmit` reports 0, solely due to missing ambient declarations.

Additionally, the current implementation has **three critical bugs**:

1. **Missing TypeScript 4.7+ module extensions** (`.mts`, `.cts`, `.d.mts`, `.d.cts`)
2. **Windows path separator handling** uses Unix-only forward slash checks
3. **Cache invalidation fails** when new `.d.ts` files are added to the project

## What Changes

### New Features

- **Ambient declaration globbing**: Explicitly resolve `.d.ts` files from tsconfig `include` patterns
- **Generated type support**: Include `.gen.ts` files with module augmentations
- **Module extension support**: Handle `.d.mts` and `.d.cts` declaration files

### Bug Fixes

- **BREAKING**: Fix file extension filter to include `.mts`, `.cts`, `.mjs`, `.cjs` files
- **CRITICAL**: Fix Windows path separator handling in node_modules detection
- **CRITICAL**: Fix cache invalidation when new ambient files are added

### Implementation Details

- Add `findAmbientDeclarations()` function to glob for ambient `.d.ts` files
- Update file extension filters to support all TypeScript module formats
- Replace string-based path checks with cross-platform path utilities
- Enhance cache key generation to detect new ambient declaration files
- Add ambient files to the `files` array (not `include`) in temp config

## Impact

**Affected specs**: `configuration-management`

**Affected code**:

- `src/config/dependency-discovery.ts` - Add ambient file discovery
- `src/config/temp-config.ts` - Update file extension patterns
- `src/utils/file-patterns.ts` - Add module extension support

**User-facing changes**:

- ✅ Eliminates false-positive errors for ambient declarations
- ✅ Matches `tsc --noEmit` behavior exactly
- ✅ Supports modern TypeScript module formats (`.mts`, `.cts`)
- ✅ Works correctly on Windows
- ✅ Proper cache invalidation

**Performance impact**:

- Globbing for `.d.ts` files adds ~5-10ms per run (negligible)
- Cache hits remain fast (<1ms)

**Breaking changes**:

- None for users (only fixes incorrect behavior)
- Internal: File extension filter now includes `.mts`/`.cts` (was missing)

**Migration path**: Automatic - no user action required
