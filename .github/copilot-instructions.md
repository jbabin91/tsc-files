# tsc-files Copilot Instructions

## Project Overview

`@jbabin91/tsc-files` is a modern TypeScript CLI tool that enables running TypeScript compiler checks on specific files while respecting existing tsconfig.json configuration. Designed for git hooks, lint-staged, and CI/CD workflows where you need to type-check only the files that have changed.

**Mission**: Establish tsc-files as THE definitive TypeScript file checker for git hooks with unmatched performance, reliability, and user experience.

## Architecture

The project follows a layered architecture:

- **CLI Layer** (`src/cli/`) - Command parsing, argument validation, terminal output
- **Core** (`src/core/`) - Type checking orchestration and file resolution
- **Detectors** (`src/detectors/`) - Package manager and TypeScript compiler detection
- **Config** (`src/config/`) - tsconfig.json resolution, parsing, and temp config generation
- **Execution** (`src/execution/`) - TypeScript compiler execution and output parsing

## Quality Standards

**Zero-Tolerance Policy**: All quality gates MUST pass before commits.

- Build must succeed with zero errors or warnings
- All tests must pass with required coverage thresholds
- ESLint zero warnings policy (no `--max-warnings` exceptions)
- TypeScript must compile without errors
- Markdown linting must pass

Coverage requirements:

- Global: 84%+ statements, 80%+ branches
- Core modules: 85%+ statements, 80%+ branches
- Utils: 95%+ statements, 85%+ branches

## TypeScript Guidelines

### Type Safety

Use strict TypeScript with no `any` types in production code.

**Type inference hierarchy** (prefer earlier over later):

1. Type inference (let TypeScript infer)
2. `satisfies` operator (type checking without widening)
3. Type annotation (`: Type`)
4. Type assertion (`as Type` - only when necessary)

```typescript
// ✅ GOOD: Type inference
const result = await checkFiles(['src/index.ts']);

// ✅ GOOD: satisfies for validation
const config = { strict: true } satisfies CompilerOptions;

// ⚠️ AVOID: Explicit annotation when inference works
const result: CheckResult = await checkFiles(['src/index.ts']);

// ❌ BAD: Type assertion
const result = (await checkFiles(['src/index.ts'])) as CheckResult;

// ❌ NEVER: any types in production
function process(data: any) {} // Production code only
```

### Imports

**ALWAYS use TypeScript path aliases** instead of relative imports.

```typescript
// ✅ CORRECT: Use path aliases
import { checkFiles } from '@/core/checker';
import type { CheckOptions } from '@/types';
import { findTypeScriptCompiler } from '@/detectors/typescript';

// ❌ INCORRECT: Relative imports
import { checkFiles } from '../core/checker';
import type { CheckOptions } from '../types';
```

**Use type-only imports** for types to enable proper tree-shaking:

```typescript
// ✅ CORRECT: Type-only import
import type { CheckOptions, CheckResult } from '@/types';

// ❌ INCORRECT: Regular import for types
import { CheckOptions, CheckResult } from '@/types';
```

### Code Comments

**Only write valuable comments that explain WHY, not WHAT.**

- NO file header boilerplate comments
- Explain reasoning, edge cases, business context
- Use JSDoc for public APIs with clear descriptions
- Remove redundant comments that restate code

```typescript
// ❌ BAD: Restates what code does
// Set the result to the return value of checkFiles
const result = await checkFiles(files);

// ❌ BAD: File header boilerplate
/**
 * File: checker.ts
 * Author: ...
 * Date: ...
 */

// ✅ GOOD: Explains WHY
// Defer validation to avoid double-parsing (parse once for validation, once for use)
return path.resolve(cwd, projectPath);

// ✅ GOOD: Documents edge case
// Windows requires shell mode for .cmd files, but this enables command injection
// Use array args to prevent injection, verify .cmd extension explicitly
```

## File Organization

- Keep files small and focused (<300 lines preferred)
- Organize by logical boundaries, not technical layers
- Single responsibility per module
- Group related functionality in directories
- Use descriptive file names that indicate purpose

## Error Handling

Use standard exit codes for CLI operations:

- `0` - Success (no type errors)
- `1` - Type errors found (user errors)
- `2` - Configuration errors (tsconfig.json issues)
- `3` - System errors (TypeScript not found)
- `99` - Internal/unknown errors

Provide clear, actionable error messages with context about what failed and how to fix it.

## Testing

**Framework**: Vitest with Node.js environment

**Requirements**:

- Write tests for all new functionality
- Maintain coverage thresholds (see vitest.config.ts)
- Use type-safe mocks without `any` types
- Integration tests for cross-platform behavior

**Test structure**:

- Unit tests: `tests/unit/**/*.test.ts`
- Integration tests: `tests/integration/**/*.test.ts`
- Test fixtures: `tests/fixtures/`

## Security

**Critical**: All temp file handling and command execution MUST follow security protocols.

**Temp files**:

- Use cryptographically random names
- Set restrictive permissions (0600)
- Clean up on all exit paths (success, error, signal)

**Command execution**:

- Use `execa` with array arguments (prevents shell injection)
- NEVER use shell mode unless absolutely required
- Validate all file paths and user inputs
- Quote paths with spaces properly

```typescript
// ✅ CORRECT: Array arguments prevent injection
await execa('tsc', ['--project', projectPath], { cwd });

// ❌ INCORRECT: String command enables injection
await execa(`tsc --project ${projectPath}`, { shell: true, cwd });
```

## Commit Conventions

Follow conventional commits with gitmoji:

```text
<type>(<scope>): <gitmoji> <description>

[optional body]

[optional footer]
```

**Types**: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `chore`, `ci`, `revert`

**Scopes**: `cli`, `core`, `types`, `config`, `build`, `test`, `docs`, `deps`

**Examples**:

```bash
feat(cli): :sparkles: add --verbose flag for detailed output
fix(core): :bug: handle missing tsconfig.json gracefully
chore(deps): :hammer: bump typescript to v5.2.0
docs: :memo: update README with installation instructions
```

**Gitmoji mapping**:

- feat: ✨ `:sparkles:`
- fix: 🐛 `:bug:`
- docs: 📝 `:memo:`
- style: 💄 `:lipstick:`
- refactor: ♻️ `:recycle:`
- perf: ⚡️ `:zap:`
- test: ✅ `:white_check_mark:`
- chore: 🔨 `:hammer:`
- ci: 👷 `:construction_worker:`
