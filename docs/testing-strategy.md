# Testing Strategy

This document outlines the comprehensive testing approach for the tsc-files TypeScript CLI tool, ensuring reliability, performance, and security.

## Testing Framework

### Primary Tools

- **Vitest**: Modern test runner with Node.js environment
- **Coverage**: v8 provider with multiple reporters (text, json, html, lcov)
- **CI Integration**: GitHub Actions with JUnit XML output
- **Test Organization**: Unit tests separated from integration tests

### Configuration

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      exclude: ['tests/fixtures/**'],
      thresholds: {
        global: {
          branches: 80,
          functions: 95,
          lines: 85,
          statements: 85,
        },
        // Core business logic has higher coverage requirements
        'src/core/**': {
          branches: 80,
          functions: 100,
          lines: 90,
          statements: 90,
        },
        // Detectors have lower initial thresholds - can increase over time
        'src/detectors/**': {
          branches: 29,
          functions: 62,
          lines: 35,
          statements: 35,
        },
      },
    },
  },
});
```

## Test Categories

### Unit Tests (`tests/unit/`)

**Scope**: Individual functions and components in isolation

**Examples**:

- Type definition validation
- Utility functions
- Error handling logic
- Configuration parsing

**Structure**:

```typescript
import { describe, test, expect } from 'vitest';
import { detectPackageManager } from '@/detectors/package-manager';

describe('Package Manager Detection', () => {
  test('detects pnpm from lock file', async () => {
    const result = await detectPackageManager('/path/with/pnpm-lock.yaml');
    expect(result.type).toBe('pnpm');
    expect(result.version).toMatch(/^\d+\.\d+\.\d+$/);
  });
});
```

### Integration Tests (`tests/integration/`)

**Scope**: End-to-end CLI functionality with real TypeScript projects

**Examples**:

- Full CLI workflow testing
- Cross-platform compatibility
- Real project type checking
- Error scenario handling

**Structure**:

```typescript
import { describe, test, expect } from 'vitest';
import { execFile } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

describe('CLI Integration', () => {
  test('type checks TypeScript files successfully', async () => {
    const { stdout, stderr } = await execFileAsync('node', [
      'dist/cli.js',
      'tests/fixtures/valid-project/src/index.ts',
    ]);

    expect(stderr).toBe('');
    expect(stdout).toContain('✓ Type check passed');
  });
});
```

### Test Fixtures (`tests/fixtures/`)

**Purpose**: Sample projects for testing different scenarios

**Structure**:

```sh
tests/fixtures/
├── valid-project/          # Clean TypeScript project
│   ├── tsconfig.json
│   ├── package.json
│   └── src/index.ts
├── error-project/          # Project with type errors
│   ├── tsconfig.json
│   └── src/broken.ts
├── monorepo/              # Multi-package setup
│   ├── packages/app/
│   └── packages/lib/
└── edge-cases/            # Unusual configurations
    ├── no-tsconfig/
    ├── empty-project/
    └── symlinks/
```

## Testing Requirements by Component

### Package Manager Detection

```typescript
// tests/unit/detectors/package-manager.test.ts
describe('Package Manager Detection', () => {
  test('detects npm from package-lock.json', async () => {
    // Test lock file detection
  });

  test('detects yarn from yarn.lock', async () => {
    // Test yarn detection
  });

  test('falls back to npm when no lock files found', async () => {
    // Test default behavior
  });

  test('respects package manager environment variables', async () => {
    // Test env var overrides
  });
});
```

### TypeScript Integration

```typescript
// tests/unit/detectors/typescript.test.ts
describe('TypeScript Detection', () => {
  test('finds local TypeScript installation', async () => {
    // Test local node_modules detection
  });

  test('finds global TypeScript installation', async () => {
    // Test global detection
  });

  test('validates TypeScript version compatibility', async () => {
    // Test version checking
  });
});
```

### Security Testing

```typescript
// tests/unit/security/temp-files.test.ts
describe('Temporary File Security', () => {
  test('creates files with secure permissions', async () => {
    const tempFile = await createTempConfig({});
    const stats = await stat(tempFile);
    expect(stats.mode & 0o777).toBe(0o600);
  });

  test('cleans up temp files on exit', async () => {
    // Test cleanup mechanisms
  });

  test('prevents path traversal attacks', async () => {
    await expect(
      createTempConfig({ project: '../../../etc/passwd' }),
    ).rejects.toThrow('Path traversal not allowed');
  });
});
```

### CLI Testing

```typescript
// tests/integration/cli.test.ts
describe('CLI Interface', () => {
  test('shows help with --help flag', async () => {
    const { stdout } = await execCLI(['--help']);
    expect(stdout).toContain('Usage: tsc-files');
  });

  test('shows version with --version flag', async () => {
    const { stdout } = await execCLI(['--version']);
    expect(stdout).toMatch(/^\d+\.\d+\.\d+$/);
  });

  test('handles invalid arguments gracefully', async () => {
    const { stderr, exitCode } = await execCLI(['--invalid-flag']);
    expect(exitCode).toBe(2);
    expect(stderr).toContain('Unknown option');
  });
});
```

## Test Commands

### Development Workflow

```bash
# Run all tests
pnpm test

# Run tests in watch mode
pnpm test:watch

