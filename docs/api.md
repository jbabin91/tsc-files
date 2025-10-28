# API Reference

## CLI Usage

### Basic Usage

```bash
# Check specific files
tsc-files src/index.ts src/utils.ts

# Use glob patterns (quote to prevent shell expansion)
tsc-files "src/**/*.ts" "tests/**/*.ts"

# Both single and double quotes work
tsc-files 'src/**/*.ts' 'tests/**/*.ts'

# With custom tsconfig
tsc-files --project tsconfig.build.json "src/**/*.ts"

# Using environment variable
TSC_PROJECT=tsconfig.build.json tsc-files "src/**/*.ts"

# Git hook usage (lint-staged)
tsc-files $(git diff --cached --name-only --diff-filter=ACM | grep -E '\.(ts|tsx)$')
```

### Command Line Options

```bash
tsc-files [options] <files...>
```

**Arguments:**

- `<files...>` - TypeScript files to check (supports glob patterns like "src/\*_/_.ts")

**Options:**

- `-h, --help` - Show help information
- `-v, --version` - Show version number
- `-p, --project <path>` - Path to tsconfig.json (default: auto-detected from current directory)
  - **Environment Variable**: Set `TSC_PROJECT` environment variable as alternative
  - **Validation**: Must be a valid JSON file path
- `--verbose` - Enable detailed output including file processing steps
- `--json` - Output results as JSON for CI/CD integration
- `--no-cache` - Disable temporary file caching for debugging
- `--skip-lib-check` - Skip type checking of declaration files for faster execution
- `--use-tsc` - Force use of tsc compiler even if tsgo is available
- `--use-tsgo` - Force use of tsgo compiler (fail if not available)
- `--show-compiler` - Display which TypeScript compiler is being used
- `--benchmark` - Run performance comparison between available compilers
- `--no-fallback` - Disable automatic fallback from tsgo to tsc on failure
- `--tips` - Show performance optimization tips for git hooks and TypeScript compilation

### Compiler Selection

**tsgo (TypeScript Native Compiler)**

tsc-files automatically detects and can use `tsgo`, Microsoft's experimental native TypeScript compiler that offers up to 10x faster compilation:

```bash
# Auto-detect and use tsgo if available
tsc-files "src/**/*.ts"

# Force use tsgo (fail if not available)
tsc-files --use-tsgo "src/**/*.ts"

# Show which compiler is being used
tsc-files --show-compiler "src/**/*.ts"

# Compare performance between tsc and tsgo
tsc-files --benchmark "src/**/*.ts"

# Disable automatic fallback to tsc if tsgo fails
tsc-files --use-tsgo --no-fallback "src/**/*.ts"
```

**Installation for tsgo:**

```bash
npm install -D @typescript/native-preview
```

**Benefits:**

- Up to 10x faster compilation than tsc
- Identical type checking results
- Automatic fallback to tsc if needed
- Perfect for git hooks and CI/CD

### Enhanced Features

- **Colored Output**: Error messages and help text use colors for better readability
- **Input Validation**: Project path is validated to ensure it points to a JSON file
- **Environment Variables**: Use `TSC_PROJECT` to set the project path
- **Verbose Debugging**: Detailed logging of file processing and execution steps
- **Enhanced Help**: Comprehensive examples and usage patterns

### Exit Codes

- `0` - Success (no type errors)
- `1` - Type errors found
- `2` - Configuration errors (tsconfig.json issues)
- `3` - System errors (TypeScript not found)

## Programmatic API

### Basic Usage

```typescript
import { checkFiles } from '@jbabin91/tsc-files';
import type { CheckOptions, CheckResult } from '@jbabin91/tsc-files';

const result = await checkFiles(['src/index.ts', 'src/utils.ts'], {
  project: './tsconfig.json',
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

### API Types

```typescript
/**
 * TypeScript checker configuration options
 */
export type CheckOptions = {
  /** Path to tsconfig.json file */
  project?: string;
  /** Don't emit files (default: true) */
  noEmit?: boolean;
  /** Skip type checking of declaration files */
  skipLibCheck?: boolean;
  /** Use cache directory for temp files */
  cache?: boolean;
  /** Custom cache directory path */
  cacheDir?: string;
  /** Enable verbose output */
  verbose?: boolean;
  /** Working directory */
  cwd?: string;
  /** Throw error instead of returning result */
  throwOnError?: boolean;
  /** Force use of tsc compiler */
  useTsc?: boolean;
  /** Force use of tsgo compiler */
  useTsgo?: boolean;
  /** Show which compiler is being used */
  showCompiler?: boolean;
  /** Run benchmark comparison between compilers */
  benchmark?: boolean;
  /** Disable automatic fallback from tsgo to tsc */
  fallback?: boolean;
};

