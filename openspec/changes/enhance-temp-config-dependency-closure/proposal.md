## Why

The current temp configuration strategy only lists the explicitly selected files and broad include patterns. Generated modules, path-mapped dependencies, and project references often fall outside of that scope, forcing ad-hoc include rules (e.g., `*.gen.ts`). This leads to inconsistent type availability and brittle workarounds.

## What Changes

- Add a dependency-closure discovery step that uses the TypeScript compiler API to enumerate every source file required by the selected roots.
- Integrate the discovered file list into temporary config generation with fallbacks when discovery fails.
- Respect compiler-specific constraints (tsc vs tsgo) when replaying the closure, including cache directory handling and typeRoots adjustments.
- Provide diagnostics and caching so users can audit the dependency set and avoid recomputation.

## Impact

- Affected specs: configuration-management
- Affected code: `src/config/temp-config.ts`, `src/config/parser.ts`, `src/config/tsgo-compatibility.ts`, `src/core/checker.ts`
- Requires new tests covering generated modules, path aliases, and project references in fixture projects.
