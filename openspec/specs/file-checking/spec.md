# File Checking Specification

## Purpose

The file checking capability orchestrates the TypeScript type checking process by resolving input files, managing configuration, and coordinating execution. It supports glob patterns, JavaScript files (when configured), and handles both single-file and batch checking scenarios.

**Implementation**: `src/core/checker.ts`, `src/core/file-resolver.ts`

## Requirements

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

### Requirement: JavaScript File Support

The system SHALL include JavaScript files when tsconfig.json has `allowJs` or `checkJs` enabled.

#### Scenario: JavaScript inclusion with allowJs

- **WHEN** tsconfig.json has `allowJs: true` and user provides `"src/**/*"`
- **THEN** the system includes both `.ts,.tsx` and `.js,.jsx` files in resolution

#### Scenario: JavaScript exclusion without allowJs

- **WHEN** tsconfig.json does not have `allowJs` or `checkJs` enabled
- **THEN** the system only resolves `.ts` and `.tsx` files

#### Scenario: Explicit JavaScript file

- **WHEN** tsconfig.json has `allowJs: true` and user provides `src/script.js`
- **THEN** the system includes the JavaScript file for type checking

### Requirement: File Validation

The system SHALL validate resolved files and filter out invalid entries.

#### Scenario: Non-existent files

- **WHEN** a direct file path does not exist
- **THEN** the system excludes it from the checking process

#### Scenario: Invalid extensions

- **WHEN** a file has an unsupported extension (not `.ts,.tsx,.js,.jsx`)
- **THEN** the system excludes it from the checking process

#### Scenario: Empty file list

- **WHEN** no valid files are found after resolution
- **THEN** the system returns success with zero checked files

### Requirement: Default File Exclusions

The system SHALL exclude certain patterns from file resolution by default.

#### Scenario: Node modules exclusion

- **WHEN** glob patterns would match files in `node_modules/`
- **THEN** the system excludes those files from resolution

#### Scenario: Dist directory exclusion

- **WHEN** glob patterns would match files in `dist/` or `build/`
- **THEN** the system excludes those files from resolution

#### Scenario: Declaration file exclusion

- **WHEN** glob patterns would match `.d.ts` files
- **THEN** the system excludes declaration files from explicit checking

### Requirement: File Grouping by Configuration

The system SHALL group files by their associated tsconfig.json for batch processing.

#### Scenario: Single tsconfig for all files

- **WHEN** all files are in the same project with one tsconfig.json
- **THEN** the system groups all files together for single execution

#### Scenario: Multiple tsconfigs in monorepo

- **WHEN** files are associated with different tsconfig.json files
- **THEN** the system groups files by their tsconfig and processes each group separately

#### Scenario: Default grouping fallback

- **WHEN** a file cannot be associated with any tsconfig.json
- **THEN** the system groups it with the default/root tsconfig

### Requirement: Core Orchestration

The system SHALL orchestrate the complete type checking workflow from file resolution to result aggregation.

#### Scenario: Successful type check

- **WHEN** all files type check successfully
- **THEN** the system returns success result with checked file count and duration

#### Scenario: Type errors found

- **WHEN** type checking finds errors
- **THEN** the system returns failure result with error details (file, line, column, message)

#### Scenario: Mixed results from multiple groups

- **WHEN** processing multiple tsconfig groups with some failures
- **THEN** the system aggregates all errors and returns combined result

### Requirement: Performance Metrics

The system SHALL track and report performance metrics for type checking operations.

#### Scenario: Duration tracking

- **WHEN** type checking completes
- **THEN** the system reports total duration in milliseconds

#### Scenario: File count reporting

- **WHEN** type checking completes
- **THEN** the system reports the total number of files checked

### Requirement: Verbose Logging

The system SHALL provide detailed logging when verbose mode is enabled.

#### Scenario: File resolution logging

- **WHEN** verbose mode is enabled
- **THEN** the system logs the number of files resolved and their paths

#### Scenario: Compiler selection logging

- **WHEN** verbose mode is enabled
- **THEN** the system logs which TypeScript compiler (tsc/tsgo) is being used and why

#### Scenario: Configuration logging

- **WHEN** verbose mode is enabled
- **THEN** the system logs tsconfig.json detection and compatibility analysis

### Requirement: Error Handling

The system SHALL handle errors gracefully and provide meaningful error messages.

#### Scenario: Configuration not found

- **WHEN** tsconfig.json cannot be found
- **THEN** the system returns configuration error with helpful guidance

#### Scenario: File resolution failure

- **WHEN** file pattern resolution fails
- **THEN** the system logs error details and continues with available files

#### Scenario: Parser errors

- **WHEN** TypeScript compiler output cannot be parsed
- **THEN** the system returns raw output and marks the check as failed

### Requirement: Working Directory Support

The system SHALL respect custom working directories specified via options.

#### Scenario: Custom cwd

- **WHEN** user specifies custom `cwd` in options
- **THEN** the system resolves all paths relative to the specified directory

#### Scenario: Default cwd

- **WHEN** no custom `cwd` is specified
- **THEN** the system uses `process.cwd()` as the working directory

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
