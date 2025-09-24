# API Reference

## CLI Usage

### Basic Usage

```bash
# Check specific files
tsc-files src/index.ts src/utils.ts

# Check files with glob patterns
tsc-files "src/**/*.ts"

# Use with git hooks (lint-staged)
npx lint-staged
```

### Command Line Options

```bash
tsc-files [options] <files...>
```

**Arguments:**

- `<files...>` - TypeScript files to check (supports glob patterns)

**Options:**

- `--help, -h` - Show help information
- `--version, -v` - Show version number
- `--project <path>` - Path to tsconfig.json (default: auto-detected)
- `--noEmit` - Only check types, don't emit files (default: true)
- `--skipLibCheck` - Skip type checking of declaration files

### Exit Codes

- `0` - Success (no type errors)
- `1` - Type errors found
- `2` - Invalid arguments or configuration
- `3` - TypeScript not found
- `4` - Internal error

## Programmatic API

### Basic Usage

```typescript
import { checkFiles } from '@jbabin91/tsc-files';

const result = await checkFiles({
  files: ['src/index.ts', 'src/utils.ts'],
  project: './tsconfig.json',
});

if (result.success) {
  console.log('Type checking passed!');
} else {
  console.error('Type errors found:', result.errors);
}
```

### API Types

```typescript
interface CheckFilesOptions {
  files: string[];
  project?: string;
  noEmit?: boolean;
  skipLibCheck?: boolean;
}

interface CheckResult {
  success: boolean;
  errors: string[];
  exitCode: number;
}
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

### husky

```bash
#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

npx lint-staged
```

### GitHub Actions

```yaml
- name: Type Check
  run: tsc-files "src/**/*.ts"
```
