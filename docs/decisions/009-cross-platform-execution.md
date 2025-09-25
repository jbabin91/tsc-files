# ADR 009: Cross-Platform Execution Strategy

**Status**: Accepted

## Context

The CLI tool needs to execute TypeScript compiler commands across different operating systems (Windows, macOS, Linux) and handle the various platform-specific differences in:

- Path separators and quoting
- Executable file extensions
- Shell execution requirements
- Package manager executable names
- Process spawning behaviors

Windows has significantly different path handling and executable requirements compared to Unix-like systems, requiring careful consideration of execution strategies.

## Decision

We implemented a **platform-aware execution strategy** with the following components:

1. **Platform detection**:
   - Use `process.platform === 'win32'` for Windows detection
   - Apply Windows-specific logic only when necessary

2. **Path quoting strategy**:
   - Automatically quote paths containing spaces on Windows
   - Preserve existing quotes to avoid double-quoting
   - Unix systems typically handle spaces without explicit quoting

3. **Executable extension handling**:
   - Add `.cmd` extension for package manager executables on Windows
   - Support `.exe` extension fallbacks where applicable
   - Maintain cross-platform executable resolution

4. **Shell execution decisions**:
   - Use shell execution for package manager proxy commands
   - Use direct execution for local TypeScript installations when possible
   - Windows requires shell execution in more scenarios

5. **Process library selection**:
   - Use `execa` for reliable cross-platform process execution
   - Leverage execa's built-in cross-platform handling
   - Override specific behaviors where platform differences require it

## Reasoning

**Platform-aware approach benefits**:

- **Reliability**: Handles Windows/Unix path differences correctly
- **User experience**: Works seamlessly across all platforms
- **Developer productivity**: No platform-specific configuration required
- **Enterprise compatibility**: Supports mixed-platform development teams

**Selective platform handling**:

- **Performance**: Only applies platform-specific logic when on that platform
- **Maintainability**: Clear separation of platform-specific concerns
- **Testing**: Easier to test platform-specific behaviors in isolation

**execa selection rationale**:

- **Cross-platform**: Built-in handling of many platform differences
- **Error handling**: Superior error reporting and handling
- **API consistency**: Same API works across platforms
- **Active maintenance**: Well-maintained with good TypeScript support

## Consequences

**Positive**:

- **Cross-platform compatibility**: Works identically on all major platforms
- **Path safety**: Handles paths with spaces correctly on Windows
- **Package manager compatibility**: Works with all package managers on all platforms
- **User transparency**: Platform differences are invisible to users

**Negative**:

- **Code complexity**: Platform detection logic adds complexity
- **Testing overhead**: Must test on multiple platforms
- **Edge case handling**: Some platform combinations may have unique behaviors

**Platform-specific considerations**:

- **Windows**: Path quoting, `.cmd` extensions, shell requirements
- **Unix**: Generally simpler path handling, direct execution preferred
- **Package managers**: Each has different Windows requirements

## Alternatives Considered

1. **Platform-agnostic approach only**:
   - Simpler code but unreliable on Windows
   - Would require users to handle platform differences

2. **Shell execution everywhere**:
   - Simpler logic but slower performance
   - Security concerns with shell injection

3. **Native child_process only**:
   - More control but significantly more platform-specific code
   - Poor error handling compared to execa

4. **Platform-specific implementations**:
   - Maximum control but maintenance nightmare
   - Code duplication across platform implementations

## Implementation Details

Key functions:

- `quoteWindowsPath()`: Handles path quoting for spaces on Windows
- `getWindowsExecutable()`: Adds appropriate extensions for Windows executables
- `findTypeScriptCompiler()`: Returns platform-appropriate execution configuration

Platform detection pattern:

```typescript
const isWindows = process.platform === 'win32';

// Platform-specific logic only when needed
if (isWindows) {
  // Windows-specific handling
}
```

Path quoting logic:

```typescript
function quoteWindowsPath(executablePath: string): string {
  if (isWindows) {
    if (executablePath.includes(' ') && !executablePath.startsWith('"')) {
      return `"${executablePath}"`;
    }
  }
  return executablePath;
}
```

The implementation provides both the raw platform-specific values and quoted/adjusted versions, allowing callers to choose the appropriate form for their use case.

**Testing strategy**:

- Mock platform detection for unit tests
- Integration tests on actual platforms via CI/CD
- Platform-specific edge case testing
