# Enhanced CLI Testing Guide

This project uses an enhanced testing setup for CLI applications that extends Vitest with custom matchers and utilities, similar to how `@testing-library/react` extends testing frameworks for React components.

## Overview

The testing setup provides:

- **Custom CLI matchers** - Like `toHaveExitCode()`, `toContainInStdout()`, `toHaveSuccessfulExit()`
- **Global test utilities** - Pre-configured temp directory and file creation helpers
- **Test templates** - Predefined TypeScript code snippets for common test scenarios
- **Performance benchmarks** - Built-in timing expectations for CLI operations
- **Enhanced error reporting** - Better error messages for CLI-specific assertions

## Quick Start

The setup file (`tests/setup.ts`) is automatically loaded by Vitest, so you can use enhanced features immediately:

```typescript
import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import {
  TEST_FILES,
  TEST_CONFIGS,
  PERFORMANCE_BENCHMARKS,
} from '@/tests/setup';

describe('My CLI Test', () => {
  let tempDir: string;
  let srcDir: string;

  beforeEach(() => {
    tempDir = createTempDir(); // Global utility
    ({ srcDir } = createTestProject(tempDir)); // Global utility
  });

  afterEach(() => {
    cleanupTempDir(tempDir); // Global utility
  });

  it('should check TypeScript files', async () => {
    // Easy file creation with predefined templates
    writeTestFile(srcDir, 'test.ts', TEST_FILES.VALID_TS);

    const result = await runCli(['src/test.ts'], tempDir);

    // Enhanced matchers
    expect(result).toHaveExitCode(0);
    expect(result).toHaveSuccessfulExit();
    expect(result).toContainInStdout('Type check passed');
  });
});
```

## Custom Matchers

### Exit Code Assertions

```typescript
expect(result).toHaveExitCode(0); // Success
expect(result).toHaveExitCode(1); // Type errors
expect(result).toHaveExitCode(2); // Config errors
expect(result).toHaveSuccessfulExit(); // Exit code 0
expect(result).not.toHaveSuccessfulExit(); // Non-zero exit
```

### Output Assertions

```typescript
expect(result).toContainInStdout('success message');
expect(result).toContainInStderr('error message');
expect(result).toHaveValidJson(); // Validates JSON output
```

### CLI-Specific Assertions

```typescript
expect(result).toHaveTypeError(); // Exit code 1 with stderr
expect({ duration }).toBeFasterThan(2000); // Performance assertion
```

## Global Utilities

### Directory Management

```typescript
const tempDir = createTempDir(); // Creates isolated test directory
const { srcDir, tsconfig } = createTestProject(tempDir); // Sets up TS project structure
cleanupTempDir(tempDir); // Cleanup (automatic in afterEach)
```

### File Creation

```typescript
// Create files with predefined templates
writeTestFile(srcDir, 'valid.ts', TEST_FILES.VALID_TS);
writeTestFile(srcDir, 'error.ts', TEST_FILES.INVALID_TS);

// Or custom content
writeTestFile(srcDir, 'custom.ts', 'export const x = 42;');
```

### CLI Execution

```typescript
const result = await runCli(['--help'], tempDir);
const result = await runCli(['src/*.ts'], tempDir);
const result = await runCli(['--json', 'file.ts'], tempDir);

// Result structure:
// { stdout: string, stderr: string, exitCode: number }
```

## Test Templates

Pre-defined TypeScript code for common scenarios:

```typescript
import { TEST_FILES } from '@/tests/setup';

// Valid TypeScript
TEST_FILES.VALID_TS;
// → 'export const message: string = "Hello, world!";'

// Type errors
TEST_FILES.INVALID_TS;
// → 'const message: string = 42;'

// Complex interfaces
TEST_FILES.COMPLEX_TS;
// → Multi-line interface and function definitions

// Warning scenarios
TEST_FILES.UNUSED_VAR_TS;
// → Code that generates TypeScript warnings
```

## Configuration Templates

Pre-configured tsconfig.json files:

