# Implementation Tasks: Ruler Integration

## 1. Setup & Installation

- [ ] 1.1 Install Ruler as dev dependency: `pnpm add --save-dev @intellectronica/ruler`
- [ ] 1.2 Initialize Ruler: `npx ruler init` (creates `.ruler/` directory)
- [ ] 1.3 Review generated `.ruler/instructions.md` starter file
- [ ] 1.4 Review generated `.ruler/ruler.toml` configuration

## 2. Content Migration

- [ ] 2.1 Create `.ruler/instructions.md` - Extract universal standards from AGENTS.md
  - [ ] 2.1.1 Project overview and mission
  - [ ] 2.1.2 Zero-tolerance quality policy
  - [ ] 2.1.3 TypeScript guidelines (type inference, imports, comments)
  - [ ] 2.1.4 File organization principles
  - [ ] 2.1.5 Error handling conventions (exit codes)
  - [ ] 2.1.6 Security requirements
  - [ ] 2.1.7 Testing requirements
  - [ ] 2.1.8 Project standards (excluding git conventions - will be separate file)
  - [ ] 2.1.9 Architecture overview
  - [ ] 2.1.10 Development commands

- [ ] 2.2 Create `.ruler/claude-workflows.md` - Extract Claude Code-specific content ONLY
  - [ ] 2.2.1 Auto-loaded context section
  - [ ] 2.2.2 Plan Mode usage patterns (Shift+Tab twice)
  - [ ] 2.2.3 Sub-agent delegation strategies (Task tool)
  - [ ] 2.2.4 TodoWrite tool guidelines
  - [ ] 2.2.5 ClaudeLog best practices
  - [ ] 2.2.6 Context management techniques (/compact, /context commands)
  - [ ] 2.2.7 UltraThink & deep reasoning
  - [ ] 2.2.8 Remove any universal workflow patterns (move to agentic-workflows.md)

- [ ] 2.3 Create `.ruler/security.md` - Security-focused instructions
  - [ ] 2.3.1 Temp file security protocols
  - [ ] 2.3.2 Command execution safety
  - [ ] 2.3.3 Input validation requirements
  - [ ] 2.3.4 Cryptographic requirements

- [ ] 2.4 Create `.ruler/testing.md` - Testing guidelines
  - [ ] 2.4.1 Testing strategy overview
  - [ ] 2.4.2 Coverage requirements by module
  - [ ] 2.4.3 Test patterns and best practices
  - [ ] 2.4.4 Vitest configuration guidance

- [ ] 2.5 Create `.ruler/agentic-workflows.md` - Universal workflow patterns (~200-300 lines)
  - [ ] 2.5.1 Extract task complexity assessment patterns from claude-code-workflows.md
  - [ ] 2.5.2 Extract tool selection decision trees (when to use Glob/Grep/Read/Task)
  - [ ] 2.5.3 Extract parallel vs sequential execution guidelines
  - [ ] 2.5.4 Extract error recovery patterns
  - [ ] 2.5.5 Extract context management strategies (when to read docs, when to use sub-agents)
  - [ ] 2.5.6 Remove extracted content from claude-workflows.md (keep only Claude-specific)

- [ ] 2.6 Create `.ruler/permissions.md` - Consolidated permission gates (~150-200 lines)
  - [ ] 2.6.1 Document git commit permission gate (ask before committing, even if files staged)
  - [ ] 2.6.2 Document git push permission gate (ask before pushing to remote)
  - [ ] 2.6.3 Document respect for partial staging (staged vs unstaged files)
  - [ ] 2.6.4 Document three-gate system (Fix → Stage → STOP → Commit → STOP → Push)
  - [ ] 2.6.5 Document common instruction patterns ("fix this" = stage only, "commit this" = actually commit)
  - [ ] 2.6.6 Document changesets creation requirements (explicit permission needed)
  - [ ] 2.6.7 Document pnpm-lock.yaml modification rules (explicit permission needed)
  - [ ] 2.6.8 Document publishing/release permissions (changeset workflow only)

- [ ] 2.7 Create `.ruler/git-conventions.md` from `.claude/commit-conventions.md` (~150-200 lines)
  - [ ] 2.7.1 Copy `.claude/commit-conventions.md` to `.ruler/git-conventions.md`
  - [ ] 2.7.2 Add Conventional Branch 1.0.0 specification
  - [ ] 2.7.3 Add branch naming format: `<type>/<description>` (feature/, bugfix/, hotfix/, release/, chore/)
  - [ ] 2.7.4 Add branch naming rules (lowercase, hyphens, no consecutive/leading/trailing)
  - [ ] 2.7.5 Add branch naming examples
  - [ ] 2.7.6 Update any references in documentation
  - [ ] 2.7.7 Remove original `.claude/commit-conventions.md` after migration

