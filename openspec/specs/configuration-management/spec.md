# Configuration Management Specification

## Purpose

The configuration management capability handles TypeScript configuration discovery, parsing, and temporary configuration generation. It supports tsconfig.json extends chains, automatic discovery, and creates temporary configurations for file-specific type checking.

**Implementation**: `src/config/discovery.ts`, `src/config/parser.ts`, `src/config/temp-config.ts`

## Requirements

### Requirement: Configuration Discovery

The system SHALL discover tsconfig.json files automatically by traversing up the directory tree.

#### Scenario: Current directory tsconfig

- **WHEN** tsconfig.json exists in current directory
- **THEN** the system uses that configuration

#### Scenario: Parent directory traversal

- **WHEN** tsconfig.json does not exist in current directory
- **THEN** the system searches parent directories up to filesystem root

#### Scenario: Explicit project path

- **WHEN** user specifies `--project` flag with tsconfig path
- **THEN** the system uses the specified configuration without auto-discovery

#### Scenario: TSC_PROJECT environment variable

- **WHEN** `TSC_PROJECT` environment variable is set
- **THEN** the system uses the specified configuration path

#### Scenario: No configuration found

- **WHEN** no tsconfig.json is found after traversal
- **THEN** the system returns configuration error

### Requirement: Configuration Parsing

The system SHALL parse tsconfig.json files and extract compiler options.

#### Scenario: Valid JSON parsing

- **WHEN** tsconfig.json contains valid JSON
- **THEN** the system parses and extracts compilerOptions

#### Scenario: Extends chain resolution

- **WHEN** tsconfig.json has `extends` property
- **THEN** the system resolves the extends chain and merges configurations

#### Scenario: Malformed JSON

- **WHEN** tsconfig.json contains invalid JSON
- **THEN** the system returns parser error with line/column information

#### Scenario: Missing compilerOptions

- **WHEN** tsconfig.json does not have compilerOptions section
- **THEN** the system treats it as empty compiler options

### Requirement: JavaScript File Detection

The system SHALL determine whether to include JavaScript files based on configuration.

#### Scenario: allowJs enabled

- **WHEN** `compilerOptions.allowJs` is `true`
- **THEN** the system enables JavaScript file inclusion

#### Scenario: checkJs enabled

- **WHEN** `compilerOptions.checkJs` is `true`
- **THEN** the system enables JavaScript file inclusion

#### Scenario: Both disabled

- **WHEN** neither `allowJs` nor `checkJs` is enabled
- **THEN** the system only processes TypeScript files

### Requirement: Temporary Configuration Generation

The system SHALL create temporary tsconfig.json files for file-specific type checking.

#### Scenario: Files array creation

- **WHEN** generating temp config
- **THEN** the system creates `files` array with specified file paths

#### Scenario: Extends original config

- **WHEN** creating temp config
- **THEN** the system extends the original tsconfig.json to preserve settings

#### Scenario: noEmit override

- **WHEN** creating temp config
- **THEN** the system forces `noEmit: true` to prevent output generation

#### Scenario: skipLibCheck option

- **WHEN** user provides `--skip-lib-check` flag
- **THEN** the system adds `skipLibCheck: true` to temp config

### Requirement: Temporary File Lifecycle

The system SHALL manage temporary configuration file lifecycle securely.

#### Scenario: Secure temp file creation

- **WHEN** creating temp config
- **THEN** the system uses cryptographically random filenames in OS temp directory

#### Scenario: File cleanup on success

- **WHEN** type checking completes successfully
- **THEN** the system deletes the temporary configuration file

#### Scenario: File cleanup on error

- **WHEN** type checking fails with error
- **THEN** the system still deletes the temporary configuration file

#### Scenario: Cleanup on signal

- **WHEN** process receives termination signal
- **THEN** the system deletes temp files before exiting

### Requirement: Configuration Validation

The system SHALL validate configuration files and provide helpful error messages.

#### Scenario: Missing required fields

- **WHEN** tsconfig.json is missing critical fields
- **THEN** the system provides error with guidance on fixing the configuration

#### Scenario: Incompatible options

- **WHEN** tsconfig.json has conflicting compiler options
- **THEN** the system warns about incompatibilities

### Requirement: Path Mapping Handling

The system SHALL handle TypeScript path mappings (baseUrl, paths) correctly.

#### Scenario: baseUrl detection

- **WHEN** tsconfig.json has `baseUrl` configured
- **THEN** the system preserves baseUrl in temporary configuration

#### Scenario: paths detection

- **WHEN** tsconfig.json has `paths` configured
- **THEN** the system preserves paths mappings in temporary configuration

#### Scenario: Module resolution

- **WHEN** `moduleResolution` is set to `bundler`
- **THEN** the system handles paths without requiring baseUrl

### Requirement: Configuration Caching

The system SHALL cache parsed configurations for performance.

#### Scenario: First parse

- **WHEN** configuration is parsed for first time
- **THEN** the system caches the parsed result

#### Scenario: Subsequent access

- **WHEN** same configuration is accessed again
- **THEN** the system returns cached result without re-parsing

#### Scenario: Cache invalidation

- **WHEN** configuration file changes
- **THEN** the system invalidates cache and re-parses

### Requirement: Dependency Closure Discovery

The system SHALL discover the complete set of source files required for type checking specific files.

#### Scenario: Basic dependency discovery

- **WHEN** checking specific files
- **THEN** the system discovers all imported dependencies recursively

#### Scenario: Generated file inclusion

- **WHEN** source files import generated files (e.g., .gen.ts)
- **THEN** the system includes generated files in the dependency closure

#### Scenario: Path alias resolution

- **WHEN** source files use TypeScript path aliases
- **THEN** the system resolves and includes aliased dependencies

#### Scenario: Project reference handling

- **WHEN** tsconfig.json has project references
- **THEN** the system includes referenced project files in dependency closure

#### Scenario: Discovery failure fallback

- **WHEN** dependency discovery fails
- **THEN** the system falls back to include patterns with verbose logging when requested

#### Scenario: Discovery caching

- **WHEN** same file set is checked multiple times
- **THEN** the system caches discovery results and validates cache freshness

#### Scenario: Verbose logging control

- **WHEN** dependency discovery encounters errors
- **THEN** the system only logs warnings when verbose mode is enabled
