# Pull Request Workflow

This guide explains how to create and submit pull requests for tsc-files.

## Before Creating a PR

### Quality Checklist

Run all quality checks and ensure they pass:

```bash
# Complete quality check
pnpm lint && pnpm typecheck && pnpm test && pnpm build
```

**Individual Checks:**

- [ ] **Tests pass**: `pnpm test` (100% pass rate required)
- [ ] **Linting clean**: `pnpm lint` (zero warnings policy)
- [ ] **Types valid**: `pnpm typecheck` (strict TypeScript)
- [ ] **Build succeeds**: `pnpm build` (clean build, no errors)
- [ ] **Markdown linted**: `pnpm lint:md` (if docs changed)

### Changeset Required

For user-facing changes, create a changeset:

```bash
pnpm changeset
```

**When to create a changeset:**

- ✅ New features
- ✅ Bug fixes
- ✅ Breaking changes
- ✅ Performance improvements
- ✅ User-visible changes
- ❌ Tests only
- ❌ Internal refactoring (no behavior change)
- ❌ Documentation updates
- ❌ CI/CD changes

### Documentation Updates

If your PR includes:

- New features → Update `README.md` and relevant docs
- CLI changes → Update `docs/api.md`
- Breaking changes → Add migration guide
- Configuration changes → Update `README.md` and `docs/api.md`

## Creating the PR

### 1. Push Your Branch

```bash
git push origin feat/your-feature-name
```

### 2. Create Pull Request

**Via GitHub CLI (Recommended):**

```bash
gh pr create --fill
```

**Via GitHub Web Interface:**

1. Visit repository on GitHub
2. Click "Compare & pull request"
3. Fill in PR template

### 3. PR Title Format

Use conventional commit format:

```text
<type>(<scope>): <description>

Examples:
feat(cli): add --show-config flag
fix(core): handle circular tsconfig extends
docs: update troubleshooting guide
perf(checker): optimize file resolution
refactor(config): simplify parser logic
```

**Types:**

- `feat` - New feature
- `fix` - Bug fix
- `docs` - Documentation only
- `style` - Code style/formatting
- `refactor` - Code refactoring
- `perf` - Performance improvement
- `test` - Adding/updating tests
- `chore` - Build/tooling changes
- `ci` - CI/CD changes

**Scopes:**

- `cli` - Command line interface
- `core` - Core functionality
- `config` - Configuration handling
- `test` - Test infrastructure
- `docs` - Documentation
- `deps` - Dependencies

### 4. PR Description Template

```markdown
## What Changed

Brief description of the changes (1-2 sentences).

## Why This Change

Explain the motivation:

- Fixes issue #123
- Resolves user pain point with X
- Improves performance of Y

## Breaking Changes

**⚠️ BREAKING CHANGE** (if applicable)

- What breaks
- How to migrate

## Testing

How to test these changes:

1. Clone PR branch
2. Run `pnpm install && pnpm build`
3. Test with: `tsc-files "src/**/*.ts"`
4. Verify behavior X

## Checklist

- [ ] Tests added/updated
- [ ] Documentation updated
- [ ] Changeset created
- [ ] All quality checks pass
```

## Code Review Process

### What Reviewers Look For

1. **Functionality**
   - Does it work as intended?
   - Are edge cases handled?
   - Is error handling appropriate?

2. **Code Quality**
   - Follows [coding standards](./coding-standards.md)?
   - Proper TypeScript types (no `any`)?
   - Clear variable/function names?
   - Appropriate comments?

3. **Testing**
   - Tests cover new functionality?
   - Coverage meets requirements (>80%)?
   - Integration tests if needed?

4. **Documentation**
   - Changes documented in README/docs?
   - API docs updated?
   - Examples provided?

5. **Security**
   - No security vulnerabilities?
   - Input validation present?
   - No hardcoded secrets?

### CI/CD Checks

Your PR must pass:

- ✅ **CI Workflow** - Lint, typecheck, test, build
- ✅ **Security Workflow** - Dependency audit, secrets scan
- ✅ **Integration Tests** - Cross-platform CLI testing
- ✅ **CodeQL** - Security code analysis

### Review Timeline

- **First review**: Usually within 24-48 hours
- **Follow-up**: Maintainers will request changes if needed
- **Merge**: After approval + CI success

## Responding to Review Comments

### Addressing Feedback

1. **Make requested changes**
2. **Push new commits** (don't force push unless asked)
3. **Reply to comments** with explanations
4. **Mark conversations as resolved** once addressed

### Example Responses

**For code changes:**

> Fixed in [commit SHA]. Changed X to Y as suggested.

**For disagreements:**

> I kept this approach because [reason]. Alternative would cause [issue].
> Happy to discuss further if you have concerns.

**For clarifications:**

> Good catch! I added documentation explaining why this is needed.

## After PR is Merged

### Version Bump

Your changes will be included in the next release via the changesets workflow:

1. PR merged to `main`
2. Changesets bot creates "Version Packages" PR
3. Maintainer merges version PR
4. Automated release to npm

### Cleanup

```bash
# Delete local branch
git branch -d feat/your-feature-name

# Delete remote branch
git push origin --delete feat/your-feature-name

# Or use GitHub CLI
gh pr close <number> --delete-branch
```

## Common PR Scenarios

### Draft PRs

For work-in-progress:

```bash
gh pr create --draft
```

Or check "Draft" when creating via web interface.

### Fixing CI Failures

```bash
# Pull latest main
git checkout main
git pull origin main

# Rebase your branch
git checkout feat/your-feature
git rebase main

# Fix conflicts if any, then push
git push --force-with-lease
```

### Updating PR After Review

```bash
# Make changes
git add .
git commit -m "fix: address review feedback"
git push origin feat/your-feature
```

### Squashing Commits (if requested)

```bash
# Interactive rebase
git rebase -i HEAD~3  # Last 3 commits

# Mark commits to squash (change 'pick' to 'squash')
# Save and edit commit message

# Force push
git push --force-with-lease
```

## PR Best Practices

### Keep PRs Small

- ✅ **Ideal**: < 400 lines changed
- ⚠️ **Acceptable**: 400-800 lines
- ❌ **Too large**: > 800 lines (split into multiple PRs)

### One Concern Per PR

```bash
# ✅ GOOD: Focused PR
feat(cli): add --verbose flag

# ❌ BAD: Multiple unrelated changes
feat(cli): add --verbose flag, refactor parser, update deps
```

### Self-Review First

Before requesting review:

1. Read your own diff on GitHub
2. Check for debug code, console.logs, commented code
3. Verify tests are meaningful
4. Ensure documentation is clear

### Clear Commit History

```bash
# ✅ GOOD: Clear progression
fix(core): add input validation
test(core): add validation tests
docs: update API documentation

# ❌ BAD: Messy history
wip
fix typo
oops
actually fix it
formatting
```

## Getting Help

**Questions about PR process?**

- Check [Contributing Guide](../CONTRIBUTING.md)
- Ask in PR comments
- Open a [Discussion](https://github.com/jbabin91/tsc-files/discussions)

**Technical questions?**

- Review [Coding Standards](./coding-standards.md)
- Check [Architecture](../architecture/README.md)
- Read [Testing Guide](../testing/README.md)

## Resources

- [Conventional Commits](https://www.conventionalcommits.org/)
- [GitHub PR Best Practices](https://github.blog/2015-01-21-how-to-write-the-perfect-pull-request/)
- [Changesets Documentation](https://github.com/changesets/changesets)
