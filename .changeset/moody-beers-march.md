---
'@jbabin91/tsc-files': patch
---

fix(config): fix tsBuildInfo clutter and cache directory management

Automatically configures tsBuildInfoFile to prevent `.tsbuildinfo` files with random suffixes from cluttering your project root when using TypeScript Project References (`composite: true`).

**What changed:**

- tsBuildInfoFile auto-configured to `node_modules/.cache/tsc-files/tsconfig.tsbuildinfo` when composite: true
- Cache directory standardized to `node_modules/.cache/tsc-files/` (auto-gitignored)
- Fixed typeRoots logic that incorrectly scanned scoped packages

**Benefits:**

- Clean project root - no more random `.tsbuildinfo` files
- Faster incremental builds with persistent cache
- Backwards compatible - respects explicit tsBuildInfoFile configuration

Closes user-reported issue about tsBuildInfo file accumulation.
