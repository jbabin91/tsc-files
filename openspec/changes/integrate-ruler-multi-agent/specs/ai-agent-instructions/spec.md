# AI Agent Instructions Management

## ADDED Requirements

### Requirement: Centralized Instruction Source

The system SHALL maintain all AI agent instructions in a centralized `.ruler/` directory as the single source of truth.

#### Scenario: Instruction file organization

- **WHEN** a developer needs to update project standards
- **THEN** they edit files in `.ruler/` directory
- **AND** all agent-specific configs are auto-generated from these source files

#### Scenario: Source file discovery

- **WHEN** the Ruler tool runs
- **THEN** it discovers all `.md` files in `.ruler/` directory
- **AND** concatenates them according to ruler.toml configuration

### Requirement: Modular Content Organization

The system SHALL organize instruction content into modular files by concern.

#### Scenario: Universal standards separation

- **WHEN** instructions apply to all AI agents
- **THEN** they are stored in `.ruler/instructions.md`
- **AND** all agent configs include this content

#### Scenario: Tool-specific workflow separation

- **WHEN** instructions apply only to Claude Code
- **THEN** they are stored in `.ruler/claude-workflows.md`
- **AND** only CLAUDE.md includes this content
- **AND** other agent configs exclude it

#### Scenario: Security content separation

- **WHEN** security-related instructions exist
- **THEN** they are stored in `.ruler/security.md`
- **AND** all agent configs include this content

#### Scenario: Testing content separation

- **WHEN** testing-related instructions exist
- **THEN** they are stored in `.ruler/testing.md`
- **AND** all agent configs include this content

#### Scenario: Agentic workflow patterns separation

- **WHEN** universal workflow patterns exist (task complexity, tool selection, error recovery)
- **THEN** they are stored in `.ruler/agentic-workflows.md`
- **AND** development agent configs include this content
- **AND** PR review agents may exclude it for reduced context

#### Scenario: Permission gates separation

- **WHEN** permission requirements exist (git commit/push approval, changesets, dependencies)
- **THEN** they are stored in `.ruler/permissions.md`
- **AND** development agent configs include this content
- **AND** PR review agents may exclude it

#### Scenario: Git conventions separation

- **WHEN** commit and branch naming conventions exist
- **THEN** they are stored in `.ruler/git-conventions.md`
- **AND** all agent configs include this content

#### Scenario: GitHub workflow separation

- **WHEN** GitHub-specific workflows exist (MCP vs gh CLI decision trees)
- **THEN** they are stored in `.ruler/github-workflow.md`
- **AND** agents with GitHub MCP support include this content

### Requirement: Multi-Agent Support

The system SHALL support generating instruction files for multiple AI coding assistants.

#### Scenario: Claude Code support

- **WHEN** Ruler generates files
- **THEN** CLAUDE.md is created
- **AND** includes universal + Claude-specific content
- **AND** Claude Code can read and follow instructions

#### Scenario: GitHub Copilot support

- **WHEN** Ruler generates files
- **THEN** .github/copilot-instructions.md is created
- **AND** includes universal content only
- **AND** GitHub Copilot can read and follow instructions

#### Scenario: Cursor support

- **WHEN** Ruler generates files
- **THEN** .cursorrules is created
- **AND** includes universal content only
- **AND** Cursor can read and follow instructions

#### Scenario: Universal AGENTS.md generation

- **WHEN** Ruler generates files
- **THEN** AGENTS.md is created
- **AND** includes universal content only
- **AND** serves as discovery file for generic AI agents

### Requirement: Automated File Generation

The system SHALL automatically generate agent-specific instruction files from source content.

#### Scenario: Pre-commit generation

- **WHEN** a developer commits changes to `.ruler/*.md` files
- **THEN** pre-commit hook triggers `ruler apply`
- **AND** all agent instruction files are regenerated
- **AND** changes are included in the commit

#### Scenario: Manual generation

- **WHEN** a developer runs `npx ruler apply` manually
- **THEN** all configured agent files are generated
- **AND** reflect current state of `.ruler/` source files

### Requirement: Configuration Management

The system SHALL use ruler.toml to configure agent-specific file generation.

#### Scenario: Agent output path configuration

- **WHEN** ruler.toml defines an agent
- **THEN** output_path specifies where the file is generated
- **AND** file is created at that exact path

#### Scenario: Content inclusion configuration

