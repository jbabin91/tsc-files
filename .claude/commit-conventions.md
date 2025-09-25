# Commit Conventions

Follow the cz-git configuration from `.commitlintrc.js` with gitmojis enabled.

## Commit Format

```text
<type>(<scope>): <gitmoji> <description>

[optional body]

[optional footer(s)]
```

## Type → Gitmoji Mapping

Based on standard gitmojis and your cz-git configuration:

- **feat**: :sparkles: ✨ - Introduce new features
- **fix**: :bug: 🐛 - Fix a bug
- **docs**: :memo: 📝 - Add or update documentation
- **style**: :lipstick: 💄 - Add or update the UI and style files
- **refactor**: :recycle: ♻️ - Refactor code
- **perf**: :zap: ⚡️ - Improve performance
- **test**: :white_check_mark: ✅ - Add or update tests
- **chore**: :hammer: 🔨 - Add or update development scripts
- **ci**: :construction_worker: 👷 - Add or update CI build system
- **revert**: :rewind: ⏪️ - Revert changes

## Available Scopes

From `.commitlintrc.js` configuration:

- `cli` - Command line interface
- `core` - Core functionality
- `types` - TypeScript types
- `config` - Configuration files
- `build` - Build system
- `test` - Test files
- `docs` - Documentation
- `deps` - Dependencies

## Examples

```bash
# Features
git commit -m "feat(cli): :sparkles: add --verbose flag for detailed output"
git commit -m "feat(core): :sparkles: implement TypeScript file detection"

# Bug fixes
git commit -m "fix(core): :bug: handle missing tsconfig.json gracefully"
git commit -m "fix(cli): :bug: correct exit code for type errors"

# Chores
git commit -m "chore(deps): :hammer: bump typescript to v5.2.0"
git commit -m "chore(build): :hammer: update tsdown configuration"

# CI/CD
git commit -m "ci(build): :construction_worker: add automated testing workflow"
git commit -m "ci: :construction_worker: fix release workflow permissions"

# Documentation
git commit -m "docs: :memo: update README with installation instructions"
git commit -m "docs(api): :memo: add examples for programmatic usage"

# Performance
git commit -m "perf(core): :zap: optimize TypeScript file parsing"

# Style
git commit -m "style: :lipstick: fix code formatting and missing semicolons"

# Refactor
git commit -m "refactor(cli): :recycle: reorganize argument parsing logic"

# Tests
git commit -m "test(core): :white_check_mark: add unit tests for file detection"

# Reverts
git commit -m "revert: :rewind: revert previous commit changes"
```

## Rules Summary

- **Types**: Must be from allowed list
- **Scope**: Optional, lowercase, from predefined list or custom
- **Subject**: Imperative mood, no period, no sentence case
- **Header**: Max 200 characters
- **Body**: No line length limit
- **Gitmojis**: Always include the appropriate gitmoji code (e.g., :sparkles:)
