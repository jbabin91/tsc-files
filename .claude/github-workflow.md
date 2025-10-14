# GitHub Workflow: MCP vs gh CLI Decision Tree

This document provides guidance for GitHub operations using MCP (Model Context Protocol) tools versus gh CLI commands.

## Golden Rule

**ALWAYS try MCP tools first, fallback to gh CLI only when necessary.**

### Why MCP First?

- More structured responses with type safety
- Better error handling and validation
- Consistent API across operations
- Integrated with Claude Code workflows

### When to Use gh CLI as Backup

Only use `gh` commands when MCP cannot handle the operation:

1. **MCP returns 404 (Not Found)**: Feature doesn't exist in MCP
2. **Threaded review comment replies**: MCP cannot create threaded replies to existing review comments
3. **After confirming it's not a permission issue (403)**: Check token permissions first
4. **Complex bulk operations**: When MCP doesn't support the specific workflow

### gh CLI as Backup Strategy

**Always verify MCP limitation first:**

```bash
# Step 1: Try MCP operation
# Step 2: If 404 error → Use gh CLI equivalent
# Step 3: If 403 error → Check permissions, then retry MCP or use gh CLI
# Step 4: Document the limitation for future reference
```

**Common gh CLI fallbacks:**

```bash
# Threaded review comment replies (MCP limitation)
gh api --method POST repos/OWNER/REPO/pulls/PR_NUMBER/comments/COMMENT_ID/replies -f body="Reply text"

# Bulk operations (MCP may not support)
gh pr list --state open --json number,title,author --jq '.[] | select(.author.login == "username")'

# Complex queries (MCP has limited filtering)
gh issue list --label "bug" --assignee "username" --state open
```

## Permission Requirements

### Required GitHub PAT Permissions

For write operations through MCP:

- **Pull requests**: Read and write ✓
- **Issues**: Read and write ✓
- **Contents**: Read and write ✓
- **Metadata**: Read-only ✓ (automatic)

### Testing Permissions

```bash
# Test MCP write permissions
mcp__github__add_issue_comment(
  owner: "owner",
  repo: "repo",
  issue_number: 123,
  body: "Test comment"
)

# If 403 error:
# 1. Check token permissions in GitHub settings
# 2. Verify token is for "All repositories" (not just public)
# 3. Confirm write permissions are enabled
```

## Decision Tree

### 1. Pull Request Reviews

#### Creating Your Own Review with Comments

**Use**: MCP pending review workflow ✓

```typescript
// Step 1: Create pending review
mcp__github__create_pending_pull_request_review({
  owner: 'owner',
  repo: 'repo',
  pullNumber: 40,
  commitID: 'abc123', // optional
});

// Step 2: Add review comments
mcp__github__add_comment_to_pending_review({
  owner: 'owner',
  repo: 'repo',
  pullNumber: 40,
  path: 'src/file.ts',
  body: 'Suggestion here',
  line: 42,
  side: 'RIGHT',
  subjectType: 'LINE',
});

// Step 3: Submit review
mcp__github__submit_pending_pull_request_review({
  owner: 'owner',
  repo: 'repo',
  pullNumber: 40,
  event: 'COMMENT', // or "APPROVE" or "REQUEST_CHANGES"
  body: 'Overall review summary',
});
```

#### Replying to Existing Review Comments (Threaded)

**Use**: gh CLI ✗ (MCP limitation)

**Why**: MCP `add_comment_to_pending_review` creates NEW comments (not threaded replies)

```bash
# Get the review comment ID from the comment you want to reply to
# Then use gh api to create a threaded reply
gh api --method POST \
  repos/OWNER/REPO/pulls/PR_NUMBER/comments/COMMENT_ID/replies \
  -f body="✅ **Fixed in commit abc123**

Removed the type assertion as suggested..."
```

**Evidence of Limitation**:

```json
// gh CLI threaded reply:
{
  "in_reply_to_id": 2423123043  // ✅ THREADED
}

// MCP pending review comment:
{
  "in_reply_to_id": null  // ❌ NOT THREADED
}
```

#### Requesting Reviews

**Use**: MCP ✓

```typescript
// Request human reviewer
mcp__github__update_pull_request({
  owner: 'owner',
  repo: 'repo',
  pullNumber: 40,
  reviewers: ['username1', 'username2'],
});

// Request Copilot review
mcp__github__request_copilot_review({
  owner: 'owner',
  repo: 'repo',
  pullNumber: 40,
});
```

