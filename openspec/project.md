# Project Context

## Purpose

`@jbabin91/tsc-files` is a modern TypeScript CLI tool that enables running TypeScript compiler checks on specific files while respecting existing tsconfig.json configuration. Designed for git hooks, lint-staged, and CI/CD workflows where you need to type-check only the files that have changed.

**Mission**: Establish tsc-files as THE definitive TypeScript file checker for git hooks with unmatched performance, reliability, and user experience.

**Key Goals**:

- Respect existing tsconfig.json configuration (no default compiler options)
- Support monorepos with per-file tsconfig resolution
- Provide 10x performance boost via tsgo integration
- Maintain cross-platform compatibility (Windows/macOS/Linux)
- Zero-tolerance for build failures, lint violations, or type errors

## Tech Stack

### Core Technologies

- **TypeScript** - Strict configuration with zero `any` types in production code
- **Node.js** - ESM with proper module resolution (>=22.19.0 required)
- **pnpm** - Primary package manager for development

### Build & Distribution

- **tsdown** - Dual ESM/CJS package builds with TypeScript declarations
- **publint** - Package export validation
- **Dual Package Support** - Full ESM + CommonJS compatibility

### CLI & Dependencies

- **commander.js** - Command-line argument parsing with enhanced validation
- **kleur** - Colored terminal output (zero dependencies)
- **zod** - Runtime type validation for CLI options
- **execa** - Reliable cross-platform process execution
- **tinyglobby** - Fast file pattern matching with cross-platform support

### TypeScript Compiler Integration

- **tsc** - Standard TypeScript compiler (peer dependency)
- **tsgo** - Native TypeScript compiler (optional, 10x performance boost)
- **cosmiconfig** - Enhanced tsconfig resolution with extends chain support
- **deepmerge** - Configuration merging for complex setups
- **tsconfig-paths** - Path mapping resolution

### Testing & Quality

- **Vitest** - Unit testing framework with Node.js environment
- **v8 coverage** - Code coverage reporting (84%+ core coverage requirement)
- **ESLint** - Zero warnings policy with strict TypeScript rules
- **Prettier** - Code formatting enforcement
- **markdownlint** - Documentation quality assurance

### CI/CD & Security

- **Changesets** - Automated versioning and changelog generation
- **GitHub Actions** - Comprehensive CI/CD pipelines
  - Static analysis (lint, typecheck, security audit)
  - Cross-platform integration tests (Ubuntu/macOS/Windows)
  - Automated releases with npm provenance
  - CodeQL security scanning (weekly)
- **Lefthook** - Git hooks management for quality enforcement

## Project Conventions

### Code Style

**TypeScript Best Practices**:

- STRICT TypeScript with no `any` types in production code
- Use type-only imports: `import type { Type } from 'module'`
- TypeScript path aliases required (`@/*` instead of relative imports)
- JSDoc for public APIs with clear descriptions and examples

**Formatting & Linting**:

- Prettier for all files (TypeScript, JavaScript, Markdown, JSON, YAML)
- ESLint with zero warnings policy (TypeScript strict rules)
- markdownlint for documentation quality

**Code Comments Policy**:

- Only valuable comments that explain WHY, not WHAT
- NO file header boilerplate comments
- JSDoc for exported functions, types, and interfaces
- Explain non-obvious algorithms, edge cases, or business context
- Remove redundant comments that restate obvious code

**Import Guidelines**:

```typescript
// ✅ CORRECT: Use path aliases (no .js extension needed)
import { checkFiles } from '@/core/checker';
import type { CheckOptions } from '@/types';
import { findTypeScriptCompiler } from '@/detectors/typescript';

// ❌ INCORRECT: Avoid relative imports
import { checkFiles } from '../core/checker';
import type { CheckOptions } from '../types';
```

**Path Alias Configuration**:

- `@/*` → `src/*` (all source files)
- `@/core/*` → `src/core/*` (core functionality)
- `@/types` → `src/types` (TypeScript type definitions)
- `@/utils/*` → `src/utils/*` (utility functions)

### Architecture Patterns

**Layered Architecture**:

```text
CLI Layer (command.ts, runner.ts, output.ts)
    ↓
Core Orchestration (checker.ts)
    ↓
Detection Layer (typescript.ts, package-manager.ts)
    ↓
Configuration Layer (discovery.ts, parser.ts, temp-config.ts)
    ↓
Execution Layer (executor.ts, output-parser.ts)
```

**Key Design Principles**:

- Small, focused files organized by logical boundaries (<300 lines preferred)
- Single responsibility per module
- Dependency injection for testability
- Graceful error degradation with proper cleanup
- Security-first for temp file handling and command execution

**File Organization Strategy**:

