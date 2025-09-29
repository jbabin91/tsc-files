# Monorepo Support Specification

## Purpose

The monorepo support capability enables per-file tsconfig resolution and file grouping for projects with multiple TypeScript configurations. It handles complex workspace setups where different directories have their own tsconfig.json files.

**Implementation**: `src/core/checker.ts` (groupRawFilesByTsConfig, processFileGroup)

## Requirements

### Requirement: Per-File Configuration Resolution

The system SHALL resolve the appropriate tsconfig.json for each input file.

#### Scenario: File in workspace with local tsconfig

- **WHEN** a file is in a directory with its own tsconfig.json
- **THEN** the system uses that local configuration for the file

#### Scenario: File in parent-configured directory

- **WHEN** a file's directory has no tsconfig.json
- **THEN** the system searches parent directories for the nearest tsconfig.json

#### Scenario: Multiple files with different configs

- **WHEN** checking files from different workspace packages
- **THEN** the system associates each file with its nearest tsconfig.json

### Requirement: File Grouping by Configuration

The system SHALL group input files by their associated tsconfig.json for batch processing.

#### Scenario: Same configuration grouping

- **WHEN** multiple files share the same tsconfig.json
- **THEN** the system groups them together for single execution

#### Scenario: Different configuration grouping

- **WHEN** files are associated with different tsconfig.json files
- **THEN** the system creates separate groups for each configuration

#### Scenario: Default group fallback

- **WHEN** a file cannot be associated with any tsconfig.json
- **THEN** the system places it in a default group

### Requirement: Batch Execution per Configuration

The system SHALL execute type checking separately for each tsconfig group.

#### Scenario: Multiple group execution

- **WHEN** files are grouped into multiple tsconfigs
- **THEN** the system runs type checking for each group independently

#### Scenario: Relative path preservation

- **WHEN** generating temp config for a group
- **THEN** the system maintains file paths relative to the tsconfig directory

#### Scenario: Configuration isolation

- **WHEN** processing multiple groups
- **THEN** each group uses only its associated tsconfig settings

### Requirement: Result Aggregation

The system SHALL combine results from multiple tsconfig groups into a unified output.

#### Scenario: Success aggregation

- **WHEN** all groups type check successfully
- **THEN** the system returns combined success with total file count

#### Scenario: Error aggregation

- **WHEN** some groups have type errors
- **THEN** the system combines all errors into single result

#### Scenario: Duration aggregation

- **WHEN** multiple groups are processed
- **THEN** the system reports total duration across all groups

### Requirement: Workspace Detection

The system SHALL detect monorepo workspace structures.

#### Scenario: Nested package detection

- **WHEN** directory contains multiple packages with tsconfig.json files
- **THEN** the system identifies each package's configuration boundary

#### Scenario: Root configuration presence

- **WHEN** workspace root has tsconfig.json
- **THEN** the system uses it as fallback for ungrouped files

### Requirement: Error Handling in Monorepos

The system SHALL handle configuration errors gracefully in multi-config scenarios.

#### Scenario: One group configuration error

- **WHEN** one tsconfig group has configuration error
- **THEN** the system reports error for that group and continues with others

#### Scenario: Partial success reporting

- **WHEN** some groups succeed and others fail
- **THEN** the system reports which groups succeeded and which failed