- [ ] 2.8 Move `.claude/github-workflow.md` to `.ruler/github-workflow.md` (~430 lines)
  - [ ] 2.8.1 Move file from `.claude/` to `.ruler/`
  - [ ] 2.8.2 Verify MCP vs gh CLI decision tree is complete
  - [ ] 2.8.3 Verify PR operations and code review workflows documented
  - [ ] 2.8.4 Update any references in documentation
  - [ ] 2.8.5 Remove original `.claude/github-workflow.md` after migration

- [ ] 2.9 Review `.github/copilot-instructions.md` for unique content
  - [ ] 2.9.1 Identify any Copilot-specific content not in AGENTS.md
  - [ ] 2.9.2 Migrate unique content to appropriate `.ruler/*.md` file

## 3. Configuration

- [ ] 3.1 Configure `.ruler/ruler.toml` with agent definitions and selective inclusion
  - [ ] 3.1.1 Configure `agents` output (AGENTS.md, ~1,630-2,130 lines, universal only, COMMITTED)
    - Include: instructions.md, git-conventions.md, github-workflow.md, security.md, testing.md, agentic-workflows.md, permissions.md
    - Exclude: claude-workflows.md
  - [ ] 3.1.2 Configure `claude` agent (CLAUDE.md, ~1,880-2,430 lines, universal + Claude-specific, git-ignored)
    - Include: All 8 files (instructions.md, git-conventions.md, github-workflow.md, security.md, testing.md, agentic-workflows.md, permissions.md, claude-workflows.md)
  - [ ] 3.1.3 Configure `github_copilot` agent (.github/copilot-instructions.md, ~800-1,000 lines, curated for PR reviews, git-ignored)
    - Include: instructions.md, git-conventions.md, security.md (curated subset)
    - Exclude: github-workflow.md, testing.md, agentic-workflows.md, permissions.md, claude-workflows.md
  - [ ] 3.1.4 Configure `cursor` agent (.cursorrules, ~1,200-1,630 lines, git-ignored)
    - Include: instructions.md, git-conventions.md, security.md, testing.md, agentic-workflows.md, permissions.md
    - Exclude: github-workflow.md (unclear MCP support), claude-workflows.md

- [ ] 3.2 Test Ruler generation
  - [ ] 3.2.1 Run `npx ruler apply`
  - [ ] 3.2.2 Verify AGENTS.md generated correctly
  - [ ] 3.2.3 Verify CLAUDE.md includes Claude-specific content
  - [ ] 3.2.4 Verify .github/copilot-instructions.md excludes Claude content
  - [ ] 3.2.5 Verify .cursorrules created successfully
  - [ ] 3.2.6 Compare generated files to originals for content completeness

## 4. Git Integration

- [ ] 4.1 Update `lefthook.yml`
  - [ ] 4.1.1 Remove old `sync-docs` hook (lines 15-18)
  - [ ] 4.1.2 Add new `ruler-apply` hook:

    ```yaml
    ruler-apply:
      glob: '.ruler/**/*.md'
      run: npx ruler apply
      priority: 1
    ```

  - [ ] 4.1.3 Test lefthook integration: `lefthook run pre-commit`

- [ ] 4.2 Commit all source and generated files
  - [ ] 4.2.1 Stage `.ruler/` directory (source files)
  - [ ] 4.2.2 Stage updated `lefthook.yml`
  - [ ] 4.2.3 Stage `package.json` (ruler dependency)
  - [ ] 4.2.4 Run `npx ruler apply` to generate all agent files
  - [ ] 4.2.5 Stage all generated files (AGENTS.md, CLAUDE.md, .cursorrules, .github/copilot-instructions.md)
  - [ ] 4.2.6 Commit with message: "feat(tooling): integrate Ruler for multi-agent AI instructions"

## 5. CI/CD Integration

- [ ] 5.1 Add Ruler validation to CI workflow
  - [ ] 5.1.1 Update `.github/workflows/ci.yaml`
  - [ ] 5.1.2 Add step: Install dependencies (includes ruler)
  - [ ] 5.1.3 Add step: Generate files with `npx ruler apply`
  - [ ] 5.1.4 Add step: Validate generation (files exist, not empty)

- [ ] 5.2 Add generated file freshness check
  - [ ] 5.2.1 Add validation step: `npx ruler apply && git diff --exit-code` (ensures generated files match .ruler/ source)
  - [ ] 5.2.2 Add to pre-commit quality checks
  - [ ] 5.2.3 Add to CI validation

## 6. Documentation

- [ ] 6.1 Create `.ruler/README.md`
  - [ ] 6.1.1 Explain file organization
  - [ ] 6.1.2 Document which file contains what type of content
  - [ ] 6.1.3 Explain how to update instructions
  - [ ] 6.1.4 Explain Ruler generation workflow

