# CLI Framework Modernization Design

## Context

### Current Implementation

**commander** (v14.0.1):

- JavaScript-first library with TypeScript definitions
- ~30kB bundle size, 5 subdependencies
- Verbose API: `new Command()`, `new Option()`, manual type guards
- Pre-TypeScript design philosophy
- 1.4M weekly downloads (mature, widely adopted)

**Current file structure**:

```sh
src/cli/
├── command.ts (176 lines) - Commander.js program setup
├── main.ts (55 lines) - Entry point and orchestration
└── runner.ts (83 lines) - Execution logic
```

### Proposed Solution

**cleye** (v1.3.2) by privatenumber:

- TypeScript-first design with superior type inference
- ~5kB bundle size, zero subdependencies
- Declarative API: `cli({ flags: {...} })`, automatic validation
- Modern DX with automatic help generation
- 202K weekly downloads (proven reliability)
- Ecosystem consistency (same author: get-tsconfig, tsx, tsdown)

## Goals

1. **Reduce bundle size**: 30kB → 5kB (83% reduction)
2. **Improve type safety**: Leverage TypeScript-first design
3. **Simplify codebase**: Reduce API verbosity (~56 lines saved)
4. **Ecosystem consistency**: Align with privatenumber toolchain
5. **Maintain functionality**: Zero breaking changes to CLI behavior
6. **Zero regression**: All 12 requirements, 42 scenarios preserved

## Non-Goals

- Changing CLI command structure or syntax
- Modifying flag names or behavior
- Altering exit codes or error messages
- Adding new CLI features (separate proposals)
- Changing help text content (only styling framework)

## Decisions

### Decision 1: Replace commander with cleye

**Chosen**: Migrate from commander to cleye

**Rationale**:

- **TypeScript-first**: Better type inference, fewer type workarounds
- **83% smaller**: 30kB → 5kB, significant bundle reduction
- **Zero subdeps**: commander has 5, cleye has 0 (security benefit)
- **Ecosystem alignment**: privatenumber toolchain (get-tsconfig, tsx, tsdown)
- **Simpler API**: Declarative flags vs imperative Option objects
- **202K weekly downloads**: Proven at scale

**Alternatives considered**:

- Keep commander
  - ❌ Heavier bundle (30kB vs 5kB)
  - ❌ More subdependencies (5 vs 0)
  - ❌ JavaScript-first, not TypeScript-native
  - ❌ Ecosystem fragmentation
- Use citty (by unjs)
  - ❌ Less TypeScript-focused than cleye
  - ❌ Different ecosystem (Nuxt/UnJS vs privatenumber)
  - ❌ Fewer downloads (90K vs 202K weekly)
- Use cac (by egoist)
  - ❌ Not TypeScript-first
  - ❌ Less active maintenance

### Decision 2: Maintain API Compatibility

**Chosen**: Preserve all CLI behavior, only change internal implementation

**Current CLI API** (must preserve):

```bash
tsc-files [options] <files...>

Options:
  -v, --version           output version
  -p, --project <path>    path to tsconfig.json
  --verbose               detailed output
  --json                  JSON output
  --no-cache              disable caching
  --skip-lib-check        skip lib checking
  --use-tsc               force tsc
  --use-tsgo              force tsgo
  --show-compiler         show compiler
  --benchmark             benchmark compilers
  --no-fallback           disable fallback
  --tips                  show tips
  --include <files>       additional files
```

**Rationale**:

- No breaking changes for users
- Easier testing (behavior comparison)
- Git hooks and CI/CD scripts continue working
- Gradual adoption path if needed

### Decision 3: Rewrite vs Incremental Migration

**Chosen**: Complete rewrite of `command.ts` in single change

**Rationale**:

