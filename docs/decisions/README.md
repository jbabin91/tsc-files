# Architectural Decision Records

This directory contains Architectural Decision Records (ADRs) for the tsc-files project. Each decision document explains the context, options considered, and rationale behind important technical choices.

## Format

Each ADR follows this structure:

- **Title**: What we decided
- **Status**: Accepted/Superseded
- **Context**: Why we needed to make this decision
- **Decision**: What we chose
- **Consequences**: What this means going forward

## Index

### Foundation Decisions (Phase 1)

- [001: TypeScript CLI Implementation](./001-typescript-cli.md)
- [002: tsdown vs tsc Build Tool](./002-tsdown-vs-tsc.md)
- [003: Dual Package Support](./003-dual-package.md)
- [004: Changesets Release Strategy](./004-changesets.md)
- [005: Vitest Testing Framework](./005-vitest-vs-jest.md)

### Implementation Decisions (Phase 2)

- [006: Package Manager Detection Strategy](./006-package-manager-detection.md)
- [007: Monorepo Support Architecture](./007-monorepo-support.md)
- [008: JavaScript File Handling Strategy](./008-javascript-file-handling.md)
- [009: Cross-Platform Execution Strategy](./009-cross-platform-execution.md)
- [010: Error Handling & Process Management](./010-error-handling-process-management.md)
