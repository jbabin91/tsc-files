# dot-agents: Universal AI Agent Configuration Manager

## Why

**Problem**: Managing AI coding assistant configurations across multiple tools is painful:

- **Configuration Duplication**: Same instructions copied to `AGENTS.md`, `CLAUDE.md`, `.cursorrules`, `.github/copilot-instructions.md`
- **Drift Risk**: Manual synchronization leads to inconsistencies across tools
- **No Optimization**: Missing research-backed patterns (command batching, context reduction, tool filtering)
- **Tool Lock-in**: Switching AI tools requires rewriting all configurations
- **Manual Sync**: Changes require updating 3-5 files manually or fragile scripts

**Real Example** (from tsc-files):

- `AGENTS.md` and `CLAUDE.md`: 910 lines each (100% duplication)
- `.github/copilot-instructions.md`: 218 lines (manually maintained)
- 82-85% content overlap but no synchronization mechanism
- Lefthook scripts for syncing (fragile, error-prone)

**Opportunity**: The AGENTS.md format is now industry standard (20,000+ repos, backed by OpenAI, Google, Cursor). Multiple tools read the same format, but each needs different subsets and tool-specific features.

**Solution**: `dot-agents` - "dotfiles for agents"

- Write once in `.agents/` directory
- Generate all tool configs automatically
- Apply research-backed optimizations (70-80% context reduction, 5-7x longer sessions)
- Commit generated files (no regeneration on clone)
- Plugin architecture for community generators

## What Changes

### New Project Creation

**Package**: `@jbabin91/dot-agents`

- CLI command: `da` (2 characters, like `git`, `ls`, `cd`)
- Runtime: Bun 1.3+ with native TypeScript support
- Architecture: Monorepo with plugin system (oclif)
- Distribution: npm + standalone binaries (GitHub Releases)

### Project Structure

```text
packages/
├── core/                     # @dotai/core - Schema, parser, validation
├── cli/                      # CLI package (da command)
└── generators/
    ├── claude/              # @dotai/generator-claude (AGENTS.md, CLAUDE.md)
    ├── cursor/              # @dotai/generator-cursor (.cursorrules)
    ├── copilot/             # @dotai/generator-copilot (.github/copilot-instructions.md)
    └── opencode/            # @dotai/generator-opencode (AGENTS.md + .opencode/config.json)
```

### User Workflow

**Before** (current manual approach):

```bash
# Edit AGENTS.md
vim AGENTS.md

# Manually copy to CLAUDE.md
cp AGENTS.md CLAUDE.md

# Manually edit .github/copilot-instructions.md to keep in sync
vim .github/copilot-instructions.md

# Manually update .cursorrules
vim .cursorrules

# Hope nothing drifts
```

**After** (with dot-agents):

```bash
# One-time setup
npm install -g @jbabin91/dot-agents
da init

# Edit source files
vim .agents/instructions/core.md

# Generate all tool configs
da apply

# All files updated automatically
git add AGENTS.md CLAUDE.md .cursorrules .github/copilot-instructions.md
git commit -m "feat: update AI instructions"
```

### .agents/ Directory Structure

```text
.agents/
├── dotagents.yaml              # Configuration (which tools, what to include)
└── instructions/               # Source files
    ├── core.md                # Project overview, mission
    ├── git-conventions.md     # Commit format, branch naming
    ├── security.md            # Security requirements
    ├── testing.md             # Testing guidelines
    ├── agentic-workflows.md   # Universal workflow patterns
    └── permissions.md         # Git commit/push gates
```

### CLI Commands (Phase 1 MVP)

```bash
da init              # Initialize .agents/ directory with starter files
da apply             # Generate all tool configs from .agents/ source
da validate          # Check if generated files match source
da list              # Show configured tools and status
da diff              # Show what would change
```

### Four-Phase Roadmap

**Phase 1 (MVP)** - `instruction-generation`:

- Parse `.agents/instructions/` directory
- Generate tool-specific configs (AGENTS.md, CLAUDE.md, .cursorrules, etc.)
- Selective inclusion per tool
- Command batching optimization

**Phase 2** - `command-generation`:

- Parse `.agents/commands/` directory
- Generate slash commands for supported tools
- Tool-specific command syntax handling

**Phase 3** - `agent-generation`:

- Parse `.agents/agents/` directory
- Generate sub-agent templates
- Orchestrator-worker delegation patterns

**Phase 4** - `mcp-configuration`:

- Parse `.agents/mcp-servers/` directory
- Generate MCP server configs with tool filtering
- 90-95% context reduction via selective tool inclusion

## Impact

### Affected Specs

**NEW** capability specs to be created:

- `instruction-generation` (Phase 1 MVP)
- `command-generation` (Phase 2)
- `agent-generation` (Phase 3)
- `mcp-configuration` (Phase 4)

### Research Migration

**Preserve 7,635 lines of competitive advantage research**:

- `findings.md` (344 lines) - Token optimization strategies
- `research-tracking.md` (3,167 lines) - 9-topic comprehensive research
- `re-evaluation.md` (4,124 lines) - Plugin marketplace + OpenCode validation

