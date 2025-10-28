# ADR 003: Dual Package Support

**Status**: Superseded

**Date**: 2025-09-23

**Superseded On**: 2025-10-28

## Context

We originally evaluated whether to ship both ESM and CommonJS bundles or focus on ESM-only output for the CLI.

## Decision

We ultimately migrated to an ESM-only distribution (the CLI binary remains, but library consumers load the ESM bundle exclusively).

## Reasoning

- **Runtime Baseline**: Project already requires Node.js ≥22, which supports native ESM without interop flags.
- **Operational Simplicity**: Single-format builds eliminate dual-export hazards (conditional export bugs, duplicate dependency graphs).
- **Package Size & Build Time**: Removing the extra CJS artifact reduces publish size and halves bundling work.
- **Tooling Reliability**: tsdown configuration and type declarations are easier to reason about with one module format.
- **Interop Options Remain**: Consumers who still need CommonJS can use `createRequire`/dynamic `import()` when necessary.

## Consequences

- **Positive**: Smaller published artifact and faster builds.
- **Positive**: Fewer edge cases around conditional exports and default interop.
- **Positive**: Documentation and examples align with a single module system.
- **Negative**: Pure CommonJS consumers must adopt interoperability helpers.
- **Negative**: Historical tutorials referencing `require('tsc-files')` need updates.

## Alternatives Considered

- **Dual package**: Previously shipped; removed due to maintenance cost outweighing remaining compatibility benefit.
- **CJS-only**: Rejected because the Node.js community is converging on ESM.
- **Conditional exports with transpiled fallbacks**: Adds complexity without solving interop headaches.
