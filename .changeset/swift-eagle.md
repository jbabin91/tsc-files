---
'@jbabin91/tsc-files': patch
---

### 🐛 Bug Fixes

- **changeset**: :bug: include all conventional commits in changelog while only bumping for feat/fix/perf
- **changeset**: :bug: only bump version for feat/fix/perf, not refactor/revert
- **parser**: :bug: add JSONC support for tsconfig.json with comments and trailing commas
- **lint**: :bug: enforce zero-tolerance policy for any types
- **claude**: :bug: use @ imports to load files into Claude Code context

### 🔧 Miscellaneous Chores

- **repo**: :hammer: bump dependencies
- **repo**: :hammer: bump dependencies

### 📝 Documentation

- **cleanup**: :memo: streamline documentation structure
- **claude**: :memo: add changeset:auto and troubleshooting commands
- **claude**: :memo: restore essential commands to CLAUDE.md for quick access
- **duplication**: :memo: eliminate duplication by referencing source of truth
- **coverage**: :memo: reference vitest.config.ts instead of duplicating thresholds
- **quality**: :memo: add test coverage to quality gate requirements
- **standards**: :memo: align coding standards with actual ESLint/Prettier config
- **workflows**: :memo: update claude-code-workflows.md with new doc structure
- **navigation**: :memo: enhance documentation navigation and cross-references
- **structure**: :memo: reorganize documentation into logical directories
- **openspec**: :memo: migrate to OpenSpec for spec-driven development
