# Coding Standards

This document defines the coding standards and best practices for tsc-files development.

## TypeScript Guidelines

### Type Safety

**`any` Types Policy:**

Our ESLint config disables the `no-explicit-any` rule, but prefer proper typing when possible:

```typescript
// ⚠️ ALLOWED: any when truly needed
function processData(data: any) {
  return data.value;
}

// ✅ PREFERRED: Proper typing when structure is known
function processData(data: { value: string }): string {
  return data.value;
}

// ✅ PREFERRED: Use unknown for truly unknown types
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

### Types vs Interfaces

**Always use `type` over `interface`** (enforced by ESLint):

```typescript
// ✅ CORRECT: Use type
type CheckOptions = {
  project?: string;
  verbose?: boolean;
};

type PackageManager = 'npm' | 'yarn' | 'pnpm' | 'bun';

// ❌ WRONG: Don't use interface
interface CheckOptions {
  project?: string;
  verbose?: boolean;
}
```

### Type Inference vs Explicit Types

**Prefer type inference, then `satisfies`, then explicit types:**

```typescript
// ✅ BEST: Type inference
const config = {
  timeout: 5000,
  retries: 3,
};

// ✅ GOOD: satisfies for type safety without widening
const config = {
  timeout: 5000,
  retries: 3,
} satisfies Config;

// ⚠️ ACCEPTABLE: Explicit type when inference isn't clear
const config: Config = {
  timeout: 5000,
  retries: 3,
};
```

### Functions vs Arrow Functions

**Prefer named functions over arrow functions:**

```typescript
// ✅ PREFERRED: Named function
function resolveFiles(patterns: string[]): string[] {
  return patterns.map((pattern) => resolve(pattern));
}

// ⚠️ ACCEPTABLE: Arrow function for simple callbacks
const filePaths = patterns.map((pattern) => resolve(pattern));

// ⚠️ ACCEPTABLE: Arrow function when needed for this binding
class FileResolver {
  resolve = (pattern: string) => {
    // Arrow function preserves `this` binding
    return this.doResolve(pattern);
  };
}
```

### Naming Conventions (Enforced by ESLint)

```typescript
// Files: kebab-case (enforced by eslint unicorn/filename-case)
// file-resolver.ts
// package-manager.ts
// tsconfig-parser.ts

// Classes/Types: PascalCase
class FileResolver {}
type PackageManager = 'npm' | 'yarn' | 'pnpm' | 'bun';
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

## Automated Code Quality

### Follow ESLint & Prettier Configs

We use automated tooling to enforce standards. **Run these before committing:**

```bash
# Format code (Prettier)
pnpm format

# Lint code (ESLint with auto-fix)
pnpm lint:fix

# Lint markdown
pnpm lint:md:fix

# Type check
pnpm typecheck
```

**Key ESLint Rules We Follow:**

- **Import sorting** (`simple-import-sort`) - Automatically organized imports
- **Type consistency** (`@typescript-eslint/consistent-type-imports`) - Inline type imports
- **No unused vars** - Prefix unused with `_` (e.g., `_unusedParam`)
- **Types over interfaces** (`@typescript-eslint/consistent-type-definitions`)
- **Kebab-case filenames** (`unicorn/filename-case`)
- **No console.log in production** (`no-console: warn`)

**Key Prettier Rules We Follow:**

- **Single quotes** (`singleQuote: true`)
- **No semicolons** (default)
- **2-space indentation** (default)

### Quality Check Workflow

**Before every commit:**

1. Write your code following the guidelines above
2. Run `pnpm format` (fixes formatting automatically)
3. Run `pnpm lint:fix` (fixes auto-fixable linting issues)
4. Run `pnpm lint:md:fix` (fixes markdown issues)
5. Run `pnpm typecheck` (validates TypeScript)
6. Run `pnpm test` (ensures tests pass)

**Pro tip:** Let the tools fix issues automatically. Don't manually format code!

```bash
# Quick validation (runs all checks)
pnpm lint && pnpm typecheck && pnpm test && pnpm build
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
