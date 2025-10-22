# Technical Design: dot-agents

## Context

Building a universal AI agent configuration manager requires careful technical decisions around:

- CLI framework selection (plugin architecture needed)
- Runtime choice (developer experience vs compatibility)
- Monorepo structure (Day 1 vs later migration)
- Configuration format (YAML vs JSON vs TOML)
- File generation strategy (in-memory vs templates)

## Goals

- ✅ Plugin architecture for community-contributed generators
- ✅ Minimal dependencies and fast startup
- ✅ Cross-platform compatibility (Windows, macOS, Linux)
- ✅ Node.js compatibility for npm distribution
- ✅ Automatic optimization application from research

## Non-Goals

- ❌ Runtime AI agent execution (just config management)
- ❌ Chat interface or interactive AI (CLI only)
- ❌ Cloud synchronization (local files only)
- ❌ Language detection (explicit configuration)

## Decisions

### Decision 1: CLI Framework - oclif

**Chosen**: oclif (v4.22+)

**Rationale**:

- **Plugin Architecture**: Native plugin system perfect for generator extensibility
- **Enterprise-Grade**: Battle-tested (Salesforce/Heroku CLIs, 1.8M downloads/week)
- **TypeScript-First**: Full TypeScript support with minimal boilerplate
- **Auto-Updating**: Built-in support for self-updating CLI
- **Autocomplete**: Advanced autocomplete including flag values

**Alternatives Considered**:

1. **cleye** (1.3.4, 202K downloads/week)
   - ✅ Lightweight (5kB), zero dependencies
   - ✅ TypeScript-first with superior type inference
   - ✅ Simpler API, less boilerplate
   - ❌ No plugin architecture (would need custom implementation)
   - ❌ No auto-updating support
   - **Verdict**: Great for simple CLIs, insufficient for generator ecosystem

2. **commander** (14.0.1, 10M+ downloads/week)
   - ✅ Very mature and popular
   - ✅ Low learning curve
   - ❌ JavaScript-first (TypeScript as afterthought)
   - ❌ No plugin architecture
   - ❌ More verbose API
   - **Verdict**: Popular but not designed for our use case

**Trade-offs**:

- ➕ Plugin system enables community generators without forking
- ➕ Auto-updating keeps users on latest version
- ➕ Autocomplete improves UX
- ➖ Slightly larger bundle than cleye (acceptable for dev tool)
- ➖ Steeper learning curve (offset by excellent docs)

### Decision 2: Runtime - Bun 1.3+

**Chosen**: Bun 1.3+ for development, dual distribution for compatibility

**Rationale**:

- **Native TypeScript**: No build configuration needed for development
- **Fast Startup**: 1ms faster than Node.js (important for CLI)
- **Memory Efficient**: 3MB less memory usage
- **Single File Executables**: Built-in support for standalone binaries
- **Package Manager**: bun.lockb native lock file, faster installs

**Distribution Strategy**:

1. **npm package** (Node.js >=18 compatible)
   - Standard npm install works on any system
   - Bun transpiles to Node-compatible code

2. **Standalone binaries** (GitHub Releases)
   - macOS (arm64 + x64)
   - Linux (x64)
   - Windows (x64)
   - No Node.js/Bun installation required

**Alternatives Considered**:

1. **Node.js only**
   - ✅ Maximum compatibility
   - ✅ No transpilation concerns
   - ❌ Slower startup, more memory
   - ❌ Requires build configuration for TypeScript
   - **Verdict**: Safe but misses performance benefits

**Trade-offs**:

- ➕ Best developer experience (native TypeScript, fast)
- ➕ Future-proof (Bun adoption growing)
- ➕ Dual distribution covers all users
- ➖ Slightly newer ecosystem (mitigated by dual distribution)

### Decision 3: Monorepo - Day 1

**Chosen**: Monorepo from Day 1 with pnpm workspaces

**Rationale**:

- **Plugin Ecosystem**: Signals "community contributions welcome" immediately
- **Clear Separation**: core vs cli vs generators (maintainability)
- **Shared Dependencies**: Avoids version conflicts
- **Coordinated Releases**: Changesets handles monorepo releases elegantly

**Structure**:

```text
packages/
├── core/                     # @dotai/core - Schema, parser, validation
├── cli/                      # CLI package (da command)
└── generators/
    ├── claude/              # @dotai/generator-claude
    ├── cursor/              # @dotai/generator-cursor
    ├── copilot/             # @dotai/generator-copilot
    └── opencode/            # @dotai/generator-opencode
```

**Alternatives Considered**:

1. **Single Package → Migrate Later**
   - ✅ Simpler initial setup
   - ❌ Migration pain later
   - ❌ Doesn't signal extensibility
   - **Verdict**: Short-term gain, long-term pain

**Trade-offs**:

