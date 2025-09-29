# CLI Interface Specification

## Purpose

The CLI interface provides a command-line tool (`tsc-files`) for running TypeScript compiler checks on specific files while respecting existing tsconfig.json configuration. The interface is designed for git hooks, lint-staged, and CI/CD workflows.

**Implementation**: `src/cli/command.ts`, `src/cli/runner.ts`, `src/types/cli.ts`

## Requirements

### Requirement: Command Structure

The CLI SHALL accept file paths as positional arguments and provide options for customization.

#### Scenario: Basic invocation

- **WHEN** user runs `tsc-files file1.ts file2.ts`
- **THEN** the tool checks the specified files using auto-detected tsconfig.json

#### Scenario: Glob pattern support

- **WHEN** user runs `tsc-files "src/**/*.ts"`
- **THEN** the tool expands the glob pattern and checks all matching TypeScript files

#### Scenario: No files provided

- **WHEN** user runs `tsc-files` with no arguments
- **THEN** the tool displays help text and exits with error

### Requirement: Project Configuration Option

The CLI SHALL support specifying a custom tsconfig.json path via `--project` flag or `TSC_PROJECT` environment variable.

#### Scenario: Custom tsconfig via flag

- **WHEN** user runs `tsc-files --project tsconfig.build.json file.ts`
- **THEN** the tool uses the specified tsconfig.json for type checking

#### Scenario: Custom tsconfig via environment variable

- **WHEN** `TSC_PROJECT=tsconfig.build.json` is set and user runs `tsc-files file.ts`
- **THEN** the tool uses the tsconfig.json specified in the environment variable

#### Scenario: Environment variable override

- **WHEN** both `TSC_PROJECT` environment variable and `--project` flag are provided
- **THEN** the `--project` flag value takes precedence

#### Scenario: Invalid project path

- **WHEN** user provides a non-.json file path to `--project`
- **THEN** the tool displays validation error and exits with code 2

### Requirement: Verbose Output Mode

The CLI SHALL provide detailed debugging output when `--verbose` flag is enabled.

#### Scenario: Verbose logging

- **WHEN** user runs `tsc-files --verbose file.ts`
- **THEN** the tool displays file processing steps, detected compiler, and execution details

#### Scenario: Environment variable logging

- **WHEN** `--verbose` is enabled and `TSC_PROJECT` is set
- **THEN** the tool logs the environment variable value

### Requirement: JSON Output Format

The CLI SHALL support machine-readable JSON output for CI/CD integration via `--json` flag.

#### Scenario: Successful type check JSON output

- **WHEN** user runs `tsc-files --json file.ts` with no type errors
- **THEN** the tool outputs structured JSON with success status and checked files

#### Scenario: Type errors JSON output

- **WHEN** user runs `tsc-files --json file.ts` with type errors
- **THEN** the tool outputs structured JSON with error details including file, line, column, and message

### Requirement: Compiler Selection Options

The CLI SHALL provide flags for controlling TypeScript compiler selection (tsc vs tsgo).

#### Scenario: Force tsc usage

- **WHEN** user runs `tsc-files --use-tsc file.ts`
- **THEN** the tool uses standard tsc compiler even if tsgo is available

#### Scenario: Force tsgo usage

- **WHEN** user runs `tsc-files --use-tsgo file.ts` and tsgo is available
- **THEN** the tool uses tsgo compiler for faster execution

#### Scenario: Force tsgo when unavailable

- **WHEN** user runs `tsc-files --use-tsgo file.ts` and tsgo is not installed
- **THEN** the tool displays error message and exits with code 3

#### Scenario: Show compiler selection

- **WHEN** user runs `tsc-files --show-compiler file.ts`
- **THEN** the tool displays which TypeScript compiler (tsc or tsgo) is being used

#### Scenario: Benchmark mode

