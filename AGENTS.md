# AGENTS.md

<!-- OPENSPEC:START -->

# OpenSpec Instructions

These instructions are for AI assistants working in this project.

Always open `@/openspec/AGENTS.md` when the request:

- Mentions planning or proposals (words like proposal, spec, change, plan)
- Introduces new capabilities, breaking changes, architecture shifts, or big
  performance/security work
- Sounds ambiguous and you need the authoritative spec before coding

Use `@/openspec/AGENTS.md` to learn:

- How to create and apply change proposals
- Spec format and conventions
- Project structure and guidelines

Keep this managed block so 'openspec update' can refresh the instructions.

<!-- OPENSPEC:END -->

This file provides guidance to AI coding assistants (Claude Code, GitHub Copilot, etc.) when working with code in this repository.

## 📋 Core Project Context

These files are automatically loaded into Claude Code's context:

**Project Overview & Commands:**

- @README.md - Project overview, features, installation, usage examples
- @package.json - Available npm commands and dependencies

**Development Conventions:**

- @.claude/commit-conventions.md - Commit message format and gitmoji usage
- @.claude/claude-code-workflows.md - Claude Code workflow patterns (Plan Mode, sub-agents, context management)
- @openspec/AGENTS.md - Spec-driven development workflow
- @openspec/project.md - Project conventions and tech stack

## 📚 Documentation Map

Read these files on-demand when you need specific guidance:

**For Contributors:**

- [docs/CONTRIBUTING.md](/docs/CONTRIBUTING.md) - Quick start for contributors
- [docs/contributing/setup.md](/docs/contributing/setup.md) - Development environment setup
- [docs/contributing/coding-standards.md](/docs/contributing/coding-standards.md) - TypeScript guidelines and code style
- [docs/contributing/pull-requests.md](/docs/contributing/pull-requests.md) - PR workflow and code review
- [docs/testing/README.md](/docs/testing/README.md) - Testing overview and quick start
- [docs/architecture/README.md](/docs/architecture/README.md) - System design and components

**For Troubleshooting:**

- [docs/guides/troubleshooting-guide.md](/docs/guides/troubleshooting-guide.md) - Common issues and solutions
- [docs/reference/api.md](/docs/reference/api.md) - CLI options and programmatic API reference

**For Deep Dives:**

- [docs/architecture/details.md](/docs/architecture/details.md) - In-depth implementation details
- [docs/architecture/security.md](/docs/architecture/security.md) - Comprehensive security requirements
- [docs/testing/strategy.md](/docs/testing/strategy.md) - Complete testing approach

## 🎯 Project Mission

Build a TypeScript CLI tool that enables running TypeScript compiler checks on specific files while respecting existing tsconfig.json configuration. Designed for git hooks, lint-staged, and CI/CD workflows.

## 🚫 Critical Quality Enforcement

This project enforces a strict zero-tolerance quality policy. All quality gates must pass before any commits or releases.

### Zero-Tolerance Policy

- **Build**: MUST pass without warnings or errors
- **Tests**: MUST achieve 100% pass rate with required coverage
- **Linting**: ZERO warnings or errors allowed (ESLint, Prettier, markdownlint)
- **Type Safety**: STRICT TypeScript with no `any` types in production code
- **Security**: ALL temp file and command execution code requires security validation

### Non-Negotiable Rules

#### Git Operations Require Explicit Permission

**Three separate gates - each requires explicit approval:**

1. **Fix & Test** → You can do this autonomously
2. **Stage** (`git add`) → You can do this autonomously
3. **Commit** (`git commit`) → ⛔ **STOP** - Requires explicit words: "commit this", "commit these changes", "go ahead and commit"
4. **Push** (`git push`) → ⛔ **STOP** - Requires explicit words: "push this", "push it", "go ahead and push"

**"Prepare" means STOP at stage:**

- ✅ Fix the code
- ✅ Run tests
- ✅ Stage with `git add`
- ⛔ **STOP HERE** - Report what's ready and WAIT

**Common instruction patterns and what they mean:**

