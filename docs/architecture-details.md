# Architecture Details

This document provides detailed architectural information for the tsc-files TypeScript CLI tool, expanding on the high-level overview in CLAUDE.md.

## System Architecture

### Layered Architecture Overview

```text
┌─────────────────────────────────────────────────────────────┐
│                     CLI Layer                               │
├─────────────────────────────────────────────────────────────┤
│                 Core Orchestration                          │
├─────────────────────────────────────────────────────────────┤
│    Detection Layer    │  Config Layer  │  Execution Layer   │
├─────────────────────────────────────────────────────────────┤
│                  Utility Layer                              │
└─────────────────────────────────────────────────────────────┘
```

## Detailed Component Design

### CLI Layer (`src/cli.ts`)

**Responsibilities**:

- Command-line argument parsing and validation
- User input sanitization and normalization
- Help text and version information display
- Global error handling and exit code management

**Key Interfaces**:

```typescript
interface CLIOptions {
  files: string[]; // Input TypeScript files
  project?: string; // Path to tsconfig.json
  noEmit: boolean; // Type check only (default: true)
  skipLibCheck?: boolean; // Skip .d.ts files
  verbose: boolean; // Detailed output
  cache: boolean; // Use temp file caching
  json: boolean; // JSON output format
}

interface CLIResult {
  success: boolean;
  errorCount: number;
  duration: number;
  errors?: TypeScriptError[];
  warnings?: string[];
}
```

**Implementation Strategy**:

- Use commander.js or similar for argument parsing
- Validate all inputs before passing to core layer
- Handle signals (SIGINT, SIGTERM) for graceful shutdown
- Implement proper exit codes (0=success, 1=errors, 2=config, 3=system, 99=internal)

### Core Orchestration (`src/core/checker.ts`)

**Responsibilities**:

- Coordinate all subsystems
- Manage workflow execution
- Handle errors and fallbacks
- Resource cleanup coordination

**Key Methods**:

```typescript
class TypeScriptChecker {
  async checkFiles(files: string[], options: CLIOptions): Promise<CLIResult>;
  private async detectEnvironment(): Promise<Environment>;
  private async prepareConfiguration(options: CLIOptions): Promise<TempConfig>;
  private async executeTypeScript(config: TempConfig): Promise<TSResult>;
  private async parseResults(output: string): Promise<TypeScriptError[]>;
}
```

**Workflow**:

1. Environment detection (package manager, TypeScript location)
2. Input validation and normalization
3. Temporary configuration generation
4. TypeScript compiler execution
5. Result parsing and formatting
6. Cleanup and resource management

### Detection Layer

#### Package Manager Detector (`src/detectors/package-manager.ts`)

**Detection Strategy**:

```typescript
interface PackageManagerInfo {
  type: 'npm' | 'yarn' | 'pnpm' | 'bun';
  version: string;
  lockFile?: string;
  command: string;
}

class PackageManagerDetector {
  async detect(projectRoot: string): Promise<PackageManagerInfo> {
    // Priority order:
    // 1. Lock file detection
    // 2. Environment variables (npm_config_user_agent)
    // 3. Binary availability in PATH
    // 4. Default to npm
  }
}
```

**Lock File Patterns**:

- `package-lock.json` → npm
- `yarn.lock` → yarn
- `pnpm-lock.yaml` → pnpm
- `bun.lockb` → bun

#### TypeScript Detector (`src/detectors/typescript.ts`)

**Detection Strategy**:

```typescript
interface TypeScriptInfo {
  compilerPath: string;
  version: string;
  isLocal: boolean;
  configPath?: string;
}

class TypeScriptDetector {
  async detect(projectRoot: string): Promise<TypeScriptInfo> {
    // Priority order:
    // 1. Local node_modules/.bin/tsc
    // 2. Package manager specific paths
    // 3. Global TypeScript installation
    // 4. System PATH lookup
  }
}
```

#### Configuration Detector (`src/detectors/config.ts`)

**Configuration Discovery**:

```typescript
interface ConfigInfo {
  configPath: string;
  extends?: string[];
  compilerOptions: any;
  include?: string[];
  exclude?: string[];
}

class ConfigDetector {
  async findConfig(
    startDir: string,
    projectFlag?: string,
  ): Promise<ConfigInfo> {
    // Search order:
    // 1. Explicit --project flag
    // 2. tsconfig.json in current directory
    // 3. Walk up directory tree
    // 4. Default configuration
  }
}
```

### Configuration Layer

#### Temporary Config Generator (`src/generators/temp-config.ts`)

**Purpose**: Create temporary tsconfig.json files that:

- Preserve original configuration semantics
- Include only specified files
- Maintain relative path relationships
- Apply security restrictions

**Implementation**:

```typescript
interface TempConfigOptions {
  originalConfig: ConfigInfo;
  targetFiles: string[];
  workingDir: string;
  compilerOptions?: Partial<CompilerOptions>;
}

class TempConfigGenerator {
  async generate(options: TempConfigOptions): Promise<string> {
    // 1. Parse original tsconfig.json
    // 2. Resolve extends chains
    // 3. Filter includes to target files only
    // 4. Adjust paths for temporary location
    // 5. Apply security restrictions
    // 6. Write to secure temporary file
  }
}
```

