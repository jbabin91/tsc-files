# Implementation Tasks: dot-agents Phase 1 MVP

## 1. Project Setup

### 1.1 Repository Initialization

- [ ] 1.1.1 Create new GitHub repository: `@jbabin91/dot-agents`
- [ ] 1.1.2 Initialize with README, LICENSE (MIT), .gitignore
- [ ] 1.1.3 Set up pnpm workspaces for monorepo
- [ ] 1.1.4 Configure Bun 1.3+ as primary runtime
- [ ] 1.1.5 Add bun.lockb to version control

### 1.2 Monorepo Structure

- [ ] 1.2.1 Create `packages/core/` directory structure
- [ ] 1.2.2 Create `packages/cli/` directory structure
- [ ] 1.2.3 Create `packages/generators/claude/` directory structure
- [ ] 1.2.4 Create `packages/generators/cursor/` directory structure
- [ ] 1.2.5 Create `packages/generators/copilot/` directory structure
- [ ] 1.2.6 Create `packages/generators/opencode/` directory structure
- [ ] 1.2.7 Set up root package.json with workspace definitions

### 1.3 Development Tooling

- [ ] 1.3.1 Set up TypeScript (strict mode, tsconfig.json per package)
- [ ] 1.3.2 Configure Vitest for testing
- [ ] 1.3.3 Set up Prettier for code formatting
- [ ] 1.3.4 Configure ESLint or Biome for linting
- [ ] 1.3.5 Add Changesets for release management
- [ ] 1.3.6 Create .editorconfig for consistency

## 2. Core Package (@dotai/core)

### 2.1 Schema Definitions

- [ ] 2.1.1 Create Zod schema for `dotagents.yaml` config file
- [ ] 2.1.2 Create Zod schema for generator configuration
- [ ] 2.1.3 Create Zod schema for optimization settings
- [ ] 2.1.4 Create Zod schema for MCP server config (Phase 4 prep)
- [ ] 2.1.5 Export all schemas with TypeScript types

### 2.2 Configuration Parser

- [ ] 2.2.1 Implement `.agents/dotagents.yaml` discovery (cosmiconfig)
- [ ] 2.2.2 Implement YAML parsing with validation
- [ ] 2.2.3 Implement default configuration fallbacks
- [ ] 2.2.4 Add error handling for malformed YAML
- [ ] 2.2.5 Create configuration validation function

### 2.3 Instruction File Parser

- [ ] 2.3.1 Implement `.agents/instructions/` directory scanner
- [ ] 2.3.2 Implement markdown file parser (with gray-matter for frontmatter)
- [ ] 2.3.3 Implement glob pattern matching for includes/excludes
- [ ] 2.3.4 Implement file ordering logic (maintain consistent order)
- [ ] 2.3.5 Add caching for parsed files (performance optimization)

### 2.4 Validator

- [ ] 2.4.1 Implement config file validation
- [ ] 2.4.2 Implement source file existence checks
- [ ] 2.4.3 Implement circular dependency detection
- [ ] 2.4.4 Implement duplicate file warnings
- [ ] 2.4.5 Create validation report generator

### 2.5 Testing

- [ ] 2.5.1 Unit tests for schema validation (>90% coverage)
- [ ] 2.5.2 Unit tests for YAML parsing
- [ ] 2.5.3 Unit tests for markdown parsing
- [ ] 2.5.4 Integration tests for full parsing pipeline
- [ ] 2.5.5 Test fixtures for various config scenarios

## 3. CLI Package (da command)

### 3.1 oclif Setup

- [ ] 3.1.1 Initialize oclif project structure
- [ ] 3.1.2 Configure TypeScript with oclif
- [ ] 3.1.3 Set up command discovery
- [ ] 3.1.4 Configure help text and branding
- [ ] 3.1.5 Set up error handling

### 3.2 `da init` Command

