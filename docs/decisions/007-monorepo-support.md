# ADR 007: Monorepo Support Architecture

**Status**: Accepted

**Date**: 2025-09-25

## Context

Modern TypeScript projects often use monorepo structures with multiple `tsconfig.json` files - one per package or workspace. The original `tsc` command doesn't handle this scenario well when checking specific files, as it assumes a single configuration. Users needed a way to type-check files across different parts of a monorepo while respecting each area's specific TypeScript configuration.

## Decision

We implemented a **per-file tsconfig resolution with file grouping** architecture:

1. **Per-file configuration discovery**
   - Each input file is mapped to its nearest `tsconfig.json` via directory traversal
   - Files inherit configuration from their closest parent tsconfig

2. **File grouping by configuration**
   - Files are grouped by their associated tsconfig path
   - Each group is processed independently with its specific configuration

3. **Parallel processing**
   - Multiple tsconfig groups are processed in parallel for performance
   - Each group generates its own temporary configuration and type-checking process

4. **Result aggregation**
   - Results from all groups are combined into a unified output
   - Error reporting maintains file context and proper source locations

## Reasoning

**Per-file resolution benefits**:

- **Accuracy**: Each file uses its intended TypeScript configuration
- **Monorepo native**: Naturally handles complex workspace structures
- **Backwards compatible**: Single-config projects work identically
- **Flexible**: Supports arbitrary tsconfig arrangements

**File grouping advantages**:

- **Efficiency**: Avoids redundant type-checking of same configurations
- **Parallelization**: Multiple groups can be processed simultaneously
- **Memory optimization**: Each group has isolated memory footprint
- **Error isolation**: Configuration errors in one area don't affect others

**Alternative approaches rejected**:

- **Single tsconfig approach**: Would lose per-workspace configuration specificity
- **Workspace detection**: Too rigid, doesn't handle custom monorepo structures
- **Sequential processing**: Slower than parallel approach

## Consequences

**Positive**:

- **Monorepo support**: Full support for complex workspace structures
- **Configuration accuracy**: Each file uses its correct TypeScript settings
- **Performance**: Parallel processing of independent configuration groups
- **Backwards compatibility**: Single-config projects continue to work unchanged
- **Flexibility**: Handles non-standard monorepo structures

**Negative**:

- **Complexity**: Significantly more complex than single-config approach
- **Resource usage**: Multiple TypeScript processes may use more memory
- **Debug complexity**: Errors may come from multiple configuration contexts

**Implementation complexity**:

- File-to-config mapping logic
- Group processing coordination
- Result aggregation and error handling
- Temporary file management for multiple configs

## Alternatives Considered

1. **Single tsconfig with includes/excludes**:
   - Simple but loses per-workspace configuration
   - Doesn't handle different compiler options per workspace

2. **Workspace detection (lerna/nx patterns)**:
   - More predictable but less flexible
   - Doesn't handle custom monorepo structures

3. **Sequential processing**:
   - Simpler coordination but slower
   - Poor performance for large monorepos

4. **User-specified config mapping**:
   - Maximum control but poor user experience
   - Requires manual configuration maintenance

## Implementation Details

Key functions:

- `findTsConfig()`: Directory traversal to find nearest tsconfig for each file
- `groupFilesByTsConfig()`: Groups files by their associated configuration
- `resolveFiles()`: Handles file resolution with proper JavaScript support per config
- `processGroup()`: Processes each configuration group independently

The implementation maintains a clear separation between:

- File discovery and grouping (pure functions)
- Configuration processing (isolated per group)
- Result aggregation (combines outputs cleanly)

This architecture scales from single-file checking to complex monorepo scenarios without requiring users to understand or configure the underlying complexity.
