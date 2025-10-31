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

**Migration steps and guidance:**

- **For most users:** If your `baseUrl` is set to `"."` (the project root), **no action is required** and the fix is fully transparent.
- **For affected users:** If your `baseUrl` is set to a subdirectory (e.g., `"./src"`), verify that your `paths` mappings are correct and that your imports resolve as expected. You may need to update your import paths or adjust your `paths` configuration if you previously worked around the old (incorrect) behavior.
- **Resolution behavior:** This fix may cause different module resolution results for existing projects that relied on the previous (incorrect) behavior. Review your project for any imports that may be affected and update them as needed.