- "Prepare all required actions" → Fix, test, stage, STOP
- "Get this ready" → Fix, test, stage, STOP
- "Fix this" → Fix, test, stage, STOP
- "Commit this" → Now you can commit
- "Commit and push" → Now you can commit AND push

**Invalid assumptions to avoid:**

- ❌ "The user showed me test output so they want me to commit"
- ❌ "I fixed the bug so I should commit it"
- ❌ "The tests pass so I should push"
- ❌ "This seems ready so I'll just go ahead"

#### Other Protected Operations

- **NEVER create changesets without explicit user permission** - Do not run `pnpm changeset` unless the user explicitly asks for it
- **NEVER modify `pnpm-lock.yaml`** without explicit permission
- **NEVER publish or release** without proper changeset workflow

#### Always Required

- ALWAYS run quality hooks after file changes (formatting, linting, type checking)
- ALWAYS maintain ESM build integrity (tsdown output is ESM-only)
- USE small, focused files organized by logical boundaries
- ALWAYS use Plan Mode (Shift+Tab twice) for architectural decisions and TypeScript integration research
- ALWAYS maintain human approval for major changes (Main Thread Control)
- ALWAYS apply sanity checks for security-critical code (temp files, command execution)

### Quality Gate Requirements

Before any commit or PR:

1. `pnpm lint` - Zero warnings/errors
2. `pnpm typecheck` - Zero TypeScript errors
3. `pnpm test:coverage` - All tests passing AND coverage thresholds met (see [vitest.config.ts](vitest.config.ts))
4. `pnpm build` - Clean build success
5. `pnpm lint:md` - Markdown compliance

## Project Overview

This is `@jbabin91/tsc-files`, a TypeScript CLI tool that enables running TypeScript compiler checks on specific files while respecting existing tsconfig.json configuration. The tool is designed for use with git hooks, lint-staged, and CI/CD workflows where you need to type-check only the files that have changed.

## 🛠️ Development Commands

### 📦 Package Manager

- Use `pnpm` as the primary package manager (required Node.js >=22.19.0)
- `pnpm install` - Install dependencies

### 🔄 Development Workflow

- `pnpm dev` - Start development with file watching (tsdown --watch)
- `pnpm test:watch` - Run tests in watch mode (for active development)

### ✅ Quality Assurance (Zero-Tolerance)

**Critical Commands (MUST pass before commits):**

- `pnpm lint` ⚠️ **CRITICAL** - ESLint with zero warnings policy
- `pnpm format` ⚠️ **CRITICAL** - Format code with Prettier
- `pnpm typecheck` ⚠️ **CRITICAL** - TypeScript type checking
- `pnpm test:coverage` ⚠️ **CRITICAL** - Tests + coverage thresholds (see [vitest.config.ts](vitest.config.ts))
- `pnpm lint:md` ⚠️ **CRITICAL** - Lint markdown files
- `pnpm build` ⚠️ **CRITICAL** - Clean build success

**Helper Commands:**

- `pnpm lint:fix` - Auto-fix linting issues
- `pnpm lint:md:fix` - Auto-fix markdown linting issues

### 🏗️ Build & Validation

- `pnpm build` - Build the project with tsdown and format code
- `pnpm check-exports` - Validate package exports with arethetypeswrong

### 🚀 Release Management

- `pnpm changeset` - Create a changeset manually (standard changesets CLI)
- `pnpm changeset:auto` - Generate changesets from conventional commits
- `pnpm commit` - Interactive commit with commitizen

**Note**: For complete release workflow, see [docs/contributing/release-process.md](docs/contributing/release-process.md)

### 🔍 Troubleshooting & Debugging

- `pnpm audit` - Check for security vulnerabilities
- `node --version && pnpm --version` - Verify environment
- `pnpm why <package>` - Analyze dependency tree
- `npx tsc --showConfig` - Debug TypeScript configuration
- `git status` - Check working directory state

**Note**: For complete list of commands, see `package.json`

## 📋 Task Management Guidelines

### Using Claude's Todo System

