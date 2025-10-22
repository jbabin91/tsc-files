# Project Context

## Purpose

`@jbabin91/dot-agents` (CLI: `da`) is a universal AI agent configuration manager - "dotfiles for agents". It provides centralized management of AI coding assistant configurations across multiple tools (Claude Code, Cursor, VS Code Copilot, OpenCode, Zed) from a single `.agents/` source directory.

**Mission**: Eliminate AI agent configuration drift and duplication. Write once in `.agents/`, generate configurations for all your AI coding tools.

**Key Goals**:

- Single source of truth for AI agent instructions, commands, and workflows
- Generate tool-specific configs from universal `.agents/` directory
- Commit generated files (no regeneration required on clone)
- Support selective inclusion (different tools get appropriate subsets)
- Automatic optimization application (command batching, context reduction, tool filtering)
- Plugin architecture for community-contributed generators

## Tech Stack

### Core Technologies

- **Bun** (>=1.3.0) - Runtime with single file executables, native TypeScript support
- **TypeScript** - Strict configuration throughout
- **bun.lockb** - Bun's native lock file format
- **pnpm workspaces** - Monorepo structure for plugin ecosystem

### CLI Framework

- **oclif** (v4.22+) - Enterprise-grade CLI framework with plugin architecture
  - Native plugin system for generator extensibility
  - Auto-updating installers
  - TypeScript-first with minimal boilerplate
  - Battle-tested (Salesforce/Heroku CLIs)

### Build & Distribution

- **Bun build** - Single file executables for standalone distribution
- **npm publishing** - Node.js-compatible package for `npm install`
- **GitHub Releases** - Standalone binaries for non-Node users
- **Dual distribution** - npm + standalone binaries

### Configuration & Parsing

- **yaml** - Configuration file format (`.agents/dotagents.yaml`)
- **zod** - Runtime schema validation
- **cosmiconfig** - Configuration discovery
- **gray-matter** - Frontmatter parsing for instruction files

### Testing & Quality

- **Vitest** - Testing framework with native Bun support
- **Biome** or **ESLint** - Linting (evaluate Bun-native options)
- **Prettier** - Code formatting
- **Changesets** - Automated versioning and releases

## Project Conventions

### Code Style

**TypeScript Best Practices**:

- STRICT TypeScript with no `any` types
- Use type-only imports: `import type { Type } from 'module'`
- JSDoc for public APIs
- Path aliases: `@dotai/*` for internal packages

**Monorepo Structure**:

```text
packages/
├── core/                     # @dotai/core - Schema, parser, validation
│   ├── src/
│   │   ├── schema/          # Zod schemas for config
│   │   ├── parser/          # .agents/ directory parser
│   │   ├── validator/       # Config validation
│   │   └── types/           # Shared TypeScript types
│   └── package.json
├── cli/                      # CLI package (da command)
│   ├── src/
│   │   ├── commands/        # oclif commands
│   │   │   ├── init.ts
│   │   │   ├── apply.ts
│   │   │   ├── validate.ts
│   │   │   └── list.ts
│   │   └── index.ts
│   └── package.json
└── generators/
    ├── claude/              # @dotai/generator-claude
    │   ├── src/
    │   │   ├── generate-agents-md.ts
    │   │   └── generate-claude-md.ts
    │   └── package.json
    ├── cursor/              # @dotai/generator-cursor
    │   ├── src/
    │   │   └── generate-cursorrules.ts
    │   └── package.json
    ├── copilot/             # @dotai/generator-copilot
    │   ├── src/
    │   │   └── generate-copilot-instructions.ts
    │   └── package.json
    └── opencode/            # @dotai/generator-opencode
        ├── src/
        │   └── generate-opencode-config.ts
        └── package.json
```

### Architecture Patterns

**Four-Phase Roadmap**:

1. **Phase 1 (MVP):** `instruction-generation` - Parse `.agents/instructions/`, generate tool configs
2. **Phase 2:** `command-generation` - Slash commands support
3. **Phase 3:** `agent-generation` - Sub-agent templates
4. **Phase 4:** `mcp-configuration` - MCP server management with tool filtering

**Plugin Architecture**:

- Generators as oclif plugins
- Community can publish `@scope/dotai-generator-*` packages
- Core CLI discovers and loads generators
- Standard generator interface for consistency

### .agents/ Directory Structure

```text
.agents/
├── dotagents.yaml              # Main configuration
├── instructions/               # Modular instruction files
│   ├── core.md                # Project overview, mission
│   ├── git-conventions.md     # Commit format, branch naming
│   ├── security.md            # Security requirements
│   ├── testing.md             # Testing guidelines
│   ├── agentic-workflows.md   # Universal workflow patterns
│   └── permissions.md         # Git commit/push gates
├── commands/                   # Slash commands (Phase 2)
│   ├── commit.md
│   └── pr-review.md
├── agents/                    # Sub-agent templates (Phase 3)
│   ├── security-expert.md
│   └── code-reviewer.md
└── mcp-servers/               # MCP configs (Phase 4)
    └── github.yaml
```

### Configuration File Format

**`dotagents.yaml`**:

