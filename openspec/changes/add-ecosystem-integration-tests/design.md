# Design: Ecosystem Integration Tests

## Context

Current testing strategy focuses on unit tests (419 tests, 84%+ coverage) which validate individual components in isolation. However, we lack integration tests that verify tsc-files works correctly with real-world TypeScript ecosystem patterns. Recent tsgo compatibility fixes highlighted this gap - we had no tests for ambient declarations, workspace imports, or framework presets.

The goal: Prove tsc-files truly replicates `tsc --noEmit` behavior for specific files across all project types.

## Goals

- **Ecosystem confidence**: Verify tsc-files works with monorepos, frameworks, and tooling
- **Real-world validation**: Test actual project structures, not mocked scenarios
- **Performance benchmarking**: Ensure scalability with large file lists
- **Regression prevention**: Catch ecosystem integration issues before release

## Non-Goals

- End-to-end CLI testing (covered by unit tests)
- Testing every TypeScript compiler option (too broad)
- Testing non-TypeScript tooling integration (out of scope)
- Supporting non-Node.js runtimes (Deno/Bun) at this time

## Decisions

### Test Organization Strategy

**Decision**: Create separate `tests/integration/ecosystem/` directory

**Rationale**:

- Clear separation from unit tests
- Integration tests are slower (can be run separately in CI)
- Fixtures can be larger without polluting unit test structure
- Easier to skip in watch mode for faster development

**Alternatives considered**:

- Mixed with unit tests: Rejected - hard to distinguish, slower watch mode
- Separate repo: Rejected - harder to maintain, version sync issues

### Fixture Management Approach

**Decision**: Real project structures in `tests/fixtures/ecosystem/`

**Rationale**:

- Tests real-world scenarios authentically
- Catches subtle configuration issues
- Easy to reproduce bugs reported by users
- Clear documentation via example projects

**Alternatives considered**:

- Programmatic generation: Rejected - harder to debug, less realistic
- Inline fixtures: Rejected - clutters test files, not reusable

### Test Scope Prioritization

**Decision**: Focus on HIGH PRIORITY scenarios first

**Priority order**:

1. **Monorepo workspace imports** (most common blocker)
2. **Framework presets** (Next.js, Vite are very popular)
3. **Project references** (enterprise monorepo pattern)
4. **Performance/scale** (git hook use case critical)
5. **Generated types** (Prisma, GraphQL common)
6. **Modern extensions** (.mts/.cts growing adoption)
7. **Test frameworks** (already mostly working, validation only)

**Rationale**: Start with scenarios most likely to break in real projects.

### Performance Targets

**Decision**: Set clear performance benchmarks

**Targets**:

- Single file: < 500ms (unit test verified)
- 10 files: < 1s (unit test verified)
- 100 files: < 5s (new target)
- 500 files: < 30s (new target for git hooks)
- Memory: < 512MB peak usage

**Rationale**: Git hooks must be fast or developers disable them. 30s for 500 files is reasonable for large PR reviews.

### CI Integration Strategy

**Decision**: Separate integration test job in GitHub Actions

**Workflow**:

```yaml
jobs:
  unit-tests:
    runs-on: ubuntu-latest
    # Fast unit tests (2-3 minutes)

  integration-tests:
    runs-on: ubuntu-latest
    needs: unit-tests
    # Slower integration tests (5-8 minutes)
    # Only run after unit tests pass
```

**Rationale**:

- Fail fast on unit tests
- Parallelization for better CI time
- Can skip integration tests in draft PRs

### Test Implementation Pattern

**Decision**: Use Vitest with real file system operations

**Pattern**:

```typescript
describe('Monorepo Workspace Protocol', () => {
  it('should resolve workspace:* imports', async () => {
    const fixture = path.join(
      __dirname,
      '../../../fixtures/ecosystem/pnpm-workspace',
    );

    // Check a file that imports from workspace:* package
    const result = await checkFiles(
      [path.join(fixture, 'packages/app/src/main.ts')],
      { cwd: fixture, verbose: false },
    );

    expect(result.success).toBe(true);
    expect(result.errorCount).toBe(0);
  });
});
```

**Rationale**:

- Real file system catches path resolution issues
- Fixtures are version controlled and reproducible
- Tests are readable and maintainable

## Risks and Mitigations

### Risk: Integration tests are slow

**Mitigation**:

- Separate CI job (doesn't block unit test feedback)
- Can skip in local development (`pnpm test:unit`)
- Optimize fixtures to be minimal but realistic

### Risk: Fixtures become stale or broken

**Mitigation**:

- Regular dependency updates in CI
- Fixtures use pinned versions initially
- Document fixture maintenance in CONTRIBUTING.md

### Risk: Platform-specific failures

**Mitigation**:

- Run integration tests on all platforms (ubuntu, macos, windows)
- Use path.join for cross-platform paths
- Test Windows-specific issues (command line length, path separators)

### Risk: False positives from TypeScript version mismatches

**Mitigation**:

- Pin TypeScript version in fixtures
- Document expected TypeScript version ranges
- Test with both TypeScript 5.0 (stable) and latest

## Open Questions

1. **Should we test every moduleResolution mode?**
   - Current: Tests use bundler (most common)
   - Decision needed: Add node, node16, nodenext tests?
   - Recommendation: Start with bundler, add others if issues reported

2. **How to handle framework preset versioning?**
   - Current: Pin to specific versions
   - Decision needed: Auto-update or manual?
   - Recommendation: Pin initially, add update script later

3. **Should we test tsgo-specific scenarios separately?**
   - Current: tsgo is optional, tests use default compiler selection
   - Decision needed: Force tsgo in some tests?
   - Recommendation: Add `--use-tsgo` flag tests as separate suite

4. **What's the integration test timeout threshold?**
   - Current: Vitest default (5s per test)
   - Decision needed: Increase for integration tests?
   - Recommendation: 30s for integration tests, document in vitest.config.ts
