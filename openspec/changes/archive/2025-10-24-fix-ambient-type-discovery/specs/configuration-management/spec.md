# Configuration Management Spec Deltas

## MODIFIED Requirements

### Requirement: Dependency Closure Discovery

The system SHALL discover the complete set of source files required for type checking specific files, including ambient declaration files from tsconfig include patterns.

#### Scenario: Basic dependency discovery

- **WHEN** checking specific files
- **THEN** the system discovers all imported dependencies recursively

#### Scenario: Generated file inclusion

- **WHEN** source files import generated files (e.g., .gen.ts)
- **THEN** the system includes generated files in the dependency closure

#### Scenario: Path alias resolution

- **WHEN** source files use TypeScript path aliases
- **THEN** the system resolves and includes aliased dependencies

#### Scenario: Project reference handling

- **WHEN** source files depend on project references
- **THEN** the system includes referenced project declaration files

#### Scenario: Ambient declaration inclusion

- **WHEN** tsconfig.json includes patterns match ambient .d.ts files
- **THEN** the system explicitly includes those files even if not imported

#### Scenario: Module augmentation inclusion

- **WHEN** .d.ts files contain module augmentations (e.g., styled-components theme extensions)
- **THEN** the system includes those files in the dependency closure

#### Scenario: Generated type files

- **WHEN** .gen.ts files exist matching include patterns (e.g., routeTree.gen.ts)
- **THEN** the system includes generated files with their module augmentations

#### Scenario: Triple-slash reference types

- **WHEN** .d.ts files contain `/// <reference types="..." />` directives
- **THEN** the system includes those files and TypeScript processes the directives

## ADDED Requirements

### Requirement: Modern TypeScript Module Format Support

The system SHALL support TypeScript 4.7+ module formats including .mts and .cts files with their declaration counterparts.

#### Scenario: ES module TypeScript files

- **WHEN** project uses .mts files (ES module TypeScript)
- **THEN** the system includes .mts files in dependency discovery

#### Scenario: CommonJS TypeScript files

- **WHEN** project uses .cts files (CommonJS TypeScript)
- **THEN** the system includes .cts files in dependency discovery

#### Scenario: ES module declaration files

- **WHEN** project has .d.mts declaration files
- **THEN** the system includes .d.mts files as ambient declarations

#### Scenario: CommonJS declaration files

- **WHEN** project has .d.cts declaration files
- **THEN** the system includes .d.cts files as ambient declarations

#### Scenario: Mixed module formats

- **WHEN** project uses both .mts and .cts files
- **THEN** the system correctly handles both module formats in dependency closure

### Requirement: Cross-Platform Path Handling

The system SHALL handle file paths correctly across Windows, macOS, and Linux platforms.

#### Scenario: Windows backslash paths

- **WHEN** running on Windows with backslash path separators
- **THEN** the system correctly identifies node_modules paths

#### Scenario: Unix forward slash paths

- **WHEN** running on macOS or Linux with forward slash separators
- **THEN** the system correctly identifies node_modules paths

#### Scenario: Mixed path separators

- **WHEN** TypeScript returns paths with mixed separators
- **THEN** the system normalizes paths before comparisons

#### Scenario: Case-insensitive filesystems

- **WHEN** running on macOS or Windows (case-insensitive)
- **THEN** the system respects OS case sensitivity behavior

### Requirement: Ambient Declaration File Discovery

The system SHALL discover ambient declaration files matching tsconfig include patterns and add them to the files array.

#### Scenario: Standard .d.ts discovery

- **WHEN** tsconfig.json has `include: ["src"]`
- **THEN** the system globs for all .d.ts files in src/ directory

#### Scenario: Exclude pattern respect

- **WHEN** tsconfig.json has `exclude: ["**/*.test.ts"]`
- **THEN** the system excludes matching .d.ts files from discovery

#### Scenario: Nested declaration files

- **WHEN** .d.ts files exist in nested directories matching include patterns
- **THEN** the system discovers and includes all matching files

#### Scenario: Vite plugin declarations

- **WHEN** project has custom.d.ts with vite-plugin-svgr declarations
- **THEN** the system includes custom.d.ts for SVG module resolution

#### Scenario: Vitest global declarations

- **WHEN** project has vitest.d.ts with `/// <reference types="vitest/globals" />`
- **THEN** the system includes vitest.d.ts for global test functions

#### Scenario: Empty ambient declaration list

- **WHEN** no .d.ts files match include patterns
- **THEN** the system continues without ambient files (no error)

### Requirement: Dependency Cache Invalidation

The system SHALL invalidate cached dependency closures when ambient declaration files are added, modified, or removed.

#### Scenario: New ambient file added

- **WHEN** new .d.ts file is created matching include patterns
- **THEN** the system detects the change and invalidates cache

#### Scenario: Ambient file modified

- **WHEN** existing .d.ts file modification time changes
- **THEN** the system detects the change via mtime hash

#### Scenario: Ambient file removed

- **WHEN** .d.ts file is deleted
- **THEN** the system detects the change and regenerates closure

#### Scenario: No changes to ambient files

- **WHEN** ambient files and their mtimes are unchanged
- **THEN** the system returns cached dependency closure

#### Scenario: Cache performance

- **WHEN** cache is valid
- **THEN** cache lookup completes in <5ms

### Requirement: Glob Pattern Performance

The system SHALL efficiently discover ambient declaration files with minimal performance overhead.

#### Scenario: Small project performance

- **WHEN** project has <10 ambient .d.ts files
- **THEN** glob discovery completes in <5ms

#### Scenario: Medium project performance

- **WHEN** project has 10-100 ambient .d.ts files
- **THEN** glob discovery completes in <10ms

#### Scenario: Large project performance

- **WHEN** project has >100 ambient .d.ts files
- **THEN** glob discovery completes in <50ms

#### Scenario: Monorepo performance

- **WHEN** checking files in large monorepo with multiple tsconfigs
- **THEN** each tsconfig's ambient discovery remains performant

### Requirement: Verbose Ambient File Logging

The system SHALL provide detailed logging of discovered ambient files when verbose mode is enabled.

#### Scenario: Verbose ambient file list

- **WHEN** verbose mode is enabled and ambient files are discovered
- **THEN** the system logs count and list of included ambient files

#### Scenario: No ambient files logging

- **WHEN** verbose mode is enabled but no ambient files found
- **THEN** the system logs that no ambient files were discovered

#### Scenario: Ambient file pattern logging

- **WHEN** verbose mode is enabled
- **THEN** the system logs the glob patterns used for ambient discovery
