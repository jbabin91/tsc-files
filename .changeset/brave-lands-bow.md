---
'@jbabin91/tsc-files': patch
---

Fix relative path resolution in monorepos without root tsconfig.

When running tsc-files with relative paths like `apps/web/src/index.ts` from a monorepo root that lacks a root `tsconfig.json`, the tool now correctly discovers per-package tsconfig files. This enables seamless integration with lefthook and lint-staged in monorepo setups.