```yaml
# Project metadata
project:
  name: 'My Project'
  version: '1.0.0'

# Target tools
tools:
  - claude-code
  - cursor
  - copilot
  - opencode

# Optimization features
optimizations:
  command_batching: true # Consolidate quality gates
  context_patterns: true # Apply CLAUDE.md persistent memory
  tool_filtering: true # Reduce MCP tool noise

# Generator configurations
generators:
  agents: # Universal AGENTS.md
    include:
      - instructions/core.md
      - instructions/git-conventions.md
      - instructions/security.md
      - instructions/testing.md
      - instructions/agentic-workflows.md
      - instructions/permissions.md

  claude: # Claude-specific CLAUDE.md
    include:
      - instructions/**/*.md
      - commands/**/*.md # Phase 2
      - agents/**/*.md # Phase 3

  cursor: # Cursor .cursorrules
    include:
      - instructions/**/*.md
    exclude:
      - instructions/claude-*

  copilot: # Curated for PR reviews
    include:
      - instructions/core.md
      - instructions/git-conventions.md
      - instructions/security.md

# MCP server configurations (Phase 4)
mcp_servers:
  github:
    enabled: true
    tools:
      include:
        - create_issue
        - create_pull_request
        - search_code
      exclude:
        - list_*
```

### Git Workflow

**Branching Strategy**:

- `main` - Production-ready code
- Feature branches for development
- Monorepo changesets for coordinated releases

**Commit Conventions** (Conventional Commits + Gitmojis):

```bash
<type>(<scope>): <gitmoji> <description>

# Examples:
feat(cli): :sparkles: add da apply command
feat(generator-claude): :sparkles: implement AGENTS.md generation
fix(core): :bug: handle missing dotagents.yaml gracefully
docs: :memo: add getting started guide
```

**Scopes**:

- `cli` - CLI commands
- `core` - Core parser/validator
- `generator-*` - Specific generator
- `docs` - Documentation

**Release Process**:

1. Create changeset: `bunx changeset`
2. Push to main → CI runs
3. CI success → "Version Packages" PR created
4. Merge PR → Automatic npm publishing

## Domain Context

### AI Coding Agent Ecosystem

**Target Tools** (Phase 1):

1. **Claude Code** - Claude Desktop CLI for coding (claude.ai/code)
   - Reads: `CLAUDE.md` (tool-specific), `AGENTS.md` (universal)
   - Features: Plan Mode, sub-agents, TodoWrite, context management
   - Optimizations: CLAUDE.md persistent memory, command batching

2. **Cursor** - AI-first code editor (cursor.com)
   - Reads: `AGENTS.md` (primary), `.cursorrules` (legacy)
   - Features: Agent mode, codebase context
   - Optimizations: Selective inclusion, context patterns

3. **VS Code Copilot** - GitHub Copilot for VS Code
   - Reads: `.github/copilot-instructions.md`
   - Use case: PR reviews (curated subset)
   - Optimizations: Minimal context for review scope

4. **OpenCode** - Open-source AI coding assistant
   - Reads: `AGENTS.md`
   - Features: MCP tool filtering via `.opencode/config.json`
   - Optimizations: Tool filtering integration

5. **Zed** - High-performance code editor with AI
   - Reads: `AGENTS.md` (planned support)
   - Status: Research phase

### Industry Standards

**AGENTS.md Format**:

- Industry standard 2025 (20,000+ repos)
- Backed by OpenAI, Google, Cursor, Factory
- Universal format read by multiple tools
- Root-level file for discoverability

**Selective Inclusion Pattern** (from Ruler):

- Central source files in `.agents/`
- Per-tool configuration defines includes/excludes
- Generated files committed to version control
- No regeneration required on clone

### Research-Backed Optimizations

**From 7,635 lines of research** (`findings.md`, `research-tracking.md`, `re-evaluation.md`):

1. **Command Batching** - Consolidate 6 quality gates → 1 command (saves 5+ tool calls)
2. **Context Reduction** - 70-80% reduction via CLAUDE.md + orchestrator + hierarchical instructions
3. **Session Length** - 5-7x longer sessions (200-300 turns vs 30-40 baseline)
4. **Tool Filtering** - 94% reduction (50 GitHub tools → 3 tools)
5. **Sub-Agent Patterns** - Orchestrator-worker delegation for parallel processing

## Important Constraints

### Non-Negotiable Rules

1. **Quality Enforcement**:
   - ALWAYS commit generated files (no gitignore)
   - ALWAYS validate before generation
   - NEVER publish without proper changesets
   - ALWAYS maintain Bun compatibility

2. **Development Process**:
   - USE monorepo structure from Day 1
   - USE oclif plugin architecture
   - APPLY research-backed optimizations automatically
   - MAINTAIN clear separation: core vs generators

3. **Generated File Philosophy**:
   - Generated files ARE source of truth for tools
   - Must work immediately on `git clone`
   - No regeneration step required
   - Version controlled like any other code

### Technical Constraints

- **Bun Version**: >=1.3.0 required
- **Node Compatibility**: Generated package works with Node.js >=18
- **Platform Support**: Windows, macOS, Linux
- **Configuration Format**: YAML (human-editable, well-supported)

## External Dependencies

### Core Dependencies

- **oclif** - CLI framework with plugin system
- **zod** - Schema validation
- **yaml** - Configuration parsing
- **cosmiconfig** - Config discovery

### Optional Dependencies

- **gray-matter** - Frontmatter parsing
- **marked** or **unified** - Markdown processing

### Development Environment

- **Bun** - Development runtime
- **Node.js** - Distribution compatibility
- **pnpm** - Monorepo package manager
- **Changesets** - Release automation

### Distribution Targets

- **npm registry** - `@jbabin91/dot-agents` package
- **GitHub Releases** - Standalone binaries (macOS, Linux, Windows)
- **Plugin marketplace** - Community generators

## Documentation References

- [oclif Documentation](https://oclif.io/docs)
- [Bun Documentation](https://bun.sh/docs)
- [AGENTS.md Standard](https://github.com/search?q=AGENTS.md&type=code)
- [Ruler Project](https://github.com/intellectronica/ruler) - Inspiration for selective inclusion
