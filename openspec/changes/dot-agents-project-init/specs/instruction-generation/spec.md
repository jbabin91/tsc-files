# Capability: Instruction Generation (Phase 1 MVP)

## Overview

The instruction generation capability enables dot-agents to parse AI agent instruction files from a central `.agents/instructions/` directory and generate tool-specific configuration files (AGENTS.md, CLAUDE.md, .cursorrules, .github/copilot-instructions.md) with selective inclusion and automatic optimization application.

**Scope**: Phase 1 MVP - Core instruction file parsing and generation for 4 AI coding tools.

**Out of Scope**: Slash commands (Phase 2), sub-agent templates (Phase 3), MCP configuration (Phase 4).

## Requirements

### Requirement: Configuration Discovery

The system SHALL discover and parse the `.agents/dotagents.yaml` configuration file to determine enabled tools, generator settings, and optimization preferences.

#### Scenario: Valid configuration file found

- **WHEN** user runs `da apply` in a project with `.agents/dotagents.yaml`
- **THEN** the system loads and validates the configuration using Zod schema
- **AND** extracts enabled tools list (claude-code, cursor, copilot, opencode)
- **AND** extracts generator-specific include/exclude patterns
- **AND** extracts optimization settings (command_batching, context_patterns)

#### Scenario: Missing configuration file

- **WHEN** user runs `da apply` without `.agents/dotagents.yaml`
- **THEN** the system displays error: "Configuration file not found. Run 'da init' to create .agents/ directory"
- **AND** exits with code 2 (configuration error)

#### Scenario: Invalid YAML syntax

- **WHEN** `.agents/dotagents.yaml` contains syntax errors
- **THEN** the system displays YAML parsing error with line number
- **AND** exits with code 2 (configuration error)

#### Scenario: Schema validation fails

- **WHEN** `.agents/dotagents.yaml` has invalid structure (e.g., missing required fields)
- **THEN** the system displays Zod validation errors
- **AND** exits with code 2 (configuration error)

### Requirement: Source File Parsing

The system SHALL parse markdown files from `.agents/instructions/` directory, extract content and optional frontmatter, and prepare files for selective inclusion.

#### Scenario: Parse instruction files successfully

- **WHEN** `.agents/instructions/` contains markdown files (core.md, git-conventions.md, etc.)
- **THEN** the system reads all .md files recursively
- **AND** parses frontmatter using gray-matter (if present)
- **AND** extracts markdown content
- **AND** maintains file order for deterministic output

#### Scenario: File with frontmatter

- **WHEN** instruction file contains YAML frontmatter
- **THEN** the system extracts frontmatter metadata
- **AND** preserves markdown content separately
- **AND** makes both available to generators

```markdown
---
title: 'Core Instructions'
priority: 1
---

# Core Instructions

Project mission and goals...
```

#### Scenario: Missing instruction directory

- **WHEN** `.agents/instructions/` directory does not exist
- **THEN** the system displays error: "Instructions directory not found at .agents/instructions/"
- **AND** suggests running `da init` to create structure
- **AND** exits with code 2 (configuration error)

#### Scenario: Empty instruction directory

- **WHEN** `.agents/instructions/` exists but contains no .md files
- **THEN** the system displays warning: "No instruction files found in .agents/instructions/"
- **AND** continues with empty source set (generators may skip or use defaults)

### Requirement: Selective Inclusion

The system SHALL apply per-generator include/exclude glob patterns to filter which source files contribute to each generated output file.

#### Scenario: Include pattern matches files

- **WHEN** generator config specifies `include: ["instructions/core.md", "instructions/git-conventions.md"]`
- **THEN** the system includes only matching files in that generator's output
- **AND** maintains include order for deterministic concatenation

#### Scenario: Glob pattern matching

- **WHEN** generator config specifies `include: ["instructions/**/*.md"]`
- **THEN** the system includes all markdown files recursively under instructions/
- **AND** maintains alphabetical order within directory levels

#### Scenario: Exclude pattern filters files

- **WHEN** generator config specifies `exclude: ["instructions/claude-*"]`
- **THEN** the system excludes any files matching the pattern
- **AND** applies exclude after include (exclude wins on conflict)

#### Scenario: No files match patterns

- **WHEN** include/exclude patterns result in empty file set
- **THEN** the system displays warning for that generator
- **AND** skips generating that output file (or generates with header only)

### Requirement: AGENTS.md Generation (Universal)

The system SHALL generate `AGENTS.md` at project root containing universal AI agent instructions suitable for multiple tools (Claude Code, Cursor, OpenCode).

#### Scenario: Generate AGENTS.md successfully

