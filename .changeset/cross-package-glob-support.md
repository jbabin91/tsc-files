---
'@jbabin91/tsc-files': minor
---

Add cross-package glob support for monorepos

Glob patterns like `packages/*/src/*.ts` now work correctly in monorepos with per-package tsconfig files. Previously, these patterns would fail because the tool tried to find a tsconfig for the glob pattern itself rather than expanding it first.

Now glob patterns are pre-expanded to concrete file paths before being grouped by their respective tsconfig files, ensuring each file is type-checked with the correct configuration.
