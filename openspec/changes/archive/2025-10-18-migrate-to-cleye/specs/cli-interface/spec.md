# CLI Interface - Spec Delta

## ADDED Requirements

### Requirement: TypeScript-First CLI Framework

The system SHALL use a TypeScript-first CLI framework with superior type inference and minimal dependencies.

#### Scenario: Minimal bundle size

- **WHEN** bundling the CLI application
- **THEN** the system uses cleye (5kB, zero dependencies) instead of heavier alternatives

#### Scenario: TypeScript type inference

- **WHEN** defining CLI options and flags
- **THEN** the system leverages cleye's automatic type inference for compile-time safety

#### Scenario: Zero subdependencies

- **WHEN** analyzing the dependency tree
- **THEN** the CLI framework has zero transitive dependencies, reducing supply chain risk

#### Scenario: Ecosystem consistency

- **WHEN** evaluating tooling choices
- **THEN** the system uses privatenumber's ecosystem (cleye, get-tsconfig, tsdown, tsx) for consistency

### Requirement: Declarative CLI Configuration

The system SHALL use declarative flag definitions for clarity and maintainability.

#### Scenario: Flag schema definition

- **WHEN** defining CLI options
- **THEN** flags are declared as a typed schema object rather than imperative Option objects

#### Scenario: Automatic validation

- **WHEN** users provide invalid flag values
- **THEN** cleye performs automatic validation based on flag type definitions

#### Scenario: Built-in help generation

- **WHEN** help text is requested
- **THEN** cleye generates help text automatically from flag schema and descriptions

### Requirement: Bun Runtime CLI Support

The system SHALL support Bun runtime for all CLI operations (MANDATORY, not optional).

#### Scenario: Bun CLI invocation

- **WHEN** CLI is invoked via Bun (bun run tsc-files)
- **THEN** cleye processes arguments correctly under Bun runtime

#### Scenario: Bun argument parsing

- **WHEN** command-line arguments are provided under Bun
- **THEN** cleye parses flags, options, and parameters correctly

#### Scenario: Bun flag validation

- **WHEN** invalid flag values are provided under Bun
- **THEN** cleye validation works identically to Node.js

#### Scenario: Cross-runtime CLI consistency

- **WHEN** same CLI command is run under Node.js and Bun
- **THEN** the system produces identical output and exit codes

#### Scenario: Bun help text generation

- **WHEN** --help flag is used under Bun runtime
- **THEN** cleye generates and displays help text correctly

### Requirement: tsgo Compiler CLI Support

The system SHALL support tsgo compiler selection via CLI flags with automatic fallback handling.

#### Scenario: --use-tsgo flag

- **WHEN** user provides --use-tsgo flag
- **THEN** cleye CLI validates and passes flag to compiler selection logic

#### Scenario: --show-compiler with tsgo

- **WHEN** user provides --show-compiler flag and tsgo is active
- **THEN** CLI displays "Using tsgo (10x faster)" message

#### Scenario: Automatic tsgo fallback message

- **WHEN** tsgo is incompatible with current config and fallback occurs
- **THEN** CLI displays clear message: "tsgo incompatible (baseUrl/paths), using tsc"

#### Scenario: tsgo performance expectation

- **WHEN** tsgo is used successfully via CLI
- **THEN** the system provides 10x performance improvement message in verbose mode

#### Scenario: Conflicting compiler flags

- **WHEN** user provides both --use-tsc and --use-tsgo flags
- **THEN** cleye validation detects conflict and provides clear error message

### Requirement: Type Safety Implementation

The system SHALL leverage cleye's automatic type inference and avoid explicit type assertions (no any types in production code).

#### Scenario: Automatic flag type inference

- **WHEN** defining CLI flags with cleye schema
- **THEN** the system leverages automatic type inference without manual type annotations
- **EXAMPLE**: `flags: { project: { type: String, alias: 'p' } } // string | undefined (inferred)`

#### Scenario: Type-safe parsed arguments

- **WHEN** accessing parsed arguments from cleye
- **THEN** the system uses inferred types without any or as assertions
- **EXAMPLE**: `const { flags } = argv; // flags.project: string | undefined (inferred)`

#### Scenario: Validated option types

- **WHEN** implementing custom validators for flags
- **THEN** validators maintain type safety and return properly typed values
- **EXAMPLE**: `validate: (value) => { ... return value; } // Type preserved`

#### Scenario: Zero any types in CLI code

- **WHEN** implementing command.ts and main.ts modules
- **THEN** the system has zero any types in production code (test mocks may use any)
- **EXAMPLE**: All CLI handler functions are properly typed without any

#### Scenario: Type-safe error handling

- **WHEN** handling CLI validation errors
- **THEN** error types are properly defined and typed (no any in catch blocks)
- **EXAMPLE**: `catch (error) { if (error instanceof Error) ... } // Type narrowing`

### Requirement: Exit Code Consistency

The system SHALL return deterministic exit codes for all execution outcomes (critical for git hooks and CI/CD).

#### Scenario: Exit 0 on success

- **WHEN** all files type-check successfully with no errors
- **THEN** the CLI exits with code 0
- **VALIDATION**: `process.exitCode === 0` and programmatic API returns `result.success === true`

#### Scenario: Exit 1 on type errors

- **WHEN** TypeScript finds type errors in user code
- **THEN** the CLI exits with code 1
- **VALIDATION**: `process.exitCode === 1` and programmatic API returns `result.success === false` with `result.errorCount > 0`

#### Scenario: Exit 2 on configuration errors

- **WHEN** tsconfig.json is invalid, missing, or malformed
- **THEN** the CLI exits with code 2
- **VALIDATION**: `process.exitCode === 2` with clear error message about configuration issue

#### Scenario: Exit 3 on system errors

- **WHEN** TypeScript compiler is not found or system-level error occurs
- **THEN** the CLI exits with code 3
- **VALIDATION**: `process.exitCode === 3` with clear error message about system issue

## MODIFIED Requirements

### Requirement: Input Validation

The system SHALL validate all user inputs and provide clear error messages for invalid values.

#### Scenario: Empty project path

- **WHEN** user provides `--project ""`
- **THEN** the tool displays "Project path cannot be empty" error via cleye's validation and exits

#### Scenario: Non-JSON project path

- **WHEN** user provides `--project tsconfig.txt`
- **THEN** the tool displays "Project path must point to a JSON file" error via custom validator and exits

#### Scenario: Conflicting compiler flags

- **WHEN** user provides both `--use-tsc` and `--use-tsgo` flags
- **THEN** the tool displays error about conflicting options via cleye's validation

## REMOVED Requirements

None - All existing CLI functionality is preserved. Only internal implementation changes.

## Notes on Behavioral Equivalence

All 12 requirements and 42 scenarios from the original cli-interface spec remain valid. This spec delta only documents the internal framework change (commander → cleye) and adds requirements specific to TypeScript-first tooling.

**Preserved behaviors**:

- Command structure: `tsc-files [options] <files...>`
- All flags and options (13 total)
- Environment variable support (`TSC_PROJECT`)
- Exit codes (0, 1, 2, 3)
- Help text content
- Colored output
- JSON output format
- Lifecycle hooks (pre-action logging)
- Cross-platform compatibility

**Implementation details changed** (internal only):

- CLI framework: commander → cleye
- API style: imperative → declarative
- Type inference: manual definitions → automatic
- Bundle size: 30kB → 5kB
