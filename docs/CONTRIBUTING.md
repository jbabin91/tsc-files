# Contributing to tsc-files

<!-- AUTO-GENERATED SECTIONS: Some sections maintained by Claude Code -->

Thank you for your interest in contributing to tsc-files! This guide provides a quick overview to help you get started. For detailed information, see the [contributing directory](./contributing/README.md).

## 🚀 Quick Start

1. **[Development Setup](./contributing/setup.md)** - Environment configuration and prerequisites
2. **[Coding Standards](./contributing/coding-standards.md)** - TypeScript guidelines and code style
3. **[Pull Request Workflow](./contributing/pull-requests.md)** - How to submit changes
4. **[Testing Guide](./testing/README.md)** - Writing and running tests

## 📚 Detailed Documentation

- **Contributing:**
  - [Setup Guide](./contributing/setup.md) - Prerequisites, installation, IDE setup
  - [Coding Standards](./contributing/coding-standards.md) - Type safety, naming, security
  - [Pull Requests](./contributing/pull-requests.md) - Creating PRs, code review
  - [Release Process](./contributing/release-process.md) - Versioning and publishing
- **Testing:**
  - [Testing Overview](./testing/README.md) - Quick start and documentation index
  - [Testing Strategy](./testing/strategy.md) - Comprehensive testing approach
  - [Best Practices](./testing/best-practices.md) - Patterns and guidelines
- **Architecture:**
  - [Architecture Overview](./architecture/README.md) - System design
  - [Architecture Details](./architecture/details.md) - In-depth implementation
  - [Security](./architecture/security.md) - Security requirements
  - [Performance](./architecture/performance.md) - Performance targets

## Table of Contents

- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)

## Getting Started

### **Prerequisites**

- **Node.js**: >=22.19.0
- **pnpm**: Latest version (we use pnpm as the package manager)
- **Git**: Latest version
- **TypeScript**: >=5.0.0 (will be installed as a peer dependency)

### **Initial Setup**

```bash
# Clone the repository
git clone https://github.com/jbabin91/tsc-files.git
cd tsc-files

# Install dependencies
pnpm install

# Verify setup
pnpm run typecheck
pnpm test
pnpm build
```

## Development Setup

### **🔥 Critical Quality Gates (MUST Pass)**

All of these commands MUST pass before any commit:

```bash
pnpm lint      # ⚠️ CRITICAL - Zero warnings/errors
pnpm typecheck # ⚠️ CRITICAL - Zero TypeScript errors
pnpm test      # ⚠️ CRITICAL - All tests passing
pnpm build     # ⚠️ CRITICAL - Clean build success
pnpm lint:md   # ⚠️ CRITICAL - Markdown compliance
```

### **🛠️ Development Commands**

```bash
# Active development
pnpm dev           # Start development with file watching
pnpm test:watch    # Run tests in watch mode

# Quality assurance helpers
pnpm lint:fix      # Auto-fix linting issues
pnpm format        # Format code with Prettier
pnpm format:check  # Check formatting without changes
pnpm test:coverage # Generate coverage reports

# Validation
pnpm check-exports # Validate package exports
```

### **IDE Setup**

#### **VS Code (Recommended)**

Install recommended extensions:

- TypeScript and JavaScript Language Features
- ESLint
- Prettier
- Vitest

Workspace settings are pre-configured in `.vscode/settings.json`.

#### **Other IDEs**

Ensure your IDE supports:

- TypeScript language server
- ESLint integration
- Prettier formatting
- EditorConfig

### **Git Hooks**

We use Lefthook for git hooks:

```bash
# Install git hooks
pnpm lefthook install

# Manually run pre-commit hooks
pnpm lefthook run pre-commit
```

Pre-commit hooks will:

- Run type checking
- Execute linting and formatting
- Run relevant tests
- Validate commit messages

## Project Structure

```sh
tsc-files/
├── src/                          # Source code
│   ├── cli.ts                    # CLI entry point
│   ├── index.ts                  # Library exports
│   ├── types.ts                  # Type definitions
│   └── core/                     # Core functionality
│       └── checker.ts            # Main orchestration logic
├── tests/                        # Test files
│   ├── unit/                     # Unit tests
│   ├── integration/              # Integration tests
│   └── fixtures/                 # Test fixtures
├── docs/                         # Documentation
├── .github/                      # GitHub workflows and templates
├── .changeset/                   # Changeset configuration
└── scripts/                      # Build and utility scripts
```

### **Planned Architecture**

The implementation will follow this modular structure:

```sh
src/
├── detectors/                    # Environment detection
│   ├── package-manager.ts
│   ├── typescript.ts
│   └── config.ts
├── generators/                   # Configuration generation
│   └── temp-config.ts
├── executors/                    # Command execution
│   └── tsc-runner.ts
├── parsers/                      # Output parsing
│   └── error-formatter.ts
└── utils/                        # Utilities
    ├── temp-files.ts
    └── cleanup.ts
```

