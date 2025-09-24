# Commit Conventions

Follow the cz-git configuration from `.commitlintrc.js` with emojis enabled.

## Commit Format

```text
<type>(<scope>): <emoji> <description>

[optional body]

[optional footer(s)]
```

## Type → Emoji Mapping

Based on your actual cz-git configuration:

- **feat**: 🎸 - A new feature
- **fix**: 🐛 - A bug fix
- **docs**: ✏️ - Documentation only changes
- **style**: 💄 - Markup, white-space, formatting, missing semi-colons...
- **refactor**: 💡 - A code change that neither fixes a bug or adds a feature
- **perf**: ⚡️ - A code change that improves performance
- **test**: 💍 - Adding missing tests
- **chore**: 🤖 - Build process or auxiliary tool changes
- **ci**: 🎡 - CI related changes
- **release**: 🏹 - Create a release commit

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
git commit -m "feat(cli): 🎸 add --verbose flag for detailed output"
git commit -m "feat(core): 🎸 implement TypeScript file detection"

# Bug fixes
git commit -m "fix(core): 🐛 handle missing tsconfig.json gracefully"
git commit -m "fix(cli): 🐛 correct exit code for type errors"

# Chores
git commit -m "chore(deps): 🤖 bump typescript to v5.2.0"
git commit -m "chore(build): 🤖 update tsdown configuration"

# CI/CD
git commit -m "ci(build): 🎡 add automated testing workflow"
git commit -m "ci: 🎡 fix release workflow permissions"

# Documentation
git commit -m "docs: ✏️ update README with installation instructions"
git commit -m "docs(api): ✏️ add examples for programmatic usage"

# Performance
git commit -m "perf(core): ⚡️ optimize TypeScript file parsing"

# Style
git commit -m "style: 💄 fix code formatting and missing semicolons"

# Refactor
git commit -m "refactor(cli): 💡 reorganize argument parsing logic"

# Tests
git commit -m "test(core): 💍 add unit tests for file detection"

# Release
git commit -m "release: 🏹 bump version to 0.2.0"
```

## Rules Summary

- **Types**: Must be from allowed list
- **Scope**: Optional, lowercase, from predefined list or custom
- **Subject**: Imperative mood, no period, no sentence case
- **Header**: Max 200 characters
- **Body**: No line length limit
- **Emojis**: Always include the appropriate emoji