- [ ] 3.2.1 Create oclif command: `src/commands/init.ts`
- [ ] 3.2.2 Implement `.agents/` directory creation
- [ ] 3.2.3 Create starter `dotagents.yaml` template
- [ ] 3.2.4 Create starter instruction files (core.md, git-conventions.md, etc.)
- [ ] 3.2.5 Add interactive prompts (which tools to enable)
- [ ] 3.2.6 Add `--yes` flag for non-interactive mode
- [ ] 3.2.7 Handle existing `.agents/` directory (skip or overwrite)

### 3.3 `da apply` Command

- [ ] 3.3.1 Create oclif command: `src/commands/apply.ts`
- [ ] 3.3.2 Load configuration from `.agents/dotagents.yaml`
- [ ] 3.3.3 Discover and load generators
- [ ] 3.3.4 Parse source files from `.agents/instructions/`
- [ ] 3.3.5 Apply selective inclusion per generator
- [ ] 3.3.6 Generate all tool config files
- [ ] 3.3.7 Write files with "DO NOT EDIT" headers
- [ ] 3.3.8 Add `--dry-run` flag to preview changes
- [ ] 3.3.9 Add progress indicators (ora spinners)

### 3.4 `da validate` Command

- [ ] 3.4.1 Create oclif command: `src/commands/validate.ts`
- [ ] 3.4.2 Load configuration and validate schema
- [ ] 3.4.3 Check source file existence
- [ ] 3.4.4 Verify generated files match source (detect drift)
- [ ] 3.4.5 Display validation report with colors (kleur)
- [ ] 3.4.6 Exit with appropriate code (0 = valid, 1 = invalid)

### 3.5 `da list` Command

- [ ] 3.5.1 Create oclif command: `src/commands/list.ts`
- [ ] 3.5.2 Display configured tools
- [ ] 3.5.3 Display enabled generators
- [ ] 3.5.4 Display enabled optimizations
- [ ] 3.5.5 Show file paths for generated configs
- [ ] 3.5.6 Add `--json` flag for machine-readable output

### 3.6 `da diff` Command

- [ ] 3.6.1 Create oclif command: `src/commands/diff.ts`
- [ ] 3.6.2 Compare current generated files with what would be generated
- [ ] 3.6.3 Display diff in readable format
- [ ] 3.6.4 Highlight additions/deletions/modifications
- [ ] 3.6.5 Add `--tool <name>` flag to show diff for specific tool

### 3.7 Testing

- [ ] 3.7.1 Unit tests for each command (>80% coverage)
- [ ] 3.7.2 Integration tests with temp directories
- [ ] 3.7.3 Test interactive prompts
- [ ] 3.7.4 Test error handling (missing config, invalid YAML, etc.)
- [ ] 3.7.5 Cross-platform tests (Windows, macOS, Linux)

## 4. Generator: Claude (@dotai/generator-claude)

### 4.1 AGENTS.md Generator

- [ ] 4.1.1 Implement generator interface
- [ ] 4.1.2 Parse selective inclusion config
- [ ] 4.1.3 Concatenate source files in order
- [ ] 4.1.4 Add file header: "<!-- AUTO-GENERATED by dot-agents -->"
- [ ] 4.1.5 Apply command batching optimization
- [ ] 4.1.6 Write to `AGENTS.md` at project root
- [ ] 4.1.7 Validate generated file (syntax, structure)

### 4.2 CLAUDE.md Generator

- [ ] 4.2.1 Implement generator interface
- [ ] 4.2.2 Parse selective inclusion config (includes all sources)
- [ ] 4.2.3 Concatenate source files in order
- [ ] 4.2.4 Add file header with warning
- [ ] 4.2.5 Apply CLAUDE.md persistent memory patterns
- [ ] 4.2.6 Apply command batching optimization
- [ ] 4.2.7 Write to `CLAUDE.md` at project root
- [ ] 4.2.8 Validate generated file

### 4.3 Testing

- [ ] 4.3.1 Unit tests for AGENTS.md generation
- [ ] 4.3.2 Unit tests for CLAUDE.md generation
- [ ] 4.3.3 Test selective inclusion logic
- [ ] 4.3.4 Test optimization application
- [ ] 4.3.5 Integration tests with real fixtures

