# Coding Standards

This document defines the coding standards and best practices for tsc-files development.

## TypeScript Guidelines

### Type Safety

**Zero Tolerance for `any` Types:**

```typescript
// ❌ WRONG: Using any
function processData(data: any) {
  return data.value;
}

// ✅ CORRECT: Proper typing
function processData(data: { value: string }): string {
  return data.value;
}

// ✅ CORRECT: Use unknown for truly unknown types
function processData(data: unknown): string {
  if (typeof data === 'object' && data !== null && 'value' in data) {
    return String(data.value);
  }
  throw new Error('Invalid data structure');
}
```

**Strict TypeScript Configuration:**

- Enable all strict mode flags
- Use strict null checks
- Enable noImplicitAny
- Enable strictFunctionTypes

### Naming Conventions

```typescript
// Files: kebab-case
// file-resolver.ts
// package-manager.ts
// tsconfig-parser.ts

// Classes/Interfaces: PascalCase
class FileResolver {}
interface PackageManager {}
type CompilerOptions = {};

// Functions/Variables: camelCase
function resolveFiles() {}
const packageManager = {};
let currentProject = '';

// Constants: SCREAMING_SNAKE_CASE
const MAX_FILES = 1000;
const DEFAULT_TIMEOUT = 5000;
const SUPPORTED_EXTENSIONS = ['.ts', '.tsx'];

// Private class members: prefix with underscore (optional)
class Parser {
  private _cache: Map<string, string> = new Map();
}
```

### Import Organization

**Use Path Aliases (Required):**

```typescript
// ✅ CORRECT: Path aliases (no .js extension needed)
import { checkFiles } from '@/core/checker';
import { findTypeScriptCompiler } from '@/detectors/typescript';
import type { CheckOptions } from '@/types';

// ❌ WRONG: Relative imports
import { checkFiles } from '../core/checker';
import { findTypeScriptCompiler } from '../../detectors/typescript';
```

**Import Grouping:**

```typescript
// 1. External dependencies
import { Command } from 'commander';
import kleur from 'kleur';

// 2. Internal imports (using path aliases)
import { checkFiles } from '@/core/checker';
import { findPackageManager } from '@/detectors/package-manager';

// 3. Type imports
import type { CheckOptions, CheckResult } from '@/types';
```

**No File Extensions with Path Aliases:**

```typescript
// ✅ CORRECT
import { checkFiles } from '@/core/checker';

// ❌ WRONG
import { checkFiles } from '@/core/checker.js';
```

### File Organization

**Keep Files Small and Focused:**

- Target: < 300 lines per file
- Single responsibility principle
- Split large files by logical boundaries

**Organization by Feature/Layer:**

```text
src/
├── cli/              # CLI layer
│   ├── command.ts    # Commander integration
│   ├── output.ts     # Formatted output
│   └── errors.ts     # Error handling
├── core/             # Core functionality
│   └── checker.ts    # Main type checking
├── detectors/        # Detection layer
│   ├── package-manager.ts
│   └── typescript.ts
└── types/            # Type definitions
    └── index.ts
```

## Code Style

### Comments Policy

**Only Valuable Comments:**

```typescript
// ❌ WRONG: Redundant comments
// Get the file path
const filePath = getFilePath();

// ✅ CORRECT: Explain WHY, not WHAT
// Use absolute paths to avoid issues with monorepo workspace resolution
const filePath = path.resolve(process.cwd(), relativePath);

// ✅ CORRECT: Explain non-obvious behavior
// TypeScript compiler requires forward slashes even on Windows
const normalizedPath = filePath.replace(/\\/g, '/');

// ✅ CORRECT: Document workarounds
// HACK: tsgo doesn't support baseUrl with paths in non-bundler moduleResolution
// Fallback to tsc when this configuration is detected
if (hasBaseUrlWithPaths && !isBundlerResolution) {
  return { compatible: false, reasons: ['baseUrl-with-paths'] };
}
```

**NO File Header Boilerplate:**

```typescript
// ❌ WRONG: Unnecessary file headers
/**
 * File: checker.ts
 * Author: John Doe
 * Date: 2024-01-01
 * Description: Main type checking logic
 */

// ✅ CORRECT: Just start with the code or JSDoc if needed
```

**JSDoc for Public APIs:**

````typescript
/**
 * Check TypeScript files for type errors while respecting tsconfig.json.
 *
 * @param files - Array of file paths or glob patterns to check
 * @param options - Configuration options for type checking
 * @returns Promise resolving to check results with errors and metadata
 *
 * @example
 * ```typescript
 * const result = await checkFiles(['src/index.ts'], {
 *   project: './tsconfig.json',
 *   verbose: true
 * });
 * ```
 */