- ALWAYS use TodoWrite tool for complex multi-step tasks
- Mark tasks as "in_progress" before starting work
- Complete tasks immediately after finishing
- Break down large features into small, focused tasks

### Sub-Agent Delegation

- Use Task tool for parallel processing of independent work
- Launch multiple sub-agents for comprehensive code reviews
- Delegate research tasks to specialized agents

## Architecture

The project follows a layered architecture designed around the planned CLI implementation:

### Core Components (Planned)

1. **CLI Layer** (`src/cli.ts`) - Entry point, argument parsing, help/version
2. **Core Checker** (`src/core/checker.ts`) - Main orchestration logic
3. **Detection Layer**:
   - Package Manager Detector - Detects npm/yarn/pnpm/bun via lock files
   - TypeScript Detector - Locates TypeScript compiler installation
4. **Configuration Layer** - Generates temporary tsconfig files
5. **Execution Layer** - Runs TypeScript compiler with proper configuration

### Build System

- **tsdown** emits optimized ESM packages with TypeScript declarations
- **publint** validation integrated into build process
- Entry points: `src/index.ts` (library API) and `src/cli.ts` (CLI binary)
- External dependency: TypeScript (peer dependency)

### Package Manager Detection Strategy

The tool will detect package managers in this priority order:

1. Lock file detection (package-lock.json, yarn.lock, pnpm-lock.yaml, bun.lockb)
2. Package manager specific files
3. Environment variables
4. Default to npm

### Testing Strategy

- **Vitest** for unit testing with Node.js environment
- **Coverage** using v8 provider with multiple reporters
- **CI Integration** with GitHub Actions and JUnit XML output
- Test fixtures excluded from coverage

## CI/CD Pipeline

The project uses a sophisticated CI/CD setup:

### Workflows

- **CI** (`ci.yaml`) - Static analysis → tests → build (sequential with dependencies)
- **Security** (`security.yaml`) - Dependency audits, secrets scanning, package integrity validation
- **Integration** (`integration.yaml`) - Cross-platform CLI testing (Ubuntu/macOS/Windows)
- **Release** (`release.yaml`) - Waits for CI success, uses trusted publishing with npm provenance
- **CodeQL** (`codeql.yaml`) - Weekly security scanning

### Release Process

1. Create changeset with `pnpm changeset`
2. Push to main → CI runs
3. CI success → Release workflow creates "Version Packages" PR
4. Merge PR → Automatic npm publishing

### GitHub Actions Structure

Reusable actions in `.github/actions/`:

- `setup` - Node.js and pnpm setup
- `static-analysis` - Linting, type checking, security audit
- `unit-tests` - Testing with Codecov integration
- `build-package` - Build and package validation

## Key Configuration Files

- `tsdown.config.ts` - Build configuration for ESM bundle output
- `vitest.config.ts` - Test configuration with coverage and CI reporting
- `.changeset/config.json` - Release management with GitHub changelog integration
- `package.json` - Package exports with ESM bundle and CLI binary configuration

## Documentation Structure

- `docs/` - Comprehensive documentation following Epic Stack patterns
- `docs/reference/api.md` - CLI and programmatic API reference
- `docs/guides/usage-examples.md` - Real-world usage scenarios and patterns
- `docs/usage/tsgo-compiler.md` - Advanced: 10x faster type checking guide
- `docs/architecture/` - Detailed system design and implementation
- `docs/decisions/` - Architectural Decision Records (ADRs) explaining key technical choices

## Development Status

**Infrastructure**: ✅ Complete (enterprise-grade CI/CD, testing, security, release automation)
**Research & Analysis**: ✅ Complete (original tsc-files PR analysis provided implementation roadmap)
**Phase 1 & 1.5**: ✅ Complete (modern tooling foundation with execa, tinyglobby, path aliases)
**Phase 2**: ✅ Complete (all critical issues resolved - feature complete CLI)
**Phase 3.1**: ✅ Complete (tsgo, enhanced errors, advanced config, Bun support)
**Quality Gates**: ✅ Enforced (zero-tolerance policy for all quality metrics - 95.87% overall coverage)
**Current Status**: 🚀 **Production Ready - All Features Complete**

