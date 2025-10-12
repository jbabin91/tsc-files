# Configuration Management Specification

## Purpose

The configuration management capability handles TypeScript configuration discovery, parsing, and temporary configuration generation. It supports tsconfig.json extends chains, automatic discovery, and creates temporary configurations for file-specific type checking.

**Implementation**: `src/config/discovery.ts`, `src/config/parser.ts`, `src/config/temp-config.ts`

## Requirements

### Requirement: Configuration Discovery

The system SHALL discover tsconfig.json files automatically by traversing up the directory tree using get-tsconfig.

#### Scenario: Current directory tsconfig

- **WHEN** tsconfig.json exists in current directory
- **THEN** the system uses that configuration via get-tsconfig discovery

#### Scenario: Parent directory traversal

- **WHEN** tsconfig.json does not exist in current directory
- **THEN** the system searches parent directories up to filesystem root using get-tsconfig

#### Scenario: Explicit project path

- **WHEN** user specifies `--project` flag with tsconfig path
- **THEN** the system uses the specified configuration via get-tsconfig parseTsconfig

#### Scenario: TSC_PROJECT environment variable

- **WHEN** `TSC_PROJECT` environment variable is set
- **THEN** the system uses the specified configuration path via get-tsconfig

#### Scenario: No configuration found

- **WHEN** no tsconfig.json is found after traversal
- **THEN** the system returns configuration error with helpful message

### Requirement: Configuration Parsing

The system SHALL parse tsconfig.json files and extract compiler options using get-tsconfig with automatic extends resolution.

#### Scenario: Valid JSON parsing

- **WHEN** tsconfig.json contains valid JSON
- **THEN** the system parses and extracts compilerOptions via get-tsconfig

#### Scenario: JSONC support

- **WHEN** tsconfig.json contains comments or trailing commas
- **THEN** the system parses JSONC format via get-tsconfig

#### Scenario: Extends chain resolution

- **WHEN** tsconfig.json has `extends` property
- **THEN** the system automatically resolves the extends chain using get-tsconfig and returns fully merged configuration

#### Scenario: Multi-level extends

- **WHEN** tsconfig.json extends chain has multiple levels (e.g., A extends B extends C)
- **THEN** the system resolves all levels and merges configurations correctly

#### Scenario: NPM package extends

- **WHEN** tsconfig.json extends from npm package (e.g., @tsconfig/node18)
- **THEN** the system resolves package extends from node_modules using get-tsconfig

#### Scenario: Circular extends detection

- **WHEN** tsconfig.json extends chain contains circular references
- **THEN** the system detects the cycle via get-tsconfig and provides clear error

#### Scenario: Malformed JSON

- **WHEN** tsconfig.json contains invalid JSON
- **THEN** the system returns parser error via get-tsconfig with helpful information

#### Scenario: Missing compilerOptions

- **WHEN** tsconfig.json does not have compilerOptions section
- **THEN** the system treats it as empty compiler options

#### Scenario: Missing extends file

- **WHEN** extends property references non-existent file
- **THEN** the system returns clear error from get-tsconfig with file path information

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

### Requirement: Dependency Management

The system SHALL use minimal, well-maintained dependencies for tsconfig resolution.

#### Scenario: Minimal bundle size

- **WHEN** bundling the application
- **THEN** the system uses get-tsconfig (7kB, zero dependencies) instead of larger alternatives

#### Scenario: No unused dependencies

- **WHEN** analyzing dependencies
- **THEN** the system has no unused tsconfig-related dependencies in package.json

#### Scenario: Single source of truth

- **WHEN** performing config operations
- **THEN** the system uses get-tsconfig for all discovery and parsing operations

### Requirement: API Compatibility

The system SHALL maintain backward-compatible public API during tsconfig resolution migration.

#### Scenario: findTsConfig signature preserved

- **WHEN** calling findTsConfig(cwd, projectPath?)
- **THEN** the function signature and return type remain identical to previous implementation

#### Scenario: findTsConfigForFile signature preserved

- **WHEN** calling findTsConfigForFile(filePath, projectPath?)
- **THEN** the function signature and return type remain identical to previous implementation

