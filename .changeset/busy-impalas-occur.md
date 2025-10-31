---
'@jbabin91/tsc-files': patch
---

fix(config): resolve paths relative to baseUrl per TypeScript semantics

Fixes path resolution to match TypeScript's module resolution behavior when using `baseUrl` with `paths`.

**What changed:**

Previously, when `baseUrl` was set to something other than `"."` (project root), the `paths` configuration was incorrectly resolved relative to the project root instead of relative to the resolved `baseUrl` location.

**Example:**

With this configuration:

```json
{
  "compilerOptions": {
    "baseUrl": "./src",
    "paths": {
      "@/*": ["./components/*"]
    }
  }
}
```

- **Before:** `@/*` resolved to `/project/components/*` (incorrect)
- **After:** `@/*` resolves to `/project/src/components/*` (correct per TypeScript semantics)

**Who is affected:**

This change only affects projects using the less common pattern where `baseUrl` is **not** set to `"."`. Most projects use `baseUrl: "."` (project root) which already worked correctly.

**Benefits:**

- Correct TypeScript module resolution semantics
- Fixes module resolution issues for advanced tsconfig patterns
- Better compatibility with complex monorepo setups
