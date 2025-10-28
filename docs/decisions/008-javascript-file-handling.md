# ADR 008: JavaScript File Handling Strategy

**Status**: Accepted

**Date**: 2025-09-25

## Context

TypeScript projects often include JavaScript files alongside TypeScript files, especially during migration or when using external libraries. The TypeScript compiler has `allowJs` and `checkJs` options that control whether JavaScript files are included in compilation and type-checking. Our CLI tool needed to respect these settings while providing intuitive behavior for users who might specify JavaScript files explicitly.

## Decision

We implemented **tsconfig-aware JavaScript file inclusion** with the following strategy:

1. **Configuration-based inclusion**:
   - Parse the relevant `tsconfig.json` for `allowJs` and `checkJs` compiler options
   - Include JavaScript files only when `allowJs` OR `checkJs` is enabled
   - Default to TypeScript-only when no configuration is found

2. **Per-tsconfig evaluation**:
   - In monorepo scenarios, each tsconfig group evaluates JavaScript inclusion independently
   - Allows mixed JavaScript support across different workspace areas

3. **File pattern expansion**:
   - When JavaScript is enabled, extend glob patterns to include `.js`, `.jsx`, `.mjs`, `.cjs`
   - Maintain TypeScript patterns (`.ts`, `.tsx`, `.mts`, `.cts`) in all cases

4. **Explicit file handling**:
   - Users can explicitly specify JavaScript files in command arguments
   - Explicit JavaScript files are included regardless of tsconfig settings (with warnings)

## Reasoning

**tsconfig-driven approach benefits**:

- **Consistency**: Matches TypeScript compiler behavior exactly
- **User expectations**: Respects existing project configuration
- **Zero surprise**: JavaScript inclusion follows established TypeScript patterns
- **Flexibility**: Different monorepo areas can have different JavaScript policies

**Per-tsconfig evaluation advantages**:

- **Monorepo compatibility**: Mixed JavaScript support across workspace areas
- **Configuration isolation**: One area's settings don't affect another
- **Migration flexibility**: Gradual JavaScript adoption across large projects

**Explicit file override rationale**:

- **User intent**: When users specify JavaScript files explicitly, they likely want them checked
- **Debugging capability**: Allows investigation of JavaScript files even in TypeScript-only projects
- **Warning system**: Users are informed when overriding configuration

## Consequences

**Positive**:

- **Intuitive behavior**: Matches TypeScript compiler expectations
- **Monorepo support**: Different areas can have different JavaScript policies
- **Migration friendly**: Supports gradual TypeScript adoption
- **Flexible**: Users can override configuration when needed

**Negative**:

- **Configuration dependency**: Requires tsconfig parsing for JavaScript inclusion
- **Complexity**: Different file inclusion logic per configuration group
- **Edge cases**: Mixed TypeScript/JavaScript projects may have unexpected behavior

**Performance implications**:

- **File system overhead**: Additional stat calls for JavaScript file detection
- **Pattern complexity**: More complex glob patterns when JavaScript is enabled
- **Memory usage**: Larger file sets when JavaScript is included

## Alternatives Considered

1. **Always include JavaScript**:
   - Simple but conflicts with TypeScript-only projects
   - Ignores user's configuration preferences

2. **CLI flag for JavaScript inclusion**:
   - Explicit control but requires user configuration
   - Doesn't respect existing tsconfig settings

3. **Never include JavaScript**:
   - Simple but limits tool utility
   - Poor support for mixed TypeScript/JavaScript projects

4. **JavaScript-only when explicitly specified**:
   - Predictable but limited functionality
   - Doesn't handle glob patterns with JavaScript files

## Implementation Details

Key functions:

- `shouldIncludeJavaScriptFiles()`: Parses tsconfig for `allowJs`/`checkJs` flags
- `resolveFiles()`: Applies JavaScript inclusion per configuration group
- Pattern expansion logic: Adds JavaScript extensions when appropriate

Configuration parsing:

```typescript
// Checks both allowJs and checkJs - if either is true, include JavaScript
const includeJs =
  (config.compilerOptions?.allowJs ?? false) ||
  (config.compilerOptions?.checkJs ?? false);
```

File pattern handling:

- TypeScript patterns: `**/*.{ts,tsx,mts,cts}`
- JavaScript patterns (when enabled): `**/*.{js,jsx,mjs,cjs}`
- Combined patterns respect user's glob expressions

The implementation ensures that JavaScript file inclusion is determined at the appropriate scope (per-tsconfig in monorepos) and provides clear feedback when configuration overrides occur.
