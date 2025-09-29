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
- **THEN** the system expands the pattern using fast-glob and returns all matching files

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

### Requirement: Fast-glob Optimizations

The system SHALL use optimized fast-glob settings for efficient file resolution.

#### Scenario: Unique file deduplication

- **WHEN** multiple patterns match the same file
- **THEN** the system deduplicates results using fast-glob's `unique` option

#### Scenario: Case-insensitive matching

- **WHEN** running on case-insensitive file systems
- **THEN** the system uses `caseSensitiveMatch: false` for cross-platform compatibility

#### Scenario: Base name matching optimization

- **WHEN** patterns use `*.ts` syntax
- **THEN** the system enables `baseNameMatch: true` for efficient matching

### Requirement: Working Directory Support

The system SHALL respect custom working directories specified via options.

#### Scenario: Custom cwd

- **WHEN** user specifies custom `cwd` in options
- **THEN** the system resolves all paths relative to the specified directory

#### Scenario: Default cwd

- **WHEN** no custom `cwd` is specified
- **THEN** the system uses `process.cwd()` as the working directory
