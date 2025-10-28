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
- CLI changes → Update `docs/reference/api.md`
- Breaking changes → Add migration guide
- Configuration changes → Update `README.md` and `docs/reference/api.md`

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

### Managing Review Comments via CLI

**Replying to Review Comments:**

To create a **line-specific reply** (not a standalone review comment):

```bash
# Get the comment ID from the review thread
# Note: Use REST API to get numeric comment IDs
gh api repos/<OWNER>/<REPO>/pulls/<PR_NUMBER>/comments \
  --jq '.[] | {id: .id, body: .body, path: .path, line: .line}'

# Reply to the specific comment (creates line-specific reply)
gh api \
  --method POST \
  repos/<OWNER>/<REPO>/pulls/<PR_NUMBER>/comments \
  -f body="Your reply message here" \
  -f path="path/to/file.ts" \
  -f commit_id="<COMMIT_SHA>" \
  -f subject_type="line" \
  -F in_reply_to=<COMMENT_ID>
```

**Important:** Use `-F in_reply_to=<NUMBER>` (uppercase F) instead of `-f` because the GitHub API requires `in_reply_to` to be a numeric field, not a string. Lowercase `-f` sends the value as a string which causes API errors.

**Resolving Review Threads:**

```bash
# Step 1: Get all review threads with their status
gh api graphql -f query='
query {
  repository(owner: "<OWNER>", name: "<REPO>") {
    pullRequest(number: <PR_NUMBER>) {
      reviewThreads(last: 10) {
        nodes {
          id
          isResolved
          comments(first: 10) {
            nodes {
              body
              path
              line
            }
          }
        }
      }
    }
  }
}'

# Step 2: Find unresolved threads (using jq)
gh api graphql -f query='
query {
  repository(owner: "<OWNER>", name: "<REPO>") {
    pullRequest(number: <PR_NUMBER>) {
      reviewThreads(last: 10) {
        nodes {
          id
          isResolved
          comments(first: 10) {
            nodes {
              body
            }
          }
        }
      }
    }
  }
}' --jq '.data.repository.pullRequest.reviewThreads.nodes[] | select(.isResolved == false) | {id: .id, body: .comments.nodes[0].body}'

# Step 3: Resolve a specific thread
gh api graphql -f query='
mutation {
  resolveReviewThread(input: {threadId: "<THREAD_ID>"}) {
    thread {
      id
      isResolved
    }
  }
}'

# Step 4: Resolve multiple threads at once (bash loop)
for thread_id in "PRRT_id1" "PRRT_id2" "PRRT_id3"; do
  gh api graphql -f query="
  mutation {
    resolveReviewThread(input: {threadId: \"$thread_id\"}) {
      thread { id isResolved }
    }
  }"
done
```

**Complete Example Workflow:**

```bash
# Full workflow: Reply to comment and resolve thread
OWNER="jbabin91"
REPO="tsc-files"
PR_NUMBER=47
COMMENT_ID=2464200977
COMMIT_SHA="ca4cc896094d96a42bf24842a4ee9487fba1feb0"

# 1. Reply to the review comment
gh api --method POST repos/$OWNER/$REPO/pulls/$PR_NUMBER/comments \
  -f body="Thanks for the suggestion! Fixed in commit $COMMIT_SHA." \
  -f path="src/core/file-resolver.ts" \
  -f commit_id="$COMMIT_SHA" \
  -f subject_type="line" \
  -F in_reply_to=$COMMENT_ID

# 2. Get the thread ID for this comment
THREAD_ID=$(gh api graphql -f query="
query {
  repository(owner: \"$OWNER\", name: \"$REPO\") {
    pullRequest(number: $PR_NUMBER) {
      reviewThreads(last: 20) {
        nodes {
          id
          isResolved
          comments(first: 10) {
            nodes {
              id
            }
          }
        }
      }
    }
  }
}" --jq ".data.repository.pullRequest.reviewThreads.nodes[] | select(any(.comments.nodes[]; .id == \"$COMMENT_ID\")) | .id")

# 3. Resolve the thread
gh api graphql -f query="
mutation {
  resolveReviewThread(input: {threadId: \"$THREAD_ID\"}) {
    thread { id isResolved }
  }
}"
```

**Quick Reference for Common Tasks:**

```bash
# List all unresolved review comments
gh api graphql -f query='
query {
  repository(owner: "<OWNER>", name: "<REPO>") {
    pullRequest(number: <PR_NUMBER>) {
      reviewThreads(last: 20) {
        nodes {
          id
          isResolved
          comments(first: 10) {
            nodes {
              body
              path
              line
            }
          }
        }
      }
    }
  }
}' --jq '.data.repository.pullRequest.reviewThreads.nodes[] | select(.isResolved == false)'

# Count unresolved threads
gh api graphql -f query='
query {
  repository(owner: "<OWNER>", name: "<REPO>") {
    pullRequest(number: <PR_NUMBER>) {
      reviewThreads(last: 20) {
        nodes {
          isResolved
        }
      }
    }
  }
}' --jq '[.data.repository.pullRequest.reviewThreads.nodes[] | select(.isResolved == false)] | length'

# Resolve all unresolved threads (use with caution!)
set -e  # Exit on error
gh api graphql -f query='
query {
  repository(owner: "<OWNER>", name: "<REPO>") {
    pullRequest(number: <PR_NUMBER>) {
      reviewThreads(last: 20) {
        nodes {
          id
          isResolved
        }
      }
    }
  }
}' --jq '.data.repository.pullRequest.reviewThreads.nodes[] | select(.isResolved == false) | .id' | while read thread_id; do
  gh api graphql -f query="
  mutation {
    resolveReviewThread(input: {threadId: \"$thread_id\"}) {
      thread { id }
    }
  }" || { echo "Error resolving thread: $thread_id"; exit 1; }
  echo "Resolved thread: $thread_id"
done
```

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
