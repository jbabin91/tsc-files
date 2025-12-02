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

- **tsdown** - ESM bundling with TypeScript declaration output and minification
- **publint** - Package export validation
- **ESM Distribution** - Single-format ESM package with CLI binary entry point

### CLI & Dependencies

- **commander.js** - Command-line argument parsing with enhanced validation
- **kleur** - Colored terminal output (zero dependencies)
- **zod** - Runtime type validation for CLI options
- **execa** - Reliable cross-platform process execution
- **tinyglobby** - Fast file pattern matching with cross-platform support

### TypeScript Compiler Integration

- **tsc** - Standard TypeScript compiler (peer dependency)
- **tsgo** - Native TypeScript compiler (optional, 10x performance boost)
- **get-tsconfig** - Accurate tsconfig discovery and extends resolution
- **tmp** - Secure temporary file and directory management for generated configs

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
- **NEVER include specific line numbers** - they become stale immediately
  - Exception: Archived OpenSpec tasks (historical records, never modified)
- **NEVER include specific metrics that change frequently** - test counts, coverage percentages, file counts
- **NEVER include implementation details that change frequently** - reference function/variable names instead
- Comments should remain accurate without updates when code changes nearby

**Comment Examples**:

```typescript
// ❌ BAD: Specific line numbers become stale
// Note: This function is async because it awaits writeChangeset() (line 326)

// ✅ GOOD: Reference the function name instead
// Note: This function is async because it awaits writeChangeset()

// ❌ BAD: Specific metrics that require constant updates
// We have 538 tests with 93.75% coverage

// ✅ GOOD: General statements
// We have comprehensive test coverage (>90%)

// ❌ BAD: Brittle implementation details
// Loop runs 5 times to process each item in the array

// ✅ GOOD: Explain the WHY, not the WHAT
// Process items in small batches to avoid memory pressure

// ❌ BAD: Version-specific details that will become outdated
// Vitest v4: 'all' option was removed, use 'include' instead

// ✅ GOOD: Timeless explanation
// Use include pattern to specify files for coverage
```

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

**Creating Pull Requests**:

CRITICAL: ALWAYS read `.github/PULL_REQUEST_TEMPLATE.md` FIRST before creating a PR.

**Step-by-step process:**

1. **Read the template** - Open and review `.github/PULL_REQUEST_TEMPLATE.md` to understand required sections
2. **Prepare PR body** - Draft the PR description following the template EXACTLY
3. **Use the template structure** - Include ALL required sections in the correct order
4. **Create the PR** - Use `gh pr create` with the prepared body

**Resolving PR Review Comments**:

CRITICAL: Only resolve comments you have ACTUALLY addressed. Never bulk-resolve all comments.

**Review comment workflow:**

1. **Read each comment** - Understand what the reviewer is suggesting
2. **Evaluate the suggestion** - Decide if it's valid and should be implemented
3. **Take action** - Either implement the fix OR document why you're rejecting it
4. **Only then resolve** - Mark as resolved ONLY after addressing it

**Valid reasons to resolve:**

- ✅ You implemented the suggested fix
- ✅ You implemented an alternative fix that addresses the concern
- ✅ You documented in code/comments why the suggestion doesn't apply

**Invalid reasons to resolve:**

- ❌ You haven't looked at the comment yet
- ❌ You're bulk-resolving all comments without reviewing each one
- ❌ You're assuming it's not important without investigation

**Example workflow:**

```bash
# 1. Get unresolved comments
# Note: Replace "owner" and "repo" with your repository owner and name
# For more GraphQL examples, see: openspec/AGENTS.md
gh api graphql -f query='
  query {
    repository(owner: "owner", name: "repo") {
      pullRequest(number: 55) {
        reviewThreads(first: 10) {
          nodes {
            id
            isResolved
            comments(first: 1) {
              nodes { path body }
            }
          }
        }
      }
    }
  }
' --jq '.data.repository.pullRequest.reviewThreads.nodes[] | select(.isResolved == false)'

# 2. Review EACH comment individually

# 3. Fix the specific issue

# 4. Resolve ONLY the specific thread you addressed
gh api graphql -f query='
  mutation {
    resolveReviewThread(input: {threadId: "PRRT_kwDOP1frcc5gKTQ7"}) {
      thread { id isResolved }
    }
  }
'
```

**PR Template Structure**:

**Key principle:** PR description = commit message body (squash merge). Keep it clean and informative.

```markdown
<!--
PR title format: type(scope): description
Examples: fix(core): handle missing tsconfig, feat(cli): add --verbose flag

This description becomes the commit message body when squash merged.
-->

## Summary

<!-- What does this PR do? (1-2 sentences) -->

## Why

<!-- What problem does this solve? Why is this change needed? -->

## Changes

<!-- Key changes (bullet points) -->
```

**PR Content Guidelines**:

- **Summary**: Brief 1-2 sentence description of what the PR does
- **Why**: Explain the problem and motivation (narrative format, not bullets)
- **Changes**: Key changes as bullet points

**What NOT to include** (handled elsewhere):

- Test counts/coverage (visible in CI checks and Codecov bot)
- Changeset status (changeset-bot comments on PR)
- Checklists (review artifacts don't belong in commit history)
- Type of change (already in PR title)

**Common Mistakes to Avoid:**

- ❌ Don't leave HTML comment placeholders (replace `<!-- ... -->` with actual content)
- ❌ Don't just describe WHAT changed - explain WHY it matters
- ❌ Don't use bullets in the "Why" section - use narrative prose
- ❌ Don't copy-paste errors or logs without context
- ❌ Don't reference line numbers (they become stale immediately)
- ❌ Don't assume reviewers have full context - write for someone unfamiliar with the background
- ❌ Don't create massive PRs - if description is getting long, the PR is probably too big

**Before Submitting:**

- **Self-review first** - Review your own diff before requesting review; catch obvious issues
- **Think like a reviewer** - Anticipate questions and address them proactively in the description
- **Keep PRs focused** - Single purpose; smaller PRs merge faster and introduce fewer bugs

**Writing Tips:**

- **Be concise** - This becomes the permanent commit message
- **Lead with impact** - Start Summary with the user/developer benefit
- **Tell a story in Why** - Problem → Context → Solution approach
- **Link issues** - Use "Closes #123" or "Fixes #123" to auto-close issues
- **Consider future readers** - Someone debugging in 6 months should understand why this change was made
- **Document concerns** - Flag limitations, uncertainties, or areas needing extra attention
- **Explain design choices** - If you chose approach A over B, briefly explain why

**For Complex PRs:**

- **Guide the review** - Suggest file review order (e.g., "Start with `types.ts`, then `checker.ts`")
- **Specify feedback needed** - "Looking for quick review" vs "Need deeper architectural feedback"
- **Use collapsible sections** - For large CLI output or test results:

```markdown
<details>
<summary>Test output</summary>

\`\`\`
... large output here ...
\`\`\`

</details>
```

**PR vs Changeset Content**:

**PR Description** (becomes commit message body):

- Summary of what the PR does
- Why the change is needed (problem/motivation)
- Key changes (bullet points)

**Changeset** (becomes release notes):

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
   - ALWAYS maintain ESM build integrity (tsdown output is ESM-only)

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
- [Architecture Overview](../docs/architecture/README.md) - High-level system design
- [Architecture Details](../docs/architecture/details.md) - In-depth implementation notes
- [Testing Strategy](../docs/testing/strategy.md) - Testing approach
