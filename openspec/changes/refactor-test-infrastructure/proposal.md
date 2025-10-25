# Test Infrastructure Reorganization

## Why

The current test setup has evolved organically but now suffers from maintainability issues:

1. **Massive setup file** - `tests/setup.ts` (593 lines) combines global utilities, custom matchers, fixtures, CLI helpers, and legacy code
2. **Legacy global pattern** - Uses `globalThis` pollution with `globals.d.ts` type declarations, making dependencies unclear
3. **No helper organization** - Utilities scattered throughout setup file with no logical grouping
4. **Mixed unit/integration concerns** - Single setup file serves both test types despite different needs
5. **Missing Zod validation** - Test types lack runtime validation despite Zod being used in production code

## What Changes

### 1. Reorganize Test Directory Structure

```sh
tests/
├── setup/              # NEW: Split setup by concern
│   ├── base.ts        # Shared configuration
│   ├── unit.ts        # Unit test specific
│   ├── integration.ts # Integration test specific
│   └── matchers.ts    # Custom Vitest matchers
│
├── helpers/            # NEW: Organized utilities
│   ├── cli.ts         # CLI execution
│   ├── filesystem.ts  # File/directory operations
│   ├── fixtures.ts    # Test fixture creation
│   └── package-manager.ts  # PM detection & execution
│
├── types/              # NEW: Test-specific types
│   ├── schemas.ts     # Zod schemas with validation
│   └── index.ts       # Type exports (z.infer)
│
├── fixtures/           # NEW: Reusable test data
│   ├── tsconfigs/     # Sample tsconfig templates
│   └── files/         # Test file templates
│
├── unit/               # Unchanged
├── integration/        # Unchanged
└── vitest.setup.ts     # NEW: Entry point (replaces setup.ts)
```

### 2. Remove Legacy Global Pattern

- **Delete** `tests/globals.d.ts`
- **Remove** `globalThis` assignments (lines 253-535 in setup.ts)
- **Use** explicit imports everywhere

### 3. Add Zod Schema Validation

- **Runtime validation** for CLI results, test fixtures, and helper parameters
- **Type inference** via `z.infer<typeof Schema>`
- **Follows coding standards** - Use `type` over `interface`

### 4. Add Package Manager Integration Tests

- **New file**: `tests/integration/cli-package-managers.test.ts`
- **Conditional testing** - Only test available package managers
- **Lightweight smoke tests** - 4 basic tests per PM (version, help, valid file, error file)

## Impact

### Affected Specs

- **NEW**: `testing-infrastructure` - Establish testing architecture requirements
- **MODIFIED**: `file-checking` - Update test approach documentation

### Affected Code

- **tests/setup.ts** - Split into modular files in `tests/setup/` and `tests/helpers/`
- **tests/globals.d.ts** - Deleted
- **All test files** - Updated to use explicit imports
- **vitest.config.ts** - Updated setup file reference
- **package.json** - Updated test scripts documentation

### Benefits

✅ **Maintainability** - Clear separation of concerns, easier to navigate
✅ **Type Safety** - Zod validation catches issues at runtime
✅ **Better DX** - Explicit imports with full IDE support
✅ **Test Coverage** - Package manager compatibility testing
✅ **Standards Compliance** - Follows `type` over `interface` convention

### Risks

⚠️ **Migration Effort** - ~30 test files need import updates (can be automated)
⚠️ **Breaking Change** - Existing tests using globals will break temporarily

### Migration Strategy

1. **Create new structure** alongside existing setup
2. **Migrate helpers** incrementally
3. **Update tests** file-by-file (or use codemod)
4. **Remove legacy code** only after all tests migrated
5. **Total estimated time**: 4-6 hours

### Testing Strategy

- Run tests after each migration step
- Ensure 100% test pass rate throughout
- No loss of coverage during migration