/**
 * TypeScript error/warning information
 */
export type TypeScriptError = {
  /** File path where error occurred */
  file: string;
  /** Line number (1-based) */
  line: number;
  /** Column number (1-based) */
  column: number;
  /** Error message */
  message: string;
  /** TypeScript error code (e.g., "TS2322") */
  code: string;
  /** Error severity */
  severity: 'error' | 'warning';
};

/**
 * Result of type checking operation
 */
export type CheckResult = {
  /** Whether type checking passed */
  success: boolean;
  /** Number of errors found */
  errorCount: number;
  /** Number of warnings found */
  warningCount: number;
  /** List of errors */
  errors: TypeScriptError[];
  /** List of warnings */
  warnings: TypeScriptError[];
  /** Duration in milliseconds */
  duration: number;
  /** List of files that were checked */
  checkedFiles: string[];
};
```

### Advanced Usage Examples

```typescript
// With custom options
const result = await checkFiles(['src/**/*.ts'], {
  project: './tsconfig.build.json',
  skipLibCheck: true,
  verbose: true,
  cache: false,
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

// Working with specific directory
const result = await checkFiles(['**/*.ts'], {
  cwd: './packages/core',
  project: './packages/core/tsconfig.json',
});
```

## Integration Examples

### lint-staged

```json
{
  "lint-staged": {
    "*.{ts,tsx}": "tsc-files"
  }
}
```

**With verbose output for debugging:**

```json
{
  "lint-staged": {
    "*.{ts,tsx}": "tsc-files --verbose"
  }
}
```

### husky

```bash
#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

npx lint-staged
```

### Package.json Scripts

```json
{
  "scripts": {
    "type-check": "tsc-files 'src/**/*.ts'",
    "type-check:verbose": "tsc-files --verbose 'src/**/*.ts'",
    "type-check:ci": "tsc-files --json --skip-lib-check 'src/**/*.ts'",
    "type-check:build": "TSC_PROJECT=tsconfig.build.json tsc-files 'src/**/*.ts'"
  }
}
```

### GitHub Actions

```yaml
- name: Type Check
  run: tsc-files "src/**/*.ts"

- name: Type Check with JSON Output
  run: tsc-files --json --skip-lib-check "src/**/*.ts"

- name: Type Check Build Config
  env:
    TSC_PROJECT: tsconfig.build.json
  run: tsc-files "src/**/*.ts"
```

### Docker Integration

```dockerfile
# Install tsc-files
RUN npm install -g @jbabin91/tsc-files

# Type check in CI
RUN tsc-files --json "src/**/*.ts"
```

### Monorepo Usage

```bash
# Check specific package
tsc-files --project packages/core/tsconfig.json "packages/core/src/**/*.ts"

# Check multiple packages
tsc-files "packages/*/src/**/*.ts"

# Using environment variable for consistency
TSC_PROJECT=tsconfig.build.json tsc-files "packages/*/src/**/*.ts"

# Optimize performance with tsgo
tsc-files --use-tsgo "packages/*/src/**/*.ts"

# Benchmark different compilers across packages
tsc-files --benchmark "packages/*/src/**/*.ts"
```

## Glob Patterns

- `"src/**/*.ts"` - All .ts files in src/ and subdirectories
- `"**/*.{ts,tsx}"` - All TypeScript files (including JSX)
- `"!**/*.test.ts"` - Exclude test files
- `"packages/*/src/**/*.ts"` - Monorepo pattern for multiple packages

## Performance Tips

### tsgo Optimization

- **Install tsgo**: `npm install -D @typescript/native-preview` for up to 10x faster compilation
- **Auto-detection**: tsc-files automatically uses tsgo when available
- **Force tsgo**: Use `--use-tsgo` for guaranteed performance (fails if tsgo not available)
- **Benchmark**: Use `--benchmark` to compare tsc vs tsgo performance on your codebase
- **Git hooks**: tsgo is perfect for git hooks where speed matters most

### General Performance

- Use `--skip-lib-check` for faster execution in CI environments
- Caching is enabled by default; use `--no-cache` only when debugging temp configs
- Use `--json` output for programmatic processing
- Set `TSC_PROJECT` environment variable to avoid repetitive `--project` flags
- Use `--tips` flag to get personalized optimization suggestions

### Git Hook Optimization

```bash
# Get optimization tips
tsc-files --tips

# Fast git hook with tsgo
tsc-files --use-tsgo --skip-lib-check "src/**/*.ts"

# Show compiler information for debugging
tsc-files --show-compiler --verbose "src/**/*.ts"
```
