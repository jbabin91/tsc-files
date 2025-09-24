# tsc-files Documentation

This directory contains comprehensive documentation for the tsc-files project.

## Quick Navigation

### Getting Started

- [Getting Started](./getting-started.md) - Installation, basic usage, and first steps

### Technical Documentation

- [Architecture](./architecture.md) - System design and component overview
- [API Reference](./api.md) - CLI options and programmatic API
- [Package Manager Detection](./package-manager-detection.md) - How we detect npm/yarn/pnpm/bun
- [Testing Strategy](./testing-strategy.md) - Testing approach and guidelines

### Project Information

- [Migration Guide](./migration-guide.md) - Migrating from the original tsc-files
- [Phase 1 Checklist](./phase-1-checklist.md) - Development progress tracking

### Architectural Decisions

- [Decision Records](./decisions/README.md) - Why we made key technical choices

## Contributing

When making significant technical decisions, please document them in the [decisions](./decisions/) directory following the established ADR format.

## Project Goals

tsc-files enables running TypeScript compiler checks on specific files while respecting your existing tsconfig.json configuration. It's designed to be fast, reliable, and work seamlessly with all major package managers and git hooks.
