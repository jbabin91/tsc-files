# ADR 002: tsdown vs tsc Build Tool

**Status**: Accepted

## Context

We needed a build tool that could generate dual ESM/CJS packages with TypeScript declarations efficiently.

## Decision

We chose tsdown over the TypeScript compiler (tsc) or other bundlers.

## Reasoning

- **Dual Package Support**: Native ESM/CJS output without complex configuration
- **Modern Tooling**: Built on Rolldown (Rust-based) for superior performance
- **Zero Config**: Works out of the box with sensible defaults
- **Package Validation**: Built-in publint integration catches publishing issues
- **Active Development**: Well-maintained with regular updates

## Consequences

- **Positive**: Fast builds, excellent dual-package output, integrated validation
- **Positive**: Simplified build configuration and maintenance
- **Negative**: Newer tool with smaller community vs established options
- **Negative**: Additional dependency vs using tsc directly

## Alternatives Considered

- **tsc**: Official but requires complex dual-package setup
- **tsup**: Popular but more configuration needed
- **rollup**: Powerful but overkill for library bundling
- **esbuild**: Fast but limited TypeScript declaration support