- **WHEN** ruler.toml defines an agent
- **THEN** include array specifies which source files to concatenate
- **AND** only specified files are included in generated output

#### Scenario: Agent activation configuration

- **WHEN** ruler.toml defines an agent with active=false
- **THEN** that agent's file is NOT generated
- **AND** previously generated file is removed

### Requirement: Generated File Management

The system SHALL commit all generated files to version control.

#### Scenario: All generated files committed

- **WHEN** agent files are generated
- **THEN** all generated files are committed (AGENTS.md, CLAUDE.md, .cursorrules, .github/copilot-instructions.md)
- **AND** files are immediately available after git pull
- **AND** no local regeneration required by developers

#### Scenario: Pre-commit hook keeps files in sync

- **WHEN** developer commits changes to `.ruler/*.md` files
- **THEN** pre-commit hook runs `ruler apply`
- **AND** all generated files are updated automatically
- **AND** developer stages both source and generated files

#### Scenario: Generated file freshness validation

- **WHEN** CI/CD pipeline runs
- **THEN** it generates files with `ruler apply`
- **AND** validates all generated files match .ruler/ sources with `git diff --exit-code`
- **AND** fails if any generated file is out of sync

### Requirement: Content Overlap Optimization

The system SHALL maximize content reuse across agents to minimize duplication.

#### Scenario: Universal content identified

- **WHEN** analyzing instruction content
- **THEN** 82-85% of content is identified as universal (applicable to all agents)
- **AND** universal content is stored in shared modular files
- **AND** all agents include universal content

#### Scenario: Tool-specific content isolated

- **WHEN** analyzing instruction content
- **THEN** 15-18% of content is identified as tool-specific (e.g., Claude-specific features)
- **AND** tool-specific content is stored in dedicated files
- **AND** only relevant agents include tool-specific content

#### Scenario: Duplication eliminated

- **WHEN** Ruler generates files
- **THEN** no manual duplication exists between source files
- **AND** changes to universal content update all agents automatically
- **AND** maintenance overhead is minimized

### Requirement: Selective Content Inclusion

The system SHALL support different content volumes per agent based on use case.

#### Scenario: PR review agent receives curated content

- **WHEN** generating .github/copilot-instructions.md for PR reviews
- **THEN** only core context, commit conventions, and security content is included (~800-1,000 lines)
- **AND** testing, agentic workflows, and permissions content is excluded
- **AND** content is optimized for PR review scope

#### Scenario: Development agents receive comprehensive content

- **WHEN** generating files for development agents (Claude Code, Cursor, OpenCode)
- **THEN** full universal content is included (~1,630-2,130 lines for universal only)
- **AND** includes all project standards, workflows, and conventions
- **AND** content supports full development lifecycle

#### Scenario: Claude Code receives extended content

- **WHEN** generating CLAUDE.md
- **THEN** universal content PLUS Claude-specific content is included (~1,880-2,430 lines)
- **AND** includes Plan Mode, sub-agents, TodoWrite, and context management
- **AND** content optimized for Claude Code features

### Requirement: Git Permission Gates

The system SHALL enforce explicit human approval for git operations.

#### Scenario: Commit requires explicit approval

- **WHEN** an agent completes a fix or feature
- **AND** files are staged in git
- **THEN** agent MUST ask before committing
- **AND** waits for explicit words: "commit this", "commit these changes", "go ahead and commit"
- **AND** does NOT assume approval from test output or staged files

#### Scenario: Push requires explicit approval

- **WHEN** an agent successfully creates a commit
- **THEN** agent MUST ask before pushing to remote
- **AND** waits for explicit words: "push this", "push it", "go ahead and push"
- **AND** does NOT assume approval from commit success

#### Scenario: Partial staging respected

- **WHEN** some files are staged and others are unstaged
- **THEN** agent commits ONLY staged files
- **AND** does NOT automatically stage additional files
- **AND** informs user which files are committed vs left unstaged

#### Scenario: Three-gate system enforced

- **WHEN** agent is asked to "fix this" or "get this ready"
- **THEN** agent performs: Fix → Test → Stage → STOP
- **AND** reports that changes are ready for commit
- **AND** waits for explicit approval before committing

### Requirement: Content Preservation

The system SHALL preserve all existing instruction content during migration.

#### Scenario: Universal standards preserved

- **WHEN** migrating from AGENTS.md to `.ruler/`
- **THEN** all universal standards are extracted to `.ruler/instructions.md`
- **AND** no content is lost
- **AND** generated files match original content

