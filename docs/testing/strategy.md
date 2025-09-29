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

**As of ADR 011, we use a Coverage-First Hybrid Testing Strategy:**

- **Hybrid Approach**: Combines real behavior testing with strategic mocking
- **Real Testing for Happy Paths**: Uses actual file systems, real TypeScript execution
- **Strategic Mocks for Edge Cases**: Mock complex error scenarios and platform-specific behavior
- **Coverage-First**: Always ensure coverage thresholds are met before refactoring
- **Component Testing**: Use test fixtures and isolated environments

#### When to Use Real vs Mock Testing

**Use Real Testing For:**

- Happy path scenarios
- Integration workflows
- File system operations that can be isolated
- Actual TypeScript compilation and type checking

**Use Mock Testing For:**

- Complex error scenarios (permission denied, disk full)
- Platform-specific behavior testing (Windows vs Unix)
- External API failures
- Edge cases difficult to reproduce with real systems

#### Example Hybrid Test Structure

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

#### CLI Modules (`src/cli/**`) - **High User-Facing Standards**

- **Branches**: 85% - User interface logic must be well-tested
- **Functions**: 94% - Nearly all CLI functions must be exercised
- **Lines/Statements**: 89% - High coverage for user-facing functionality

#### Execution Modules (`src/execution/**`) - **Highest Performance Standards**

- **Branches**: 85% - Critical execution paths must be tested
- **Functions**: 100% - Every execution function must be tested (zero-tolerance)
- **Lines/Statements**: 95% - Maximum coverage for performance-critical code

#### Detector Modules (`src/detectors/**`) - **Comprehensive Detection Standards**

- **Branches**: 75% - Detection logic must handle multiple scenarios
- **Functions**: 100% - Every detection function must be tested
- **Lines/Statements**: 65% - Good coverage accounting for platform complexity

#### Utils Modules (`src/utils/**`) - **Perfect Utility Standards**

- **Branches**: 90% - Utility functions must handle edge cases
- **Functions**: 100% - Every utility function must be tested
- **Lines/Statements**: 95% - Near-perfect coverage for reusable utilities

### Coverage Philosophy

1. **Zero-Tolerance for Critical Code**: Core business logic, execution, and utilities must have near-perfect coverage
2. **High Standards for User-Facing**: CLI modules have high thresholds due to user impact
3. **Comprehensive Detection**: Detector modules must handle multiple scenarios but account for platform complexity
4. **Quality Gates**: All thresholds are enforced in CI - coverage regressions block merges
5. **Coverage-First Refactoring**: Never refactor tests without ensuring coverage is maintained

### Recent Coverage Focus Areas

**Post-tsgo Integration (ADR 011):**

- **education.ts**: New module needs comprehensive test coverage (40% → 89%)
- **typescript.ts**: tsgo detection features need testing (48% → 65%)
- **CLI integration**: New flags (`--tips`, `--benchmark`, `--show-compiler`) need testing

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
