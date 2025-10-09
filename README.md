# @jbabin91/tsc-files

[![npm version](https://img.shields.io/npm/v/@jbabin91/tsc-files.svg)](https://www.npmjs.com/package/@jbabin91/tsc-files)
[![CI](https://github.com/jbabin91/tsc-files/workflows/CI/badge.svg)](https://github.com/jbabin91/tsc-files/actions)
[![Security](https://github.com/jbabin91/tsc-files/workflows/Security/badge.svg)](https://github.com/jbabin91/tsc-files/actions)
[![codecov](https://codecov.io/gh/jbabin91/tsc-files/branch/main/graph/badge.svg)](https://codecov.io/gh/jbabin91/tsc-files)

> A modern TypeScript CLI tool that enables running TypeScript compiler checks on specific files while respecting existing tsconfig.json configuration.

Perfect for git hooks, lint-staged, and CI/CD workflows where you need to type-check only the files that have changed.

## 🚀 Quick Start

```bash
# Install globally
npm install -g @jbabin91/tsc-files

# Or install locally
npm install --save-dev @jbabin91/tsc-files

# Check specific files
tsc-files src/index.ts src/utils.ts

# Use with git hooks (lint-staged)
tsc-files $(git diff --cached --name-only --diff-filter=ACM | grep -E '\.(ts|tsx)$')
```

## ✨ Features

### Core Functionality

- ✅ **Respects tsconfig.json** - Uses your existing TypeScript configuration
- ✅ **File-specific checking** - Only checks the files you specify
- ✅ **Monorepo support** - Per-file tsconfig resolution for complex projects
- ✅ **JavaScript support** - Handles allowJs/checkJs configurations automatically
- ✅ **Package manager detection** - Works with npm, yarn, pnpm, and bun
- ✅ **Automatic setup file detection** - Finds and includes test setup files automatically

### Enhanced CLI Experience

- ✅ **Colored output** - Beautiful, readable error messages and help text
- ✅ **Verbose debugging** - Detailed logging with `--verbose` flag
- ✅ **JSON output** - Machine-readable results with `--json` for CI/CD
- ✅ **Environment variables** - Use `TSC_PROJECT` for consistent configuration
- ✅ **Input validation** - Helpful error messages for invalid options
- ✅ **Enhanced help** - Comprehensive examples and usage patterns

### Performance & Reliability

- ✅ **Fast & lightweight** - Optimized file resolution and execution
- ✅ **Cross-platform** - Tested on Windows, macOS, and Linux
- ✅ **Git hook friendly** - Perfect for pre-commit hooks and lint-staged
- ✅ **CI/CD optimized** - Designed for continuous integration workflows
- ✅ **Comprehensive testing** - 290+ tests with 84% coverage

### Security & Quality

- ✅ **Supply chain security** - npm provenance and trusted publishing enabled
- ✅ **Signed commits** - GitHub App automation with verified commit signatures
- ✅ **Automated security scanning** - Dependency audits, secrets scanning, CodeQL analysis
- ✅ **Dual package** - Supports both ESM and CommonJS

## 🎯 Why tsc-files?

### The Problem

The TypeScript compiler (`tsc`) is designed to check entire projects, not individual files:

```bash
# This doesn't work as expected
tsc src/index.ts src/utils.ts
```

This ignores your `tsconfig.json` and uses default compiler options, missing important type checking rules.

### The Solution

`tsc-files` creates a temporary configuration that:

- ✅ Extends your existing `tsconfig.json`
- ✅ Includes only the specified files
- ✅ Maintains all your compiler options
- ✅ Provides accurate type checking

```bash
# This works correctly
tsc-files src/index.ts src/utils.ts
```

## 📋 Quick Reference

| Task           | Command                                                      |
| -------------- | ------------------------------------------------------------ |
| Check files    | `tsc-files "src/**/*.ts"`                                    |
| Custom config  | `tsc-files -p tsconfig.build.json "src/**/*.ts"`             |
| Verbose output | `tsc-files --verbose "src/**/*.ts"`                          |
| JSON output    | `tsc-files --json "src/**/*.ts"`                             |
| Skip lib check | `tsc-files --skip-lib-check "src/**/*.ts"`                   |
| Git hooks      | `tsc-files $(git diff --cached --name-only \| grep '\.ts$')` |

## 📦 Installation

### Global Installation

```bash
npm install -g @jbabin91/tsc-files
```

### Project Installation

```bash
# npm
npm install --save-dev @jbabin91/tsc-files

# yarn
yarn add --dev @jbabin91/tsc-files

# pnpm
pnpm add --save-dev @jbabin91/tsc-files

# bun
bun add --dev @jbabin91/tsc-files
```

## 🔧 Usage

### Command Line

#### Basic Usage

```bash
# Check specific files
tsc-files src/index.ts src/utils.ts

# Check with glob patterns (quote to prevent shell expansion)
tsc-files "src/**/*.ts" "tests/**/*.ts"

# Both single and double quotes work
tsc-files 'src/**/*.ts' 'tests/**/*.ts'

# Check all TypeScript files
tsc-files "**/*.{ts,tsx}"
```

#### Automatic Setup File Detection

`tsc-files` automatically detects and includes test setup files when checking test files:

```bash
# Setup files are automatically included when checking test files
tsc-files "tests/**/*.test.ts"

# Output shows which setup files were included
✓ Automatically included 2 setup files: tests/setup.ts, tests/globals.ts
```

**Supported setup file patterns:**

- `setup.ts`, `setup.js`, `setupTests.ts`, `setupTests.js`
- `test-setup.ts`, `test-setup.js`, `testSetup.ts`, `testSetup.js`
- `globals.ts`, `globals.js`, `test-globals.ts`, `test-globals.js`
- Custom patterns defined in `vitest.config.ts`, `jest.config.js`, etc.

**Manual override:**

```bash
# Explicitly specify setup files
tsc-files --include tests/custom-setup.ts "tests/**/*.test.ts"
```

#### Advanced Options

```bash
# Use specific tsconfig
tsc-files --project tsconfig.build.json "src/**/*.ts"

# Using environment variable (great for CI/CD)
TSC_PROJECT=tsconfig.build.json tsc-files "src/**/*.ts"

# Verbose output for debugging
tsc-files --verbose "src/**/*.ts"

# JSON output for CI/CD integration
tsc-files --json "src/**/*.ts"

# Skip library checking for faster execution
tsc-files --skip-lib-check "src/**/*.ts"

# Disable caching for debugging
tsc-files --no-cache "src/**/*.ts"
```

#### Git Hook Usage

```bash
# Perfect for lint-staged
tsc-files $(git diff --cached --name-only --diff-filter=ACM | grep -E '\.(ts|tsx)$')

# With verbose output for debugging hooks
tsc-files --verbose $(git diff --cached --name-only --diff-filter=ACM | grep -E '\.(ts|tsx)$')
```

### Git Hooks Integration

#### With lint-staged

```json
{
  "lint-staged": {
    "*.{ts,tsx}": "tsc-files"
  }
}
```

#### With husky

```bash
# Install husky
npm install --save-dev husky
npx husky install

# Add pre-commit hook
npx husky add .husky/pre-commit "npx lint-staged"
```

#### With lefthook

```yaml
# lefthook.yml
pre-commit:
  commands:
    type-check:
      glob: '*.{ts,tsx}'
      run: tsc-files {staged_files}
```

```bash
# Install lefthook
npm install --save-dev lefthook
npx lefthook install
```

### Programmatic API

```typescript
import { checkFiles } from '@jbabin91/tsc-files';
import type { CheckOptions, CheckResult } from '@jbabin91/tsc-files';

// Basic usage
const result = await checkFiles(['src/index.ts'], {
  project: './tsconfig.json',
  verbose: true,
});

if (result.success) {
  console.log(`✓ Type check passed (${result.duration}ms)`);
  console.log(`Checked ${result.checkedFiles.length} files`);
} else {
  console.error(
    `✗ Found ${result.errorCount} errors, ${result.warningCount} warnings`,
  );

  // Detailed error information
  result.errors.forEach((error) => {
    console.error(
      `${error.file}:${error.line}:${error.column} - ${error.message} [${error.code}]`,
    );
  });

  // Handle warnings separately
  result.warnings.forEach((warning) => {
    console.warn(
      `${warning.file}:${warning.line}:${warning.column} - ${warning.message} [${warning.code}]`,
    );
  });
}
```

#### Advanced API Usage

```typescript
// With all options
const result = await checkFiles(['src/**/*.ts'], {
  project: './tsconfig.build.json',
  skipLibCheck: true,
  verbose: true,
  cache: false,
  cwd: './packages/core',
  throwOnError: false,
});

// Error handling with throwOnError
try {
  await checkFiles(['src/index.ts'], {
    throwOnError: true,
  });
  console.log('✓ No type errors');
} catch (error) {
  console.error('Type checking failed:', error.message);
}
```

## 📋 Package.json Scripts Integration

Add type checking scripts to your `package.json` for different scenarios:

```json
{
  "scripts": {
    "type-check": "tsc-files 'src/**/*.ts'",
    "type-check:verbose": "tsc-files --verbose 'src/**/*.ts'",
    "type-check:ci": "tsc-files --json --skip-lib-check 'src/**/*.ts'",
    "type-check:build": "TSC_PROJECT=tsconfig.build.json tsc-files 'src/**/*.ts'",
    "type-check:staged": "tsc-files $(git diff --cached --name-only --diff-filter=ACM | grep -E '\\.(ts|tsx)$')"
  }
}
```

## 🚦 Exit Codes

`tsc-files` uses standard exit codes to indicate different types of results:

- **`0`** - Success (no type errors)
- **`1`** - Type errors found
- **`2`** - Configuration errors (tsconfig.json issues)
- **`3`** - System errors (TypeScript not found)

Perfect for CI/CD pipelines and scripts:

```bash
#!/bin/bash
tsc-files "src/**/*.ts"
exit_code=$?

case $exit_code in
  0) echo "✅ Type checking passed" ;;
  1) echo "❌ Type errors found" ;;
  2) echo "⚠️ Configuration error" ;;
  3) echo "💥 System error" ;;
esac

exit $exit_code
```

## 🎯 Best Practices

### Performance Tips

```bash
# Use --skip-lib-check for faster execution in CI
tsc-files --skip-lib-check "src/**/*.ts"

# Enable caching for repeated runs (default)
tsc-files --cache "src/**/*.ts"

# Use JSON output for programmatic processing
tsc-files --json "src/**/*.ts" | jq '.errorCount'
```

### Monorepo Usage

```bash
# Check specific package
tsc-files --project packages/core/tsconfig.json "packages/core/src/**/*.ts"

# Check multiple packages
tsc-files "packages/*/src/**/*.ts"

# Use environment variable for consistency
TSC_PROJECT=tsconfig.build.json tsc-files "packages/*/src/**/*.ts"
```

### CI/CD Integration

```yaml
# GitHub Actions
- name: Type Check
  run: tsc-files --json --skip-lib-check "src/**/*.ts"

# With custom tsconfig
- name: Type Check Build
  env:
    TSC_PROJECT: tsconfig.build.json
  run: tsc-files "src/**/*.ts"
```

## ⚙️ CLI Options

| Option           | Short | Description                             | Default       |
| ---------------- | ----- | --------------------------------------- | ------------- |
| `--help`         | `-h`  | Show help information                   |               |
| `--version`      | `-v`  | Show version number                     |               |
| `--project`      | `-p`  | Path to tsconfig.json                   | Auto-detected |
| `--noEmit`       |       | Don't emit files                        | `true`        |
| `--skipLibCheck` |       | Skip type checking of declaration files |               |
| `--verbose`      |       | Enable verbose output                   |               |
| `--cache`        |       | Use cache directory for temp files      | `true`        |
| `--no-cache`     |       | Disable caching                         |               |
| `--json`         |       | Output results as JSON                  |               |
| `--include`      |       | Additional files to include             |               |

## 🔄 Package Manager Support

`tsc-files` automatically detects and works with:

- **npm** (via `package-lock.json`)
- **yarn** (via `yarn.lock`)
- **pnpm** (via `pnpm-lock.yaml`)
- **bun** (via `bun.lockb`)

No configuration needed - it just works!

> **⚡ Performance Tip:** For 10x faster type checking, see the [tsgo compiler guide](./docs/usage/tsgo-compiler.md) (experimental).

## 🏗️ Development Status

- **Infrastructure**: ✅ Complete (enterprise-grade CI/CD, testing, security, release automation)
- **Security**: ✅ Complete (signed commits, npm provenance, automated vulnerability scanning)
- **Release Pipeline**: ✅ Complete (automated versioning, publishing, GitHub releases)
- **Research & Analysis**: ✅ Complete (original tsc-files community solutions analyzed and implemented)
- **Core Implementation**: ✅ Complete (1,400+ lines: CLI, type checker, package detection, cross-platform support)
- **All Critical Features**: ✅ Complete (monorepo, package managers, JavaScript support, error handling)
- **Testing & Quality**: ✅ Complete (280 tests passing, 84%+ coverage, comprehensive test suite)
- **Status**: 🚀 **Production Ready** - Feature complete TypeScript CLI tool

## 📚 Documentation

- [API Reference](./docs/api.md) - Complete CLI and programmatic API documentation
- [Usage Examples](./docs/usage-examples.md) - Real-world usage scenarios and patterns
- [tsgo Compiler Guide](./docs/usage/tsgo-compiler.md) - 10x faster type checking (experimental)
- [Troubleshooting Guide](./docs/troubleshooting-guide.md) - Common issues and solutions
- [Architecture](./docs/architecture/README.md) - How tsc-files works internally
- [Contributing](./docs/CONTRIBUTING.md) - Development setup and contribution guidelines

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](./docs/contributing.md) for details.

### Development Setup

```bash
# Clone the repository
git clone https://github.com/jbabin91/tsc-files.git
cd tsc-files

# Install dependencies
pnpm install

# Run tests
pnpm test

# Build the project
pnpm build

# Run linting
pnpm lint
```

## 📄 License

MIT © [Jace Babin](https://github.com/jbabin91)

## 🔗 Related Projects

- [TypeScript](https://www.typescriptlang.org/) - The TypeScript language
- [lint-staged](https://github.com/okonet/lint-staged) - Run linters on git staged files
- [husky](https://github.com/typicode/husky) - Git hooks made easy
- [lefthook](https://github.com/evilmartians/lefthook) - Fast and powerful Git hooks manager