#### Scenario: Claude-specific features preserved

- **WHEN** migrating from CLAUDE.md to `.ruler/`
- **THEN** Claude-specific features are extracted to `.ruler/claude-workflows.md`
- **AND** CLAUDE.md still includes all original Claude content
- **AND** other agent files exclude Claude content

#### Scenario: Security requirements preserved

- **WHEN** migrating security content
- **THEN** all security protocols are extracted to `.ruler/security.md`
- **AND** all agent files include security content
- **AND** no security requirements are lost

#### Scenario: Git conventions preserved and expanded

- **WHEN** migrating commit conventions from `.claude/commit-conventions.md`
- **THEN** content is moved to `.ruler/git-conventions.md`
- **AND** Conventional Branch 1.0.0 specification is added
- **AND** all commit conventions are preserved
- **AND** branch naming standards are documented

#### Scenario: GitHub workflows moved to universal location

- **WHEN** migrating `.claude/github-workflow.md`
- **THEN** content is moved to `.ruler/github-workflow.md`
- **AND** MCP vs gh CLI decision trees are preserved
- **AND** agents with MCP support include this content

#### Scenario: Agentic workflows extracted

- **WHEN** migrating claude-workflows.md
- **THEN** universal workflow patterns are extracted to `.ruler/agentic-workflows.md`
- **AND** Claude-specific features remain in `.ruler/claude-workflows.md`
- **AND** all development agents receive universal patterns

#### Scenario: Permission gates documented

- **WHEN** creating permission requirements
- **THEN** git commit/push approval gates are documented in `.ruler/permissions.md`
- **AND** three-gate system (Fix → Stage → STOP → Commit → STOP → Push) is specified
- **AND** all development agents enforce permission gates

### Requirement: Documentation and Discoverability

The system SHALL provide clear documentation for managing AI agent instructions.

#### Scenario: Source file documentation

- **WHEN** a developer wants to update instructions
- **THEN** `.ruler/README.md` explains file organization
- **AND** documents which file contains what content
- **AND** explains generation workflow

#### Scenario: Generated file warnings

- **WHEN** a generated file is opened
- **THEN** header comment warns: "AUTO-GENERATED by Ruler"
- **AND** instructs: "DO NOT EDIT - Edit .ruler/\*.md files instead"
- **AND** prevents accidental manual edits

#### Scenario: Contributing guide integration

- **WHEN** a contributor reads CONTRIBUTING.md
- **THEN** it documents the Ruler workflow
- **AND** explains how to update AI agent instructions
- **AND** warns against editing generated files

### Requirement: Quality Gate Integration

The system SHALL integrate Ruler generation into project quality gates.

#### Scenario: Pre-commit validation

- **WHEN** developer attempts to commit
- **THEN** lefthook runs ruler-apply hook
- **AND** generation must succeed without errors
- **AND** commit fails if generation fails

#### Scenario: CI/CD validation

- **WHEN** CI pipeline runs
- **THEN** it installs Ruler as dev dependency
- **AND** generates all agent files
- **AND** validates files exist and are not empty
- **AND** fails build if generation fails

### Requirement: Backward Compatibility

The system SHALL maintain backward compatibility for existing AI agents during migration.

#### Scenario: Claude Code continues working

- **WHEN** Ruler integration is complete
- **THEN** CLAUDE.md still exists (generated)
- **AND** contains all previous content
- **AND** Claude Code reads it successfully
- **AND** no functionality is lost

#### Scenario: GitHub Copilot continues working

- **WHEN** Ruler integration is complete
- **THEN** .github/copilot-instructions.md still exists (generated)
- **AND** contains appropriate content
- **AND** GitHub Copilot reads it successfully
- **AND** PR review functionality unchanged

### Requirement: Rollback Support

The system SHALL support rolling back to previous instruction management if needed.

#### Scenario: Rollback to manual sync

- **WHEN** Ruler integration causes issues
- **THEN** original AGENTS.md can be restored from git
- **AND** lefthook sync-docs hook can be re-enabled
- **AND** Ruler can be uninstalled
- **AND** system returns to previous working state

#### Scenario: Emergency file recovery

- **WHEN** generated files are accidentally deleted
- **THEN** running `ruler apply` regenerates them
- **AND** content is restored from `.ruler/` sources
- **AND** no manual intervention needed
