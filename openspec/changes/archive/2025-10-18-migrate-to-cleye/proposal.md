# CLI Framework Modernization: commander → cleye

## Why

Current CLI implementation uses `commander` (14.0.1, ~30kB) for argument parsing and command handling. While functional, there's an opportunity to modernize with `cleye` (1.3.2, ~5kB) from privatenumber:

### Current Pain Points

1. **Heavy Dependency**: commander is 30kB with 5 subdependencies
2. **JavaScript-First**: commander predates TypeScript, requires type overlays
3. **Ecosystem Fragmentation**: Already using privatenumber tools (get-tsconfig, tsx, tsdown)
4. **API Verbosity**: Requires `new Command()`, `.addOption(new Option())`, manual hook setup

### Modern Solution: cleye

**cleye** (CLI-maker) by privatenumber:

- **TypeScript-first**: Built for TypeScript with superior type inference
- **83% smaller**: 5kB vs 30kB (82% reduction)
- **Zero extra deps**: commander has 5, cleye has 0
- **Ecosystem consistency**: Same author as get-tsconfig, tsx, tsdown, tsup
- **Simpler API**: Declarative options, automatic help text, built-in validation
- **202K weekly downloads**: Proven reliability

## What Changes

### Dependencies

**REMOVE:**

- `commander` (30kB, 5 subdeps)

**ADD:**

- `cleye` (5kB, 0 subdeps)

**Bundle impact:**

- **Size reduction**: 25kB (83% smaller)
- **Subdeps reduction**: -5 dependencies
- **Type safety**: Improved (TypeScript-first design)

### Code Changes

**CLI Command Setup** (`src/cli/command.ts`):

- Replace `commander` imports with `cleye`
- Convert `Command` class to `cli()` function
- Simplify option declarations (no `new Option()` needed)
- Automatic validation and type inference
- Cleaner hook mechanism

**Type Definitions** (`src/types/cli.ts`):

- Update `RawCliOptions` to match cleye's inferred types
- Remove commander-specific type workarounds
- Leverage cleye's superior TypeScript inference

**Tests** (`tests/unit/cli/command.test.ts`):

- Update command parsing tests
- Adapt to cleye's API patterns
- Maintain 100% test coverage

### Breaking Changes

**None** - This is an internal refactoring with no public API changes.

The CLI tool maintains identical:

- Command syntax: `tsc-files [options] <files...>`
- All flags: `--project`, `--verbose`, `--json`, etc.
- Exit codes: 0, 1, 2, 3
- Help text format
- Environment variable support (`TSC_PROJECT`)

Users won't notice any difference in behavior.

## Impact

**Affected specs:**

- `cli-interface` - CLI framework implementation

**Affected code:**

- `src/cli/command.ts` - Complete rewrite using cleye (~176 lines → ~120 lines)
- `src/types/cli.ts` - Type definition updates
- `tests/unit/cli/command.test.ts` - Test updates for cleye API
- `tests/setup.ts` - Mock updates

**Benefits:**

- **83% smaller CLI framework** (30kB → 5kB)
- **5 fewer subdependencies** (supply chain security)
- **Better TypeScript experience** (type-first design, superior inference)
- **Simpler codebase** (~56 fewer lines, cleaner API)
- **Ecosystem consistency** (privatenumber toolchain: cleye, get-tsconfig, tsdown, tsx)
- **Proven reliability** (202K weekly downloads)

**Risks:**

- **MEDIUM**: CLI framework is user-facing but API differences are internal
- **Mitigation**: Comprehensive testing of all CLI scenarios
- **Validation**: Integration tests across all platforms (Ubuntu/macOS/Windows)
- **Rollback**: Git history preserves commander implementation