### **Phase 3.1 Features** ✅ COMPLETE

- ✅ **tsgo Integration**: 10x performance boost with Microsoft's native TypeScript compiler
- ✅ **Enhanced Error Messages**: Comprehensive error handling with educational tips and guidance
- ✅ **Advanced Configuration**: Full dependency discovery and complex monorepo support
- ✅ **Bun Runtime Support**: Complete package manager integration (npm/yarn/pnpm/bun)

**Achievement**: tsc-files is now THE definitive TypeScript file checker for git hooks with unmatched performance, reliability, and user experience.

The project has evolved from research through implementation to a mature, production-ready TypeScript CLI tool with cutting-edge performance optimization and comprehensive features.

### Implementation Completion Status

- ✅ Build system configured (tsdown) with production-ready ESM output
- ✅ Testing framework complete (Vitest) with comprehensive test suite and high coverage (95%+)
- ✅ Quality enforcement active (ESLint, Prettier, TypeScript strict)
- ✅ CI/CD pipeline operational with automated releases
- ✅ Documentation structure comprehensive and current
- ✅ Security requirements implemented and validated
- ✅ Modern tooling foundation implemented (execa, tinyglobby, TypeScript path aliases)
- ✅ Community solutions analyzed and implemented (PRs #66, #49, #75)
- ✅ **Core Implementation Complete** (4,000+ lines):
  - ✅ CLI Layer (900+ lines) - commander, kleur, zod integration with educational features
  - ✅ Core Layer (500+ lines) - monorepo support, JavaScript handling, type checking
  - ✅ Config Layer (1,100+ lines) - dependency discovery, temp config, tsconfig resolution, tsgo compatibility
  - ✅ Detectors Layer (600+ lines) - package manager and TypeScript compiler detection
  - ✅ Execution Layer (300+ lines) - cross-platform TypeScript execution with error parsing
  - ✅ Utils Layer (400+ lines) - file operations, patterns, formatting, logging
- ✅ **All Critical Features**:
  - ✅ Monorepo support with per-file tsconfig resolution
  - ✅ Package manager auto-detection (npm/yarn/pnpm/bun)
  - ✅ Cross-platform compatibility (Windows path handling)
  - ✅ JavaScript support (allowJs/checkJs configurations)
  - ✅ Enhanced error reporting with educational tips
  - ✅ tsgo native compiler support with intelligent fallback
  - ✅ Dependency discovery and ambient declaration detection
  - ✅ Comprehensive test coverage with quality thresholds

## Testing Commands

```bash
# Run single test file
pnpm vitest tests/unit/types.test.ts

# Run tests matching pattern
pnpm vitest --run --reporter=verbose "checker"

# Run integration tests only
pnpm vitest tests/integration/

# Coverage with multiple formats (text, json, html, lcov)
pnpm test:coverage

# Watch mode for development
pnpm test:watch
```

## CLI API Reference

### Basic Usage

```bash
# Check specific files
tsc-files src/index.ts src/utils.ts

# Check files with glob patterns
tsc-files "src/**/*.ts"

# Use with specific tsconfig
tsc-files --project tsconfig.build.json src/*.ts
```

### Command Line Options

- `--help, -h` - Show help information
- `--version, -v` - Show version number
- `--project, -p <path>` - Path to tsconfig.json (default: auto-detected)
- `--verbose` - Enable detailed logging
- `--json` - Output results as JSON
- `--skip-lib-check` - Skip type checking of declaration files (default: enabled)
- `--no-cache` - Disable cached temporary configs (caching is enabled by default)
- `--use-tsc` - Force the classic `tsc` compiler
- `--use-tsgo` - Force the native `tsgo` compiler (fails if unavailable)
- `--show-compiler` - Print which compiler is in use
- `--benchmark` - Compare compiler performance when both are available
- `--no-fallback` - Disable automatic fallback from tsgo to tsc
- `--tips` - Show performance tips for git hooks and TypeScript compilation
- `--include <files>` - Additional files to include (comma-separated, useful for setup files)

### Exit Codes

- `0` - Success (no type errors)
- `1` - Type errors found
- `2` - Configuration errors
- `3` - System errors (TypeScript not found, etc.)
- `99` - Internal/unknown errors

## Programmatic API

```typescript
import { checkFiles } from '@jbabin91/tsc-files';
import type { CheckOptions, CheckResult } from '@jbabin91/tsc-files';

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

## Important Implementation Notes

### TypeScript Considerations

- The `tsconfig.json` includes all `**/*.ts` files to ensure configuration files are type-checked
- Strict TypeScript configuration with comprehensive error checking
- Uses Node.js ESM with proper module resolution

### Code Comments Policy

- **Only valuable comments** - Comments should provide useful information that helps someone understand the code
- **NO file header comments** - Avoid boilerplate comments at the top of files
- **Explain WHY, not WHAT** - Comments should explain reasoning, edge cases, or business context, not repeat what the code does
- **JSDoc for public APIs** - Document exported functions, types, and interfaces with clear descriptions and examples
- **Complex logic clarification** - Explain non-obvious algorithms, workarounds, or performance considerations
- **Remove redundant comments** - Clean up comments that don't add value or simply restate obvious code

**NEVER add comments that:**

- State framework/library version changes (e.g., "Vitest v4: ...")
- Describe configuration defaults (e.g., "Use default threading for...")
- Explain common patterns everyone knows
- Repeat what the code clearly shows

**Examples of BAD comments to avoid:**

```typescript
// ❌ BAD: States the obvious about version changes
// Vitest v4: 'all' option was removed
include: ['src/**/*.ts'],

// ❌ BAD: Describes common configuration
// Use default threading for better compatibility
pool: 'threads',

// ❌ BAD: Repeats what code clearly shows
// Set verbose to true
verbose: true,
```

**Examples of GOOD comments (when needed):**

- Explains WHY: `// useAtomics: true causes worker termination in CI - keeping disabled until upstream fix`
- Documents security: `// Restrict permissions to owner-only (0600) to prevent privilege escalation`

#### TypeScript Path Aliases

The project uses TypeScript path aliases for cleaner imports. **ALWAYS use path aliases instead of relative imports**:

```typescript
// ✅ CORRECT: Use path aliases (no .js extension needed)
import { checkFiles } from '@/core/checker';
import type { CheckOptions } from '@/types';
import { findTypeScriptCompiler } from '@/detectors/typescript';

// ❌ INCORRECT: Avoid relative imports
import { checkFiles } from '../core/checker';
import type { CheckOptions } from '../types';
```

**Path Alias Configuration:**

- `@/*` → `src/*` (all source files)
- `@/core/*` → `src/core/*` (core functionality)
- `@/types` → `src/types` (TypeScript type definitions)
- `@/utils/*` → `src/utils/*` (utility functions)

**Import Extension Rules:**

- **All imports**: No `.js` extension needed with TypeScript path aliases
- **Type-only imports**: Use `type` keyword for clarity

```typescript
// Module imports - no .js extension needed
import { checkFiles } from '@/core/checker';

// Type imports - use type keyword for clarity
import type { CheckOptions } from '@/types';
```

### Error Handling Strategy

Planned error categories with specific exit codes:

- Exit 0: Success
- Exit 1: Type check failures (user errors)
- Exit 2: Configuration errors
- Exit 3: System errors (TypeScript not found, etc.)
- Exit 99: Internal/unknown errors

### Security Considerations

- Temp files use cryptographically random names with restrictive permissions
- Command execution uses `execFile` with array arguments to prevent injection
- All temp files cleaned up on exit (success or failure)

## Git Hooks Integration

### With lint-staged

```json
{
  "lint-staged": {
    "*.{ts,tsx}": "tsc-files"
  }
}
```

### With husky

```bash
#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

npx lint-staged
```

### Direct pre-commit hook

```bash
#!/bin/sh
# Check only staged TypeScript files
staged_files=$(git diff --cached --name-only --diff-filter=ACM | grep -E '\.(ts|tsx)$')
if [ -n "$staged_files" ]; then
  tsc-files $staged_files
fi
```

## Project Structure

```sh
src/
├── cli/                # Commander setup, CLI runner, output helpers
├── config/             # Temp config generation, dependency discovery, tsconfig resolution
├── core/               # Orchestration (checker + file grouping)
├── detectors/          # Package manager & TypeScript compiler detection
├── execution/          # Process execution and result parsing
├── utils/              # Shared logging and helpers
├── cli.ts              # CLI entry point wiring the command to the runner
├── index.ts            # Public API exports
└── types/              # Shared TypeScript types for CLI/core layers

tests/
├── unit/               # Unit tests for individual functions
├── integration/        # Integration tests with real projects
└── fixtures/           # Test fixtures and sample projects

docs/
├── guides/             # How-to content (usage examples, troubleshooting)
├── reference/          # API reference and supporting docs
├── usage/              # Deep dives (e.g., tsgo compiler guide)
├── architecture/       # System design, performance, security
├── testing/            # Strategy, framework, best practices
└── decisions/          # Architectural Decision Records (ADRs)

.github/
├── workflows/         # CI/CD workflows
└── actions/          # Reusable GitHub Actions
```

## ADR Summary

Key architectural decisions documented:

### Foundation Decisions (Phase 1)

- **001**: TypeScript CLI Implementation approach
- **002**: tsdown vs tsc for build tooling
- **003**: Distribution format strategy (dual-package evaluation; current build ships ESM-only)
- **004**: Changesets for release management
- **005**: Vitest vs Jest for testing

### Implementation Decisions (Phase 2)

- **006**: Package Manager Detection Strategy (npm/yarn/pnpm/bun auto-detection)
- **007**: Monorepo Support Architecture (per-file tsconfig resolution with file grouping)
- **008**: JavaScript File Handling Strategy (tsconfig-aware allowJs/checkJs support)
- **009**: Cross-Platform Execution Strategy (Windows/Unix path handling and process spawning)
- **010**: Error Handling & Process Management (execa-based execution with categorized error reporting)

## 🔍 Troubleshooting Guide

### 🚫 Common Issues & Solutions

#### TypeScript Compiler Issues

**⚠️ "TypeScript not found"**

```bash
# Install TypeScript locally (recommended)
pnpm add -D typescript

# Verify installation
npx tsc --version

# Check if tsc-files can find it
tsc-files --version
```

**⚠️ "tsconfig.json not found"**

```bash
# Use explicit project flag
tsc-files --project ./config/tsconfig.json src/*.ts

# Validate tsconfig.json
npx tsc --showConfig

# Check extends chain
cat tsconfig.json | grep extends
```

#### File Pattern Issues

**⚠️ "No files found" or glob pattern failures**

```bash
# ✅ CORRECT: Quote patterns
tsc-files "src/**/*.ts"

# ❌ INCORRECT: Unquoted (shell expands)
tsc-files src/**/*.ts

# Verify pattern matches
ls src/**/*.ts
```

#### Permission & Security Issues

**⚠️ "Permission denied" on temp files**

```bash
# Check temp directory permissions
ls -la /tmp

# Fix permissions if needed
sudo chmod 755 /tmp

# Use alternative temp directory
TMPDIR=/path/to/writable/dir tsc-files src/**/*.ts
```

#### Performance Issues

**⚠️ "Slow type checking"**

```bash
# Skip library checking for speed
tsc-files --skip-lib-check src/**/*.ts

# Check specific slow files
time tsc-files src/slow-file.ts

# Caching is enabled by default; disable it temporarily when debugging config issues
tsc-files --no-cache src/**/*.ts
```

### 🐛 Git Hook Failures

**⚠️ Pre-commit hooks failing**

```bash
# Test hook manually
.husky/pre-commit

# Debug staged files
git diff --cached --name-only --diff-filter=ACM | grep -E '\.(ts|tsx)$'

# Run with verbose output
tsc-files --verbose $(git diff --cached --name-only --diff-filter=ACM | grep -E '\.(ts|tsx)$')

# Temporary bypass (not recommended)
git commit --no-verify
```

### 🔧 CI/CD Debugging

**⚠️ GitHub Actions failures**

```bash
# Debug with JSON output
tsc-files --json "src/**/*.ts" | tee type-check-results.json

# Check environment
node --version && npm --version

# Verify TypeScript installation
npx tsc --version
```

### 🎢 Emergency Fixes

When all else fails:

```bash
# Clear npm cache
npm cache clean --force

# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install

# Reset git hooks
npx husky install

# Verify basic setup
pnpm lint && pnpm typecheck && pnpm test && pnpm build
```

## 🏗️ Foundation Mechanics (ClaudeLog Core Principles)

### **Main Thread Control**

- **You are the main thread**: Human remains strategic decision-maker while AI provides execution power
- **Veto Power**: All architectural decisions require explicit human approval before implementation
- **Workflow Management**: Use Plan Mode to present comprehensive plans before execution
- **Sub-Agent Coordination**: Delegate parallel tasks while maintaining oversight

### **CLAUDE.md Supremacy**

- **Project-Specific Intelligence**: This file provides context that overrides default AI behavior
- **Instruction Adherence**: Claude follows CLAUDE.md instructions more strictly than regular prompts
- **Living Document**: Update this file as project insights and patterns emerge
- **Comprehensive Coverage**: Document coding standards, build commands, workflow instructions, and project quirks

### **Plan Mode + Experimentation**

- **Trigger**: Use `Shift+Tab` twice to activate Plan Mode for safe research
- **Safe Research**: Investigate and plan without making changes until approval
- **Structured Thinking**: Forces consideration of edge cases and multiple approaches
- **Best Use Cases**:
  - TypeScript compiler integration research
  - Large refactoring across planned architecture
  - Security implementations (temp file handling, command execution)
  - Package manager detection strategy development

### **Context Management Ecosystem**

- **Context Inspection**: Use `/context` command to monitor token usage across tools/agents
- **Poison Context Prevention**: Our modular file architecture supports efficient context usage
- **Dynamic Memory**: Preserve TypeScript integration learnings across sessions
- **Auto-Compact**: Automatic conversation summarization when approaching context limits
- **Manual Optimization**: Use `/compact` command for manual context summarization

### **Quality Assurance Framework**

- **Sanity Checks**: Essential for temp file security and command execution safety
- **Permutation Frameworks**: Systematic testing of package manager detection patterns
- **Output Styles**: Available for specialized contexts (consider "TypeScript Expert" mode)
- **Validation Protocols**: Multi-perspective analysis for critical implementations

### **Strategic Development Workflow**

1. **Research Phase**: Plan Mode for investigation and architectural decisions
2. **Implementation Phase**: Sub-agent delegation for parallel component development
3. **Validation Phase**: Multi-role analysis (security, performance, type safety, UX)
4. **Iteration Phase**: Continuous experimentation with "Always Be Experimenting" mindset

## 🧠 ClaudeLog Best Practices Applied

### File Organization Strategy

- **Small, Focused Files**: Organize by logical boundaries to reduce context window usage
- **Modular Architecture**: Each component should have a single responsibility
- **Clear File Naming**: Use descriptive names that indicate purpose
- **Logical Grouping**: Group related functionality in directories

### Advanced Workflow Techniques

- **Plan Mode**: Use `Shift+Tab` twice for safe research before execution
- **Sub-Agent Delegation**: Use Task tool for parallel processing of complex operations
- **Context Management**: Use `/compact` command to manage context window in large codebases
- **Multi-Directory**: Use `/add-dir` to expand workspace without losing context

### Development Automation

- **Quality Hooks**: Automated formatting, linting, and type checking after file changes
- **Session Management**: Git status on startup, commit reminders on exit
- **Permission Security**: Comprehensive deny rules with bypass prevention

## ⚡ Advanced Performance Techniques

### UltraThink & Deep Reasoning

- **UltraThink Trigger**: Use "UltraThink" magic word for maximum reasoning budget on complex problems
- **Plan Mode**: Use `Shift+Tab` twice for safe research and predictable outcomes
- **Multi-Perspective Analysis**: Request different viewpoints (security expert, senior engineer, architect)

### Context Window Optimization

- **Lean File Strategy**: Keep files small and focused to reduce context consumption
- **Strategic Reading**: Use CLAUDE.md to guide which files to read/avoid
- **Context Management Commands**:
  - `/compact` - Manual context summarization
  - `/clear` - Start fresh session
  - Auto-compact - Automatic summarization when approaching limits

### Tactical Model Selection

- **Claude 4 Opus**: Use for complex reasoning, architecture decisions, debugging
- **Claude 4 Sonnet**: Use for routine implementation, daily development tasks
- **Strategic Switching**: Optimize both quality and cost through intelligent model selection

### Sub-Agent Delegation Patterns (TypeScript Focus)

#### Role-Based Analysis Team

Create specialized sub-agents for comprehensive code review:

- **Security Expert**: Analyze for vulnerabilities, input validation, secure patterns
- **Senior Engineer**: Review architecture, design patterns, best practices
- **Performance Specialist**: Identify optimization opportunities, memory usage
- **Type Safety Guardian**: Ensure proper TypeScript usage, generic constraints

#### Parallel Development Tasks

Use Task tool to launch simultaneous sub-agents for:

- **Architecture Design**: System design and component relationships
- **Implementation**: Core functionality development
- **Testing Strategy**: Unit/integration test planning and implementation
- **Documentation**: API docs, README updates, code comments

#### Split Role Validation

For critical changes, use multiple sub-agents to validate from different perspectives:

- Code correctness and logic
- Type safety and TypeScript best practices
- Performance implications
- Security considerations

#### Consolidation Strategy

Sub-agents return focused reports that consume minimal context in main session, enabling complex multi-dimensional analysis without context bloat.

## 🎯 Task Routing & Documentation

### **Implementation Tasks**

When working on implementation:

1. **Use Plan Mode first** for TypeScript integration research
2. **Read [Architecture Overview](docs/architecture/README.md)** for implementation phases and component boundaries
3. **Apply sub-agent delegation** for parallel component development
4. **Follow [Security Requirements](docs/architecture/security.md)** for all security validations
5. **Reference [Architecture Details](docs/architecture/details.md)** for system design

### **Testing Tasks**

When adding or fixing tests:

1. **Read [Testing Strategy](docs/testing/strategy.md)** for framework and patterns
2. **Use test subagent** for comprehensive test implementation
3. **Follow security testing protocols** from [Security Requirements](docs/architecture/security.md)
4. **Ensure coverage requirements** are met (>90%)
5. **Reference [Contributing Guide](/docs/CONTRIBUTING.md)** for quality standards

### **Security Tasks**

When implementing security features:

1. **Read [Security Requirements](docs/architecture/security.md)** for complete requirements
2. **Use security-expert subagent** for validation
3. **Apply sanity check protocols** before implementation
4. **Test against penetration test scenarios**
5. **Reference [Testing Strategy](docs/testing/strategy.md)** for security test patterns

### **Architecture Tasks**

When making architectural decisions:

1. **Use Plan Mode** for analysis and research
2. **Read [Architecture Details](docs/architecture/details.md)** for system design
3. **Review [Architecture Overview](docs/architecture/README.md)** when organizing components
4. **Use architecture subagent** for complex design decisions
5. **Review [ADR Documentation](docs/decisions/)** for previous architectural decisions

### **Key Development Principles**

- **Security First**: All temp file handling and command execution must pass security validation
- **TypeScript Preservation**: Maintain original tsconfig.json semantics and behavior
- **Modular Architecture**: Use small, focused files organized by logical boundaries
- **Systematic Testing**: Apply comprehensive testing strategies
- **Explicit Context**: Always read relevant documentation before starting tasks