- **WHEN** user runs `tsc-files --benchmark file.ts`
- **THEN** the tool runs type checking with both tsc and tsgo and displays performance comparison

### Requirement: Performance Optimization Options

The CLI SHALL provide flags for optimizing type checking performance.

#### Scenario: Skip library checking

- **WHEN** user runs `tsc-files --skip-lib-check file.ts`
- **THEN** the tool skips type checking of declaration files for faster execution

#### Scenario: Disable caching

- **WHEN** user runs `tsc-files --no-cache file.ts`
- **THEN** the tool disables temporary file caching for debugging purposes

#### Scenario: Disable automatic fallback

- **WHEN** user runs `tsc-files --no-fallback --use-tsgo file.ts` and tsgo fails
- **THEN** the tool does not fallback to tsc and exits with the tsgo error

### Requirement: Educational Features

The CLI SHALL provide educational messaging to help users optimize their TypeScript checking workflow.

#### Scenario: Performance tips display

- **WHEN** user runs `tsc-files --tips`
- **THEN** the tool displays performance optimization tips for git hooks and TypeScript compilation

#### Scenario: Compiler education

- **WHEN** tsgo is available but not being used
- **THEN** the tool suggests trying tsgo for better performance (unless suppressed)

### Requirement: Help and Version Information

The CLI SHALL provide comprehensive help text and version information.

#### Scenario: Version display

- **WHEN** user runs `tsc-files --version` or `tsc-files -v`
- **THEN** the tool displays the current version number and exits

#### Scenario: Help display

- **WHEN** user runs `tsc-files --help` or `tsc-files -h`
- **THEN** the tool displays usage information, options, examples, and exit codes

#### Scenario: Help examples

- **WHEN** help text is displayed
- **THEN** the tool shows examples for basic usage, glob patterns, git hooks, and compiler selection

### Requirement: Exit Codes

The CLI SHALL use standardized exit codes to indicate different result types.

#### Scenario: Success exit code

- **WHEN** type checking completes without errors
- **THEN** the tool exits with code 0

#### Scenario: Type error exit code

- **WHEN** type checking finds TypeScript errors
- **THEN** the tool exits with code 1

#### Scenario: Configuration error exit code

- **WHEN** tsconfig.json is missing or invalid
- **THEN** the tool exits with code 2

#### Scenario: System error exit code

- **WHEN** TypeScript compiler is not found or system error occurs
- **THEN** the tool exits with code 3

### Requirement: Input Validation

The CLI SHALL validate all user inputs and provide clear error messages for invalid values.

#### Scenario: Empty project path

- **WHEN** user provides `--project ""`
- **THEN** the tool displays "Project path cannot be empty" error and exits

#### Scenario: Non-JSON project path

- **WHEN** user provides `--project tsconfig.txt`
- **THEN** the tool displays "Project path must point to a JSON file" error and exits

#### Scenario: Conflicting compiler flags

- **WHEN** user provides both `--use-tsc` and `--use-tsgo` flags
- **THEN** the tool displays error about conflicting options

### Requirement: Colored Output

The CLI SHALL use colored terminal output to improve readability and user experience.

#### Scenario: Error message coloring

- **WHEN** the tool displays error messages
- **THEN** errors are shown in red for visibility

#### Scenario: Help text styling

- **WHEN** help text is displayed
- **THEN** section titles are bold, command text is cyan, options are yellow, and descriptions are gray

#### Scenario: Success message coloring

- **WHEN** type checking succeeds
- **THEN** success messages use green color

### Requirement: Lifecycle Hooks

The CLI SHALL support pre-action hooks for debugging and monitoring.

#### Scenario: Pre-action verbose logging

- **WHEN** `--verbose` is enabled
- **THEN** the tool logs command execution details before running type checking

#### Scenario: Environment variable detection

- **WHEN** `TSC_PROJECT` environment variable is set and `--verbose` is enabled
- **THEN** the tool logs the environment variable value before execution