- Small surface area (one file, 176 lines)
- APIs incompatible (can't mix commander/cleye)
- Cleaner git history (single transition commit)
- Easier to review (complete before/after)
- Faster than incremental approach

**Alternatives considered**:

- Incremental migration with dual support
  - ❌ Unnecessary complexity for small file
  - ❌ Would require maintaining both APIs temporarily
  - ❌ More prone to bugs during transition

### Decision 4: Testing Strategy

**Chosen**: Comprehensive unit + integration testing before merging

**Test layers**:

1. **Unit tests**: Command creation, option parsing, validation
2. **Integration tests**: Real CLI invocations across platforms
3. **Regression tests**: Verify all 42 scenarios from spec
4. **Cross-platform**: Ubuntu, macOS, Windows via CI

**Coverage target**: Maintain 89% CLI layer coverage

**Rationale**:

- CLI is user-facing, requires high confidence
- Integration tests catch cleye-specific quirks
- Platform tests ensure Windows/Unix compatibility
- Regression suite prevents behavior changes

### Decision 5: Type Safety with Automatic Inference

**Chosen**: Leverage cleye's automatic type inference instead of manual type annotations

**Type Safety Hierarchy**:

1. 🥇 **Type Inference** (preferred) - Let TypeScript infer types from cleye schema
2. 🥈 **satisfies** - Validation without losing inference
3. 🥉 **:** (colon) - Explicit typing only when inference fails
4. ⛔ **as** - Avoid unless absolutely necessary
5. 🚫 **any** - NEVER in production code

**Rationale**:

- **cleye is TypeScript-first**: Automatic type inference from flag schema
- **Zero manual annotations needed**: `flags: { project: { type: String } }` → `string | undefined`
- **Better DX**: Less boilerplate, fewer type errors
- **Prevents regressions**: No `any` types means no type safety holes
- **User requirement**: "not just using as, :, any for our types"

**Implementation patterns**:

```typescript
// ✅ EXCELLENT: Automatic flag type inference
const argv = cli({
  flags: {
    project: { type: String, alias: 'p' }  // string | undefined (inferred!)
  }
});
// argv.flags.project is string | undefined (automatic!)

// ✅ GOOD: Type guards for validation
if (!argv.flags.project) {
  throw new Error('Project path required');
}
// argv.flags.project is now string (narrowed)

// ✅ GOOD: Custom validators maintain types
validate: (value) => {
  if (!value.endsWith('.json')) throw new Error('Must be JSON');
  return value;  // Type preserved automatically
}

// ❌ AVOID: Manual type assertions
const flags = argv.flags as { project: string };  // Loses inference

// 🚫 NEVER: any types in production
function handleOptions(options: any) { ... }  // PROHIBITED
```

**Testing exception**: Test mocks may use `any` for simplicity, but production code (command.ts, main.ts) must be strictly typed.

### Decision 6: Bun Runtime Support (MANDATORY)

**Chosen**: Bun runtime support is MANDATORY, not optional

**Rationale**:

- **User requirement**: "We need to support bun" (explicit)
- **cleye compatibility**: Confirmed compatible with Bun runtime
- **CLI arg parsing**: Same behavior under Node.js and Bun
- **Integration tests**: Bun tests MUST pass (not optional)
- **Future-proofing**: Bun adoption growing in TypeScript ecosystem

**Implementation requirements**:

1. **Runtime detection**: CLI works identically under `bun run tsc-files`
2. **Argument parsing**: `process.argv` handling same for Node.js and Bun
3. **Help text generation**: cleye help text renders correctly under Bun
4. **Flag validation**: Validation errors work identically
5. **Exit codes**: Same exit codes (0, 1, 2, 3) under both runtimes

**Validation strategy**:

```bash
# Test CLI invocation under Bun
bun run tsc-files src/**/*.ts

# Compare output consistency
node dist/cli.js --help > node-help.txt
bun dist/cli.js --help > bun-help.txt
diff node-help.txt bun-help.txt  # Should be identical

# Test argument parsing
bun dist/cli.js --project tsconfig.json file.ts --verbose

# Test error handling
bun dist/cli.js --invalid-flag  # Should show same error as Node.js
```

**Breaking if not supported**: Users running `bun run tsc-files` would experience failures or inconsistent behavior. This is unacceptable for a modern TypeScript CLI tool.

**Exit code consistency**: Must return same exit codes under both Node.js and Bun:

- Exit 0: Success
- Exit 1: Type errors
- Exit 2: Configuration errors
- Exit 3: System errors

## Implementation Strategy

### Phase 1: Dependency Swap

1. Add `cleye@^1.3.2` to `package.json`
2. Remove `commander@^14.0.1`
3. Run `pnpm install`
4. Verify no import errors with `pnpm typecheck`

### Phase 2: Rewrite Command Module

**Before** (commander):

```typescript
import { Command, Option } from 'commander';

export function createProgram(handler) {
  const program = new Command();

  program
    .name('tsc-files')
    .version(version)
    .argument('<files...>')
    .addOption(
      new Option('-p, --project <path>')
        .env('TSC_PROJECT')
        .argParser(validatePath),
    )
    .hook('preAction', logVerbose)
    .action(handler);

  return program;
}
```

**After** (cleye):

```typescript
import { cli } from 'cleye';

export function createProgram(handler) {
  return cli({
    name: 'tsc-files',
    version,
    parameters: ['<files...>'],
    flags: {
      project: {
        type: String,
        alias: 'p',
        description: 'path to tsconfig.json',
        validate: validatePath,
      },
      // ... other flags
    },
    help: {
      examples: createHelpExamples(),
    },
  });
}
```

**Key changes**:

- `new Command()` → `cli({ ... })`
- `.addOption(new Option())` → declarative `flags: {}`
- `.hook('preAction')` → handled in main execution
- Automatic help text generation
- Better TypeScript inference

### Phase 3: Update Type Definitions

**Before**:

```typescript
export interface RawCliOptions {
  project?: string;
  verbose?: boolean;
  // ... manual type definitions for each option
}
```

**After**:

```typescript
import type { ParsedFlags } from 'cleye';

// Leverage cleye's type inference
export type RawCliOptions = ParsedFlags<typeof flagsSchema>;
```

### Phase 4: Update Tests

1. Replace commander mocks with cleye mocks (if needed)
2. Update test assertions for cleye's output format
3. Add cleye-specific test cases
4. Verify 100% coverage maintained

### Phase 5: Integration Testing

Test all 42 scenarios from cli-interface spec:

- All option combinations
- Environment variable support
- Exit codes (0, 1, 2, 3)
- Error messages
- Help text
- Cross-platform behavior

## Migration Path

This is a **non-breaking internal refactoring**:

1. All CLI commands remain identical
2. All flags and options unchanged
3. Help text content preserved (styling may improve)
4. Exit codes unchanged
5. Can be done in single PR
6. No deprecation period needed

## Risks & Mitigations

### Risk 1: cleye behavior differs from commander

**Likelihood**: Low (both are CLI parsers with similar goals)
**Impact**: Medium (user-facing behavior)

**Mitigation**:

- Comprehensive integration tests covering all 42 scenarios
- Cross-platform testing (Ubuntu/macOS/Windows)
- Manual testing of real-world usage (lint-staged, CI/CD)
- Git history preserves rollback path

### Risk 2: Missing edge cases in argument parsing

**Likelihood**: Low (cleye is battle-tested with 202K weekly downloads)
**Impact**: Medium

**Mitigation**:

- Extensive unit tests for edge cases
- Integration tests with complex argument combinations
- Test special characters, spaces, quotes
- Verify glob pattern preservation

### Risk 3: Type inference issues

**Likelihood**: Very Low (cleye designed for TypeScript)
**Impact**: Low (development experience, not runtime)

**Mitigation**:

- Comprehensive type checking with `pnpm typecheck`
- TypeScript strict mode already enabled
- Test with TypeScript 5.x (current version)

### Risk 4: Help text formatting changes

**Likelihood**: Medium (different library, different defaults)
**Impact**: Low (cosmetic only)

**Mitigation**:

- Customize cleye's help formatter to match current style
- Preserve kleur color usage
- Manually review help text output
- Document any intentional improvements

### Risk 5: Bundle size increase from new features

**Likelihood**: None (cleye is 83% smaller)
**Impact**: N/A

**Validation**: Verify with `pnpm check-exports` after migration

## Testing Strategy

### Unit Tests

**Command Creation**:

- [x] Create CLI program with all options
- [x] Validate option types and defaults
- [x] Verify flag aliases (-v, -p)
- [x] Test custom validators

**Argument Parsing**:

- [x] Parse file arguments correctly
- [x] Handle glob patterns
- [x] Parse boolean flags
- [x] Parse string options
- [x] Environment variable support

**Input Validation**:

- [x] Reject empty project path
- [x] Reject non-JSON project path
- [x] Detect conflicting options
- [x] Validate custom types

### Integration Tests

**CLI Invocation**:

- [ ] Basic: `tsc-files file.ts`
- [ ] Glob: `tsc-files "src/**/*.ts"`
- [ ] Project flag: `tsc-files -p tsconfig.build.json file.ts`
- [ ] Environment: `TSC_PROJECT=... tsc-files file.ts`
- [ ] Verbose: `tsc-files --verbose file.ts`
- [ ] JSON: `tsc-files --json file.ts`
- [ ] Compiler selection: `--use-tsc`, `--use-tsgo`
- [ ] Performance: `--skip-lib-check`, `--no-cache`
- [ ] Educational: `--tips`, `--show-compiler`, `--benchmark`

**Error Handling**:

- [ ] Missing files argument
- [ ] Invalid project path
- [ ] Conflicting options
- [ ] TypeScript not found
- [ ] Config errors

**Cross-Platform**:

- [ ] Test on macOS (zsh, bash)
- [ ] Test on Linux (bash)
- [ ] Test on Windows (cmd, PowerShell)
- [ ] Verify path handling
- [ ] Verify colored output

## Rollback Plan

If issues discovered after merge:

1. **Revert PR**: Git history allows clean revert to commander
2. **Temporary fix**: Can patch cleye usage while keeping migration
3. **Gradual rollback**: Can revert file-by-file if needed

All commander code preserved in git history for reference.

## Success Criteria

- [ ] All quality gates pass (lint, typecheck, test, build)
- [ ] Bundle size reduced by ~25kB (30kB → 5kB)
- [ ] Subdependencies reduced by 5 (commander's deps removed)
- [ ] Test coverage maintained at 89%+ CLI layer
- [ ] No breaking changes to CLI behavior
- [ ] All 42 scenarios from spec verified
- [ ] Integration tests pass on all platforms
- [ ] Documentation updated
- [ ] No regression in functionality

## Open Questions

**Q: Should we customize cleye's help text styling?**
A: Yes - use kleur to maintain consistent branding with current style.

**Q: Do we need to maintain commander compatibility layer?**
A: No - small surface area, clean break is simpler.

**Q: What about argument parsing differences?**
A: Comprehensive tests will catch any differences. Both libraries parse similarly.

**Q: Should we expose cleye's additional features?**
A: Out of scope for this migration. Can be added in separate proposal if needed.
