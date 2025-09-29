## MODIFIED Requirements

### Requirement: Error Parsing

The system SHALL parse TypeScript compiler output and extract structured error information with enhanced detail.

#### Scenario: Structured error extraction

- **WHEN** compiler outputs errors in format `file.ts(line,col): error TS1234: message`
- **THEN** the system extracts file path, line number, column, error code, severity, and message

#### Scenario: Error severity detection

- **WHEN** parsing compiler output
- **THEN** the system categorizes errors by severity (error, warning, suggestion)

#### Scenario: Error code mapping

- **WHEN** extracting error code
- **THEN** the system looks up actionable suggestions for common error codes

## ADDED Requirements

### Requirement: Error Grouping and Organization

The system SHALL organize errors for optimal readability.

#### Scenario: Group by file

- **WHEN** multiple errors exist across files
- **THEN** the system groups errors by file path with file-level headers

#### Scenario: Sort by location

- **WHEN** multiple errors exist in same file
- **THEN** the system sorts errors by line number ascending

#### Scenario: Deduplicate errors

- **WHEN** compiler reports duplicate errors
- **THEN** the system removes duplicates keeping first occurrence

### Requirement: Error Suggestions

The system SHALL provide actionable suggestions for common TypeScript errors.

#### Scenario: Missing type error

- **WHEN** error code indicates missing type annotation (TS7006, TS7031)
- **THEN** the system suggests adding explicit type annotation

#### Scenario: Import resolution error

- **WHEN** error code indicates module not found (TS2307)
- **THEN** the system suggests checking tsconfig paths and node_modules

#### Scenario: Configuration error

- **WHEN** error indicates tsconfig misconfiguration
- **THEN** the system suggests specific tsconfig.json fixes
