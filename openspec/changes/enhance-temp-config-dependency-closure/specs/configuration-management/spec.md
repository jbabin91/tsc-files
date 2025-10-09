## ADDED Requirements

### Requirement: Dependency Closure Discovery

The system SHALL compute the complete set of TypeScript source files required to typecheck the selected root files using the canonical compiler resolution graph.

#### Scenario: Generated module dependency

- **WHEN** a selected file imports types from a generated `.gen.ts` module
- **THEN** the system includes that generated module in the temporary configuration without manual includes

#### Scenario: Path-mapped dependency

- **WHEN** a selected file resolves imports via `compilerOptions.paths`
- **THEN** the system includes the resolved target files in the temporary configuration

#### Scenario: Project reference dependency

- **WHEN** a selected file relies on a project reference
- **THEN** the system includes the referenced project entry points required for successful typechecking

### Requirement: Compiler Parity Safeguards

The system SHALL honor compiler-specific constraints when replaying the dependency closure.

#### Scenario: tsgo-incompatible closure

- **WHEN** the discovered closure requires compiler options unsupported by tsgo
- **THEN** the system reports the incompatibility and falls back to tsc execution

#### Scenario: Temp config relocation

- **WHEN** the temporary configuration resides outside the project directory
- **THEN** the system adds explicit `typeRoots` for tsc while preserving default resolution for tsgo

### Requirement: Dependency Cache & Diagnostics

The system SHALL cache dependency closures and provide visibility into resolved dependencies.

#### Scenario: Cache hit reuse

- **WHEN** the selected files and configuration are unchanged since the last run
- **THEN** the system reuses the cached closure without recomputation

#### Scenario: Cache invalidation

- **WHEN** either the configuration chain or any dependency file in the closure changes
- **THEN** the system invalidates the cache and recomputes the closure

#### Scenario: Verbose dependency report

- **WHEN** the user enables verbose output
- **THEN** the system prints the resolved dependency list to aid auditing and debugging
