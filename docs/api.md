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
```

## Glob Patterns

- `"src/**/*.ts"` - All .ts files in src/ and subdirectories
- `"**/*.{ts,tsx}"` - All TypeScript files (including JSX)
- `"!**/*.test.ts"` - Exclude test files
- `"packages/*/src/**/*.ts"` - Monorepo pattern for multiple packages

## Performance Tips

- Use `--skip-lib-check` for faster execution in CI environments
- Enable `--cache` (default) for repeated runs
- Use `--json` output for programmatic processing
- Set `TSC_PROJECT` environment variable to avoid repetitive `--project` flags
