# ADR 004: Changesets Release Strategy

**Status**: Accepted

**Date**: 2025-09-23

## Context

We needed a reliable, automated release strategy that handles versioning, changelogs, and npm publishing while following semantic versioning.

## Decision

We chose Changesets for our release management workflow.

## Reasoning

- **Semantic Versioning**: Enforces proper semver through changeset files
- **Quality Changelogs**: Generates human-readable changelogs with GitHub integration
- **Version Packages PR**: Provides review opportunity before releases
- **GitHub Integration**: Automatic changelog generation with PR links
- **Monorepo Ready**: Works well for single packages and scales to monorepos
- **CI/CD Integration**: Seamless automation with GitHub Actions

## Consequences

- **Positive**: Professional release process with full automation
- **Positive**: Clear changelog generation and version management
- **Positive**: Manual approval gate prevents accidental releases
- **Negative**: Requires discipline to create changesets for each PR
- **Negative**: Additional step in contribution workflow

## Alternatives Considered

- **Manual Releases**: Error-prone and time-consuming
- **semantic-release**: More automated but less control over timing
- **Standard Version**: Good but lacks GitHub integration
- **Release Please**: Google's tool but more opinionated
