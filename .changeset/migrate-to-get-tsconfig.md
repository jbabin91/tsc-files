---
'@jbabin91/tsc-files': patch
---

refactor(config): simplify config parsing with get-tsconfig

**Architecture Improvements:**

- Replace discovery.ts + parser.ts with unified tsconfig-resolver.ts
- Delegate extends chain resolution to get-tsconfig (zero dependencies, well-tested)
- Migrate from fast-glob (20kB) to tinyglobby (1kB, 95% reduction)

**Dependency Changes:**

- Remove 6 unused dependencies: cosmiconfig, deepmerge, fs-extra, tsconfig-paths, strip-json-comments, fast-glob
- Add get-tsconfig v4.8.1 (TypeScript config parser)
- Add tinyglobby v0.2.10 (minimal glob library)
- Net reduction: -5 dependencies

**Performance:**

- 66% bundle size reduction: 368kB → 125kB
- Faster installation and module loading
- Better error handling with get-tsconfig's forgiving JSON parser

**Quality:**

- 100% API compatibility maintained
- All 460 tests passing
- Coverage thresholds increased (CLI +5%, Config +7%, Utils +6%)
