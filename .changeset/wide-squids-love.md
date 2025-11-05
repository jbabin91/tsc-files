---
'@jbabin91/tsc-files': patch
---

Fix recursive import discovery from ambient files with path-mapped imports

Fixes a bug where imports from ambient declaration files (found via pattern matching) were not recursively discovered when using path-mapped imports configured via baseUrl/paths in tsconfig.json. This caused false positive type errors about missing files in the file list.
