# Release Process

tsc-files uses [oakum](https://github.com/oakoss/oakum) (`@oakoss/oakum`, binary `oakum`, pinned at 0.1.4 in CI) for version bumps, changelog entries, git tags, and GitHub releases. Configuration lives in `.changeset/_config.toml`. Pending changes are recorded as bump files in `.changeset/*.md`, which use the changesets frontmatter format. oakum never publishes to npm; a separate publish job does that.

## Versioning

We follow [Semantic Versioning](https://semver.org/):

- **major**: Breaking changes that require user action
- **minor**: New features that are backward compatible
- **patch**: Bug fixes and improvements that are backward compatible

## Bump Files

### Create a bump file

For any user-facing change, add a bump file on your branch before opening the PR:

```bash
pnpm exec oakum add --packages '@jbabin91/tsc-files:patch' --message 'What changed'
```

Use `patch`, `minor`, or `major` for the level. The message becomes the changelog entry, so write it for users of the package.

To derive a bump file from the conventional commits on the branch instead of writing one by hand:

```bash
pnpm exec oakum generate
```

Review the generated file and edit the message if needed.

### Changes that do not need a release

Tests, internal refactors, documentation, and CI changes do not need a version bump. To record that a change is intentionally releaseless:

```bash
pnpm exec oakum add --empty
```

### Check the plan

Show the pending release plan (next version and changelog entries):

```bash
pnpm exec oakum status --template summary
```

Verify that bump files match the branch and flag drift:

```bash
pnpm exec oakum check --strict
```

The Release workflow runs `oakum check` on pull requests other than the version PR. It fails on tag drift. A package that changed with no covering bump file is reported but does not fail the check; that needs `--strict`, so run it locally before opening a PR.

## What CI Does

Everything after merge is automated:

1. The bump file merges to `main` with the PR.
2. The Release workflow runs `oakum ci version-pr`, which opens or updates a "Version Packages" PR on the branch `oakum/version-packages`. That PR bumps `package.json`, writes the changelog entry from oakum's built-in template, and removes the consumed bump files.
3. Review the version PR and merge it by hand once CI passes; nothing merges it automatically.
4. On that push to `main`, `oakum release` tags `v<version>` and creates the GitHub release.
5. The tag push runs the publish job, which runs `pnpm publish` with npm provenance. `prepublishOnly` runs the tests and the build first.

## Manual Recovery

There is no manual trigger for the Release workflow. The version and release jobs run on every push to `main`, so merging another bump file (or an empty one) re-runs them.

If the publish job fails after the tag exists, re-run it by re-pushing the tag:

```bash
git push origin :refs/tags/v<version>
git push origin v<version>
```

Alternatively, publish from a clean checkout of the tag with an npm token:

```bash
git checkout v<version>
pnpm install --frozen-lockfile
pnpm publish --access public --no-git-checks
```

A published version cannot be replaced. To retract a bad release, deprecate it and ship a patch:

```bash
npm deprecate @jbabin91/tsc-files@<version> "Use <next-version> instead"
```

## Checklist

Before merging a PR that changes user-facing behavior:

- A bump file exists with the right level and a user-facing message
- `pnpm exec oakum check --strict` passes
- `pnpm lint`, `pnpm typecheck`, `pnpm test:coverage`, `pnpm build`, and `pnpm lint:md` pass

After the version PR merges:

- The `v<version>` tag and GitHub release exist
- `npm view @jbabin91/tsc-files version` reports the new version