**Migration strategy**:

```text
dot-agents/
├── docs/
│   ├── research/            # Raw research files preserved
│   │   ├── token-optimization.md
│   │   ├── context-patterns.md
│   │   └── tool-filtering.md
│   └── optimizations.md     # Distilled patterns
└── packages/
    └── core/
        └── src/
            └── optimizations/   # Code implementations
                ├── command-batching.ts
                ├── context-reduction.ts
                └── tool-filtering.ts
```

### Benefits

**For Individual Developers**:

- ✅ Single source of truth (`.agents/` directory)
- ✅ No configuration drift across tools
- ✅ Switch AI tools without rewriting configs
- ✅ Automatic optimization application (70-80% context reduction)
- ✅ Works immediately on `git clone` (generated files committed)

**For Teams**:

- ✅ Consistent AI guidance across all team members
- ✅ Version controlled AI configurations
- ✅ Easy onboarding (clone repo, configs work immediately)
- ✅ Centralized updates (change once, apply everywhere)

**For Tool Creators**:

- ✅ Plugin architecture (publish `@scope/dotai-generator-*`)
- ✅ Standard generator interface
- ✅ Community ecosystem

**Research-Backed Improvements**:

- ✅ 5-7x longer AI sessions (200-300 turns vs 30-40 baseline)
- ✅ 70-80% context reduction
- ✅ 94% tool noise reduction (50 tools → 3 tools with filtering)
- ✅ 5+ tool calls saved per quality check (command batching)

### Risks

**Medium Risk** - New project in crowded space:

- **Competition**: Ruler (1.5k stars, instructions only), udecode/dotai (1k stars, context manager)
- **Mitigation**: Broader scope (instructions + commands + agents + MCP), research-backed optimizations, plugin architecture
- **Differentiation**: Only tool that applies 7,635 lines of research automatically

**Medium Risk** - Monorepo complexity:

- **Challenge**: More setup than single package
- **Mitigation**: oclif's proven monorepo patterns, pnpm workspaces
- **Benefit**: Signals "community contributions welcome" from Day 1

**Low Risk** - Bun adoption:

- **Challenge**: Bun is newer than Node.js
- **Mitigation**: Dual distribution (npm for Node.js + standalone binaries)
- **Benefit**: 1ms faster startup, 3MB less memory, native TypeScript

**Low Risk** - Generated file maintenance:

- **Challenge**: Users might edit generated files directly
- **Mitigation**: Clear warnings in file headers, `da validate` detects drift
- **Recovery**: `da apply` regenerates from source

## Success Criteria

### Phase 1 MVP (instruction-generation)

**Core Functionality**:

- [ ] `da init` creates `.agents/` directory with starter files
- [ ] `da apply` generates AGENTS.md, CLAUDE.md, .cursorrules, .github/copilot-instructions.md
- [ ] Selective inclusion works (tools get appropriate subsets)
- [ ] Command batching optimization applied automatically
- [ ] Generated files include clear "DO NOT EDIT" headers

**Generator Support**:

- [ ] @dotai/generator-claude (AGENTS.md, CLAUDE.md)
- [ ] @dotai/generator-cursor (.cursorrules)
- [ ] @dotai/generator-copilot (.github/copilot-instructions.md)
- [ ] @dotai/generator-opencode (AGENTS.md)

**Quality Gates**:

- [ ] TypeScript strict mode (zero `any` types)
- [ ] Comprehensive test coverage (>80%)
- [ ] Cross-platform compatibility (Windows, macOS, Linux)
- [ ] Bun and Node.js runtime support

**Distribution**:

- [ ] npm package published: `@jbabin91/dot-agents`
- [ ] Standalone binaries (macOS, Linux, Windows)
- [ ] GitHub Releases with changelogs

**Documentation**:

- [ ] README with quick start
- [ ] API documentation
- [ ] Generator development guide
- [ ] Migration guide (from manual configs)

### Phase 2-4 (Future)

- [ ] Phase 2: Slash command generation
- [ ] Phase 3: Sub-agent template generation
- [ ] Phase 4: MCP server configuration with tool filtering

## Next Steps

1. **Create new repository**: `@jbabin91/dot-agents`
2. **Initialize monorepo**: pnpm workspaces + Bun 1.3+
3. **Migrate research**: Copy 7,635 lines of research to `docs/research/`
4. **Implement Phase 1**: Start with `instruction-generation` spec
5. **Publish MVP**: First release with 4 generators (Claude, Cursor, Copilot, OpenCode)

## Related Work

- **Ruler** (1.5k stars) - Instructions only, no optimizations
- **udecode/dotai** (1k stars) - Context manager for 3 tools
- **AGENTS.md standard** (20k+ repos) - Industry standard format

**dot-agents differentiators**:

- ✅ Broader scope (instructions + commands + agents + MCP)
- ✅ Research-backed optimizations (7,635 lines of research)
- ✅ Plugin architecture (community extensibility)
- ✅ Automatic optimization application (command batching, context reduction, tool filtering)
