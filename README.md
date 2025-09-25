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

- ✅ **Respects tsconfig.json** - Uses your existing TypeScript configuration
- ✅ **File-specific checking** - Only checks the files you specify
- ✅ **Git hook friendly** - Perfect for pre-commit hooks and lint-staged
- ✅ **Package manager detection** - Works with npm, yarn, pnpm, and bun
- ✅ **Fast & lightweight** - Minimal dependencies, maximum performance
- ✅ **CI/CD optimized** - Designed for continuous integration workflows
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

```bash
# Check specific files
tsc-files src/index.ts src/utils.ts

# Check with glob patterns
tsc-files "src/**/*.ts"

# Use specific tsconfig
tsc-files --project tsconfig.build.json src/*.ts

# Verbose output
tsc-files --verbose src/*.ts

# JSON output for CI/CD
tsc-files --json src/*.ts
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

const result = await checkFiles(['src/index.ts'], {
  project: './tsconfig.json',
  noEmit: true,
  verbose: true,
});

if (result.success) {
  console.log(`✓ Type check passed (${result.duration}ms)`);
} else {
  console.error(`✗ Found ${result.errorCount} errors`);
  result.errors.forEach((error) => {
    console.error(
      `${error.file}:${error.line}:${error.column} - ${error.message}`,
    );
  });
}
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

## 🔄 Package Manager Support

`tsc-files` automatically detects and works with:

- **npm** (via `package-lock.json`)
- **yarn** (via `yarn.lock`)
- **pnpm** (via `pnpm-lock.yaml`)
- **bun** (via `bun.lockb`)

No configuration needed - it just works!

## 🏗️ Development Status

- **Infrastructure**: ✅ Complete (enterprise-grade CI/CD, testing, security, release automation)
- **Security**: ✅ Complete (signed commits, npm provenance, automated vulnerability scanning)
- **Release Pipeline**: ✅ Complete (automated versioning, publishing, GitHub releases)
- **Research & Analysis**: ✅ Complete (original tsc-files community solutions analyzed)
- **Phase 1 & 1.5**: ✅ Complete (modern tooling foundation with execa, fast-glob, path aliases)
- **Phase 2 Dependencies**: ✅ Ready (commander, kleur, ora, cosmiconfig, tsconfig-paths, fs-extra, deepmerge, zod)
- **Implementation**: 🎯 Phase 2 ready to start (critical issues resolution based on community pain points)
- **Quality Gates**: ✅ Enforced (zero-tolerance policy for all quality metrics)

## 📚 Documentation

- [Getting Started](./docs/getting-started.md) - Installation and basic usage
- [API Reference](./docs/api.md) - Complete CLI and programmatic API documentation
- [Architecture](./docs/architecture.md) - How tsc-files works internally
- [Contributing](./docs/contributing.md) - Development setup and contribution guidelines

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
