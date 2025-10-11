# File Checking - Spec Delta

## MODIFIED Requirements

### Requirement: File Pattern Resolution

The system SHALL resolve file patterns (including globs) to absolute file paths for type checking.

#### Scenario: Direct file paths

- **WHEN** user provides direct file paths like `src/index.ts src/utils.ts`
- **THEN** the system resolves them to absolute paths and validates they exist

#### Scenario: Glob pattern expansion

- **WHEN** user provides glob patterns like `"src/**/*.ts"`
- **THEN** the system expands the pattern using tinyglobby and returns all matching files

#### Scenario: Mixed patterns

- **WHEN** user provides both direct paths and glob patterns
- **THEN** the system resolves all patterns and returns the combined unique file list

#### Scenario: Directory paths

- **WHEN** user provides a directory path without glob pattern
- **THEN** the system expands it to `directory/**/*.{ts,tsx}` (or includes `.js,.jsx` if allowJs is configured)

## REMOVED Requirements

### Requirement: Fast-glob Optimizations

**Reason**: Implementation-specific details should not be in requirements. Glob library is now tinyglobby which has different internal optimizations.

**Migration**: Behavior is maintained through tinyglobby's built-in optimizations. Tests ensure cross-platform compatibility and deduplication work correctly.

## ADDED Requirements

### Requirement: Minimal Glob Dependencies

The system SHALL use a minimal, battle-tested glob library for file pattern matching.

#### Scenario: Lightweight implementation

- **WHEN** bundling the application
- **THEN** the system uses tinyglobby (1kB, 2 dependencies) for glob operations

#### Scenario: Cross-platform compatibility

- **WHEN** running on different operating systems (Windows/macOS/Linux)
- **THEN** the system handles path separators and case sensitivity correctly via tinyglobby

#### Scenario: Pattern deduplication

- **WHEN** multiple patterns match the same file
- **THEN** the system returns unique file paths without duplicates

#### Scenario: Performance at scale

- **WHEN** processing large codebases with complex patterns
- **THEN** the system maintains efficient pattern matching as validated by Vite's adoption

### Requirement: Monorepo File Resolution

The system SHALL resolve and group files correctly in monorepo structures where different packages may have different tsconfig.json files.

#### Scenario: Glob patterns across packages

- **WHEN** user provides glob pattern spanning multiple packages (packages/\*/src/\*\*/\*.ts)
- **THEN** the system expands pattern across all packages and resolves files correctly via tinyglobby

#### Scenario: File grouping by tsconfig

- **WHEN** resolved files belong to different packages with different tsconfig.json files
- **THEN** the system groups files by their associated tsconfig for batch processing

#### Scenario: Cross-platform monorepo paths

- **WHEN** running on Windows with monorepo structure
- **THEN** the system handles backslash path separators correctly for multi-package resolution

#### Scenario: Monorepo file deduplication

- **WHEN** multiple patterns match the same file in monorepo (packages/core/\*\*/\*.ts and packages/\*/src/index.ts)
- **THEN** the system deduplicates files before grouping by tsconfig

#### Scenario: Mixed package file patterns

- **WHEN** user provides mix of absolute paths, relative paths, and globs across packages
- **THEN** the system normalizes all paths, resolves patterns, and groups by package tsconfig correctly

### Requirement: Bun Runtime Compatibility

The system SHALL support Bun runtime for all file resolution and glob operations (MANDATORY, not optional).

#### Scenario: Bun runtime glob patterns

- **WHEN** running under Bun runtime with glob patterns (src/\*\*/\*.ts)
- **THEN** tinyglobby works correctly with Bun's filesystem APIs

#### Scenario: Bun filesystem operations

- **WHEN** resolving file paths under Bun runtime
- **THEN** the system uses cross-runtime compatible path operations that work with both Node.js and Bun

#### Scenario: Cross-runtime file resolution

- **WHEN** same file patterns are processed under Node.js and Bun
- **THEN** the system returns identical file lists regardless of runtime

#### Scenario: Bun path normalization

- **WHEN** converting relative to absolute paths under Bun
- **THEN** the system produces correct absolute paths using Bun-compatible path operations

#### Scenario: Bun performance optimization

- **WHEN** processing large file sets under Bun runtime
- **THEN** the system leverages Bun's faster filesystem operations without additional configuration

### Requirement: Advanced Glob Patterns

The system SHALL support advanced glob patterns for real-world file selection scenarios using tinyglobby.

#### Scenario: Brace expansion patterns

- **WHEN** user provides brace expansion patterns (src/{core,utils}/\*_/_.ts)
- **THEN** tinyglobby expands braces and returns all matching files from specified directories

#### Scenario: Negation patterns

- **WHEN** user provides negation patterns (src/**/\*.ts !src/**/\*.test.ts)
- **THEN** the system excludes negated patterns from results correctly

#### Scenario: Windows backslash paths

- **WHEN** running on Windows with backslash paths (src\\\*_\\_.ts)
- **THEN** tinyglobby normalizes backslashes to forward slashes and resolves patterns correctly

#### Scenario: Escaped special characters

- **WHEN** file paths contain spaces or special characters ("src/my file.ts", "src/[test].ts")
- **THEN** the system handles escaped characters and quoted paths correctly

#### Scenario: Cross-platform case sensitivity

- **WHEN** same pattern is used on case-sensitive (Linux) and case-insensitive (macOS/Windows) filesystems
- **THEN** the system respects platform case sensitivity rules consistently