#### Scenario: parseTypeScriptConfig signature preserved

- **WHEN** calling parseTypeScriptConfig(configPath)
- **THEN** the function signature and return type remain identical to previous implementation

#### Scenario: shouldIncludeJavaScript signature preserved

- **WHEN** calling shouldIncludeJavaScript(config)
- **THEN** the function signature and return type remain identical to previous implementation

#### Scenario: shouldIncludeJavaScriptFiles signature preserved

- **WHEN** calling shouldIncludeJavaScriptFiles(tsconfigPath?)
- **THEN** the function signature and return type remain identical to previous implementation

### Requirement: TypeScript API Integration

The system SHALL continue using TypeScript API for program creation while using get-tsconfig for simple parsing.

#### Scenario: Dependency discovery uses TypeScript API

- **WHEN** discovering dependency closures in dependency-discovery.ts
- **THEN** the system uses ts.readConfigFile and ts.parseJsonConfigFileContent for program creation

#### Scenario: Simple parsing uses get-tsconfig

- **WHEN** performing simple config discovery and parsing
- **THEN** the system uses get-tsconfig for efficient, lightweight operations

#### Scenario: Consistent extends resolution

- **WHEN** config extends are resolved in both modules
- **THEN** the system produces consistent results between get-tsconfig and TypeScript API

### Requirement: Monorepo Support

The system SHALL support monorepo structures by resolving tsconfig.json per file location using get-tsconfig's context-aware discovery.

#### Scenario: Per-file tsconfig resolution

- **WHEN** checking files from different monorepo packages (packages/core/src/index.ts, packages/ui/src/button.ts)
- **THEN** the system resolves the correct tsconfig.json for each file by searching up from its location

#### Scenario: Multiple packages with different configs

- **WHEN** monorepo has packages with different compiler options (strict mode variations, target versions)
- **THEN** the system applies the correct tsconfig.json to each package's files

#### Scenario: Project references support

- **WHEN** tsconfig.json uses project references (references field)
- **THEN** the system respects project boundaries and dependency relationships

#### Scenario: Nested monorepo structures

- **WHEN** monorepo has nested packages (packages/backend/core/, packages/backend/api/)
- **THEN** the system resolves tsconfig.json at the appropriate nesting level

#### Scenario: Cross-package file invocation

- **WHEN** user provides files from multiple packages in single command
- **THEN** the system groups files by their associated tsconfig.json and processes each group correctly

#### Scenario: Workspace glob patterns

- **WHEN** user provides glob patterns spanning multiple packages (packages/\*/src/\*\*/\*.ts)
- **THEN** the system expands patterns, resolves per-file tsconfig, and groups files appropriately

#### Scenario: Root vs package-level configs

- **WHEN** monorepo has both root tsconfig.json and package-level tsconfig.json files
- **THEN** the system uses the most specific (closest) tsconfig.json for each file

#### Scenario: Explicit project flag in monorepo

- **WHEN** user specifies --project flag with root tsconfig in monorepo
- **THEN** the system uses specified config for all files regardless of package location

#### Scenario: Monorepo with extends chains

- **WHEN** monorepo packages extend root tsconfig (packages/core/tsconfig.json extends ../../tsconfig.base.json)
- **THEN** the system resolves extends chains correctly for each package via get-tsconfig

#### Scenario: Monorepo with path aliases

- **WHEN** monorepo uses TypeScript path aliases (baseUrl, paths) across packages
- **THEN** the system resolves path mappings correctly for each package's tsconfig

### Requirement: Bun Runtime Support

The system SHALL support Bun runtime and package manager for all configuration operations (MANDATORY, not optional).

#### Scenario: Bun runtime compatibility

- **WHEN** running under Bun runtime (detected via process.versions.bun)
- **THEN** get-tsconfig works correctly without Node.js-specific APIs

#### Scenario: Bun lockfile detection

- **WHEN** bun.lockb file exists in project
- **THEN** the system recognizes Bun as the package manager

#### Scenario: Bun package resolution