export async function checkFiles(
  files: string[],
  options?: CheckOptions,
): Promise<CheckResult> {
  // Implementation
}
````

### Error Handling

**Use Specific Error Types:**

```typescript
// ❌ WRONG: Generic errors
throw new Error('Failed');

// ✅ CORRECT: Specific error types with context
export class ConfigurationError extends Error {
  constructor(
    message: string,
    public readonly configPath: string,
  ) {
    super(message);
    this.name = 'ConfigurationError';
  }
}

throw new ConfigurationError(
  'Failed to parse tsconfig.json: Unexpected token',
  tsconfigPath,
);
```

**Provide Actionable Error Messages:**

```typescript
// ❌ WRONG: Vague error
throw new Error('Configuration error');

// ✅ CORRECT: Actionable error with context
throw new ConfigurationError(
  `Failed to resolve extends path: "${extendsPath}" not found. ` +
    `Check that the path is correct and the file exists.`,
  tsconfigPath,
);
```

**Exit Codes:**

- `0` - Success (no type errors)
- `1` - Type errors found
- `2` - Configuration errors
- `3` - System errors (TypeScript not found, etc.)

### Security Best Practices

**Temp Files:**

```typescript
// ✅ Use cryptographically random names
import { randomBytes } from 'node:crypto';

const tempFile = path.join(
  tmpdir(),
  `tsconfig-${randomBytes(8).toString('hex')}.json`,
);
```

**Command Execution:**

```typescript
// ❌ WRONG: Shell injection risk
import { exec } from 'node:child_process';
exec(`tsc ${userInput}`); // Dangerous!

// ✅ CORRECT: Use execa with array arguments
import { execa } from 'execa';
await execa('tsc', [userInput], { shell: false });
```

**Input Validation:**

```typescript
// ✅ Validate all user inputs
import { z } from 'zod';

const optionsSchema = z.object({
  project: z.string().optional(),
  verbose: z.boolean().optional(),
  skipLibCheck: z.boolean().optional(),
});

const validatedOptions = optionsSchema.parse(options);
```

**Resource Cleanup:**

```typescript
// ✅ Always clean up resources
try {
  await fs.writeFile(tempConfig, JSON.stringify(config));
  await runTypeScript(tempConfig);
} finally {
  await fs.unlink(tempConfig).catch(() => {
    /* ignore if already deleted */
  });
}
```

## Testing Standards

### Coverage Requirements

- **Core functions**: > 90% coverage
- **CLI layer**: > 80% coverage
- **Integration tests**: Critical paths covered
- **Zero tolerance**: Test failures block PRs

### Test Organization

**Use Fixtures for Setup:**

```typescript
import { test } from '../setup';

test('should detect package manager', async ({ tempDir }) => {
  // tempDir fixture automatically created and cleaned up
  await writeTestFile(tempDir, 'package-lock.json', '{}');
  const result = await detectPackageManager(tempDir);
  expect(result.manager).toBe('npm');
});
```

**Prefer Real Implementation Testing:**

```typescript
// ✅ Test against real implementations when possible
test('should compile TypeScript files', async ({ tempDir }) => {
  const { srcDir } = createTestProject(tempDir);
  writeTestFile(srcDir, 'test.ts', 'export const x: number = 42;');

  // Run real TypeScript compiler
  const result = await runCli(['src/test.ts'], tempDir);
  expect(result).toHaveSuccessfulExit();
});
```

**Clear Test Names:**

```typescript
// ✅ CORRECT: Descriptive test names
test('should detect npm when package-lock.json exists', async () => {
  // ...
});

test('should fallback to tsc when tsgo is incompatible', async () => {
  // ...
});

// ❌ WRONG: Vague test names
test('package manager test', async () => {
  // ...
});
```

**Use Custom Matchers:**

```typescript
// ✅ Domain-specific assertions
expect(result).toHaveSuccessfulExit();
expect(result).toHaveTypeError();
expect(result).toContainInStdout('Type check passed');
```

## Code Review Checklist

Before submitting a PR, ensure:

- [ ] All TypeScript types are explicit (no `any`)
- [ ] Path aliases used (no relative imports)
- [ ] No file extensions with TypeScript imports
- [ ] Comments explain WHY, not WHAT
- [ ] Error messages are actionable
- [ ] Security best practices followed
- [ ] Tests achieve required coverage
- [ ] All quality checks pass: `pnpm lint && pnpm typecheck && pnpm test`

## Resources

- [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/intro.html)
- [Node.js Best Practices](https://github.com/goldbergyoni/nodebestpractices)
- [Testing Guide](../testing/README.md)
- [Pull Request Workflow](./pull-requests.md)