# Run with coverage
pnpm test:coverage

# Run specific test file
pnpm vitest tests/unit/types.test.ts

# Run tests matching pattern
pnpm vitest --run --reporter=verbose "detector"

# Run integration tests only
pnpm vitest tests/integration/
```

### CI/CD Integration

```bash
# CI test command (in GitHub Actions)
pnpm test --reporter=junit --outputFile=test-results.xml

# Coverage for Codecov
pnpm test:coverage --reporter=lcov
```

## Testing Best Practices

### Test Organization

- **One test file per source file**: `src/utils/foo.ts` → `tests/unit/utils/foo.test.ts`
- **Descriptive test names**: Focus on behavior, not implementation
- **Arrange-Act-Assert pattern**: Clear test structure
- **Test edge cases**: Error conditions, boundary values, empty inputs

### Test Quality

```typescript
// Good: Descriptive and focused
test('throws error when TypeScript not found in project', async () => {
  await expect(findTypeScriptCompiler('/empty/project')).rejects.toThrow(
    'TypeScript compiler not found',
  );
});

// Avoid: Vague and implementation-focused
test('findTypeScriptCompiler works', async () => {
  // Test that calls internal methods
});
```

### Testing Strategy

- **No mocking of core functions**: Tests run against real implementations for better integration testing
- **Use test fixtures**: Automatic temp directory creation and cleanup
- **Real TypeScript execution**: Tests use actual TypeScript compiler for authentic behavior
- **Isolated test environments**: Each test gets its own temporary directory

```typescript
import { test } from 'vitest';

// Tests run against real functions with isolated environments
test('should check TypeScript files', async ({ tempDir }) => {
  const { srcDir } = createTestProject(tempDir);
  writeTestFile(srcDir, 'test.ts', 'export const x: number = 42;');

  const result = await runCli(['src/test.ts'], tempDir);
  expect(result).toHaveSuccessfulExit();
});
```

## Coverage Strategy

### Tiered Coverage Requirements

The project uses different coverage thresholds for different code areas based on their criticality and testability:

#### Global Baseline (Default)

- **Branches**: 80% - Ensures most conditional logic paths are tested
- **Functions**: 95% - Nearly all functions should be exercised
- **Lines/Statements**: 85% - High coverage for general codebase

#### Core Business Logic (`src/core/**`) - **Highest Standards**

- **Branches**: 80% - All conditional paths in critical logic
- **Functions**: 100% - Every function must be tested (zero-tolerance)
- **Lines/Statements**: 90% - Maximum coverage for core functionality

#### Detector Modules (`src/detectors/**`) - **Progressive Standards**

- **Branches**: 29% - Current baseline, can be increased over time
- **Functions**: 62% - Moderate function coverage requirement
- **Lines/Statements**: 35% - Lower initial threshold due to cross-platform complexity

### Coverage Philosophy

1. **Zero-Tolerance for Core**: Core business logic must have near-perfect coverage
2. **Progressive for Infrastructure**: Detector modules have lower initial thresholds that can be raised as tests are added
3. **Practical Approach**: Acknowledges that some cross-platform and environment-specific code is harder to test
4. **Quality Gates**: All thresholds are enforced in CI - coverage regressions block merges

### Improving Coverage

To increase coverage for detector modules:

```bash
# Run coverage to see specific uncovered lines
pnpm test:coverage

# Focus on testable logic first
# - Package manager detection
# - Path construction
# - Configuration generation
# - Error handling paths

# Leave environment-specific code for integration tests
# - Windows vs Unix paths
# - File system operations
# - Environment variable detection
```

## Performance Testing

### Benchmarking

```typescript
// tests/performance/benchmarks.test.ts
import { bench, describe } from 'vitest';

describe('Performance Benchmarks', () => {
  bench('package manager detection', async () => {
    await detectPackageManager(process.cwd());
  });

  bench('TypeScript compilation', async () => {
    await runTypeScript(['tests/fixtures/large-project/**/*.ts']);
  });
});
```

### Load Testing

- Test with large TypeScript projects (1000+ files)
- Memory usage monitoring
- Concurrent execution testing
- Performance regression detection

## Security Testing

### Penetration Testing

```typescript
// tests/security/penetration.test.ts
describe('Security Penetration Tests', () => {
  test('rejects malicious file paths', async () => {
    const maliciousPaths = [
      '../../../etc/passwd',
      '/dev/null',
      '\\\\server\\share',
      'CON:', // Windows device name
    ];

    for (const path of maliciousPaths) {
      await expect(processFiles([path])).rejects.toThrow();
    }
  });
});
```

### Fuzzing

- Random input generation
- Malformed configuration files
- Edge case discovery
- Crash resistance testing

## Test Automation

### Pre-commit Hooks

```bash
# lefthook.yaml
pre-commit:
  commands:
    tests:
      run: pnpm test --run
      stage_fixed: true
```

### Continuous Integration

```yaml
# .github/workflows/ci.yaml
- name: Run tests
  run: pnpm test --reporter=junit --outputFile=test-results.xml

- name: Upload test results
  uses: actions/upload-artifact@v3
  with:
    name: test-results
    path: test-results.xml
```

This comprehensive testing strategy ensures reliability, security, and performance of the tsc-files tool across all supported environments and use cases.
