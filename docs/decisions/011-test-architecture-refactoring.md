# ADR 011: Test Architecture Refactoring Strategy

## Status

**ACCEPTED** - Coverage-First Hybrid Approach

## Context

Our test suite has evolved to include 306 passing tests across 22 test files, but analysis revealed significant architectural issues:

### Problems Identified

1. **Mock Complexity Explosion**: `typescript.test.ts` has 56 lines just to mock the Node.js `Require` interface
2. **Testing Mocks vs Behavior**: We're validating mock implementations rather than actual functionality
3. **Coverage Degradation**: New tsgo integration dropped coverage below thresholds (education.ts: 40%, typescript.ts: 48%)
4. **Fragile Tests**: Changes to internal implementation break tests that should only care about outcomes
5. **Maintenance Burden**: Complex mocks require constant updates

### Current Coverage Thresholds

```typescript
thresholds: {
  'src/cli/**': { lines: 89%, functions: 94%, statements: 89%, branches: 85% },
  'src/detectors/**': { lines: 65%, functions: 100%, statements: 65%, branches: 75% },
  'src/execution/**': { lines: 95%, functions: 100%, statements: 95%, branches: 85% },
  // ... other modules with strict requirements
}
```

### Success Pattern Identified

`core/checker.test.ts` demonstrates ideal component testing:

- Creates real temporary directories with `createTempDir()`
- Writes actual TypeScript files
- Tests real compiler behavior
- Validates actual file resolution and type checking
- More robust and valuable than mocks

## Decision

We adopt a **Coverage-First Hybrid Testing Strategy** with three phases:

### Phase 1: Coverage Recovery (Priority)

**Goal**: Fix coverage gaps before any refactoring

1. **Add Tests for education.ts** (40% → 89%)
   - Test all educational messaging functions
   - Cover compiler education, fallback education, usage optimization
   - Ensure all branches and error paths are covered

2. **Add Tests for typescript.ts tsgo detection** (48% → 65%)
   - Test new `detectTsgo` function
   - Cover integration with `findTypeScriptCompiler`
   - Test error handling and edge cases

3. **Add CLI Integration Tests**
   - Test `--tips`, `--benchmark`, `--show-compiler` flags
   - Cover educational messaging integration in runner

### Phase 2: Strategic Hybrid Testing

**Goal**: Improve test quality while maintaining coverage

Convert problematic tests using **Hybrid Approach**:

- **Real Testing** for happy paths and integration scenarios
- **Strategic Mocks** for edge cases, error conditions, and platform-specific behavior

**Example Hybrid Structure:**

```typescript
describe('TypeScript Detection - Hybrid Approach', () => {
  describe('Real Detection (Happy Paths)', () => {
    it('should detect real TypeScript in temp project', () => {
      const tempDir = createTempDir();
      setupTypeScriptProject(tempDir);
      installFakeTypeScript(tempDir);

      const result = findTypeScriptCompiler(tempDir);

      expect(result.executable).toContain('node_modules/.bin/tsc');
    });
  });

  describe('Mock Detection (Edge Cases)', () => {
    it('should handle require.resolve errors', () => {
      setupMockRequire(() => {
        throw new Error('Permission denied');
      });
      // Test error handling - maintain coverage of error branches
    });
  });
});
```

### Phase 3: Enhanced Test Infrastructure

**Goal**: Build component test utilities

1. **Project Setup Utilities**

   ```typescript
   export function setupTypeScriptProject(tempDir: string, setup: ProjectSetup);
   export function installFakeTypeScript(tempDir: string);
   export function createFileWithErrors(tempDir: string, fileName?: string);
   ```

2. **Enhanced Component Testing**
   - Real file system operations
   - Real compiler execution for integration tests
   - Proper temp file cleanup and isolation

## Rationale

### Why Coverage-First?

1. **Non-Negotiable Quality Gates**: Coverage thresholds are established quality standards
2. **Incremental Safety**: Fix current issues before introducing changes
3. **Stakeholder Confidence**: Maintain quality metrics while improving architecture

### Why Hybrid Approach?

1. **Pragmatic Balance**: Gets benefits of both real testing and comprehensive edge case coverage
2. **Incremental Migration**: Allows gradual improvement without massive rewrites
3. **Coverage Preservation**: Strategic mocks ensure we don't lose coverage of error paths

### Why Not Pure Component Testing?

1. **Coverage Risk**: Some error paths are difficult to reproduce with real systems
2. **Platform Dependencies**: Cross-platform testing requires some mocking
3. **Performance**: Some tests need to run quickly in CI environments

## Implementation Plan

### Week 1: Coverage Recovery

- [ ] Create `tests/unit/cli/education.test.ts` with comprehensive coverage
- [ ] Add missing tsgo detection tests to `typescript.test.ts`
- [ ] Add CLI integration tests for new flags
- [ ] **Target**: All coverage thresholds above requirements

### Week 2: Hybrid Conversion - Safe Targets

- [ ] Convert `package-manager.test.ts` to hybrid approach
- [ ] Convert `file-operations.test.ts` to real file testing
- [ ] **Target**: Maintain 100% test pass rate and coverage

### Week 3: Complex Hybrid Conversion

- [ ] Gradually convert `typescript.test.ts` with hybrid approach
- [ ] Convert `execution/executor.test.ts` with real execution testing
- [ ] **Target**: Reduce mock complexity by 50% while maintaining coverage

### Week 4: Validation & Documentation

- [ ] Run comprehensive test validation
- [ ] Update testing documentation
- [ ] Create component test utility library
- [ ] **Target**: Documented, maintainable test architecture

## Success Metrics

### Coverage Targets (Must Achieve)

- ✅ CLI: 89% lines (currently 77.46%)
- ✅ Detectors: 65% lines (currently 48.08% for typescript.ts)
- ✅ Execution: 95% lines (currently 83.57%)
- ✅ All existing thresholds maintained

### Test Quality Improvements

- ✅ Reduce mock complexity by 50%
- ✅ Add real file system testing for appropriate modules
- ✅ Maintain 306+ passing tests
- ✅ Faster test execution through reduced mock setup

### Developer Experience

- ✅ Tests fail for real issues, not mock configuration problems
- ✅ Easier debugging when tests fail
- ✅ Faster development iteration with less mock maintenance

## Consequences

### Positive

- **Improved Reliability**: Tests catch real integration issues
- **Easier Maintenance**: Less complex mock setup and configuration
- **Better Refactoring Safety**: Component tests provide confidence during changes
- **Production Parity**: Tests use same execution patterns as production

### Negative

- **Initial Development Time**: Creating hybrid test infrastructure requires upfront effort
- **Some Test Complexity**: Hybrid approach means understanding both real and mock test patterns
- **Platform Dependencies**: Real file system tests may have platform-specific behaviors

### Mitigation Strategies

- **Incremental Implementation**: Phase-based approach reduces risk
- **Comprehensive Documentation**: Clear patterns for when to use real vs mock testing
- **Utility Library**: Reusable test utilities reduce boilerplate
- **Coverage Monitoring**: Continuous validation that coverage remains above thresholds

## Related ADRs

- [ADR 005: Vitest vs Jest](./005-vitest-vs-jest.md) - Established testing framework choice
- [ADR 010: Error Handling & Process Management](./010-error-handling-process-management.md) - Error handling patterns that need testing

## References

- [Testing Strategy Documentation](../testing-strategy.md)
- [Coverage Configuration](../../vitest.config.ts)
- [Existing Component Test Example](../../tests/unit/core/checker.test.ts)
