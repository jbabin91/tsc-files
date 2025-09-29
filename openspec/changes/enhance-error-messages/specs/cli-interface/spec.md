## ADDED Requirements

### Requirement: Git Hook Context Detection

The system SHALL detect when running in git hook or lint-staged environment.

#### Scenario: CI environment detection

- **WHEN** CI environment variables are set (CI, HUSKY, LINT_STAGED)
- **THEN** the system enables git hook mode with enhanced error formatting

#### Scenario: Explicit git hook mode

- **WHEN** user provides `--git-hook` flag
- **THEN** the system enables git hook mode regardless of environment detection

#### Scenario: Normal CLI mode

- **WHEN** no git hook indicators are present
- **THEN** the system uses standard error output format

### Requirement: Error Summary Display

The system SHALL display summary statistics after type checking.

#### Scenario: Success summary

- **WHEN** type checking completes without errors
- **THEN** the system displays files checked count and duration

#### Scenario: Error summary

- **WHEN** type checking finds errors
- **THEN** the system displays error count, affected files count, and duration

#### Scenario: Multiple file groups

- **WHEN** checking multiple tsconfig groups in monorepo
- **THEN** the system aggregates statistics across all groups

## MODIFIED Requirements

### Requirement: Error Output Format

The system SHALL display type checking errors with enhanced formatting for readability and actionability.

#### Scenario: Grouped error display

- **WHEN** type checking finds multiple errors
- **THEN** the system groups errors by file with clear file headers

#### Scenario: Error details

- **WHEN** displaying individual error
- **THEN** the system shows file path, line number, column, error code, and message

#### Scenario: Git hook error format

- **WHEN** running in git hook mode
- **THEN** the system displays concise error format optimized for pre-commit output

### Requirement: Help and Guidance

The system SHALL provide contextual help and optimization tips.

#### Scenario: Git hook tips display

- **WHEN** running in git hook mode with errors
- **THEN** the system suggests performance optimizations and troubleshooting steps

#### Scenario: First run guidance

- **WHEN** user runs tool for first time
- **THEN** the system displays brief usage tips and common workflow patterns

#### Scenario: Performance suggestions

- **WHEN** type checking takes longer than expected
- **THEN** the system suggests optimization flags like --skip-lib-check or --use-tsgo
