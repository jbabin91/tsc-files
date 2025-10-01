---
'@jbabin91/tsc-files': patch
---

fix: always exclude node_modules and dist from type checking, fix git hook hanging, correct TypeScript peer dependency

**Problem:**

- tsc-files was checking declaration files in node_modules, causing hundreds of irrelevant type errors from library dependencies
- Setting `exclude: []` in temp config removed all exclusions including node_modules
- User's tsconfig `skipLibCheck` setting could cause node_modules to be checked
- Git hooks (lefthook/husky) appearing to hang showing "⠼ waiting: typecheck" due to immediate `process.exit()` preventing spinner cleanup
- Integration tests failing because exit code was being overwritten after being set correctly
- TypeScript peer dependency was incorrectly set to `>=5.9.2` instead of our intended `>=5.0.0`, limiting compatibility

**Solution:**

1. Always exclude node_modules and dist directories by default
2. Preserve user's original exclude patterns while ensuring node_modules/dist are excluded
3. Default skipLibCheck to true (skip checking library declaration files)
4. Use `process.exitCode` with a brief delay before `process.exit()` to allow graceful spinner cleanup while ensuring correct exit codes in CI/test environments
5. Prevent overwriting the correct exit code in the main function
6. Restore TypeScript peer dependency to `>=5.0.0` for broader compatibility
7. Configure Renovate to use `widen` strategy for peer dependencies to prevent future breaking changes

**Benefits:**

- Faster type checking (no library declaration file checking)
- Cleaner error output (only errors from your code)
- Works reliably with git hooks (lefthook, husky) without hanging
- Respects user's other exclusion patterns
- Graceful process shutdown allows proper cleanup of spinners and other resources
- Correct exit codes in all environments (CLI, CI/CD, git hooks, integration tests)
- Broader TypeScript version compatibility (5.0.0+) for better ecosystem support

Users can still explicitly check libraries with `--skip-lib-check=false` if needed.
