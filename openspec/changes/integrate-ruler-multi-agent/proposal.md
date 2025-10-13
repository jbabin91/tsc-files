# Integrate Ruler for Multi-Agent AI Instruction Management

## Why

Currently, we manage AI agent instructions through manual file duplication and lefthook syncing:

- `AGENTS.md` and `CLAUDE.md` contain identical content (910 lines each)
- `.github/copilot-instructions.md` is manually maintained separately (218 lines)
- `.claude/commit-conventions.md` and `.claude/github-workflow.md` contain universal content (~530 lines total) wrongly placed in Claude-specific directory
- No support for other AI agents (Cursor, OpenCode)
- Changes require manual updates to multiple files or fragile lefthook sync scripts
- Claude-specific content (Plan Mode, sub-agents, TodoWrite) pollutes universal AGENTS.md

**Analysis reveals 82-85% content overlap** across all agents:

- ~1,630-2,130 lines of universal content applicable to ALL agents
- Only ~250-300 lines are Claude-specific
- Massive duplication and drift risk with manual maintenance

**Problem:** As the team adopts more AI coding assistants, maintaining instruction files across 4+ agents becomes error-prone and time-consuming. The high overlap (82-85%) makes manual synchronization unsustainable.

**Opportunity:** [Ruler](https://github.com/intellectronica/ruler) is an industry-standard tool designed specifically for this problem, supporting centralized instruction management with selective inclusion per agent. AGENTS.md has become the 2025 industry standard (20,000+ repos, backed by OpenAI, Google, Cursor).

## What Changes

### Architecture Changes

**From: Manual sync approach**

```text
AGENTS.md (910 lines, source of truth)
  ↓ lefthook copies
CLAUDE.md (910 lines, duplicate)
.github/copilot-instructions.md (manually maintained)
```

**To: Ruler-managed approach**

```text
.ruler/
├── instructions.md              # Universal project standards (~600-700 lines)
├── git-conventions.md           # Commits + branches (~150-200 lines) [MOVED from .claude/commit-conventions.md, EXPANDED]
├── github-workflow.md           # MCP vs gh CLI decision tree (~430 lines) [MOVED from .claude/]
├── security.md                 # Security requirements (~100-150 lines)
├── testing.md                  # Testing guidelines (~100-150 lines)
├── agentic-workflows.md        # Universal workflow patterns (~200-300 lines) [NEW]
├── permissions.md              # Permission gates (~150-200 lines) [NEW]
├── claude-workflows.md         # Claude-specific features (~250-300 lines)
└── ruler.toml                  # Configuration

  ↓ ruler apply (selective inclusion per agent)

AGENTS.md (generated, ~1,630-2,130 lines, committed)
CLAUDE.md (generated, ~1,880-2,430 lines, committed)
.github/copilot-instructions.md (generated, ~800-1,000 lines curated for PR reviews, committed)
.cursorrules (generated, ~1,200-1,630 lines, committed)
```

### File Changes

**Added:**

- `.ruler/` directory with 8 modular instruction files
- `.ruler/ruler.toml` configuration with selective inclusion per agent
- `.ruler/agentic-workflows.md` - NEW: Universal workflow patterns (~200-300 lines)
- `.ruler/permissions.md` - NEW: Consolidated permission gates including git commit/push approval (~150-200 lines)
- Ruler integration in development workflow

**Modified:**

- `package.json` - Add ruler as dev dependency
- `lefthook.yml` - Replace sync-docs with ruler apply

**Moved:**

- `.claude/commit-conventions.md` → `.ruler/git-conventions.md` (universal content, expanded with branch naming)
- `.claude/github-workflow.md` → `.ruler/github-workflow.md` (universal content for MCP-enabled agents)

**Generated (from .ruler/ source):**

- `AGENTS.md` - Committed, industry standard 2025 format, ~1,630-2,130 lines
- `CLAUDE.md` - Committed, ~1,880-2,430 lines (universal + Claude-specific)
- `.github/copilot-instructions.md` - Committed, ~800-1,000 lines (curated for PR review scope)
- `.cursorrules` - Committed, ~1,200-1,630 lines (Cursor legacy format support)

### Development Workflow Changes

**Before:**

1. Edit AGENTS.md (source of truth)
2. Lefthook auto-copies to CLAUDE.md
3. Manually update .github/copilot-instructions.md if needed

**After:**

1. Edit `.ruler/*.md` files (modular source files)
2. Run `ruler apply` (or via pre-commit hook)
3. All agent configs auto-generated
4. Commit all changes (both .ruler/ source and generated files)

### Supported AI Agents

This change enables support for 4 actively-used agents:

- ✅ **Claude Code** (existing, improved)
  - Reads: CLAUDE.md (~1,880-2,430 lines)
  - Includes: Universal content + Claude-specific features (Plan Mode, sub-agents, TodoWrite)

- ✅ **GitHub Copilot PR Code Review** (existing, improved)
  - Reads: .github/copilot-instructions.md (~800-1,000 lines)
  - Includes: Curated subset for PR review context
  - Note: Copilot Coding Agent reads AGENTS.md instead

- 🆕 **Cursor** (new support)
  - Reads: AGENTS.md (primary) and .cursorrules (legacy)
  - AGENTS.md: ~1,630-2,130 lines (comprehensive)
  - .cursorrules: ~1,200-1,630 lines (excludes github-workflow.md)

- 🆕 **OpenCode** (new support)
  - Reads: AGENTS.md (~1,630-2,130 lines)
  - Industry-standard 2025 format (20,000+ repos)

**File Support Matrix:**

| Agent                | Primary File                    | Includes Universal? | Includes Claude-Specific? | Size               |
| -------------------- | ------------------------------- | ------------------- | ------------------------- | ------------------ |
| Claude Code          | CLAUDE.md                       | ✅                  | ✅                        | ~1,880-2,430 lines |
| Copilot PR Review    | .github/copilot-instructions.md | ⚠️ Curated          | ❌                        | ~800-1,000 lines   |
| Copilot Coding Agent | AGENTS.md                       | ✅                  | ❌                        | ~1,630-2,130 lines |
| Cursor               | AGENTS.md, .cursorrules         | ✅                  | ❌                        | ~1,630-2,130 lines |
| OpenCode             | AGENTS.md                       | ✅                  | ❌                        | ~1,630-2,130 lines |

## Why Ruler vs Alternatives?

**Option A: Simple Concatenation Script**

```bash
cat .ruler/*.md > AGENTS.md
```

- ✅ Pro: Simple, no dependencies
- ❌ Con: No selective inclusion (can't create curated copilot-instructions.md with only ~800 lines)
- ❌ Con: No per-agent customization
- ❌ Con: Must implement ordering, header injection, metadata ourselves
- **Verdict:** Insufficient for multi-agent with different content needs

**Option B: Symlinks**

```bash
ln -s AGENTS.md CLAUDE.md
```

- ✅ Pro: Zero duplication
- ❌ Con: **BLOCKER:** changesets/action breaks with symlinks (GitHub API commit signing issues)
- ❌ Con: Can't have different content per agent (Copilot needs curated subset, Claude needs extra content)
- **Verdict:** Not viable due to changesets constraint + selective inclusion requirement

**Option C: Manual Duplication (Current Approach)**

- ✅ Pro: Full control
- ❌ Con: High drift risk (already evident: 910 lines vs 218 lines)
- ❌ Con: Doesn't scale to 4+ agents
- ❌ Con: 82-85% content duplication (wasteful)
- **Verdict:** Unsustainable with 4 agents and high overlap

**Option D: Ruler (Chosen)**

- ✅ Pro: Selective inclusion per agent (Copilot gets ~800 lines curated, AGENTS.md gets ~1,600 lines comprehensive)
- ✅ Pro: Industry-standard tool (1.5k+ stars, actively maintained)
- ✅ Pro: Supports 25+ agent formats out-of-box (future-proof)
- ✅ Pro: Handles ordering, headers, metadata automatically
- ✅ Pro: Single source of truth with 82-85% content reuse
- ⚠️ Con: External dependency (mitigated by active maintenance and popularity)
- **Verdict:** Best fit for multi-agent + selective inclusion + high overlap needs

## Impact

### Affected Specs

This change requires a new capability spec:

- **NEW:** `ai-agent-instructions` - Managing instructions across multiple AI coding assistants

### Affected Code

- **Development tooling**: `.ruler/` directory, ruler.toml configuration
- **Git hooks**: `lefthook.yml` integration
- **Build system**: `package.json` dependencies
- **Documentation**: README.md, CONTRIBUTING.md references to instruction files

### Breaking Changes

**BREAKING:** Generated instruction files (AGENTS.md, CLAUDE.md, .github/copilot-instructions.md) will be auto-generated. Any manual edits to these files will be lost.

**Migration path:** Before implementing, extract all manual changes to appropriate `.ruler/*.md` source files.

### Benefits

1. **Massive Content Reuse (82-85%):** ~1,630-2,130 lines of universal content shared across all agents, eliminating duplication
2. **Proven Industry Standard:** AGENTS.md format backed by OpenAI, Google, Cursor, Factory (20,000+ repos adoption)
3. **Scalability:** Currently supports 4 agents (Claude, Copilot, Cursor, OpenCode), easily extensible to 25+ formats via Ruler
4. **Selective Inclusion:** Each agent gets appropriate content volume and scope:
   - PR reviews: ~800 lines (curated for review context)
   - Development agents: ~1,600-2,400 lines (comprehensive guidance)
   - Claude-specific: +250-300 lines (Plan Mode, sub-agents, TodoWrite)
5. **Maintainability:** Single source of truth in modular `.ruler/` directory (8 focused files by concern)
6. **Consistency:** All agents synchronized automatically via `ruler apply` - no drift, no manual sync
7. **Clear Separation:** Universal standards (82-85%) vs tool-specific features (15-18%) explicitly organized
8. **No Manual Sync:** Eliminates fragile lefthook scripts and manual file maintenance

### Risks

1. **Learning curve:** Team needs to learn Ruler workflow
2. **Tool dependency:** Adds external dependency to development process
3. **Migration effort:** One-time cost to reorganize existing instruction files
4. **Git history:** Generated files may clutter git history (mitigated by .gitignore)

## Success Criteria

### Phase 1: File Structure (8 source files)

- [ ] `.ruler/` directory created with proper organization
- [ ] `agentic-workflows.md` created (~200-300 lines) with universal workflow patterns
- [ ] `permissions.md` created (~150-200 lines) with git commit/push gates
- [ ] `git-conventions.md` created from commit-conventions.md with added branch naming (Conventional Branch 1.0.0)
- [ ] `github-workflow.md` moved from `.claude/` to `.ruler/`
- [ ] All universal content (82-85%, ~1,630-2,130 lines) extracted and organized
- [ ] Claude-specific content (15-18%, ~250-300 lines) isolated in `claude-workflows.md`

### Phase 2: Configuration & Generation

- [ ] `ruler.toml` configured with selective inclusion per agent
- [ ] AGENTS.md generates: ~1,630-2,130 lines (universal only, committed)
- [ ] CLAUDE.md generates: ~1,880-2,430 lines (universal + Claude-specific, committed)
- [ ] .github/copilot-instructions.md generates: ~800-1,000 lines (curated for PR reviews, committed)
- [ ] .cursorrules generates: ~1,200-1,630 lines (excludes github-workflow.md, committed)
- [ ] Generated files validated against expected sizes

### Phase 3: Integration & Automation

- [ ] `ruler apply` successfully generates all 4 agent files
- [ ] Pre-commit hook runs `ruler apply` automatically on `.ruler/**/*.md` changes
- [ ] All generated files (AGENTS.md, CLAUDE.md, .cursorrules, .github/copilot-instructions.md) committed to version control
- [ ] Lefthook sync-docs hook removed, replaced with ruler-apply hook

### Phase 4: Multi-Agent Validation

- [ ] Claude Code reads CLAUDE.md correctly (test Plan Mode, sub-agents, TodoWrite)
- [ ] GitHub Copilot PR reviews use .github/copilot-instructions.md correctly
- [ ] Cursor reads AGENTS.md correctly (test with actual Cursor IDE)
- [ ] OpenCode reads AGENTS.md correctly (if available for testing)
- [ ] Cross-agent consistency validated (all agents follow git conventions, security protocols)

### Phase 5: Documentation & Training

- [ ] README.md references AGENTS.md as discovery file
- [ ] CONTRIBUTING.md documents `.ruler/` workflow
- [ ] `.ruler/README.md` created explaining file organization
- [ ] Team trained on Ruler workflow and `.ruler/` source editing