## Development Workflow

### **Feature Development**

1. **Create a feature branch:**

   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Implement your changes:**
   - Follow the coding standards
   - Write comprehensive tests
   - Update documentation as needed

3. **Test your changes:**

   ```bash
   pnpm test
   pnpm run typecheck
   pnpm run lint
   ```

4. **Commit your changes:**

   ```bash
   # Use conventional commits
   git commit -m "feat: add package manager detection"
   ```

5. **Push and create a PR:**

   ```bash
   git push origin feature/your-feature-name
   ```

### **Bug Fixes**

1. **Create a bugfix branch:**

   ```bash
   git checkout -b fix/issue-description
   ```

2. **Write a failing test** that demonstrates the bug

3. **Implement the fix** and ensure tests pass

4. **Update documentation** if necessary

### **Hotfixes**

For critical production issues:

1. **Create hotfix branch from main:**

   ```bash
   git checkout -b hotfix/critical-issue
   ```

2. **Implement minimal fix**

3. **Fast-track through review process**

## Coding Standards

### **TypeScript Guidelines**

#### **Type Safety**

```typescript
// ✅ Good: Strict types
interface PackageManagerInfo {
  type: 'npm' | 'yarn' | 'pnpm' | 'bun';
  version: string;
  lockFile?: string;
}

// ❌ Avoid: Any types
function detectPackageManager(): any;
```

#### **Error Handling**

```typescript
// ✅ Good: Specific error types
class PackageManagerNotFoundError extends Error {
  constructor(searchPaths: string[]) {
    super(`Package manager not found in paths: ${searchPaths.join(', ')}`);
    this.name = 'PackageManagerNotFoundError';
  }
}

// ❌ Avoid: Generic errors
throw new Error('Something went wrong');
```

#### **Function Design**

```typescript
// ✅ Good: Pure functions with clear interfaces
async function detectPackageManager(
  projectRoot: string,
  options: DetectionOptions = {},
): Promise<PackageManagerInfo> {
  // Implementation
}

// ❌ Avoid: Side effects and unclear parameters
async function detect(path?: string): Promise<unknown>;
```

### **Security Guidelines**

#### **Input Validation**

```typescript
// ✅ Good: Validate and sanitize inputs
function validateFilePath(filePath: string): string {
  const resolved = path.resolve(filePath);
  const relative = path.relative(process.cwd(), resolved);

  if (relative.startsWith('..')) {
    throw new Error('Path traversal not allowed');
  }

  return resolved;
}
```

#### **Command Execution**

```typescript
// ✅ Good: Use execFile with array arguments
import { execFile } from 'child_process';

execFile('tsc', ['--noEmit', '--project', configPath]);

// ❌ Avoid: Shell execution with string concatenation
exec(`tsc --project ${userInput}`);
```

#### **Temporary Files**

```typescript
// ✅ Good: Secure temporary file creation
import { randomBytes } from 'crypto';

const tempFileName = `tsc-files-${randomBytes(16).toString('hex')}.json`;
await chmod(tempFilePath, 0o600); // Restrictive permissions
```

### **Code Organization**

#### **File Structure**

- One main export per file
- Group related functionality
- Use index files for clean imports
- Keep files small and focused (< 200 lines)

#### **Naming Conventions**

```typescript
// Files: kebab-case
package - manager - detector.ts;

// Classes: PascalCase
class PackageManagerDetector {}

// Functions: camelCase
function detectPackageManager() {}

// Constants: SCREAMING_SNAKE_CASE
const DEFAULT_TIMEOUT = 30000;

// Interfaces: PascalCase with descriptive names
interface TypeScriptCompilerOptions {}
```

### **Documentation Standards**

#### **JSDoc Comments**

````typescript
/**
 * Detects the package manager used in a project.
 *
 * @param projectRoot - The root directory of the project
 * @param options - Detection options
 * @returns Promise resolving to package manager information
 * @throws {PackageManagerNotFoundError} When no package manager is detected
 *
 * @example
 * ```typescript
 * const info = await detectPackageManager('/path/to/project');
 * console.log(info.type); // 'pnpm'
 * ```
 */
async function detectPackageManager(
  projectRoot: string,
  options: DetectionOptions = {},
): Promise<PackageManagerInfo> {
  // Implementation
}
````

## Testing Guidelines

### **Test Structure**

Follow the testing strategy outlined in `docs/testing-strategy.md`:

#### **Unit Tests**

