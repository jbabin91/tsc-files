# 📝 Description

<!-- Describe the specific changes that have been made in this pull request including relevant motivation and context. Include details on the approach taken to address the problem and any notable implementation details or dependencies. -->

## Type of Change

<!-- Mark the relevant option with an "x" -->

- [ ] 🐛 Bug fix (non-breaking change which fixes an issue)
- [ ] ✨ New feature (non-breaking change which adds functionality)
- [ ] 💥 Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] 📚 Documentation update (improvements or corrections to documentation)
- [ ] ⚡ Performance improvement (code change that improves performance)
- [ ] ♻️ Refactoring (no functional changes, code cleanup)
- [ ] 🔧 Chore (dependency updates, build changes, maintenance tasks)

# 🔗 Related Issues

<!-- Link to related issues using #issue-number. GitHub will automatically convert these to links. -->

Closes #
Relates to #

# 🧪 Testing

<!-- Describe the testing that has been performed -->

## Test Coverage

- [ ] Unit tests pass locally (`pnpm test`)
- [ ] Integration tests pass locally
- [ ] New tests added for bug fixes/features
- [ ] Manual testing completed
- [ ] Cross-platform testing (if applicable)

## CLI Testing (if applicable)

- [ ] Help output is correct (`tsc-files --help`)
- [ ] Version output is correct (`tsc-files --version`)
- [ ] Exit codes are appropriate (0 for success, 1+ for errors)
- [ ] Works with different package managers (npm, yarn, pnpm, bun)
- [ ] Glob patterns work correctly
- [ ] Error messages are clear and helpful

## Test Commands Run

<!-- List the specific test commands you ran -->

```bash
pnpm test
pnpm typecheck
pnpm lint
pnpm build
```

# 💥 Breaking Changes

<!-- List any breaking changes introduced by this PR. If none, write "None." -->

None.

# 📦 Changeset

<!-- Changesets are required for changes that affect the public API -->

- [ ] Changeset added (if this PR includes changes that affect the public API)
- [ ] Changeset category is correct (patch/minor/major)
- [ ] Changeset description is clear and user-facing

<!-- To add a changeset, run: pnpm changeset -->

# ✅ Quality Checklist

<!-- Ensure all quality gates pass before submitting -->

## Code Quality

- [ ] `pnpm lint` passes with zero warnings/errors
- [ ] `pnpm typecheck` passes with zero TypeScript errors
- [ ] `pnpm test` passes with all tests
- [ ] `pnpm build` completes successfully
- [ ] `pnpm lint:md` passes for markdown files

## Code Standards

- [ ] Code follows the project's style guidelines
- [ ] Self-review of code completed
- [ ] No `console.log` statements left in production code
- [ ] No `any` types used in production code
- [ ] Error handling is appropriate and secure
- [ ] Comments explain WHY, not WHAT (when necessary)

## Security

- [ ] No secrets or sensitive data in code changes
- [ ] Input validation added for user-facing features
- [ ] Temporary files are properly cleaned up
- [ ] Command execution uses secure patterns (execFile with arrays)
- [ ] Path traversal vulnerabilities considered and prevented

## Documentation

- [ ] Documentation updated if needed
- [ ] JSDoc comments added for new public APIs
- [ ] README updated if CLI interface changed
- [ ] CHANGELOG.md will be updated by changesets

# 📷 Screenshots / Visual Changes

<!-- Include screenshots or GIFs if this PR includes visual changes, CLI output changes, or new features that would benefit from visual documentation. Delete this section if not applicable. -->

# 🔍 Additional Notes

<!-- Include any additional notes, considerations, or context that reviewers should be aware of. This could include:
- Performance implications
- Future work planned
- Alternative approaches considered
- Known limitations
- Migration guidance (for breaking changes)
-->

# 📋 Reviewer Checklist

<!-- For maintainers reviewing this PR -->

- [ ] PR title follows conventional commit format
- [ ] Changes are properly tested
- [ ] Documentation is adequate
- [ ] Breaking changes are clearly marked and justified
- [ ] Security considerations have been addressed
- [ ] Performance impact is acceptable

---

<!--
Thanks for contributing to tsc-files! 🎉

By submitting this pull request, you agree to follow our Code of Conduct and that your contributions will be licensed under the MIT License.
-->