### 2. Pull Request Comments (General)

**Use**: MCP ✓

```typescript
// Add comment to PR conversation (not a review)
mcp__github__add_issue_comment({
  owner: 'owner',
  repo: 'repo',
  issue_number: 40, // PRs use issue API
  body: 'General comment here',
});
```

### 3. Pull Request Creation

**Use**: MCP ✓

```typescript
mcp__github__create_pull_request({
  owner: 'owner',
  repo: 'repo',
  title: 'feat: add new feature',
  body: '## Summary\n...',
  head: 'feature-branch',
  base: 'main',
  draft: false,
});
```

### 4. Pull Request Updates

**Use**: MCP ✓

```typescript
mcp__github__update_pull_request({
  owner: 'owner',
  repo: 'repo',
  pullNumber: 40,
  title: 'Updated title',
  body: 'Updated description',
  state: 'open', // or "closed"
  base: 'main', // change base branch
  reviewers: ['username'], // request reviewers
});
```

### 5. Merging Pull Requests

**Use**: MCP ✓

```typescript
mcp__github__merge_pull_request({
  owner: 'owner',
  repo: 'repo',
  pullNumber: 40,
  merge_method: 'squash', // or "merge" or "rebase"
  commit_title: 'feat: add feature',
  commit_message: 'Detailed message',
});
```

## Error Handling Decision Tree

```text
GitHub operation fails?
│
├─ HTTP 403 (Forbidden)?
│  ├─ Check: Are you using MCP or gh CLI?
│  │  ├─ MCP: Check token permissions in GitHub settings
│  │  │  ├─ Missing write permission? → Add and retry
│  │  │  └─ Has write permission? → Try gh CLI
│  │  └─ gh CLI: Check gh auth status
│  │     └─ gh auth refresh -s repo,write:discussion
│  │
├─ HTTP 404 (Not Found)?
│  ├─ Using MCP? → MCP limitation, use gh CLI
│  └─ Using gh CLI? → Resource actually doesn't exist
│
├─ HTTP 422 (Unprocessable)?
│  └─ Validation error, check request parameters
│
└─ Other error?
   └─ Check error message for specific guidance
```

## Practical Examples

### Example 1: Addressing PR Feedback

**Scenario**: Copilot left review comments on your PR. You fixed the issues and want to reply.

```bash
# ✅ CORRECT: Reply to specific review comment (threaded)
gh api --method POST \
  repos/owner/repo/pulls/40/comments/2423123043/replies \
  -f body="✅ **Fixed in commit 5448f35**

Removed the type assertion as suggested. The return type is now properly inferred from the function signature."
```

```typescript
// ❌ INCORRECT: Don't use MCP for threaded replies
// This creates a NEW comment, not a threaded reply
mcp__github__add_comment_to_pending_review({...})
```

### Example 2: Creating Your Own Review

**Scenario**: You want to review someone else's PR with multiple comments.

```typescript
// ✅ CORRECT: Use MCP pending review workflow
// Step 1: Create pending review
await mcp__github__create_pending_pull_request_review({
  owner: 'owner',
  repo: 'repo',
  pullNumber: 40,
});

// Step 2: Add comments to different files
await mcp__github__add_comment_to_pending_review({
  owner: 'owner',
  repo: 'repo',
  pullNumber: 40,
  path: 'src/file1.ts',
  body: 'Consider using const instead',
  line: 10,
  side: 'RIGHT',
  subjectType: 'LINE',
});

await mcp__github__add_comment_to_pending_review({
  owner: 'owner',
  repo: 'repo',
  pullNumber: 40,
  path: 'src/file2.ts',
  body: 'This could be simplified',
  line: 42,
  side: 'RIGHT',
  subjectType: 'LINE',
});

// Step 3: Submit with overall feedback
await mcp__github__submit_pending_pull_request_review({
  owner: 'owner',
  repo: 'repo',
  pullNumber: 40,
  event: 'COMMENT',
  body: 'Great work! Just a few suggestions above.',
});
```

### Example 3: Requesting Copilot Review

**Scenario**: You want Copilot to review your PR.

```typescript
// ✅ CORRECT: Use MCP
await mcp__github__request_copilot_review({
  owner: 'owner',
  repo: 'repo',
  pullNumber: 40,
});
```