```typescript
// tests/unit/detectors/package-manager.test.ts
import { describe, test, expect, vi } from 'vitest';
import { detectPackageManager } from '@/detectors/package-manager';

describe('Package Manager Detection', () => {
  test('detects pnpm from lock file', async () => {
    // Arrange
    vi.mocked(fs.access).mockResolvedValue(undefined);
    vi.mocked(fs.readFile).mockResolvedValue('packageManager: pnpm@8.0.0');

    // Act
    const result = await detectPackageManager('/test/project');

    // Assert
    expect(result.type).toBe('pnpm');
    expect(result.version).toBe('8.0.0');
  });

  test('throws error when no package manager found', async () => {
    // Arrange
    vi.mocked(fs.access).mockRejectedValue(new Error('ENOENT'));

    // Act & Assert
    await expect(detectPackageManager('/empty/project')).rejects.toThrow(
      'Package manager not found',
    );
  });
});
```

#### **Integration Tests**

```typescript
// tests/integration/cli.test.ts
import { describe, test, expect } from 'vitest';
import { execFile } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

describe('CLI Integration', () => {
  test('type checks valid TypeScript project', async () => {
    const { stdout, stderr } = await execFileAsync('node', [
      'dist/cli.js',
      'tests/fixtures/valid-project/src/index.ts',
    ]);

    expect(stderr).toBe('');
    expect(stdout).toContain('✓ Type check passed');
  });
});
```

### **Test Requirements**

- **Coverage**: Minimum 90% line coverage
- **Test Naming**: Descriptive test names that explain behavior
- **Mocking**: Mock external dependencies and file system operations
- **Fixtures**: Use realistic test data in `tests/fixtures/`
- **Security Tests**: Include tests for security vulnerabilities

### **Running Tests**

```bash
# Run all tests
pnpm test

# Run specific test file
pnpm vitest tests/unit/detectors/package-manager.test.ts

# Run tests with coverage
pnpm test:coverage

# Run tests in watch mode
pnpm test:watch
```

## Documentation

### **Documentation Types**

1. **Code Documentation**: JSDoc comments for all public APIs
2. **User Documentation**: Usage examples and guides in `docs/`
3. **Developer Documentation**: Architecture and contributing guides
4. **API Documentation**: Auto-generated from TypeScript definitions

### **Documentation Requirements**

- Update relevant documentation with every change
- Include practical examples
- Keep documentation in sync with code
- Write clear, concise explanations

### **Documentation Tools**

```bash
# Lint markdown files
pnpm run lint:md

# Fix markdown linting issues
pnpm run lint:md:fix
```

## Pull Request Process

### **Before Submitting**

1. **Ensure tests pass:**

   ```bash
   pnpm test
   pnpm run typecheck
   pnpm run lint
   ```

2. **Update documentation** if needed

3. **Add changeset** for user-facing changes:

   ```bash
   pnpm changeset
   ```

4. **Write descriptive commit messages** using conventional commits

### **PR Requirements**

#### **PR Title**

Use conventional commit format:

- `feat: add package manager detection`
- `fix: resolve path traversal vulnerability`
- `docs: update contributing guidelines`

#### **PR Description**

Include:

- **Summary**: What does this PR do?
- **Changes**: List of specific changes made
- **Testing**: How was this tested?
- **Breaking Changes**: Any breaking changes?
- **Related Issues**: Link to relevant issues

#### **PR Template**

```markdown
## Summary

Brief description of changes

## Changes

- Added package manager detection
- Updated error handling
- Fixed security vulnerability

## Testing

- [ ] Unit tests added/updated
- [ ] Integration tests pass
- [ ] Manual testing completed

## Breaking Changes

None / List any breaking changes

## Related Issues

Closes #123
```

### **Review Process**

1. **Automated Checks**: All CI checks must pass
2. **Code Review**: At least one maintainer approval required
3. **Security Review**: Required for security-related changes
4. **Documentation Review**: Ensure documentation is updated

### **Merge Requirements**

- ✅ All CI checks passing
- ✅ Code review approval
- ✅ No merge conflicts
- ✅ Changeset added (if applicable)
- ✅ Documentation updated

## Release Process

See the [Release Management section in CLAUDE.md](../CLAUDE.md#-release-management) for release procedures and changeset workflow.

### **Changesets**

We use Changesets for version management:

```bash
# Add a changeset
pnpm changeset

# Check changeset status
pnpm changeset status

# Version packages (maintainers only)
pnpm changeset:version
```

### **Versioning**

We follow [Semantic Versioning](https://semver.org/):

- **Major**: Breaking changes
- **Minor**: New features (backward compatible)
- **Patch**: Bug fixes (backward compatible)

## Community Guidelines

### **Code of Conduct**

- Be respectful and inclusive
- Provide constructive feedback
- Help others learn and grow
- Follow professional communication standards

### **Getting Help**

- **Documentation**: Check existing documentation first
- **Discussions**: Use GitHub Discussions for questions
- **Issues**: Create issues for bugs and feature requests
- **Discord/Slack**: Join community channels for real-time help

### **Recognition**

Contributors are recognized in:

- Release notes
- Contributors section in README
- GitHub contributor graphs
- Special recognition for significant contributions

Thank you for contributing to tsc-files! Your contributions help make TypeScript development better for everyone.
