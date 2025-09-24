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
import { detectPackageManager } from '../src/detectors/package-manager.js';

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

### Mock Strategy

- **Mock external dependencies**: File system, child processes, network calls
- **Test real integrations separately**: Integration tests with actual TypeScript
- **Use fixtures for file system tests**: Avoid creating real files in unit tests

```typescript
import { vi } from 'vitest';

// Mock file system for unit tests
vi.mock('fs/promises', () => ({
  readFile: vi.fn(),
  writeFile: vi.fn(),
  unlink: vi.fn(),
}));
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