- **WHEN** user runs `da apply` with `agents` generator configured
- **THEN** the system concatenates included source files in order
- **AND** adds file header: `<!-- AUTO-GENERATED by dot-agents from .agents/ directory -->`
- **AND** adds warning: `<!-- DO NOT EDIT - Changes will be overwritten -->`
- **AND** applies command batching optimization (if enabled)
- **AND** writes output to `AGENTS.md` at project root

#### Scenario: AGENTS.md with universal content

- **WHEN** generating AGENTS.md
- **THEN** the output excludes Claude-specific content (Plan Mode, sub-agents, TodoWrite)
- **AND** includes universal patterns (git conventions, security, testing, agentic workflows)
- **AND** includes project-specific instructions (core.md)

### Requirement: CLAUDE.md Generation (Claude-Specific)

The system SHALL generate `CLAUDE.md` at project root containing comprehensive instructions for Claude Code, including universal content plus Claude-specific features.

#### Scenario: Generate CLAUDE.md successfully

- **WHEN** user runs `da apply` with `claude` generator configured
- **THEN** the system concatenates all included source files (universal + Claude-specific)
- **AND** adds file header with warning
- **AND** applies CLAUDE.md persistent memory patterns
- **AND** applies command batching optimization (if enabled)
- **AND** writes output to `CLAUDE.md` at project root

#### Scenario: CLAUDE.md includes Claude-specific features

- **WHEN** generating CLAUDE.md
- **THEN** the output includes Claude Code features (Plan Mode, sub-agents, TodoWrite, context management)
- **AND** includes universal content (from AGENTS.md)
- **AND** includes Claude-specific workflow patterns

### Requirement: .cursorrules Generation (Cursor-Specific)

The system SHALL generate `.cursorrules` at project root containing instructions for Cursor AI editor, excluding Claude-specific content.

#### Scenario: Generate .cursorrules successfully

- **WHEN** user runs `da apply` with `cursor` generator configured
- **THEN** the system concatenates included source files
- **AND** excludes files matching `claude-*` pattern
- **AND** adds file header with warning
- **AND** applies command batching optimization (if enabled)
- **AND** writes output to `.cursorrules` at project root

#### Scenario: .cursorrules excludes Claude features

- **WHEN** generating .cursorrules
- **THEN** the output excludes Claude Code-specific content
- **AND** includes universal patterns suitable for Cursor
- **AND** includes project-specific instructions

### Requirement: copilot-instructions.md Generation (Copilot-Specific)

The system SHALL generate `.github/copilot-instructions.md` containing curated subset of instructions optimized for GitHub Copilot PR review context.

#### Scenario: Generate copilot-instructions.md successfully

- **WHEN** user runs `da apply` with `copilot` generator configured
- **THEN** the system concatenates minimal included files (core.md, git-conventions.md, security.md)
- **AND** creates `.github/` directory if it doesn't exist
- **AND** adds file header with warning
- **AND** writes output to `.github/copilot-instructions.md`

#### Scenario: Curated subset for PR reviews

- **WHEN** generating copilot-instructions.md
- **THEN** the output includes only essential content for PR review context (~800-1000 lines)
- **AND** excludes verbose workflow patterns, testing details, and tool-specific features
- **AND** focuses on code quality, security, and commit conventions

### Requirement: Command Batching Optimization

The system SHALL detect separate quality gate commands in source files and consolidate them into a single batched command when optimization is enabled.

#### Scenario: Detect separate commands

- **WHEN** source files contain separate quality gate commands:
  - `pnpm lint`
  - `pnpm format`
  - `pnpm typecheck`
  - `pnpm test:coverage`
  - `pnpm lint:md`
  - `pnpm build`
- **THEN** the optimization detects this pattern

#### Scenario: Apply command batching

- **WHEN** `command_batching: true` in dotagents.yaml
- **THEN** the system replaces separate commands with batched version:

```bash
pnpm lint && pnpm format && pnpm typecheck && pnpm test:coverage && pnpm lint:md && pnpm build
```

- **AND** adds note: "Fail-fast execution: stops on first error"
- **AND** documents benefit: "Saves 5+ tool calls per quality check"

#### Scenario: Optimization disabled

- **WHEN** `command_batching: false` or optimization not configured
- **THEN** the system preserves original separate commands
- **AND** does not apply command batching

### Requirement: CLAUDE.md Persistent Memory Optimization

The system SHALL add CLAUDE.md persistent memory header section when generating Claude-specific files and optimization is enabled.

#### Scenario: Apply persistent memory pattern

- **WHEN** `context_patterns: true` in dotagents.yaml and generating CLAUDE.md
- **THEN** the system adds persistent memory header section
- **AND** includes context management instructions
- **AND** documents benefit: "70-80% context reduction, 5-7x longer sessions"

