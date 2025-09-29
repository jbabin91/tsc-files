# Execution and Output Specification

## Purpose

The execution and output capability handles TypeScript compiler execution, output parsing, and error extraction. It provides enhanced process execution with proper error handling, timeout protection, and cross-platform compatibility.

**Implementation**: `src/execution/executor.ts`, `src/execution/output-parser.ts`

## Requirements

### Requirement: Compiler Execution

The system SHALL execute TypeScript compiler with temporary configuration and capture output.

#### Scenario: Successful execution

- **WHEN** compiler runs without errors
- **THEN** the system captures stdout/stderr and returns success result

#### Scenario: Execution with type errors

- **WHEN** compiler finds type errors
- **THEN** the system captures error output and returns failure result with exit code 1

#### Scenario: Timeout protection

- **WHEN** compiler execution exceeds 30 seconds
- **THEN** the system terminates the process and returns timeout error

### Requirement: Output Capture

The system SHALL capture combined stdout and stderr from compiler execution.

#### Scenario: Combined output

- **WHEN** compiler produces both stdout and stderr
- **THEN** the system captures both streams in `allOutput` field

#### Scenario: Large output handling

- **WHEN** compiler produces more than 50MB output
- **THEN** the system handles it with increased buffer size

### Requirement: Error Parsing

The system SHALL parse TypeScript compiler output and extract structured error information.

#### Scenario: Standard error format

- **WHEN** compiler outputs errors in format `file.ts(line,col): error TS1234: message`
- **THEN** the system extracts file path, line number, column, error code, and message

#### Scenario: Multiple errors

- **WHEN** compiler outputs multiple errors
- **THEN** the system parses each error into separate structured entries

#### Scenario: Unparseable output

- **WHEN** compiler output doesn't match expected format
- **THEN** the system returns raw output and marks parsing as failed

### Requirement: Exit Code Handling

The system SHALL properly handle and report compiler exit codes.

#### Scenario: Success exit code

- **WHEN** compiler exits with code 0
- **THEN** the system marks result as success

#### Scenario: Type error exit code

- **WHEN** compiler exits with code 1
- **THEN** the system marks result as failure with type errors

#### Scenario: Configuration error exit code

- **WHEN** compiler exits with code 2
- **THEN** the system marks result as configuration error

#### Scenario: System error exit code

- **WHEN** compiler exits with code 3 or higher
- **THEN** the system marks result as system error

### Requirement: Process Cleanup

The system SHALL ensure proper cleanup of spawned processes.

#### Scenario: Cleanup on success

- **WHEN** execution completes successfully
- **THEN** the system cleans up spawned process resources

#### Scenario: Cleanup on error

- **WHEN** execution fails
- **THEN** the system still cleans up spawned process resources

#### Scenario: Cleanup on termination signal

- **WHEN** parent process receives SIGTERM/SIGINT
- **THEN** the system terminates child process before exiting

### Requirement: Error Details Extraction

The system SHALL extract detailed error information from compiler output.

#### Scenario: ExecaError handling

- **WHEN** execa throws ExecaError
- **THEN** the system extracts stdout, stderr, exitCode, and error message

#### Scenario: Spawn errors

- **WHEN** process fails to spawn
- **THEN** the system captures spawn error details

#### Scenario: Signal termination

- **WHEN** process is terminated by signal
- **THEN** the system reports signal name and reason

### Requirement: Warning Extraction

The system SHALL distinguish between errors and warnings in compiler output.

#### Scenario: Warning detection

- **WHEN** compiler output contains "warning TS" messages
- **THEN** the system categorizes them separately from errors

#### Scenario: Error vs warning count

- **WHEN** parsing output
- **THEN** the system provides separate counts for errors and warnings

### Requirement: Cross-Platform Execution

The system SHALL execute compilers correctly across Windows, macOS, and Linux.

#### Scenario: Shell mode on Windows

- **WHEN** executing on Windows with .cmd files
- **THEN** the system enables shell mode for proper execution

#### Scenario: Direct execution on Unix

- **WHEN** executing on Unix-like platforms
- **THEN** the system uses direct process execution without shell

#### Scenario: Path quoting

- **WHEN** executable path contains spaces
- **THEN** the system applies platform-appropriate quoting

### Requirement: Performance Metrics

The system SHALL track execution performance metrics.

#### Scenario: Duration tracking

- **WHEN** execution completes
- **THEN** the system reports total execution duration

#### Scenario: File processing rate

- **WHEN** checking multiple files
- **THEN** the system calculates files per second metric

### Requirement: Verbose Execution Logging

The system SHALL provide detailed execution logging in verbose mode.

#### Scenario: Command logging

- **WHEN** verbose mode is enabled
- **THEN** the system logs the exact command being executed

#### Scenario: Output logging

- **WHEN** verbose mode is enabled
- **THEN** the system logs raw compiler output for debugging
