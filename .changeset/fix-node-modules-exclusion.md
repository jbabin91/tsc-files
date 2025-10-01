---
'@jbabin91/tsc-files': patch
---

fix: always exclude node_modules and dist from type checking, fix git hook hanging

**Problem:**

- tsc-files was checking declaration files in node_modules, causing hundreds of irrelevant type errors from library dependencies
- Setting `exclude: []` in temp config removed all exclusions including node_modules
- User's tsconfig `skipLibCheck` setting could cause node_modules to be checked
- Git hooks (lefthook/husky) appearing to hang showing "⠼ waiting: typecheck" due to immediate `process.exit()` preventing spinner cleanup

**Solution:**

1. Always exclude node_modules and dist directories by default
2. Preserve user's original exclude patterns while ensuring node_modules/dist are excluded
3. Default skipLibCheck to true (skip checking library declaration files)
4. Use `process.exitCode` instead of `process.exit()` to allow graceful event loop drainage and proper spinner cleanup

**Benefits:**

- Faster type checking (no library declaration file checking)
- Cleaner error output (only errors from your code)
- Works reliably with git hooks (lefthook, husky) without hanging
- Respects user's other exclusion patterns
- Graceful process shutdown allows proper cleanup of spinners and other resources

Users can still explicitly check libraries with `--skip-lib-check=false` if needed.