```typescript
import { TEST_CONFIGS } from '@/tests/setup';

// Strict TypeScript configuration
writeTestFile(
  tempDir,
  'tsconfig.json',
  JSON.stringify(TEST_CONFIGS.STRICT, null, 2),
);

// Loose configuration for testing permissive scenarios
writeTestFile(
  tempDir,
  'tsconfig.json',
  JSON.stringify(TEST_CONFIGS.LOOSE, null, 2),
);
```

## Performance Testing

Built-in benchmarks for CLI operations:

```typescript
import { PERFORMANCE_BENCHMARKS } from '@/tests/setup';

it('should be fast for single files', async () => {
  const start = Date.now();
  const result = await runCli(['file.ts'], tempDir);
  const duration = Date.now() - start;

  expect(result).toHaveSuccessfulExit();
  expect({ duration }).toBeFasterThan(PERFORMANCE_BENCHMARKS.SINGLE_FILE); // 2s
});

// Available benchmarks:
PERFORMANCE_BENCHMARKS.SINGLE_FILE; // 2000ms - single file
PERFORMANCE_BENCHMARKS.SMALL_PROJECT; // 5000ms - < 10 files
PERFORMANCE_BENCHMARKS.MEDIUM_PROJECT; // 15000ms - < 100 files
```

## Advanced Usage

### Custom Test Configurations

```typescript
const customConfig = {
  compilerOptions: {
    ...TEST_CONFIGS.STRICT.compilerOptions,
    noUnusedLocals: false,
  },
};
writeTestFile(tempDir, 'tsconfig.json', JSON.stringify(customConfig, null, 2));
```

### Multiple File Testing

```typescript
// Create multiple test files
for (let i = 0; i < 5; i++) {
  writeTestFile(srcDir, \`file\${i}.ts\`, TEST_FILES.VALID_TS);
}

const result = await runCli(['src/*.ts'], tempDir);
expect(result).toHaveSuccessfulExit();
```

### JSON Output Validation

```typescript
const result = await runCli(['--json', 'src/test.ts'], tempDir);

expect(result).toHaveValidJson();

const parsed = JSON.parse(result.stdout);
expect(parsed).toHaveProperty('success', true);
expect(parsed).toHaveProperty('errorCount', 0);
expect(parsed.checkedFiles).toHaveLength(1);
```

## Error Message Testing

```typescript
writeTestFile(srcDir, 'error.ts', 'const x: number = "string";');

const result = await runCli(['src/error.ts'], tempDir);

expect(result).toHaveTypeError();
expect(result).toContainInStderr('Type');
expect(result).toContainInStderr('error.ts');
```

## Migration from Basic Tests

**Before (basic approach):**

```typescript
const { stdout, stderr, exitCode } = await execFileAsync(
  'node',
  [CLI_PATH, 'file.ts'],
  { cwd },
);
expect(exitCode).toBe(0);
expect(stdout).toContain('success');
```

**After (enhanced approach):**

```typescript
const result = await runCli(['file.ts'], tempDir);
expect(result).toHaveSuccessfulExit();
expect(result).toContainInStdout('success');
```

## Benefits

1. **Readability** - Tests read more like specifications
2. **Maintainability** - Centralized utilities and templates
3. **Consistency** - Standardized patterns across all CLI tests
4. **Performance** - Built-in timing assertions
5. **Error Messages** - Better failure descriptions
6. **Type Safety** - Full TypeScript support with global utilities

## Files Structure

```sh
tests/
├── setup.ts              # Main setup file (auto-loaded)
├── README.md              # This documentation
└── unit/
    ├── cli.test.ts        # Existing CLI tests
    ├── checker.test.ts    # Core functionality tests
    ├── index.test.ts      # Export tests
    └── types.test.ts      # Type definition tests
```

The setup automatically extends Vitest with all utilities and matchers, so no additional imports are needed beyond the optional `TEST_FILES`, `TEST_CONFIGS`, and `PERFORMANCE_BENCHMARKS` constants.