```bash
# ❌ AVOID: gh CLI is more verbose
gh api --method POST \
  repos/owner/repo/pulls/40/requested_reviewers \
  -f reviewers='["github-copilot[bot]"]'
```

## MCP Tool Reference

### Pull Request Operations

| Operation          | MCP Tool                                | gh CLI Fallback                    |
| ------------------ | --------------------------------------- | ---------------------------------- |
| Create PR          | `create_pull_request`                   | `gh pr create`                     |
| Update PR          | `update_pull_request`                   | `gh pr edit`                       |
| Merge PR           | `merge_pull_request`                    | `gh pr merge`                      |
| List PRs           | `list_pull_requests`                    | `gh pr list`                       |
| View PR            | `pull_request_read`                     | `gh pr view`                       |
| Create review      | `create_pending_pull_request_review`    | N/A                                |
| Add review comment | `add_comment_to_pending_review`         | N/A                                |
| Submit review      | `submit_pending_pull_request_review`    | N/A                                |
| Reply to comment   | ❌ Not available                        | `gh api .../comments/{id}/replies` |
| Request reviewer   | `update_pull_request` (reviewers param) | `gh pr edit --add-reviewer`        |
| Request Copilot    | `request_copilot_review`                | `gh api .../requested_reviewers`   |

### Issue Operations

| Operation    | MCP Tool            | gh CLI Fallback    |
| ------------ | ------------------- | ------------------ |
| Create issue | `create_issue`      | `gh issue create`  |
| Update issue | `update_issue`      | `gh issue edit`    |
| Add comment  | `add_issue_comment` | `gh issue comment` |
| List issues  | `list_issues`       | `gh issue list`    |
| View issue   | `get_issue`         | `gh issue view`    |

### Workflow Operations

| Operation      | MCP Tool              | gh CLI Fallback     |
| -------------- | --------------------- | ------------------- |
| List runs      | `list_workflow_runs`  | `gh run list`       |
| View run       | `get_workflow_run`    | `gh run view`       |
| Rerun workflow | `rerun_workflow_run`  | `gh run rerun`      |
| Cancel run     | `cancel_workflow_run` | `gh run cancel`     |
| Get logs       | `get_job_logs`        | `gh run view --log` |

## Common Pitfalls

### ❌ Don't: Use gh CLI immediately

```bash
# BAD: Skipping MCP entirely
gh pr comment 40 --body "Comment"
```

### ✅ Do: Try MCP first, fallback if needed

```typescript
// GOOD: Try MCP first
try {
  await mcp__github__add_issue_comment({
    owner: 'owner',
    repo: 'repo',
    issue_number: 40,
    body: 'Comment',
  });
} catch (error) {
  if (error.status === 403) {
    // Check permissions first
    console.error('Permission denied - check GitHub PAT permissions');
  } else if (error.status === 404) {
    // Fallback to gh CLI
    await Bash({ command: `gh pr comment 40 --body "Comment"` });
  }
}
```

### ❌ Don't: Assume 403 means "use gh CLI"

```typescript
// BAD: Immediately falling back without checking permissions
catch (error) {
  if (error.status === 403) {
    await Bash({ command: `gh pr comment...` })
  }
}
```

### ✅ Do: Check permissions first

```typescript
// GOOD: Investigate permission issue
catch (error) {
  if (error.status === 403) {
    console.error(`
Permission denied. Check GitHub PAT permissions:
1. Go to GitHub Settings → Developer settings → Personal access tokens
2. Verify token scope includes:
   - Pull requests: Read and write
   - Issues: Read and write
   - Contents: Read and write
3. Confirm token is for "All repositories" (not just public)
    `)
    throw error // Don't silently fallback
  }
}
```

## Validation Checklist

Before using this workflow, ensure:

- [ ] GitHub PAT has correct permissions (Pull requests, Issues, Contents - all R/W)
- [ ] Token scope is "All repositories" (not just public)
- [ ] You've tested MCP write operations with a simple comment
- [ ] You understand when to use MCP vs gh CLI
- [ ] You know how to check for permission errors vs feature limitations

## References

- [GitHub MCP Documentation](https://github.com/modelcontextprotocol/servers/tree/main/src/github)
- [GitHub REST API](https://docs.github.com/en/rest)
- [gh CLI Manual](https://cli.github.com/manual/)