## 5. Generator: Cursor (@dotai/generator-cursor)

### 5.1 .cursorrules Generator

- [ ] 5.1.1 Implement generator interface
- [ ] 5.1.2 Parse selective inclusion config
- [ ] 5.1.3 Concatenate source files in order
- [ ] 5.1.4 Add file header
- [ ] 5.1.5 Exclude Claude-specific content
- [ ] 5.1.6 Apply command batching optimization
- [ ] 5.1.7 Write to `.cursorrules` at project root
- [ ] 5.1.8 Validate generated file

### 5.2 Testing

- [ ] 5.2.1 Unit tests for .cursorrules generation
- [ ] 5.2.2 Test exclusion of Claude-specific content
- [ ] 5.2.3 Test optimization application
- [ ] 5.2.4 Integration tests with real fixtures

## 6. Generator: Copilot (@dotai/generator-copilot)

### 6.1 copilot-instructions.md Generator

- [ ] 6.1.1 Implement generator interface
- [ ] 6.1.2 Parse selective inclusion config (curated subset)
- [ ] 6.1.3 Concatenate source files in order
- [ ] 6.1.4 Add file header
- [ ] 6.1.5 Optimize for PR review context (minimal content)
- [ ] 6.1.6 Write to `.github/copilot-instructions.md`
- [ ] 6.1.7 Validate generated file

### 6.2 Testing

- [ ] 6.2.1 Unit tests for copilot-instructions.md generation
- [ ] 6.2.2 Test curated subset selection
- [ ] 6.2.3 Test file size optimization
- [ ] 6.2.4 Integration tests with real fixtures

## 7. Generator: OpenCode (@dotai/generator-opencode)

### 7.1 AGENTS.md Generator (reuse Claude generator)

- [ ] 7.1.1 Use shared AGENTS.md generator from Claude package
- [ ] 7.1.2 Configure selective inclusion

### 7.2 Testing

- [ ] 7.2.1 Unit tests for OpenCode AGENTS.md generation
- [ ] 7.2.2 Verify consistency with Claude's AGENTS.md
- [ ] 7.2.3 Integration tests with real fixtures

## 8. Optimizations Implementation

### 8.1 Command Batching

- [ ] 8.1.1 Create optimization module: `src/optimizations/command-batching.ts`
- [ ] 8.1.2 Detect quality gate commands in source files
- [ ] 8.1.3 Consolidate commands (6 → 1 batched command)
- [ ] 8.1.4 Add fail-fast execution notes
- [ ] 8.1.5 Test command consolidation logic

### 8.2 Context Patterns (Phase 1 - Basic)

- [ ] 8.2.1 Create optimization module: `src/optimizations/context-patterns.ts`
- [ ] 8.2.2 Apply CLAUDE.md persistent memory header
- [ ] 8.2.3 Add context management sections
- [ ] 8.2.4 Test pattern application

## 9. Documentation

### 9.1 User Documentation

- [ ] 9.1.1 Write comprehensive README.md
  - Quick start guide
  - Installation instructions
  - Basic usage examples
  - CLI command reference
- [ ] 9.1.2 Create CONTRIBUTING.md
  - Development setup
  - Testing guidelines
  - Generator development guide
- [ ] 9.1.3 Write migration guide (from manual configs)
- [ ] 9.1.4 Create examples directory with sample configs

### 9.2 API Documentation

- [ ] 9.2.1 Document core API (@dotai/core exports)
- [ ] 9.2.2 Document generator interface
- [ ] 9.2.3 Document configuration schema
- [ ] 9.2.4 Add JSDoc comments to all public APIs

### 9.3 Research Documentation

- [ ] 9.3.1 Migrate `findings.md` to `docs/research/token-optimization.md`
- [ ] 9.3.2 Migrate relevant sections of `research-tracking.md` to `docs/research/`
- [ ] 9.3.3 Migrate `re-evaluation.md` to `docs/research/tool-filtering.md`
- [ ] 9.3.4 Create `docs/optimizations.md` with distilled patterns

## 10. Build & Distribution

