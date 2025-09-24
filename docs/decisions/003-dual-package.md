# ADR 003: Dual Package Support

**Status**: Accepted

## Context

We needed to decide whether to support both ESM and CommonJS or focus on ESM-only for our TypeScript CLI tool.

## Decision

We chose to provide dual package support with both ESM and CommonJS outputs.

## Reasoning

- **Ecosystem Compatibility**: Many tools and environments still require CommonJS
- **Git Hook Integration**: Tools like lint-staged and husky may run in CommonJS contexts
- **Node.js Transition**: The ecosystem is still transitioning from CJS to ESM
- **Zero Breaking Changes**: Ensures compatibility with existing workflows
- **tsdown Support**: Our build tool makes dual packages trivial to maintain

## Consequences

- **Positive**: Maximum compatibility across all environments
- **Positive**: Easy adoption for existing projects
- **Positive**: Works with both `import` and `require()`
- **Negative**: Slightly larger package size
- **Negative**: Need to avoid dual package hazards

## Alternatives Considered

- **ESM-only**: Cleaner but would break CommonJS environments
- **CJS-only**: Legacy approach, not future-proof
- **Conditional exports only**: Complex and error-prone
