# Getting Started

## Installation

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

## Basic Usage

### Command Line

Check specific TypeScript files:

```bash
tsc-files src/index.ts src/utils.ts
```

Check files with glob patterns:

```bash
tsc-files "src/**/*.ts"
```

### Git Hooks Integration

The most common use case is with git hooks to check only staged files:

#### With lint-staged

```json
{
  "lint-staged": {
    "*.{ts,tsx}": "tsc-files"
  }
}
```

#### With husky

1. Install husky:

```bash
npm install --save-dev husky
npx husky install
```

2. Add pre-commit hook:

```bash
npx husky add .husky/pre-commit "npx lint-staged"
```

#### With lefthook

1. Install lefthook:

```bash
npm install --save-dev lefthook
npx lefthook install
```

2. Create `lefthook.yml`:

```yaml
# lefthook.yml
pre-commit:
  commands:
    type-check:
      glob: '*.{ts,tsx}'
      run: tsc-files {staged_files}
```

## Why tsc-files?

### The Problem

The TypeScript compiler (`tsc`) is designed to check entire projects, not individual files:

```bash
# This doesn't work as expected
tsc src/index.ts src/utils.ts
```

This ignores your `tsconfig.json` and uses default compiler options, missing important type checking rules.

### The Solution

tsc-files creates a temporary configuration that:

- ✅ Extends your existing `tsconfig.json`
- ✅ Includes only the specified files
- ✅ Maintains all your compiler options
- ✅ Provides accurate type checking

```bash
# This works correctly
tsc-files src/index.ts src/utils.ts
```

## Package Manager Support

tsc-files automatically detects and works with:

- **npm** (via `package-lock.json`)
- **yarn** (via `yarn.lock`)
- **pnpm** (via `pnpm-lock.yaml`)
- **bun** (via `bun.lockb`)

No configuration needed - it just works!

## Next Steps

- [API Reference](./api.md) - Complete CLI and programmatic API documentation
- [Architecture](./architecture.md) - How tsc-files works internally
- [Migration Guide](./migration.md) - Migrating from the original tsc-files