### 10.1 Build Configuration

- [ ] 10.1.1 Configure Bun build for single file executables
- [ ] 10.1.2 Configure TypeScript compilation for npm package
- [ ] 10.1.3 Set up build scripts in root package.json
- [ ] 10.1.4 Test Node.js compatibility (>=18)

### 10.2 npm Publishing

- [ ] 10.2.1 Configure package.json for npm publishing
- [ ] 10.2.2 Set up npm provenance
- [ ] 10.2.3 Configure Changesets for versioning
- [ ] 10.2.4 Test local npm link installation
- [ ] 10.2.5 Publish to npm: `@jbabin91/dot-agents`

### 10.3 Standalone Binaries

- [ ] 10.3.1 Build standalone binary for macOS (arm64 + x64)
- [ ] 10.3.2 Build standalone binary for Linux (x64)
- [ ] 10.3.3 Build standalone binary for Windows (x64)
- [ ] 10.3.4 Test binaries on each platform
- [ ] 10.3.5 Create GitHub Release with binaries

## 11. CI/CD

### 11.1 GitHub Actions Workflows

- [ ] 11.1.1 Create CI workflow (lint, typecheck, test)
- [ ] 11.1.2 Create release workflow (changesets + npm publish)
- [ ] 11.1.3 Create binary build workflow (cross-platform binaries)
- [ ] 11.1.4 Set up automated testing on push
- [ ] 11.1.5 Configure secrets (NPM_TOKEN, GITHUB_TOKEN)

### 11.2 Quality Gates

- [ ] 11.2.1 Enforce lint checks in CI
- [ ] 11.2.2 Enforce type checking in CI
- [ ] 11.2.3 Enforce test coverage thresholds (>80%)
- [ ] 11.2.4 Enforce build success before merge
- [ ] 11.2.5 Set up branch protection rules

## 12. Integration Testing

### 12.1 End-to-End Tests

- [ ] 12.1.1 Test full workflow: init → apply → validate
- [ ] 12.1.2 Test with real project fixtures
- [ ] 12.1.3 Test all 4 generators together
- [ ] 12.1.4 Test optimization application
- [ ] 12.1.5 Test cross-platform compatibility

### 12.2 Real-World Testing

- [ ] 12.2.1 Test with tsc-files project (dogfooding)
- [ ] 12.2.2 Migrate tsc-files to use dot-agents
- [ ] 12.2.3 Verify generated files match manual configs
- [ ] 12.2.4 Test with other projects (if available)

## 13. Release Preparation

### 13.1 Pre-Release Checklist

- [ ] 13.1.1 All Phase 1 MVP tasks completed
- [ ] 13.1.2 All tests passing (>80% coverage)
- [ ] 13.1.3 Documentation complete and accurate
- [ ] 13.1.4 Changelog generated (Changesets)
- [ ] 13.1.5 Version numbers updated

### 13.2 Release

- [ ] 13.2.1 Create Git tag: `v0.1.0`
- [ ] 13.2.2 Publish to npm: `@jbabin91/dot-agents@0.1.0`
- [ ] 13.2.3 Create GitHub Release with binaries
- [ ] 13.2.4 Announce on relevant communities (Twitter, Reddit, etc.)
- [ ] 13.2.5 Update tsc-files to use dot-agents

## 14. Future Phases (Stub Specs)

### Phase 2: Command Generation

- [ ] 14.1 Create stub spec: `openspec/specs/command-generation/spec.md`
- [ ] 14.2 Document slash command format
- [ ] 14.3 Document generator interface for commands

### Phase 3: Agent Generation

- [ ] 14.3.1 Create stub spec: `openspec/specs/agent-generation/spec.md`
- [ ] 14.3.2 Document sub-agent template format
- [ ] 14.3.3 Document orchestrator-worker patterns

### Phase 4: MCP Configuration

- [ ] 14.4.1 Create stub spec: `openspec/specs/mcp-configuration/spec.md`
- [ ] 14.4.2 Document MCP server config format
- [ ] 14.4.3 Document tool filtering logic
