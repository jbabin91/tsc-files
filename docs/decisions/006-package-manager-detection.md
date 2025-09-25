# ADR 006: Package Manager Detection Strategy

**Status**: Accepted

## Context

The TypeScript CLI tool needs to execute the TypeScript compiler (`tsc`) in a way that respects the user's package manager choice and project setup. Different package managers (npm, yarn, pnpm, bun) have different installation patterns, execution methods, and performance characteristics. We needed a reliable way to auto-detect the package manager and execute TypeScript accordingly.

## Decision

We implemented a multi-layered package manager detection strategy:

1. **Lock file detection** (primary method)
   - `pnpm-lock.yaml` → pnpm
   - `yarn.lock` → yarn
   - `bun.lockb` → bun
   - `package-lock.json` or `npm-shrinkwrap.json` → npm

2. **Environment variable detection** (CI/CD environments)
   - Parse `npm_config_user_agent` for package manager identification
   - Fallback to lock file detection if environment detection fails

3. **TypeScript compiler path resolution** (execution optimization)
   - Detect local TypeScript installation paths specific to each package manager
   - Handle pnpm's nested `.pnpm` directory structure
   - Support Windows-specific executable extensions (`.cmd`, `.exe`)

4. **Cross-platform execution patterns**
   - Direct execution for local TypeScript installations
   - Package manager proxy execution (`pnpm exec tsc`, `yarn tsc`, etc.)
   - Shell vs direct execution based on platform and package manager

## Reasoning

**Multi-layered approach benefits**:

- **Reliability**: Lock files are the most reliable indicator of package manager choice
- **CI/CD compatibility**: Environment variables work better in automated environments
- **Performance**: Direct TypeScript execution avoids package manager overhead when possible
- **Compatibility**: Supports all major package managers used in the ecosystem

**Priority order rationale**:

- pnpm > yarn > bun > npm reflects modern usage patterns and performance characteristics
- npm as fallback ensures compatibility with all Node.js environments

**Cross-platform considerations**:

- Windows requires different executable extensions and quoting strategies
- pnpm has unique nested installation patterns that need special handling

## Consequences

**Positive**:

- **Zero configuration**: Works automatically with any package manager setup
- **Optimal performance**: Uses direct TypeScript execution when available
- **Cross-platform**: Handles Windows and Unix path differences
- **Future-proof**: Easy to add new package managers

**Negative**:

- **Complexity**: Multiple detection methods increase code complexity
- **Edge cases**: Complex pnpm workspace scenarios may need special handling
- **Maintenance**: Must stay current with package manager evolution

**Trade-offs addressed**:

- Detection reliability vs simplicity: Chose reliability
- Performance vs compatibility: Optimized for performance with compatibility fallbacks
- Auto-detection vs manual configuration: Chose auto-detection with manual override capability

## Alternatives Considered

1. **Manual configuration only**: Simple but poor user experience
2. **Single detection method**: Reliable but limited compatibility
3. **Always use package manager proxy**: Simple but slower execution
4. **NPX-only approach**: Universal but suboptimal performance

## Implementation Details

Key components:

- `detectPackageManager()`: Lock file detection
- `detectPackageManagerAdvanced()`: Environment + lock file detection
- `getTscPath()`: Package manager-specific TypeScript path resolution
- `getRecommendedTscExecution()`: Optimal execution strategy selection

The implementation provides both simple and advanced detection methods, allowing different use cases to choose the appropriate level of detection sophistication.