- ➕ Clear architecture from Day 1
- ➕ Easier to onboard contributors (focused packages)
- ➕ Plugin pattern evident immediately
- ➖ More setup initially (acceptable one-time cost)

### Decision 4: Configuration Format - YAML

**Chosen**: YAML for `dotagents.yaml`

**Rationale**:

- **Human-Editable**: Comments, multi-line strings, readable structure
- **Industry Standard**: Used by Docker Compose, Kubernetes, GitHub Actions
- **Well-Supported**: Mature parsing libraries (js-yaml)
- **Hierarchical**: Natural fit for nested configuration

**Example**:

```yaml
project:
  name: 'My Project'

tools:
  - claude-code
  - cursor

generators:
  agents:
    include:
      - instructions/core.md
      - instructions/git-conventions.md
```

**Alternatives Considered**:

1. **JSON**
   - ✅ Native JavaScript support
   - ❌ No comments
   - ❌ Strict syntax (trailing commas error)
   - ❌ Less human-friendly
   - **Verdict**: Too rigid for config file

2. **TOML**
   - ✅ Human-friendly, comments supported
   - ❌ Less common than YAML in JavaScript ecosystem
   - ❌ Fewer parsing libraries
   - **Verdict**: Good but YAML more familiar

**Trade-offs**:

- ➕ Easy to read and edit by hand
- ➕ Comments for documentation
- ➕ Widely adopted format
- ➖ Indentation-sensitive (mitigated by editor support)

### Decision 5: Generated Files - Committed to Version Control

**Chosen**: Generated files committed, not gitignored

**Rationale**:

- **Immediate Functionality**: Works on `git clone` without running `da apply`
- **Discoverability**: Tools discover files immediately (AGENTS.md, CLAUDE.md, etc.)
- **No Build Step**: Contributors don't need to install dot-agents
- **Version History**: Track changes to AI configurations over time

**File Headers**:

```markdown
<!-- AUTO-GENERATED by dot-agents from .agents/ directory -->
<!-- DO NOT EDIT - Changes will be overwritten -->
<!-- Edit source files in .agents/ and run 'da apply' -->
```

**Alternatives Considered**:

1. **Gitignore + Regenerate**
   - ✅ Cleaner git history
   - ❌ Requires every user to run `da apply`
   - ❌ Doesn't work on `git clone`
   - ❌ Tools don't find configs
   - **Verdict**: Breaks "works immediately" goal

**Trade-offs**:

- ➕ Zero friction for new users
- ➕ Always in sync with version control
- ➕ No regeneration step needed
- ➖ Git history shows generated file changes (acceptable)
- ➖ Potential for drift if users edit directly (mitigated by `da validate`)

### Decision 6: Optimization Strategy - Automatic Application

**Chosen**: Apply research-backed optimizations automatically

**Rationale**:

- **Competitive Advantage**: 7,635 lines of research becomes product differentiator
- **Zero Configuration**: Optimizations work without user intervention
- **Proven Patterns**: Research-backed, not speculative
- **Measurable Impact**: 70-80% context reduction, 5-7x longer sessions

**Optimizations** (Phase 1):

1. **Command Batching**
   - Detect: Separate quality gate commands
   - Apply: Consolidate 6 commands → 1 batched command
   - Impact: 5+ tool calls saved per check

2. **CLAUDE.md Persistent Memory**
   - Detect: Claude-specific generator
   - Apply: Add persistent memory header section
   - Impact: Context preservation across sessions

**Implementation**:

```typescript
// packages/core/src/optimizations/
├── command-batching.ts
├── context-patterns.ts
└── tool-filtering.ts (Phase 4)
```

**Alternatives Considered**:

1. **Opt-In Optimizations**
   - ✅ User control
   - ❌ Most users won't enable (missing value)
   - ❌ Requires documentation reading
   - **Verdict**: Hides competitive advantage

**Trade-offs**:

- ➕ Automatic value delivery (users get benefits without config)
- ➕ Research becomes product
- ➕ Consistent optimization across users
- ➖ Less user control (mitigated by clear documentation)

### Decision 7: Selective Inclusion - Per-Tool Configuration

**Chosen**: Per-tool include/exclude pattern (from Ruler inspiration)

**Rationale**:

- **Flexibility**: Different tools get appropriate subsets
- **PR Review Optimization**: Copilot gets minimal context (~800 lines)
- **Full Context for Development**: Claude/Cursor get comprehensive instructions
- **Maintainability**: Single source of truth with targeted outputs

**Example**:

```yaml
generators:
  agents: # Universal AGENTS.md
    include:
      - instructions/core.md
      - instructions/git-conventions.md

  claude: # Claude-specific CLAUDE.md
    include:
      - instructions/**/*.md # Everything

  copilot: # Curated for PR reviews
    include:
      - instructions/core.md
      - instructions/git-conventions.md
```

**Alternatives Considered**:

