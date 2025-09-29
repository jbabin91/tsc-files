# Development Environment Setup

This guide will help you set up your local development environment for contributing to tsc-files.

## Prerequisites

### Required

- **Node.js** >= 22.19.0 ([Download](https://nodejs.org/))
- **pnpm** (package manager) - Install via: `npm install -g pnpm`
- **Git** with commit signing configured

### Recommended

- **VS Code** with ESLint, Prettier, and TypeScript extensions
- **GitHub CLI** (`gh`) for easier PR management

## Initial Setup

```bash
# 1. Clone the repository
git clone https://github.com/jbabin91/tsc-files.git
cd tsc-files

# 2. Install dependencies
pnpm install

# 3. Verify setup (all commands must pass)
pnpm lint      # ESLint with zero warnings
pnpm typecheck # TypeScript type checking
pnpm test      # Run test suite
pnpm build     # Build the project
```

All commands should complete successfully with no errors.

## IDE Configuration

### VS Code (Recommended)

The project includes pre-configured VS Code settings in `.vscode/settings.json`:

**Required Extensions:**

- ESLint (`dbaeumer.vscode-eslint`)
- Prettier (`esbenp.prettier-vscode`)
- TypeScript and JavaScript Language Features (built-in)

**Recommended Extensions:**

- GitLens (`eamodio.gitlens`)
- Error Lens (`usernamehw.errorlens`)
- Code Spell Checker (`streetsidesoftware.code-spell-checker`)

### Other IDEs

Ensure your IDE is configured to:

- Use the project's TypeScript version
- Enable ESLint integration
- Format on save with Prettier
- Show type hints and inline errors

## Quality Assurance Commands

These commands MUST pass before committing:

```bash
# Run all quality checks
pnpm lint           # ESLint (zero warnings policy)
pnpm typecheck      # TypeScript strict mode
pnpm test           # Complete test suite (100% pass rate)
pnpm build          # Clean build with no errors
```

**Additional Commands:**

```bash
pnpm lint:fix       # Auto-fix linting issues
pnpm format         # Format code with Prettier
pnpm test:watch     # Run tests in watch mode
pnpm test:coverage  # Generate coverage reports
pnpm dev            # Development mode with file watching
```

## Development Workflow

### 1. Create a Feature Branch

```bash
git checkout -b feat/your-feature-name
# or
git checkout -b fix/issue-description
```

### 2. Make Changes

- Write code following [coding standards](./coding-standards.md)
- Add tests for new functionality
- Update documentation if needed

### 3. Run Quality Checks

```bash
# Run all checks
pnpm lint && pnpm typecheck && pnpm test
```

### 4. Commit Changes

Use conventional commit format (or use `pnpm commit` for interactive mode):

```bash
git add .
pnpm commit  # Interactive commit with commitizen
```

**Commit Format:**

```text
<type>(<scope>): <gitmoji> <description>

[optional body]
```

Examples:

```bash
feat(cli): :sparkles: add --show-config flag
fix(core): :bug: handle circular tsconfig extends
docs: :memo: update troubleshooting guide
```

See [commit conventions](../../.claude/commit-conventions.md) for details.

### 5. Create Changeset (for user-facing changes)

```bash
pnpm changeset
```

Select change type (patch/minor/major) and describe the change.

### 6. Push and Create PR

```bash
git push origin feat/your-feature-name
gh pr create  # Or create PR via GitHub web interface
```

## Testing Your Changes

### Run Specific Tests

```bash
# Single test file
pnpm vitest tests/unit/checker.test.ts

# Tests matching pattern
pnpm vitest --run --reporter=verbose "package-manager"

# Integration tests only
pnpm vitest tests/integration/
```

### Test Coverage

```bash
# Generate coverage report
pnpm test:coverage

# View coverage in browser
open coverage/index.html
```

### Test with Real Projects

Create a test project and use your local build:

```bash
# Build your changes
pnpm build

# Link locally
pnpm link --global

# In test project
cd /path/to/test-project
tsc-files "src/**/*.ts"
```

## Troubleshooting

### Dependencies Won't Install

```bash
# Clear pnpm cache and reinstall
rm -rf node_modules pnpm-lock.yaml
pnpm store prune
pnpm install
```

### Tests Failing Locally

```bash
# Ensure clean state
git status  # No uncommitted changes affecting tests

# Clear build artifacts
rm -rf dist

# Rebuild and test
pnpm build && pnpm test
```

### TypeScript Errors in IDE

```bash
# Restart TypeScript server in VS Code
# Command Palette (Cmd+Shift+P) → "TypeScript: Restart TS Server"

# Or verify TypeScript version
npx tsc --version
```

### Git Hooks Not Running

```bash
# Reinstall git hooks
pnpm prepare
```

## Getting Help

- **Questions?** Open a [GitHub Discussion](https://github.com/jbabin91/tsc-files/discussions)
- **Bug?** Check [troubleshooting guide](../troubleshooting-guide.md)
- **Documentation:** Browse [docs/](../README.md)

## Next Steps

- Read [Coding Standards](./coding-standards.md)
- Review [Pull Request Workflow](./pull-requests.md)
- Check [Testing Guide](../testing/README.md)
- Explore [Architecture](../architecture/README.md)
