# ADR 010: Error Handling & Process Management

**Status**: Accepted

## Context

The CLI tool needs to execute TypeScript compiler processes and handle various failure scenarios gracefully. The original tsc-files community identified critical issues where spawn errors were not properly propagated, leading to silent failures and poor user experience. We needed a robust process execution and error handling strategy that provides clear feedback for all failure modes.

## Decision

We implemented **comprehensive error handling with execa-based process management**:

1. **Process execution library**:
   - Use `execa` instead of native `child_process` for superior error handling
   - Leverage execa's built-in cross-platform support and error enrichment
   - Benefit from structured error objects and better debugging information

2. **Error propagation strategy**:
   - Always propagate spawn errors: `if (error) throw error`
   - Capture both exit codes and spawn errors separately
   - Provide detailed error context for debugging

3. **Error categorization**:
   - **Type errors** (exit code 1): TypeScript compilation errors
   - **Configuration errors** (exit code 2): Missing or invalid tsconfig.json
   - **System errors** (exit code 3): TypeScript compiler not found, permissions
   - **Internal errors** (exit code 99): Unexpected errors in our tool

4. **Verbose error reporting**:
   - Standard mode: User-friendly error messages
   - Verbose mode: Full command details, file paths, execution context
   - JSON mode: Structured error objects for programmatic consumption

5. **Error recovery strategies**:
   - Graceful fallback when TypeScript paths are not found
   - Cleanup temporary files even when errors occur
   - Continue processing other file groups in monorepo scenarios when possible

## Reasoning

**execa selection benefits**:

- **Error handling**: Superior error objects with more context than child_process
- **Cross-platform**: Built-in Windows/Unix compatibility
- **Promise-based**: Cleaner async/await patterns
- **TypeScript support**: Excellent TypeScript definitions and type safety

**Error categorization rationale**:

- **User guidance**: Different exit codes help users understand error types
- **Tooling integration**: CI/CD and editors can respond appropriately to exit codes
- **Debugging efficiency**: Clear categorization speeds up problem resolution

**Community issue resolution**:

- **Silent failures**: Fixed by proper spawn error propagation
- **Poor debugging**: Resolved with verbose mode and detailed error context
- **Tool integration**: Structured exit codes improve CI/CD integration

## Consequences

**Positive**:

- **Reliable error reporting**: No silent failures, all errors are properly surfaced
- **Developer experience**: Clear error messages with actionable guidance
- **Tool integration**: Proper exit codes for CI/CD and editor integration
- **Debugging support**: Verbose mode provides detailed execution context
- **Cross-platform**: Consistent error handling across all platforms

**Negative**:

- **Dependency**: Additional dependency on execa (though widely used and stable)
- **Error complexity**: More detailed error handling code
- **Testing overhead**: Must test various error scenarios and exit codes

**Performance considerations**:

- **Error object creation**: Slightly more overhead for error enrichment
- **Process spawning**: execa adds minimal overhead over child_process
- **Error formatting**: Verbose mode formatting has minor CPU cost

## Alternatives Considered

1. **Native child_process**:
   - Less dependency but significantly more platform-specific code
   - Poor error handling compared to execa
   - More complex cross-platform implementation

2. **Simple error handling**:
   - Easy to implement but poor user experience
   - Difficult to debug failures
   - Poor tool integration

3. **Custom process wrapper**:
   - Maximum control but reinventing well-solved problems
   - Maintenance overhead for cross-platform edge cases

4. **Other process libraries** (shell.js, cross-spawn):
   - Various trade-offs but execa provides the best balance

## Implementation Details

Key error handling patterns:

```typescript
// Process execution with comprehensive error handling
try {
  const result = await execa(executable, args, options);
  return parseResults(result);
} catch (error) {
  // Categorize and enrich error
  throw createCategorizedError(error, context);
}
```

Exit code mapping:

```typescript
const EXIT_CODES = {
  SUCCESS: 0,
  TYPE_ERRORS: 1,
  CONFIG_ERROR: 2,
  SYSTEM_ERROR: 3,
  INTERNAL_ERROR: 99,
} as const;
```

Error enrichment:

- Add file context and command details
- Include suggestions for common failure scenarios
- Preserve original error information for debugging

**Recovery mechanisms**:

- Temporary file cleanup in finally blocks
- Continue processing other groups when one fails
- Fallback execution strategies when primary methods fail

**Testing approach**:

- Mock execa for unit tests to test error handling paths
- Integration tests with actual TypeScript compiler failures
- Error scenario testing across different platforms