- Group related functionality in directories (detectors/, config/, execution/, cli/)
- Clear file naming that indicates purpose
- Modular architecture with minimal coupling
- Test files mirror source structure

**Error Handling Strategy**:

- Exit 0: Success (no type errors)
- Exit 1: Type errors found (user errors)
- Exit 2: Configuration errors (tsconfig.json issues)
- Exit 3: System errors (TypeScript not found)
- Exit 99: Internal/unknown errors

**Security Considerations**:

- Temp files use cryptographically random names with restrictive permissions (0600)
- Command execution uses execa with array arguments (no shell injection)
- All temp files cleaned up on exit (success or failure)
- Input validation for file paths and CLI options

### Testing Strategy

**Test Layers** (comprehensive suite with 95%+ coverage):

1. **Unit Tests** - Individual function testing with proper mocking
   - File system operations with memfs
   - Process execution with vitest mocks
   - Type-safe mocking without `any` types
2. **Integration Tests** - Real TypeScript projects
   - Actual file system operations
   - Cross-platform compatibility testing
   - Package manager integration
3. **End-to-End Tests** (GitHub Actions) - Full CLI execution across platforms

**Coverage Targets** (all layers exceed minimums):

- **CLI Layer**: 95%+ statements, 85%+ branches, 95%+ functions
- **Core Layer**: 95%+ statements, 80%+ branches, 95%+ functions
- **Utils Layer**: 100% statements, 100% branches, 100% functions

**Testing Best Practices**:

- Use custom Vitest matchers for CLI-specific assertions
- Comprehensive mocking with type safety
- Test fixtures excluded from coverage
- Cross-platform integration via GitHub Actions

**Quality Gate Requirements** (Before any commit or PR):

1. `pnpm lint` - Zero warnings/errors
2. `pnpm typecheck` - Zero TypeScript errors
3. `pnpm test` - All tests passing
4. `pnpm build` - Clean build success
5. `pnpm lint:md` - Markdown compliance

### Git Workflow

**Branching Strategy**:

- `main` - Production-ready code
- Feature branches for development
- No direct commits to main (PR required)

**Pull Request Format**:

ALWAYS follow `.github/PULL_REQUEST_TEMPLATE.md` for consistency. Use narrative format with these required sections:

```markdown
## Summary

Brief description with issue reference (Closes #X)

## Problem

Why this change matters - explain context and motivation

## Changes

Detailed breakdown with subsections for complex PRs:

- ### Core Changes
- ### Additional Changes (if applicable)

## Benefits

List advantages with ✅ checkmarks for readability

## Testing

Quality gates passed + test coverage results:

- ✅ pnpm lint - zero errors/warnings
- ✅ pnpm typecheck - zero TypeScript errors
- ✅ pnpm test - all tests passing
- ✅ pnpm build - clean build success
- ✅ pnpm lint:md - markdown compliance

## Breaking Changes

**NONE** or list breaking changes with migration guidance

## Documentation (if applicable)

List doc updates with ✅ checkmarks

## Changeset (if affecting public API)

- [ ] Changeset added and categorized correctly
```

**PR Format Principles**:

- Use narrative format (not excessive checkboxes)
- Include issue reference in Summary section
- Explain WHY in Problem section (context, motivation)
- Detail WHAT in Changes section (implementation specifics)
- Show benefits with ✅ checkmarks for visual clarity
- Always specify if breaking changes exist
- Document all quality gates passed
- Add OpenSpec reference if change was tracked with OpenSpec

**PR vs Changeset Content**:

**PR Description (comprehensive, internal details):**

- Full implementation details
- Test coverage improvements
- Internal refactoring rationale
- Developer tooling changes
- Architectural decisions
- All quality gates with detailed results

**Changeset (concise, user-focused):**

- User-facing behavior changes ONLY
- Brief (1-3 paragraphs for patch releases)
- Focus on "what changed" and "why users care"
- Exclude internal details (tests, tooling, refactoring)
- See `docs/contributing/release-process.md` for detailed guidelines

**Commit Conventions** (Conventional Commits + Gitmojis):

```bash
<type>(<scope>): <gitmoji> <description>

# Examples:
feat(cli): :sparkles: add --verbose flag for detailed output
fix(core): :bug: handle missing tsconfig.json gracefully
chore(deps): :hammer: bump typescript to v5.2.0
docs: :memo: update README with installation instructions
```

**Type → Gitmoji Mapping**:

- **feat**: ✨ `:sparkles:` - Introduce new features
- **fix**: 🐛 `:bug:` - Fix a bug
- **docs**: 📝 `:memo:` - Add or update documentation
- **style**: 💄 `:lipstick:` - Add or update the UI and style files
- **refactor**: ♻️ `:recycle:` - Refactor code
- **perf**: ⚡️ `:zap:` - Improve performance
- **test**: ✅ `:white_check_mark:` - Add or update tests
- **chore**: 🔨 `:hammer:` - Add or update development scripts
- **ci**: 👷 `:construction_worker:` - Add or update CI build system

