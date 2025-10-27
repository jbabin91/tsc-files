# Configuration Management Specification Delta

## ADDED Requirements

### Requirement: Automatic tsBuildInfoFile Configuration

The system SHALL automatically configure `tsBuildInfoFile` for TypeScript composite projects when the user has not explicitly set it.

#### Scenario: Composite project without explicit tsBuildInfoFile

- **WHEN** `compilerOptions.composite` is `true`
- **AND** `compilerOptions.tsBuildInfoFile` is not set
- **THEN** the system automatically sets `tsBuildInfoFile` to `{projectRoot}/node_modules/.cache/tsc-files/tsconfig.tsbuildinfo`

#### Scenario: Composite project with explicit tsBuildInfoFile

- **WHEN** `compilerOptions.composite` is `true`
- **AND** user has explicitly set `compilerOptions.tsBuildInfoFile`
- **THEN** the system preserves the user's configuration without modification

#### Scenario: Non-composite project

- **WHEN** `compilerOptions.composite` is `false` or not set
- **THEN** the system does not set `tsBuildInfoFile` automatically

#### Scenario: Cache directory creation failure

- **WHEN** automatic tsBuildInfoFile configuration is triggered
- **AND** `node_modules/.cache/tsc-files/` directory cannot be created
- **THEN** the system logs a warning in verbose mode
- **AND** continues without setting tsBuildInfoFile (TypeScript uses default behavior)

#### Scenario: Verbose logging

- **WHEN** automatic tsBuildInfoFile configuration succeeds
- **AND** `--verbose` flag is enabled
- **THEN** the system logs the configured tsBuildInfoFile path

### Requirement: Cache Directory Location

The system SHALL use `node_modules/.cache/tsc-files/` as the default location for all temporary files.

#### Scenario: Default cache directory

- **WHEN** user does not specify `--no-cache` flag
- **AND** user does not provide custom `cacheDir` option
- **THEN** the system uses `{projectRoot}/node_modules/.cache/tsc-files/` for all temporary files

#### Scenario: Cache directory structure

- **WHEN** temporary files are created
- **THEN** temporary TypeScript configs are stored in cache directory with random suffixes
- **AND** tsBuildInfo file (for composite projects) is stored in same cache directory without random suffix

#### Scenario: Cache directory fallback

- **WHEN** cache directory creation fails
- **THEN** the system logs warning and falls back to system temp directory

## ADDED Requirements

### Requirement: Type Resolution Configuration

The system SHALL configure TypeScript type resolution based on cache directory location and compiler selection.

#### Scenario: Cache in project directory (default)

- **WHEN** cache directory is `node_modules/.cache/tsc-files/` (default)
- **THEN** the system does NOT add explicit `typeRoots`
- **AND** TypeScript uses default type resolution by walking up from cache directory

#### Scenario: Cache disabled with tsc

- **WHEN** user specifies `--use-tsc` flag
- **AND** user specifies `--no-cache` flag (forcing system temp)
- **AND** user has not defined `typeRoots` in tsconfig.json
- **THEN** the system adds `typeRoots = ['{projectRoot}/node_modules/@types']`
- **AND** does NOT include bare `node_modules` directory (prevents scoped package scanning)

#### Scenario: User-defined typeRoots preserved

- **WHEN** user has defined `typeRoots` in tsconfig.json
- **THEN** the system preserves user's configuration without modification
- **AND** does not add automatic typeRoots

#### Scenario: Type resolution with scoped packages

- **WHEN** cache directory is in project
- **AND** project has scoped npm packages (e.g., `@company/utils`, `@jbabin91/tsc-files`)
- **THEN** TypeScript does NOT treat scoped packages as implicit type libraries
- **AND** type checking succeeds without "Cannot find type definition file" errors

### Requirement: Temporary Configuration Location

The system SHALL store temporary TypeScript configuration files in a clean, predictable location.

#### Scenario: Temporary config location

- **WHEN** temporary config is created
- **AND** `--no-cache` flag is not specified
- **THEN** temporary config is created in `{projectRoot}/node_modules/.cache/tsc-files/`
- **AND** filename follows pattern `tsconfig.-{pid}-{random}-.json`

#### Scenario: Temporary config with cache disabled

- **WHEN** temporary config is created
- **AND** `--no-cache` flag is specified
- **THEN** temporary config is created in system temp directory
- **AND** explicit `typeRoots` are added to point back to project

#### Scenario: Temporary config cleanup

- **WHEN** type checking completes (success or failure)
- **THEN** temporary config file is deleted from cache directory
- **AND** cleanup is logged in verbose mode
