## 1. Research & Design

- [x] 1.1 Document dependency discovery approach using TypeScript compiler APIs
- [x] 1.2 Define caching key strategy for dependency closures and invalidation triggers

## 2. Implementation

- [x] 2.1 Build helper to compute dependency closure from selected root files
- [x] 2.2 Integrate closure results into temporary config generation with fallback logic
- [x] 2.3 Update compiler selection safeguards for tsgo vs tsc using closure metadata

## 3. Testing & Documentation

- [x] 3.1 Add fixtures/tests for generated modules, path aliases, and project references
- [x] 3.2 Verify cache behavior and diagnostic outputs (including verbose mode)
- [x] 3.3 Update developer documentation/education messaging to cover dependency discovery
