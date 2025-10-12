# Testing Best Practices for tsc-files

This document outlines the testing best practices and patterns we've implemented using Vitest, based on modern testing principles and Vitest-specific features.

## Table of Contents

- [Overview](#overview)
- [Enhanced Setup Architecture](#enhanced-setup-architecture)
- [Test Fixtures](#test-fixtures)
- [Testing Strategies](#testing-strategies)
- [Environment Variable Testing](#environment-variable-testing)
- [CLI Testing Patterns](#cli-testing-patterns)
- [Custom Matchers](#custom-matchers)
- [Parameterized Testing](#parameterized-testing)
- [Performance Testing](#performance-testing)
- [Third-Party Library Verification](#third-party-library-verification)
- [Migration Guide](#migration-guide)

## Overview

Our testing strategy emphasizes:

1. **Integration Testing**: Tests run against real implementations for authentic behavior
2. **Isolation**: Each test gets its own temporary directory and environment
3. **Performance**: Fast test execution through efficient fixtures and utilities
4. **Maintainability**: Reusable patterns and utilities across test suites
5. **Type Safety**: Full TypeScript support with comprehensive test coverage

## Enhanced Setup Architecture

### Setup File Structure

```typescript
// tests/setup.ts
import { test as baseTest } from 'vitest';
import tmp from 'tmp';

// 1. Test fixtures with automatic cleanup
export const test = baseTest.extend<TestFixtures>({
  tempDir: [
    async ({}, use) => {
      const tempDir = tmp.dirSync({
        prefix: 'tsc-files-test-',
        unsafeCleanup: true,
      });
      await use(tempDir.name);
      // Automatic cleanup
    },
    { auto: true },
  ],
});

// 2. Global utilities for test project creation
export const createTestProject = (tempDir: string, customTsconfig?: object) => {
  // Creates tsconfig.json and src directory
};

// 3. Custom matchers for CLI testing
expect.extend({
  toHaveExitCode: (received, expected) => {
    /* implementation */
  },
  toHaveSuccessfulExit: (received) => {
    /* implementation */
  },
  // ... other matchers
});
```

### Key Principles

1. **No mocking of core functions** - Tests run against real implementations
2. **Use test fixtures** for automatic resource management
3. **Isolated test environments** - Each test gets its own temp directory
4. **Real TypeScript execution** - Authentic behavior testing
5. **Custom matchers** for domain-specific assertions

## Test Fixtures

### Automatic Fixtures

Fixtures that are always available and auto-managed:

```typescript
import { test } from '../setup-enhanced';

test('automatically gets temp directory', ({ tempDir }) => {
  // tempDir is created and cleaned up automatically
  expect(tempDir).toBeDefined();
});
```

### Test Environment Fixtures

Fixtures that provide isolated test environments:

```typescript
test('uses test fixtures', ({ tempDir }) => {
  // tempDir is automatically created and cleaned up
  const { srcDir } = createTestProject(tempDir);
  writeTestFile(srcDir, 'test.ts', 'export const x = 42;');

  // Test runs against real TypeScript compiler
  const result = await runCli(['src/test.ts'], tempDir);
  expect(result).toHaveSuccessfulExit();
});
```

### Creating Custom Fixtures

```typescript
interface MyTestFixtures {
  customSetup: string;
}

const myTest = test.extend<MyTestFixtures>({
  customSetup: async ({}, use) => {
    // Setup logic
    const setup = 'configured';
    await use(setup);
    // Cleanup logic (if needed)
  },
});
```

## Testing Strategies

### 1. Real Implementation Testing

Tests run against actual implementations for authentic behavior:

```typescript
test('package manager detection', async ({ tempDir }) => {
  // Create real package-lock.json
  writeTestFile(tempDir, 'package-lock.json', '{"lockfileVersion": 2}');

  // Test real package manager detection
  const result = await detectPackageManager(tempDir);
  expect(result.manager).toBe('npm');
});
```

### 2. Isolated Test Environments

Each test gets its own temporary directory:

```typescript
test('TypeScript compilation', async ({ tempDir }) => {
  const { srcDir } = createTestProject(tempDir);
  writeTestFile(srcDir, 'test.ts', 'export const x: number = 42;');

  // Real TypeScript compilation
  const result = await runCli(['src/test.ts'], tempDir);
  expect(result).toHaveSuccessfulExit();
});
```

### 3. Console Output Testing

For testing console output in CLI applications:

```typescript
test('verbose output', async ({ tempDir }) => {
  const result = await runCli(['--verbose', 'src/test.ts'], tempDir);
  expect(result).toContainInStdout('Processing group');
  expect(result).toContainInStdout('Using pnpm package manager');
});
```

### 4. Error Scenario Testing

Test real error conditions:

```typescript
test('type error handling', async ({ tempDir }) => {
  const { srcDir } = createTestProject(tempDir);
  writeTestFile(srcDir, 'error.ts', 'const x: number = "string";');

  const result = await runCli(['src/error.ts'], tempDir);
  expect(result).toHaveTypeError();
  expect(result).toContainInStderr('Type');
});
```

### 5. Performance Testing

Monitor real execution performance:

```typescript
test('performance monitoring', async ({ tempDir }) => {
  const start = performance.now();
  const result = await runCli(['src/test.ts'], tempDir);
  const duration = performance.now() - start;

  expect(result).toHaveSuccessfulExit();
  expect({ duration }).toBeFasterThan(2000);
});
```

## Environment Variable Testing

### Using `vi.stubEnv()`

```typescript
import { stubEnv } from '../setup-enhanced';

test('CI environment behavior', () => {
  stubEnv('CI', 'true');
  stubEnv('NODE_ENV', 'production');

  expect(process.env.CI).toBe('true');

  // Test CI-specific behavior

  // Environment automatically restored after test
});
```

### Configuration

Enable automatic environment restoration in `vitest.config.ts`:

```typescript
export default defineConfig({
  test: {
    unstubEnvs: true, // Automatic environment variable restoration
  },
});
```

## CLI Testing Patterns

### Direct CLI Testing

```typescript
import { runCliDirect, writeTestFile, TEST_FILES } from '../setup-enhanced';

test('CLI success scenario', async ({ tempDir }) => {
  const { srcDir } = createTestProject(tempDir);
  writeTestFile(srcDir, 'test.ts', TEST_FILES.VALID_TS);

  const result = await runCliDirect(['src/test.ts'], tempDir);

  expect(result).toHaveExitCode(0);
  expect(result).toContainInStdout('Type check passed');
});
```

### Error Scenario Testing

```typescript
test('CLI error handling', async ({ tempDir }) => {
  configureMocks.checkResult(false, [mockTypeError]);

  const result = await runCliDirect(['invalid.ts'], tempDir);

  expect(result).toHaveExitCode(1);
  expect(result).toHaveTypeError();
});
```

### JSON Output Testing

```typescript
test('JSON output format', async ({ tempDir }) => {
  const result = await runCliDirect(['--json', 'test.ts'], tempDir);

  expect(result).toHaveValidJson();

  const parsed = JSON.parse(result.stdout);
  expect(parsed).toHaveProperty('success', true);
});
```

## Custom Matchers

We provide domain-specific matchers for cleaner test assertions:

### CLI-Specific Matchers

```typescript
// Exit code assertions
expect(result).toHaveExitCode(0);
expect(result).toHaveSuccessfulExit();

// Output content assertions
expect(result).toContainInStdout('success message');
expect(result).toContainInStderr('error message');

// CLI behavior assertions
expect(result).toHaveTypeError();
expect(result).toHaveValidJson();

// Performance assertions
expect({ duration: 1500 }).toBeFasterThan(2000);
```

### Creating Custom Matchers

```typescript
expect.extend({
  toHaveSpecificError(received, expectedCode) {
    const hasError = received.errors.some((err) => err.code === expectedCode);
    return {
      pass: hasError,
      message: () => `Expected error code ${expectedCode}`,
    };
  },
});

// Usage
expect(result).toHaveSpecificError('TS2322');
```

## Parameterized Testing

### Testing Multiple Scenarios

```typescript
const packageManagers = [
  { manager: 'npm', lockFile: 'package-lock.json' },
  { manager: 'yarn', lockFile: 'yarn.lock' },
  { manager: 'pnpm', lockFile: 'pnpm-lock.yaml' },
  { manager: 'bun', lockFile: 'bun.lockb' },
];

test.each(packageManagers)(
  'should detect $manager package manager',
  async ({ manager, lockFile }, { tempDir }) => {
    configureMocks.packageManager(manager, lockFile);

    // Test package manager detection
    const result = detectPackageManager(tempDir);
    expect(result.manager).toBe(manager);
  },
);
```

### Error Code Testing

```typescript
const errorScenarios = [
  { exitCode: 1, type: 'type error', expectInStderr: 'TS2322' },
  { exitCode: 2, type: 'config error', expectInStderr: 'tsconfig.json' },
  { exitCode: 3, type: 'system error', expectInStderr: 'TypeScript not found' },
];

test.each(errorScenarios)(
  'should handle $type correctly',
  async ({ exitCode, expectInStderr }, { tempDir }) => {
    // Configure appropriate error scenario

    const result = await runCliDirect(['test.ts'], tempDir);

    expect(result).toHaveExitCode(exitCode);
    expect(result).toContainInStderr(expectInStderr);
  },
);
```

## Performance Testing

### Using Performance Benchmarks

```typescript
import { PERFORMANCE_BENCHMARKS } from '../setup-enhanced';

test('single file performance', async ({ tempDir }) => {
  const start = Date.now();

  await runCliDirect(['test.ts'], tempDir);

  const duration = Date.now() - start;
  expect({ duration }).toBeFasterThan(PERFORMANCE_BENCHMARKS.SINGLE_FILE);
});
```

### Monitoring Test Performance

```typescript
test('performance monitoring', async ({ tempDir }) => {
  const { srcDir } = createTestProject(tempDir);

  // Create multiple test files
  const files = Array.from({ length: 10 }, (_, i) =>
    writeTestFile(srcDir, `test${i}.ts`, TEST_FILES.VALID_TS),
  );

  const start = performance.now();
  await runCliDirect(['src/*.ts'], tempDir);
  const duration = performance.now() - start;

  // Log performance metrics in CI
  if (process.env.CI) {
    console.log(`Checked ${files.length} files in ${duration}ms`);
  }

  expect({ duration }).toBeFasterThan(PERFORMANCE_BENCHMARKS.SMALL_PROJECT);
});
```

## Migration Guide

### From Old to New Test Patterns

#### Before (Old Pattern)

```typescript
import { beforeEach, afterEach, describe, expect, it } from 'vitest';

describe('Package Manager Detection', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = createTempDir();
  });

  afterEach(() => {
    cleanupTempDir(tempDir);
  });

  it('should detect npm', () => {
    // Manual setup and cleanup
    // Potential for real execution
  });
});
```

#### After (New Pattern)

```typescript
import { describe, expect } from 'vitest';
import { test, configureMocks } from '../setup-enhanced';

describe('Package Manager Detection', () => {
  test('should detect npm', ({ tempDir, mockPackageManager }) => {
    // Automatic setup and cleanup
    // Properly mocked execution

    configureMocks.packageManager('npm');
    expect(mockPackageManager.manager).toBe('npm');
  });
});
```

### Migration Checklist

- [ ] Replace `import { test }` with `import { test } from '../setup-enhanced'`
- [ ] Remove manual temp directory management
- [ ] Replace real execution with mock configuration
- [ ] Use fixtures instead of beforeEach/afterEach for common setup
- [ ] Replace assertion patterns with custom matchers
- [ ] Add type annotations for mock configurations
- [ ] Use `configureMocks` utilities for dynamic mock setup

### Common Migration Patterns

1. **Temp Directory Management**

   ```typescript
   // Before
   let tempDir: string;
   beforeEach(() => {
     tempDir = createTempDir();
   });
   afterEach(() => {
     cleanupTempDir(tempDir);
   });

   // After
   test('description', ({ tempDir }) => {
     // tempDir automatically managed
   });
   ```

2. **Mock Configuration**

   ```typescript
   // Before
   vi.mock('@/detectors/package-manager');
   const mockDetect = vi.mocked(detectPackageManager);
   mockDetect.mockReturnValue({ manager: 'npm' });

   // After
   configureMocks.packageManager('npm');
   ```

3. **Environment Variables**

   ```typescript
   // Before
   const originalEnv = process.env.CI;
   process.env.CI = 'true';
   // Manual cleanup needed

   // After
   stubEnv('CI', 'true');
   // Automatic cleanup
   ```

## Troubleshooting

### Common Issues

1. **Mocks Not Working**
   - Ensure mocks are defined in `vi.hoisted()` for factory access
   - Check that modules are mocked before imports
   - Use dynamic imports if needed: `await import('@/module')`

2. **Environment Variables Not Restored**
   - Ensure `unstubEnvs: true` in vitest config
   - Use `stubEnv()` utility instead of direct assignment

3. **Fixtures Not Available**
   - Import `test` from setup file, not from 'vitest'
   - Check fixture definition and interface types

4. **TypeScript Errors with Mocks**
   - Use `vi.mocked()` for type-safe mock access
   - Import types properly: `import type { SomeType } from '@/module'`

### Performance Issues

1. **Slow Test Execution**
   - Ensure all external commands are mocked
   - Use automatic fixtures instead of manual setup
   - Check for real file system operations

2. **Memory Leaks**
   - Verify all mocks are restored: `vi.restoreAllMocks()`
   - Use automatic cleanup with fixtures
   - Monitor temp directory cleanup

## Third-Party Library Verification

### Temporary Verification Tests

When evaluating or migrating third-party libraries, you may need to write tests to verify behavior. **These tests should be temporary and NOT committed.**

#### Guidelines

**DO:**

- ✅ Write verification tests locally to understand library behavior
- ✅ Document findings in ADRs (Architectural Decision Records)
- ✅ Delete verification tests before committing
- ✅ Keep only integration tests that verify our code's usage

**DON'T:**

- ❌ Commit tests that verify third-party library behavior
- ❌ Test third-party library edge cases (that's their responsibility)
- ❌ Maintain tests for library features we don't use

#### Example: Library Migration Verification

```typescript
// ❌ BAD - Do not commit this
// tests/unit/tinyglobby-behavior.test.ts
describe('tinyglobby behavior verification', () => {
  it('should automatically deduplicate results', async () => {
    // Testing tinyglobby's internal behavior
    const results = await glob(['src/**/*.ts', 'src/core/*.ts']);
    const uniqueResults = [...new Set(results)];
    expect(results.length).toBe(uniqueResults.length);
  });
});

// ✅ GOOD - Commit this instead
// tests/unit/core/file-resolver.test.ts
describe('file-resolver', () => {
  it('should resolve files without duplicates', async () => {
    // Testing OUR code that uses tinyglobby
    const files = await resolveFiles(['src/**/*.ts', 'src/core/*.ts'], cwd);
    const uniqueFiles = [...new Set(files)];
    expect(files.length).toBe(uniqueFiles.length);
  });
});
```

#### Workflow for Library Verification

1. **Research Phase** (Local, not committed):

   ```bash
   # Create temporary verification test
   touch tests/unit/library-verification.test.ts

   # Run verification
   pnpm vitest tests/unit/library-verification.test.ts
   ```

2. **Documentation Phase** (Committed):

   ```bash
   # Document findings in ADR
   vi docs/decisions/011-library-migration.md

   # Include:
   # - What you verified
   # - Key findings (duplicates, edge cases, performance)
   # - Why the library is suitable for our use case
   ```

3. **Cleanup Phase** (Before commit):

   ```bash
   # Delete verification test
   rm tests/unit/library-verification.test.ts
   # DO NOT git add this file
   ```

#### When to Keep Tests

**Keep tests when:**

- Testing **your code's integration** with the library
- Testing **your abstractions** over the library
- Testing **error handling** in your wrappers
- Testing **configuration** of the library in your context

**Example of tests to keep:**

```typescript
// ✅ GOOD - Testing our integration
describe('file-resolver integration', () => {
  it('should handle glob errors gracefully', async () => {
    // Testing our error handling when glob fails
    await expect(resolveFiles(['invalid'], cwd)).rejects.toThrow();
  });

  it('should apply our ignore patterns correctly', async () => {
    // Testing our configuration of the glob library
    const files = await resolveFiles(['**/*.ts'], cwd);
    expect(files.every((f) => !f.includes('node_modules'))).toBe(true);
  });
});
```

#### Documentation

Document verification findings in:

- **ADRs** - For architectural decisions (library selection, migration)
- **PR comments** - For reviewer context during code review
- **Commit messages** - Brief summary of what was verified

Do NOT document in:

- ❌ Test files (temporary verification only)
- ❌ Inline comments (test third-party behavior elsewhere)

#### Real Example: tinyglobby Migration

**What we did:** ✅ Correct approach

1. Created temporary `tests/unit/tinyglobby-behavior.test.ts` locally
2. Verified duplicate handling, basename matching, case sensitivity
3. Documented findings in ADR-011: File Pattern Matching Library Migration
4. Posted findings in PR review comment for Copilot
5. **Deleted the verification test** before final commit
6. Kept only integration tests that verify our file-resolver code

## Best Practices Summary

1. **Always use fixtures** for common setup patterns
2. **Mock at the module level** to prevent real execution
3. **Use `configureMocks`** for flexible test scenarios
4. **Implement custom matchers** for domain-specific assertions
5. **Use `vi.mocked()`** for type-safe mock access
6. **Test environment variables** with `stubEnv()`
7. **Use parameterized tests** for multiple scenarios
8. **Monitor performance** with custom matchers
9. **Maintain isolation** between tests
10. **Document test patterns** for team consistency
11. **Delete third-party verification tests** - Document in ADRs instead
12. **Test your integration** - Not the library's internal behavior

By following these patterns, our tests are fast, reliable, maintainable, and provide excellent coverage of both happy path and error scenarios.