1. **Single Output for All Tools**
   - ✅ Simple
   - ❌ Wastes context (Copilot PR reviews don't need full instructions)
   - ❌ Can't customize per tool
   - **Verdict**: One-size-fits-all doesn't work

**Trade-offs**:

- ➕ Each tool gets optimized content
- ➕ No wasted context
- ➕ Fine-grained control
- ➖ More configuration (mitigated by sensible defaults)

### Decision 8: Generator Interface - Standard Contract

**Chosen**: Shared interface all generators implement

**Interface**:

```typescript
interface Generator {
  name: string;
  description: string;
  targetFile: string; // e.g., "AGENTS.md", ".cursorrules"

  generate(config: GeneratorConfig, sources: SourceFile[]): Promise<string>;
  validate(content: string): Promise<ValidationResult>;
}

interface GeneratorConfig {
  include: string[]; // Glob patterns
  exclude?: string[]; // Glob patterns
  optimizations?: OptimizationConfig;
}

interface SourceFile {
  path: string;
  content: string;
  frontmatter?: Record<string, unknown>;
}
```

**Rationale**:

- **Consistency**: All generators follow same pattern
- **Testability**: Easy to mock and test
- **Documentation**: Clear contract for community generators
- **Validation**: Built-in validation step

**Trade-offs**:

- ➕ Clear contract for community
- ➕ Easy to test and maintain
- ➕ Type-safe with TypeScript
- ➖ All generators must fit this shape (acceptable constraint)

## Risks & Mitigations

### Risk 1: Bun Compatibility Issues

**Likelihood**: Low (Bun 1.3+ stable, dual distribution)

**Impact**: Medium (affects development workflow)

**Mitigation**:

- Dual distribution (npm + standalone binaries)
- Node.js >=18 compatibility testing in CI
- Document both Bun and Node.js workflows

### Risk 2: oclif Learning Curve

**Likelihood**: Medium (oclif is complex)

**Impact**: Low (one-time learning cost)

**Mitigation**:

- Comprehensive generator development guide
- Example generators (4 built-in generators as reference)
- Clear interface documentation

### Risk 3: Configuration Drift (Users Edit Generated Files)

**Likelihood**: High (users will edit files directly)

**Impact**: Medium (changes overwritten on next `da apply`)

**Mitigation**:

- Clear "DO NOT EDIT" headers in generated files
- `da validate` command detects drift
- Helpful error messages pointing to source files

**Recovery**:

```bash
# User edited AGENTS.md directly
da validate  # Detects drift, shows what changed
da apply     # Regenerates from source (overwrites manual edits)
```

### Risk 4: Generator Ecosystem Slow Growth

**Likelihood**: Medium (new project, no users yet)

**Impact**: Low (4 built-in generators cover main tools)

**Mitigation**:

- High-quality built-in generators (Claude, Cursor, Copilot, OpenCode)
- Clear generator development guide
- Promote on relevant communities

## Migration Plan

### From tsc-files integrate-ruler-multi-agent

**Research Migration**:

```bash
# Preserve research files
cp openspec/changes/integrate-ruler-multi-agent/findings.md \
   dot-agents/docs/research/token-optimization.md

cp openspec/changes/integrate-ruler-multi-agent/research-tracking.md \
   dot-agents/docs/research/context-patterns.md

cp openspec/changes/integrate-ruler-multi-agent/re-evaluation.md \
   dot-agents/docs/research/tool-filtering.md

# Create distilled patterns
# docs/optimizations.md - Extract key patterns and implementations
```

**OpenSpec Migration**:

```bash
# Copy OpenSpec structure
cp -r openspec/changes/dot-agents-project-init/* dot-agents/openspec/
```

## Open Questions

**Q: Should we support custom optimization plugins?**

A: Phase 2 consideration. Phase 1 ships with built-in optimizations only.

**Q: How do we handle versioning of generated files?**

A: Add version number to file header: `<!-- Generated by dot-agents v0.1.0 -->`.
Users can track which version generated their files.

**Q: Should `.agents/` directory be configurable location?**

A: Phase 1: hardcoded to `.agents/`. Phase 2: add `--config` flag for custom location.

**Q: How do we handle conflicts between generators?**

A: Each generator writes to unique file. If two generators target same file, error and require user resolution.

## Success Metrics

**Phase 1 MVP**:

- [ ] 4 generators working (Claude, Cursor, Copilot, OpenCode)
- [ ] Dogfooding: tsc-files migrated to use dot-agents
- [ ] All optimizations applied automatically
- [ ] <100ms CLI startup time
- [ ] > 80% test coverage
- [ ] Cross-platform compatibility (Windows, macOS, Linux)

**Post-Launch**:

- Community generators published (track @scope/dotai-generator-\* packages)
- GitHub stars/adoption metrics
- User feedback on optimizations effectiveness