- **WHEN** tsconfig extends npm packages and Bun is package manager
- **THEN** the system resolves packages from Bun's installation directory

#### Scenario: Cross-runtime configuration consistency

- **WHEN** same tsconfig is processed under Node.js and Bun
- **THEN** the system produces identical resolved configurations

#### Scenario: Bun TypeScript integration

- **WHEN** using Bun's built-in TypeScript support
- **THEN** the system correctly discovers and parses tsconfig.json via get-tsconfig

### Requirement: tsgo Compiler Integration

The system SHALL support tsgo (10x faster native TypeScript compiler) with automatic configuration compatibility detection.

#### Scenario: tsgo configuration parsing

- **WHEN** tsgo is selected as the compiler
- **THEN** get-tsconfig parses tsconfig.json identically to tsc mode

#### Scenario: tsgo compatibility detection

- **WHEN** tsconfig uses features incompatible with tsgo (complex baseUrl/paths)
- **THEN** the system detects incompatibility and provides clear fallback message

#### Scenario: tsgo extends resolution

- **WHEN** tsconfig uses extends chains and tsgo is available
- **THEN** get-tsconfig resolves extends identically for both tsc and tsgo

#### Scenario: Automatic tsc fallback

- **WHEN** tsgo is unavailable or incompatible with current config
- **THEN** the system automatically falls back to tsc with identical tsconfig resolution

#### Scenario: tsgo performance with complex configs

- **WHEN** tsconfig has multiple extends levels and tsgo is used
- **THEN** get-tsconfig parses configuration efficiently without performance degradation

### Requirement: Type Safety Implementation

The system SHALL use TypeScript type inference and avoid explicit type assertions (no any types in production code).

#### Scenario: Type-safe config discovery

- **WHEN** calling getTsconfig() or parseTsconfig()
- **THEN** the system leverages automatic type inference without any or as type assertions
- **EXAMPLE**: `const result = getTsconfig(cwd); // TsConfigResult | null (inferred)`

#### Scenario: Automatic result type inference

- **WHEN** accessing config properties from get-tsconfig result
- **THEN** the system uses inferred TsConfigJsonResolved type without manual annotations
- **EXAMPLE**: `const config = result.config; // TsConfigJsonResolved (inferred)`

#### Scenario: Type guards for optional properties

- **WHEN** checking for optional config properties (compilerOptions, extends)
- **THEN** the system uses type guards instead of type assertions
- **EXAMPLE**: `if (!result) throw new Error(...); // Type narrowing, not 'as'`

#### Scenario: Config validation with satisfies

- **WHEN** creating temporary config objects for validation
- **THEN** the system uses satisfies operator to maintain type inference
- **EXAMPLE**: `const tempConfig = { ...options } satisfies Partial<TsConfigJsonResolved>`

#### Scenario: Zero any types in implementation

- **WHEN** implementing tsconfig-resolver.ts module
- **THEN** the system has zero any types in production code (test mocks may use any)
- **EXAMPLE**: All function parameters and return types are explicitly or implicitly typed

### Requirement: Security Validation

The system SHALL validate all configuration file paths and prevent security vulnerabilities during config discovery and parsing.

#### Scenario: Path traversal prevention

- **WHEN** --project flag contains path traversal attempts (../../etc/passwd, ../../../sensitive)
- **THEN** the system rejects paths outside project boundaries and returns clear security error

#### Scenario: Malicious extends validation

- **WHEN** tsconfig extends property references suspicious locations (URLs, /etc/, /root/)
- **THEN** get-tsconfig safely rejects dangerous extends and provides security warning

#### Scenario: Symlink attack prevention

- **WHEN** tsconfig.json is a symlink to sensitive system file
- **THEN** the system validates symlink target is within project directory before reading

#### Scenario: Config file permissions validation

- **WHEN** tsconfig.json has world-writable permissions (chmod 777)
- **THEN** the system warns about insecure permissions but continues (non-blocking warning)

#### Scenario: Untrusted config source detection

- **WHEN** tsconfig extends from npm package not in node_modules
- **THEN** the system validates package exists in safe location before resolution
