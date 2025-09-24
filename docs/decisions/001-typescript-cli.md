# ADR 001: TypeScript CLI Implementation

**Status**: Accepted

## Context

We needed to decide whether to implement the CLI tool in TypeScript or JavaScript, considering factors like type safety, maintainability, and ecosystem alignment.

## Decision

We chose to implement the CLI in TypeScript with dual ESM/CJS output.

## Reasoning

- **Type Safety**: CLI tools benefit from TypeScript's type checking to prevent runtime errors
- **Ecosystem Alignment**: We're building a TypeScript tooling utility - dogfooding makes sense
- **Maintainability**: Better IDE support and refactoring capabilities
- **Professional Standard**: TypeScript is the de facto standard for modern Node.js tooling

## Consequences

- **Positive**: Better code quality, IDE support, easier refactoring
- **Positive**: Aligns with target audience expectations (TypeScript developers)
- **Negative**: Adds build step complexity
- **Negative**: Slightly larger distribution due to declaration files

## Alternatives Considered

- **Plain JavaScript**: Simpler build, but lacks type safety benefits
- **JavaScript with JSDoc**: Types without compilation, but less robust
