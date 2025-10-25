# Testing Guide

Comprehensive testing documentation for tsc-files.

## Quick Start

```bash
# Run all tests
pnpm test

# Watch mode
pnpm test:watch

# Coverage report
pnpm test:coverage
```

## Documentation

### [Testing Strategy](./strategy.md)

Comprehensive testing approach including:

- Test coverage requirements
- Unit testing patterns
- Integration testing strategy
- Performance testing guidelines
- CI/CD integration

### [Best Practices](./best-practices.md)

Practical testing patterns and guidelines:

- Vitest fixtures and setup
- Custom matchers
- Real implementation testing
- File system test utilities
- Environment variable testing

### [Testing Framework](./framework.md)

Technical testing infrastructure:

- Vitest configuration
- Test setup and utilities
- Custom test extensions
- Coverage reporting
- CI integration

### [Testing History](./history.md)

Evolution of the testing system:

- Testing improvements timeline
- Architecture enhancements
- Performance optimizations
- Future enhancement roadmap

## Test Coverage Requirements

| Area               | Target | Current |
| ------------------ | ------ | ------- |
| **Core Functions** | > 90%  | 97%     |
| **CLI Layer**      | > 80%  | 98%     |
| **Detectors**      | > 85%  | 93%     |
| **Overall**        | > 84%  | 96%     |

## Running Tests

### Specific Test Files

```bash
# Single file
pnpm vitest tests/unit/checker.test.ts

# Pattern matching
pnpm vitest --run --reporter=verbose "checker"

# Integration tests
pnpm vitest tests/integration/
```

### With Coverage

```bash
# Generate coverage
pnpm test:coverage

# View in browser
open coverage/index.html
```

### Watch Mode

```bash
# Watch all tests
pnpm test:watch

# Watch specific file
pnpm vitest tests/unit/checker.test.ts --watch
```

## Test Structure

```text
tests/
├── setup.ts                    # Global test setup
├── unit/                       # Unit tests
│   ├── cli/                    # CLI layer tests
│   ├── core/                   # Core functionality tests
│   ├── detectors/              # Detection layer tests
│   └── utils/                  # Utility tests
├── integration/                # Integration tests
│   └── cli.test.ts            # End-to-end CLI tests
└── fixtures/                   # Test fixtures
    └── projects/              # Sample project structures
```

## Writing Tests

### Basic Test Example

```typescript
import { test } from '../setup';
import { expect } from 'vitest';

test('should detect package manager', async ({ tempDir }) => {
  // Setup
  await writeTestFile(tempDir, 'package-lock.json', '{}');

  // Execute
  const result = await detectPackageManager(tempDir);

  // Assert
  expect(result.manager).toBe('npm');
});
```

### Using Custom Matchers

```typescript
test('should pass type checking', async ({ tempDir }) => {
  const { srcDir } = createTestProject(tempDir);
  writeTestFile(srcDir, 'test.ts', 'export const x: number = 42;');

  const result = await runCli(['src/test.ts'], tempDir);

  // Custom matchers
  expect(result).toHaveSuccessfulExit();
  expect(result).toContainInStdout('Type check passed');
});
```

## Test Best Practices

1. **Use Fixtures** - Leverage `test.extend()` for automatic setup/cleanup
2. **Real Implementations** - Test against real TypeScript compiler when possible
3. **Clear Test Names** - Use descriptive names: `should <expected> when <condition>`
4. **Isolated Tests** - Each test should be independent
5. **Fast Tests** - Keep unit tests under 100ms

## Quality Gates

All tests must pass before:

- ✅ Creating pull requests
- ✅ Merging to main
- ✅ Publishing releases

Zero tolerance for test failures.

## Troubleshooting

### Tests Failing Locally

```bash
# Clean and rebuild
rm -rf dist node_modules
pnpm install
pnpm build
pnpm test
```

### Coverage Below Threshold

```bash
# See uncovered lines
pnpm test:coverage

# Check coverage report
open coverage/index.html
```

### Slow Tests

```bash
# Find slow tests
pnpm vitest --reporter=verbose | grep -E "[0-9]{3,}ms"
```

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [Testing Best Practices](./best-practices.md)
- [Testing Strategy](./strategy.md)
- [Contributing Guide](../CONTRIBUTING.md)
