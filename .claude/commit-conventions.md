# Commit Conventions

Follow the cz-git configuration from `.commitlintrc.js` with emojis enabled.

## Commit Format

```text
<emoji> <type>(<scope>): <description>

[optional body]

[optional footer(s)]
```

## Type → Emoji Mapping

Based on cz-git conventions when `useEmoji: true`:

- **feat**: ✨ - New features
- **fix**: 🐛 - Bug fixes
- **docs**: 📝 - Documentation changes
- **style**: 💄 - Code style changes (formatting, etc.)
- **refactor**: ♻️ - Code changes that neither fix bugs nor add features
- **perf**: ⚡ - Performance improvements
- **test**: ✅ - Adding or correcting tests
- **chore**: 🔧 - Dependencies, tooling, etc.
- **ci**: 👷 - CI configuration changes
- **revert**: ⏪ - Revert a previous commit

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
git commit -m "✨ feat(cli): add --verbose flag for detailed output"
git commit -m "✨ feat(core): implement TypeScript file detection"

# Bug fixes
git commit -m "🐛 fix(core): handle missing tsconfig.json gracefully"
git commit -m "🐛 fix(cli): correct exit code for type errors"

# Chores
git commit -m "🔧 chore(deps): bump typescript to v5.2.0"
git commit -m "🔧 chore(build): update tsdown configuration"

# CI/CD
git commit -m "👷 ci(build): add automated testing workflow"
git commit -m "👷 ci: fix release workflow permissions"

# Documentation
git commit -m "📝 docs: update README with installation instructions"
git commit -m "📝 docs(api): add examples for programmatic usage"
```

## Rules Summary

- **Types**: Must be from allowed list
- **Scope**: Optional, lowercase, from predefined list or custom
- **Subject**: Imperative mood, no period, no sentence case
- **Header**: Max 200 characters
- **Body**: No line length limit
- **Emojis**: Always include the appropriate emoji
