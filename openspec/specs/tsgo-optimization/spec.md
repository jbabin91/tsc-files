# tsgo Optimization Specification

## Purpose

The tsgo optimization capability provides integration with Microsoft's native TypeScript compiler (tsgo) for up to 10x performance improvement. It includes proactive compatibility checking, automatic fallback to tsc, user education, and compiler selection options.

**Implementation**: `src/config/tsgo-compatibility.ts`, `src/cli/education.ts`

## Requirements

### Requirement: Compatibility Analysis

The system SHALL analyze TypeScript configurations for tsgo compatibility before execution.

#### Scenario: Compatible configuration

- **WHEN** tsconfig.json uses `moduleResolution: "bundler"` without baseUrl
- **THEN** the system marks configuration as tsgo-compatible

#### Scenario: baseUrl incompatibility

- **WHEN** tsconfig.json has `baseUrl` with `paths` and non-bundler moduleResolution
- **THEN** the system marks configuration as tsgo-incompatible due to baseUrl limitation

#### Scenario: Compatibility recommendation

- **WHEN** analyzing incompatible configuration
- **THEN** the system suggests using bundler moduleResolution for tsgo compatibility

### Requirement: Automatic Compiler Selection

The system SHALL automatically select the optimal compiler based on availability and compatibility.

#### Scenario: tsgo preferred when compatible

- **WHEN** tsgo is installed and configuration is compatible
- **THEN** the system automatically selects tsgo for performance

#### Scenario: tsc fallback on incompatibility

- **WHEN** tsgo is installed but configuration is incompatible
- **THEN** the system automatically selects tsc and explains why

#### Scenario: tsc only available

- **WHEN** tsgo is not installed
- **THEN** the system uses tsc without attempting tsgo

### Requirement: User Preference Override

The system SHALL respect explicit user compiler preferences via CLI flags.

#### Scenario: Force tsgo with --use-tsgo

- **WHEN** user provides `--use-tsgo` flag
- **THEN** the system uses tsgo regardless of compatibility analysis

#### Scenario: Force tsc with --use-tsc

- **WHEN** user provides `--use-tsc` flag
- **THEN** the system uses tsc regardless of tsgo availability

#### Scenario: Explicit preference priority

- **WHEN** both automatic selection and user flag are present
- **THEN** the user flag takes precedence over automatic selection

### Requirement: Automatic Fallback

The system SHALL automatically fallback from tsgo to tsc when tsgo execution fails.

#### Scenario: tsgo execution failure

- **WHEN** tsgo execution fails with error
- **THEN** the system automatically retries with tsc compiler

#### Scenario: Fallback notification

- **WHEN** automatic fallback occurs
- **THEN** the system logs warning about fallback and reason

#### Scenario: Fallback disabled

- **WHEN** user provides `--no-fallback` flag and tsgo fails
- **THEN** the system does not fallback to tsc and exits with error

### Requirement: Educational Messaging

The system SHALL provide educational messaging about compiler performance and optimization.

#### Scenario: First tsgo run education

- **WHEN** using tsgo for first time in session
- **THEN** the system displays performance insight about 10x speedup

#### Scenario: tsgo installation suggestion

- **WHEN** using tsc but tsgo is not installed
- **THEN** the system suggests installing `@typescript/native-preview` for better performance

#### Scenario: Benchmark suggestion

- **WHEN** tsgo is available but not being used
- **THEN** the system suggests trying `--benchmark` to compare performance

#### Scenario: Large file count optimization

- **WHEN** checking more than 50 files with tsc
- **THEN** the system suggests using `--use-tsgo` for better performance

### Requirement: Performance Comparison

The system SHALL support benchmarking both compilers for performance comparison.

#### Scenario: Benchmark mode execution

- **WHEN** user provides `--benchmark` flag
- **THEN** the system runs type checking with both tsc and tsgo

#### Scenario: Performance metrics display

- **WHEN** benchmark completes
- **THEN** the system displays duration for each compiler and speedup ratio

#### Scenario: Benchmark result recommendation

- **WHEN** benchmark shows significant speedup
- **THEN** the system recommends using tsgo by default

### Requirement: Compiler Information Display

The system SHALL display compiler selection information when requested.

#### Scenario: Show compiler flag

- **WHEN** user provides `--show-compiler` flag
- **THEN** the system displays which compiler is being used and why

#### Scenario: Verbose compiler logging

- **WHEN** verbose mode is enabled
- **THEN** the system logs compiler selection decision and reasoning

### Requirement: Fallback Education

The system SHALL provide helpful guidance when fallback occurs.

#### Scenario: Fallback reason explanation

- **WHEN** tsgo fails and fallback occurs
- **THEN** the system explains why tsgo failed

#### Scenario: Issue reporting suggestion

- **WHEN** tsgo repeatedly fails
- **THEN** the system suggests reporting issue to TypeScript GitHub

#### Scenario: Disable fallback guidance

- **WHEN** fallback occurs
- **THEN** the system informs about `--use-tsc` and `--no-fallback` flags

### Requirement: Git Hook Optimization Tips

The system SHALL provide optimization tips specifically for git hook usage.

#### Scenario: Tips display

- **WHEN** user provides `--tips` flag
- **THEN** the system displays git hook optimization recommendations

#### Scenario: Optimization suggestions

- **WHEN** tips are displayed
- **THEN** the system suggests lint-staged integration, caching, tsgo, and skipLibCheck

### Requirement: Installation Guidance

The system SHALL provide clear installation instructions for missing compilers.

#### Scenario: tsgo installation

- **WHEN** tsgo is not available
- **THEN** the system shows npm install command and documentation link

#### Scenario: TypeScript installation

- **WHEN** TypeScript is not available
- **THEN** the system shows installation command and npx alternative

### Requirement: Known Limitations Tracking

The system SHALL track and communicate known tsgo limitations.

#### Scenario: baseUrl limitation

- **WHEN** configuration uses baseUrl with paths
- **THEN** the system identifies this as known tsgo incompatibility

#### Scenario: Future limitations

- **WHEN** new tsgo limitations are discovered
- **THEN** the system can be updated to detect additional incompatibilities

### Requirement: Compatibility Decision Logging

The system SHALL provide detailed compatibility decision information in verbose mode.

#### Scenario: Verbose compatibility analysis

- **WHEN** verbose mode is enabled
- **THEN** the system logs compatibility check results and reasoning

#### Scenario: Incompatible features listing

- **WHEN** configuration is incompatible
- **THEN** the system lists specific features causing incompatibility
