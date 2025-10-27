---
'@jbabin91/tsc-files': patch
---

fix(config): fix tsBuildInfo clutter and cache directory management

Fixes tsBuildInfo file clutter in project root by automatically configuring clean cache locations following industry conventions.

**Problems Solved:**

- Random-suffixed .tsbuildinfo files cluttering project root when using TypeScript Project References
- Files not gitignored by default (most projects only ignore `tsconfig.tsbuildinfo`)
- File accumulation over time requiring manual cleanup
- Scoped packages incorrectly scanned as type libraries

**Changes:**

- Auto-set `tsBuildInfoFile` to `node_modules/.cache/tsc-files/tsconfig.tsbuildinfo` for composite projects
- Changed default cache from system temp to `node_modules/.cache/tsc-files/`
- Fixed typeRoots logic to only add when cache disabled (prevents scoped package scanning)
- Fixed shell injection vulnerability in integration tests

**Benefits:**

- Clean project root with no temporary file clutter
- Auto-gitignored (node_modules/ is standard in .gitignore)
- Follows industry conventions (ESLint, Babel, Webpack)
- Faster builds with persistent cache
- Backwards compatible (respects user configuration)