**Security Considerations**:

- Cryptographically random temp file names
- Restrictive file permissions (600)
- Secure temp directory usage
- Automatic cleanup on exit

### Execution Layer

#### TypeScript Runner (`src/executors/tsc-runner.ts`)

**Safe Execution**:

```typescript
interface ExecutionOptions {
  compilerPath: string;
  configPath: string;
  additionalArgs?: string[];
  timeout?: number;
}

interface ExecutionResult {
  stdout: string;
  stderr: string;
  exitCode: number;
  duration: number;
}

class TypeScriptRunner {
  async run(options: ExecutionOptions): Promise<ExecutionResult> {
    // Use execFile with array arguments (no shell)
    // Validate all paths before execution
    // Handle timeouts and process cleanup
    // Capture all output streams
  }
}
```

**Security Measures**:

- No shell execution (use execFile with arrays)
- Path validation and sanitization
- Command timeout enforcement
- Resource limit enforcement
- Signal handling for cleanup

### Parsing Layer

#### Error Formatter (`src/parsers/error-formatter.ts`)

**Output Parsing**:

```typescript
interface TypeScriptError {
  file: string;
  line: number;
  column: number;
  message: string;
  severity: 'error' | 'warning';
  code: string;
}

class ErrorFormatter {
  parseOutput(output: string): TypeScriptError[];
  formatForCLI(errors: TypeScriptError[]): string;
  formatAsJSON(errors: TypeScriptError[]): string;
}
```

**Format Support**:

- Human-readable CLI output
- JSON structured output
- Integration with CI/CD systems
- Editor-friendly formats

### Utility Layer

#### Temporary File Manager (`src/utils/temp-files.ts`)

**Secure File Handling**:

```typescript
class TempFileManager {
  private tempFiles: Set<string> = new Set();

  async createSecureTemp(content: string, extension: string): Promise<string> {
    // Generate cryptographically random filename
    // Create with restrictive permissions
    // Track for cleanup
  }

  async cleanup(): Promise<void> {
    // Remove all tracked temp files
    // Handle cleanup errors gracefully
  }
}
```

#### Cleanup Manager (`src/utils/cleanup.ts`)

**Resource Management**:

```typescript
class CleanupManager {
  private handlers: Array<() => Promise<void>> = [];

  addHandler(handler: () => Promise<void>): void;
  async executeCleanup(): Promise<void>;
  setupSignalHandlers(): void; // SIGINT, SIGTERM, SIGQUIT
}
```

## Data Flow

### Typical Execution Flow

```text
User Input (CLI args)
        ↓
Input Validation & Parsing
        ↓
Environment Detection
├── Package Manager Detection
├── TypeScript Compiler Location
└── Configuration Discovery
        ↓
Temporary Configuration Generation
        ↓
TypeScript Compiler Execution
        ↓
Output Parsing & Formatting
        ↓
Cleanup & Exit
```

### Error Handling Flow

```text
Error Occurs
     ↓
Error Classification
├── User Error (exit 1)
├── Configuration Error (exit 2)
├── System Error (exit 3)
└── Internal Error (exit 99)
     ↓
Cleanup Resources
     ↓
Format Error Message
     ↓
Exit with Appropriate Code
```

## Security Architecture

### Input Validation Pipeline

```text
User Input
    ↓
Argument Parsing & Validation
    ↓
Path Sanitization & Resolution
    ↓
File Access Validation
    ↓
Command Construction & Validation
    ↓
Secure Execution
```

### Privilege Management

- **Principle of Least Privilege**: Only access necessary files and directories
- **Temporary File Isolation**: Secure temp directory with restricted permissions
- **Process Isolation**: Child processes with minimal environment
- **Resource Limits**: Timeout and memory constraints

## Performance Considerations

### Optimization Strategies

1. **Lazy Loading**: Load components only when needed
2. **Caching**: Reuse detection results within session
3. **Parallel Processing**: Concurrent environment detection
4. **Minimal File I/O**: Efficient temporary file management
5. **Stream Processing**: Handle large outputs efficiently

### Scalability

- **Memory Management**: Efficient handling of large project outputs
- **Process Management**: Proper cleanup of child processes
- **File Handle Management**: Avoid resource leaks
- **Error Accumulation**: Efficient error collection and reporting

## Testing Architecture

### Component Testing Strategy

```text
Unit Tests
├── Detection Layer Tests
├── Configuration Tests
├── Execution Tests
├── Parsing Tests
└── Utility Tests

Integration Tests
├── End-to-End CLI Tests
├── Real Project Tests
├── Cross-Platform Tests
└── Performance Tests

Security Tests
├── Input Validation Tests
├── Path Traversal Tests
├── Command Injection Tests
└── Resource Cleanup Tests
```

### Test Data Management

- **Fixtures**: Realistic TypeScript projects for testing
- **Mocks**: Controlled environment simulation
- **Snapshots**: Output format validation
- **Performance Benchmarks**: Regression detection

This architecture ensures reliable, secure, and performant TypeScript file checking while maintaining clear separation of concerns and testability.
