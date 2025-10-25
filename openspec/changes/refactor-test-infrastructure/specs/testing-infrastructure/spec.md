# Testing Infrastructure Specification

## ADDED Requirements

### Requirement: Modular Test Setup

The testing infrastructure SHALL be organized into modular setup files separated by concern.

#### Scenario: Unit test setup

- **WHEN** running unit tests
- **THEN** only unit-specific setup is loaded
- **AND** setup completes in < 100ms

#### Scenario: Integration test setup

- **WHEN** running integration tests
- **THEN** integration-specific setup is loaded
- **AND** real package packing occurs once per session

### Requirement: Explicit Helper Imports

Test utilities SHALL be provided through explicit module imports rather than global variables.

#### Scenario: CLI helper usage

- **WHEN** a test needs CLI execution utilities
- **THEN** it imports from `tests/helpers/cli`
- **AND** IDE provides autocomplete for available functions

#### Scenario: Filesystem helper usage

- **WHEN** a test needs file operations
- **THEN** it imports from `tests/helpers/filesystem`
- **AND** TypeScript validates parameter types

### Requirement: Runtime Type Validation

Test utilities SHALL use Zod schemas for runtime validation of complex data structures.

#### Scenario: CLI result validation

- **WHEN** CLI execution returns a result
- **THEN** the result is validated against CLIResultSchema
- **AND** invalid data throws descriptive error
- **AND** TypeScript types are inferred from schema

#### Scenario: Test fixture validation

- **WHEN** creating a test project fixture
- **THEN** the fixture is validated against TestProjectSchema
- **AND** missing required fields are caught immediately

### Requirement: Type Over Interface Convention

All test types SHALL use `type` declarations instead of `interface` declarations.

#### Scenario: Zod type inference

- **WHEN** defining types from Zod schemas
- **THEN** use `type CLIResult = z.infer<typeof CLIResultSchema>`
- **AND** ESLint enforces this convention

#### Scenario: Helper function types

- **WHEN** defining function parameter types
- **THEN** use `type` keyword for object shapes
- **AND** avoid `interface` keyword

### Requirement: Reusable Test Fixtures

The testing infrastructure SHALL provide reusable fixture files for common test scenarios.

#### Scenario: TypeScript configuration fixtures

- **WHEN** a test needs a specific tsconfig setup
- **THEN** it can load from `tests/fixtures/tsconfigs/`
- **AND** fixtures include: strict, loose, with-aliases, monorepo

#### Scenario: Test file templates

- **WHEN** a test needs sample TypeScript files
- **THEN** it can load from `tests/fixtures/files/`
- **AND** templates include: valid, error, complex

### Requirement: Package Manager Compatibility Testing

The testing infrastructure SHALL validate CLI functionality across all available package managers.

#### Scenario: Conditional PM testing

- **WHEN** integration tests run
- **THEN** available package managers are detected
- **AND** tests run only for installed PMs (npx, pnpm, yarn, bun)

#### Scenario: PM smoke tests

- **WHEN** testing a package manager
- **THEN** 4 smoke tests execute: version, help, valid file, error file
- **AND** each test validates basic CLI invocation

#### Scenario: CI comprehensive coverage

- **WHEN** tests run in CI environment
- **THEN** all 4 package managers are available
- **AND** 16 total PM compatibility tests execute

### Requirement: Test Organization Standards

Test files SHALL follow consistent organization patterns for maintainability.

#### Scenario: Helper module size

- **WHEN** creating helper modules
- **THEN** each module focuses on single responsibility
- **AND** modules are < 200 lines each

#### Scenario: Setup file organization

- **WHEN** organizing setup files
- **THEN** base setup is shared by unit and integration
- **AND** custom matchers are separated into dedicated file

### Requirement: Migration Safety

The testing infrastructure SHALL support safe incremental migration from legacy patterns.

#### Scenario: Backward compatibility during migration

- **WHEN** migrating tests to new infrastructure
- **THEN** old and new patterns coexist temporarily
- **AND** all tests pass throughout migration

#### Scenario: Batch migration

- **WHEN** updating test imports
- **THEN** updates happen in batches of 5 files
- **AND** test suite runs after each batch
- **AND** failures are caught immediately