**Available Scopes**:

- `cli` - Command line interface
- `core` - Core functionality
- `types` - TypeScript types
- `config` - Configuration files
- `build` - Build system
- `test` - Test files
- `docs` - Documentation
- `deps` - Dependencies

**Release Process**:

1. Create changeset with `pnpm changeset`
2. Push to main → CI runs comprehensive validation
3. CI success → Release workflow creates "Version Packages" PR
4. Merge PR → Automatic npm publishing with provenance

## Domain Context

### TypeScript Compiler Ecosystem

**Key Concepts**:

- **tsconfig.json**: TypeScript configuration file with compiler options
- **Project References**: Multi-tsconfig setup for monorepos
- **Extends Chain**: Configuration inheritance via `extends` property
- **Compiler Options**: Settings like `strict`, `noEmit`, `allowJs`, `checkJs`
- **Path Mapping**: TypeScript path aliases via `baseUrl` and `paths`

**Package Manager Detection**:

- **npm**: `package-lock.json` presence
- **yarn**: `yarn.lock` presence
- **pnpm**: `pnpm-lock.yaml` presence
- **bun**: `bun.lockb` presence
- Fallback to npm if no lock files found

**TypeScript Compiler Variants**:

- **tsc**: Standard TypeScript compiler (always available as peer dependency)
- **tsgo**: Native TypeScript compiler (@typescript/native-preview, 10x faster)
  - Optional dependency for performance optimization
  - Automatic fallback to tsc on incompatibility
  - Proactive compatibility checking (baseUrl, paths limitations)

### Git Hook Integration Patterns

**lint-staged Integration**:

```json
{
  "lint-staged": {
    "*.{ts,tsx}": "tsc-files"
  }
}
```

**Monorepo Scenarios**:

- Per-file tsconfig resolution (traverse up directory tree)
- Group files by associated tsconfig for batch processing
- Maintain relative paths within each tsconfig context

## Important Constraints

### Non-Negotiable Rules

1. **Quality Enforcement**:
   - NEVER modify `pnpm-lock.yaml` without explicit permission
   - ALWAYS run quality hooks after file changes
   - NEVER publish without proper changeset workflow
   - ALWAYS maintain dual package (ESM/CJS) compatibility

2. **Development Process**:
   - ALWAYS use Plan Mode (Shift+Tab twice) for architectural decisions
   - ALWAYS maintain human approval for major changes (Main Thread Control)
   - ALWAYS apply sanity checks for security-critical code
   - USE small, focused files organized by logical boundaries

3. **TypeScript Integration**:
   - Respect existing tsconfig.json semantics (never override user config)
   - Maintain original tsconfig.files if present
   - Support full extends chain resolution
   - Handle checkJs/allowJs for JavaScript file inclusion

4. **Security Requirements**:
   - ALL temp file handling requires security validation
   - ALL command execution must prevent injection attacks
   - Cryptographically random temp file names with restrictive permissions
   - Proper cleanup on all exit paths (success, error, signal)

### Technical Constraints

- **Node.js Version**: >=22.19.0 required
- **TypeScript**: Peer dependency (user must install)
- **Package Size**: Minimal dependencies to reduce installation overhead
- **Performance Targets**:
  - Single file: <500ms
  - 10 files: <1s
  - 100 files: <3s
  - 1000 files: <10s (with tsgo optimization)

### Platform Compatibility

- **Windows**: Path quoting for spaces, shell mode for .cmd execution
- **macOS**: Standard Unix behavior
- **Linux**: Standard Unix behavior with pnpm path adjustments

## External Dependencies

### Required Peer Dependencies

- **typescript** - TypeScript compiler (user must install, version >=4.0.0)

### Optional Dependencies

- **@typescript/native-preview** - tsgo native compiler for 10x performance boost

### Runtime Environment

- **Node.js** - ESM runtime with proper module resolution
- **npm/yarn/pnpm/bun** - Package manager for TypeScript installation

### Build & Release Infrastructure

- **npm registry** - Package distribution with provenance
- **GitHub Actions** - CI/CD automation
- **Codecov** - Coverage reporting and tracking

### Documentation References

- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [tsconfig.json reference](https://www.typescriptlang.org/tsconfig)
- [ADRs](../docs/decisions/) - Architectural Decision Records
- [Implementation Strategy](../docs/implementation-strategy.md) - Development roadmap
- [Architecture Details](../docs/architecture-details.md) - System design
- [Testing Strategy](../docs/testing-strategy.md) - Testing approach
