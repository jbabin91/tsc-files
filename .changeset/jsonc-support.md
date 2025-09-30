---
'@jbabin91/tsc-files': patch
---

fix: add JSONC support for tsconfig.json files with comments and trailing commas

TypeScript's tsconfig.json files support comments and trailing commas (JSONC format), but strict JSON.parse() doesn't. This fix adds `strip-json-comments` to properly parse tsconfig.json files that contain:

- Single-line comments (`//`)
- Block comments (`/* */`)
- Trailing commas

This resolves parsing errors when using tsconfig.json files with these valid TypeScript configuration features.