#### Scenario: Optimization disabled for non-Claude generators

- **WHEN** generating files for non-Claude tools (Cursor, Copilot, OpenCode)
- **THEN** the system does not apply CLAUDE.md persistent memory patterns
- **AND** uses appropriate patterns for each tool

### Requirement: File Header Generation

The system SHALL add clear headers to all generated files warning users not to edit them directly.

#### Scenario: Standard file header

- **WHEN** generating any output file
- **THEN** the system adds header block:

```markdown
<!-- AUTO-GENERATED by dot-agents v0.1.0 -->
<!-- DO NOT EDIT - Changes will be overwritten -->
<!-- Source files: .agents/instructions/ -->
<!-- To modify, edit source files and run 'da apply' -->
<!-- Generated: 2025-01-15T10:30:00Z -->
```

- **AND** includes dot-agents version number
- **AND** includes generation timestamp

### Requirement: Validation

The system SHALL validate generated files against expected structure and detect configuration drift.

#### Scenario: Validate generated files match source

- **WHEN** user runs `da validate`
- **THEN** the system loads configuration and source files
- **AND** generates output files in memory (not written to disk)
- **AND** compares in-memory output with actual files on disk
- **AND** reports any differences (drift detected)

#### Scenario: No drift detected

- **WHEN** `da validate` completes and files match
- **THEN** the system displays: "✓ All generated files are up to date"
- **AND** exits with code 0 (success)

#### Scenario: Drift detected

- **WHEN** `da validate` finds differences between expected and actual
- **THEN** the system displays: "✗ Drift detected in generated files:"
- **AND** lists affected files with brief diff summary
- **AND** suggests: "Run 'da apply' to regenerate from source"
- **AND** exits with code 1 (validation failed)

### Requirement: CLI Commands

The system SHALL provide intuitive CLI commands for initialization, generation, validation, and listing.

#### Scenario: da init creates starter structure

- **WHEN** user runs `da init` in empty project
- **THEN** the system creates `.agents/` directory
- **AND** creates `dotagents.yaml` with sensible defaults
- **AND** creates starter instruction files (core.md, git-conventions.md, security.md, testing.md)
- **AND** displays: "✓ Initialized .agents/ directory. Run 'da apply' to generate configs."

#### Scenario: da init with existing structure

- **WHEN** user runs `da init` and `.agents/` already exists
- **THEN** the system displays: "✗ .agents/ directory already exists. Use --force to overwrite."
- **AND** exits with code 2 (configuration error)

#### Scenario: da apply generates all configs

- **WHEN** user runs `da apply`
- **THEN** the system loads configuration
- **AND** parses source files
- **AND** generates all enabled tool configs
- **AND** displays progress with spinners (ora)
- **AND** displays summary: "✓ Generated 4 files: AGENTS.md, CLAUDE.md, .cursorrules, .github/copilot-instructions.md"

#### Scenario: da apply with dry-run

- **WHEN** user runs `da apply --dry-run`
- **THEN** the system generates files in memory
- **AND** displays what would be written (file paths, sizes)
- **AND** does not write files to disk
- **AND** exits with code 0

#### Scenario: da list shows configuration

- **WHEN** user runs `da list`
- **THEN** the system displays enabled tools
- **AND** displays enabled generators with target files
- **AND** displays enabled optimizations
- **AND** displays source file count

#### Scenario: da diff shows changes

- **WHEN** user runs `da diff`
- **THEN** the system generates files in memory
- **AND** compares with existing files on disk
- **AND** displays unified diff for each file
- **AND** highlights additions/deletions/modifications

## Design Decisions

See [design.md](../../design.md) for comprehensive technical decisions including:

- CLI framework selection (oclif)
- Runtime choice (Bun 1.3+ with dual distribution)
- Monorepo structure (Day 1)
- Configuration format (YAML)
- Generated file philosophy (committed, not gitignored)

## Success Metrics

**Phase 1 MVP**:

- [ ] All 4 generators working (Claude, Cursor, Copilot, OpenCode)
- [ ] Command batching optimization applied automatically
- [ ] CLAUDE.md persistent memory optimization applied
- [ ] Validation detects drift accurately
- [ ] CLI commands intuitive and responsive (<100ms startup)
- [ ] Cross-platform compatibility (Windows, macOS, Linux)
- [ ] Test coverage >80%

## Future Phases

**Phase 2**: Command generation (slash commands)
**Phase 3**: Agent generation (sub-agent templates)
**Phase 4**: MCP configuration (tool filtering)

See [proposal.md](../../proposal.md) for complete roadmap.