- [ ] 6.2 Update `README.md`
  - [ ] 6.2.1 Reference `.ruler/` for AI agent instructions
  - [ ] 6.2.2 Remove references to AGENTS.md as source of truth
  - [ ] 6.2.3 Add "Supported AI Agents" section

- [ ] 6.3 Update `CONTRIBUTING.md`
  - [ ] 6.3.1 Add section: "Updating AI Agent Instructions"
  - [ ] 6.3.2 Document workflow: edit `.ruler/*.md` → `npx ruler apply` → commit
  - [ ] 6.3.3 Warning: Do not edit generated files directly

- [ ] 6.4 Update `CLAUDE.md` header comment
  - [ ] 6.4.1 Add: "<!-- AUTO-GENERATED by Ruler from .ruler/ directory -->"
  - [ ] 6.4.2 Add: "<!-- DO NOT EDIT - Edit .ruler/*.md files instead -->"

## 7. Testing

- [ ] 7.1 Multi-Agent Testing
  - [ ] 7.1.1 Test Claude Code with CLAUDE.md (~1,880-2,430 lines)
    - [ ] Verify Claude reads CLAUDE.md successfully
    - [ ] Test Plan Mode works (Shift+Tab twice)
    - [ ] Test sub-agent delegation (Task tool)
    - [ ] Test TodoWrite functionality
    - [ ] Verify all universal content present
    - [ ] Verify Claude-specific features documented
    - [ ] Test git permission gates (commit/push approval)

  - [ ] 7.1.2 Test GitHub Copilot with .github/copilot-instructions.md (~800-1,000 lines)
    - [ ] Create test PR
    - [ ] Verify Copilot PR review reads instructions
    - [ ] Test commit convention enforcement
    - [ ] Test security requirement awareness
    - [ ] Confirm curated content appropriate for PR review scope
    - [ ] Test git permission gates work in PR context

  - [ ] 7.1.3 Test Cursor with AGENTS.md (~1,630-2,130 lines)
    - [ ] Open project in Cursor
    - [ ] Verify Cursor reads AGENTS.md
    - [ ] Test multi-file editing with instructions
    - [ ] Test chat interface follows guidelines
    - [ ] Confirm universal content present
    - [ ] Test git permission gates (commit/push approval)

  - [ ] 7.1.4 Test OpenCode with AGENTS.md (~1,630-2,130 lines)
    - [ ] Open project in OpenCode (if available)
    - [ ] Verify OpenCode reads AGENTS.md
    - [ ] Test coding assistance follows guidelines
    - [ ] Confirm universal content present
    - [ ] Test git permission gates (commit/push approval)

  - [ ] 7.1.5 Cross-agent consistency validation
    - [ ] Verify commit conventions applied consistently across all agents
    - [ ] Verify TypeScript guidelines followed by all agents
    - [ ] Verify security protocols enforced by all agents
    - [ ] Verify git permission gates work across all agents
    - [ ] Document any agent-specific behavioral differences

- [ ] 7.2 Pre-commit hook testing
  - [ ] 7.2.1 Edit `.ruler/instructions.md`
  - [ ] 7.2.2 Run `git add` and `git commit`
  - [ ] 7.2.3 Verify ruler-apply hook runs automatically
  - [ ] 7.2.4 Verify generated files updated

- [ ] 7.3 Quality gate validation
  - [ ] 7.3.1 Run `pnpm lint` - Zero warnings
  - [ ] 7.3.2 Run `pnpm lint:md` - All markdown files pass
  - [ ] 7.3.3 Run `pnpm format` - All files formatted
  - [ ] 7.3.4 Verify git status clean

## 8. Team Training

- [ ] 8.1 Document Ruler workflow in team wiki/docs
- [ ] 8.2 Create PR with comprehensive description
- [ ] 8.3 Schedule team demo/walkthrough
- [ ] 8.4 Update onboarding documentation

## 9. Validation

- [ ] 9.1 Run OpenSpec validation: `openspec validate integrate-ruler-multi-agent --strict`
- [ ] 9.2 Fix any validation errors
- [ ] 9.3 Request proposal approval from team
- [ ] 9.4 Wait for approval before implementation

## 10. Rollback Plan (if needed)

- [ ] 10.1 Restore original AGENTS.md from git: `git checkout HEAD~1 -- AGENTS.md CLAUDE.md`
- [ ] 10.2 Remove `.ruler/` directory: `rm -rf .ruler`
- [ ] 10.3 Restore lefthook sync-docs hook
- [ ] 10.4 Remove ruler from package.json: `pnpm remove @intellectronica/ruler`
- [ ] 10.5 Update .gitignore to track AGENTS.md, CLAUDE.md again
