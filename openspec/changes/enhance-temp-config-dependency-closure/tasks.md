## 1. Research & Design

- [ ] 1.1 Document dependency discovery approach using TypeScript compiler APIs
- [ ] 1.2 Define caching key strategy for dependency closures and invalidation triggers

## 2. Implementation

- [ ] 2.1 Build helper to compute dependency closure from selected root files
- [ ] 2.2 Integrate closure results into temporary config generation with fallback logic
- [ ] 2.3 Update compiler selection safeguards for tsgo vs tsc using closure metadata

## 3. Testing & Documentation

- [ ] 3.1 Add fixtures/tests for generated modules, path aliases, and project references
- [ ] 3.2 Verify cache behavior and diagnostic outputs (including verbose mode)
- [ ] 3.3 Update developer documentation/education messaging to cover dependency discovery
