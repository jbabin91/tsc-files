# Compiler Detection Specification

## Purpose

The compiler detection capability identifies and locates TypeScript compilers (tsc and tsgo) and package managers (npm, yarn, pnpm, bun) in the user's environment. It provides cross-platform support with special handling for Windows paths and shell execution.

**Implementation**: `src/detectors/typescript.ts`, `src/detectors/package-manager.ts`

## Requirements

### Requirement: TypeScript Compiler Detection

The system SHALL detect the TypeScript compiler (tsc) installation in the user's project.

#### Scenario: Local node_modules installation

- **WHEN** typescript is installed in `node_modules/`
- **THEN** the system detects the local tsc executable path

#### Scenario: Package manager specific paths

- **WHEN** using pnpm with nested node_modules structure
- **THEN** the system adjusts paths for pnpm's `../../../` prefix

#### Scenario: Windows executable names

- **WHEN** running on Windows platform
- **THEN** the system uses `.cmd` extension for package manager executables

#### Scenario: TypeScript not found

- **WHEN** typescript is not installed
- **THEN** the system throws error with installation guidance

### Requirement: tsgo Compiler Detection

The system SHALL detect optional tsgo (@typescript/native-preview) compiler when available.

#### Scenario: tsgo available

- **WHEN** `@typescript/native-preview` is installed in node_modules
- **THEN** the system detects tsgo executable and marks it as available

#### Scenario: tsgo not available

- **WHEN** `@typescript/native-preview` is not installed
- **THEN** the system returns `available: false` without error

#### Scenario: Multiple tsgo paths

- **WHEN** checking for tsgo in multiple possible locations
- **THEN** the system checks `bin/tsgo`, package root, and `.bin/tsgo` in order

### Requirement: Package Manager Detection

The system SHALL detect the package manager used in the project via lock files.

#### Scenario: npm detection

- **WHEN** `package-lock.json` exists
- **THEN** the system identifies npm as the package manager

#### Scenario: yarn detection

- **WHEN** `yarn.lock` exists
- **THEN** the system identifies yarn as the package manager

#### Scenario: pnpm detection

- **WHEN** `pnpm-lock.yaml` exists
- **THEN** the system identifies pnpm as the package manager

#### Scenario: bun detection

- **WHEN** `bun.lockb` exists
- **THEN** the system identifies bun as the package manager

#### Scenario: Fallback to npm

- **WHEN** no lock files are present
- **THEN** the system defaults to npm as the package manager

### Requirement: Windows Path Handling

The system SHALL handle Windows-specific path requirements.

#### Scenario: Paths with spaces

- **WHEN** executable path contains spaces on Windows
- **THEN** the system wraps the path in double quotes

#### Scenario: Already quoted paths

- **WHEN** path already starts with quote on Windows
- **THEN** the system does not double-quote the path

#### Scenario: Package manager cmd extensions

- **WHEN** using npm, npx, yarn, pnpm, or bun on Windows
- **THEN** the system adds `.cmd` extension to executables

### Requirement: Shell Execution Mode

The system SHALL determine when to use shell mode for process execution.

#### Scenario: Windows requires shell

- **WHEN** running on Windows platform
- **THEN** the system enables shell mode for .cmd execution

#### Scenario: Unix no shell needed

- **WHEN** running on Unix-like platforms (macOS/Linux)
- **THEN** the system disables shell mode for direct execution

### Requirement: Compiler Information

The system SHALL provide complete compiler information for execution.

#### Scenario: Compiler metadata

- **WHEN** compiler is detected
- **THEN** the system returns executable path, args, shell mode, and compiler type (tsc/tsgo)

#### Scenario: Fallback availability

- **WHEN** both tsc and tsgo are available
- **THEN** the system marks fallback as available for automatic switching

### Requirement: Cross-Platform Compatibility

The system SHALL work correctly across Windows, macOS, and Linux platforms.

#### Scenario: Platform detection

- **WHEN** system starts
- **THEN** the system detects platform and adjusts path handling accordingly

#### Scenario: Path resolution

- **WHEN** resolving node_modules paths
- **THEN** the system uses platform-appropriate path separators
