---
'@jbabin91/tsc-files': patch
---

fix: handle files with special characters in filenames

Files containing special characters like parentheses `()` and dollar signs `$` are now properly type-checked instead of being silently skipped. This fixes an issue where the glob library was interpreting these characters as pattern syntax.

**Changes:**

- Direct files bypass glob processing to avoid special character interpretation
- Improved fallback logic to prevent duplicate file processing
- Refactored directory pattern generation to reduce code duplication
- Added comprehensive test coverage for error paths (100% function coverage)
- Fixed tsconfigPath parameter propagation for consistent JavaScript file inclusion

**Fixes:** #45
