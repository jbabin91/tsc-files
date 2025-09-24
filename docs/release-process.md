# Release Process

This document outlines the comprehensive release process for tsc-files, from development to production deployment.

## Release Strategy

### **Semantic Versioning**

We follow [Semantic Versioning (SemVer)](https://semver.org/) strictly:

- **Major (X.0.0)**: Breaking changes that require user action
- **Minor (0.X.0)**: New features that are backward compatible
- **Patch (0.0.X)**: Bug fixes and improvements that are backward compatible

### **Release Types**

#### **Regular Releases**

- **Frequency**: Bi-weekly or as needed
- **Content**: New features, improvements, bug fixes
- **Process**: Full automated release pipeline

#### **Hotfix Releases**

- **Frequency**: As needed for critical issues
- **Content**: Critical bug fixes, security patches
- **Process**: Expedited release with minimal validation

#### **Pre-releases**

- **Frequency**: For major changes requiring user testing
- **Content**: Beta features, breaking changes preview
- **Process**: Alpha/Beta/RC release cycle

## Release Tools and Automation

### **Changesets Workflow**

We use [Changesets](https://github.com/changesets/changesets) for version management and changelog generation.

#### **Adding Changesets**

```bash
# Add a changeset for your changes
pnpm changeset

# Check current changeset status
pnpm changeset status

# Preview what the next release will look like
pnpm changeset:version --dry-run
```

#### **Changeset Types**

```bash
# Patch release (bug fixes)
pnpm changeset add --type patch

# Minor release (new features)
pnpm changeset add --type minor

# Major release (breaking changes)
pnpm changeset add --type major
```

### **Automated Release Pipeline**

#### **GitHub Actions Workflow**

```yaml
# .github/workflows/release.yaml
name: Release

on:
  push:
    branches: [main]

jobs:
  release:
    runs-on: ubuntu-latest
    if: github.repository_owner == 'jbabin91'
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
          token: ${{ secrets.GITHUB_TOKEN }}

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Build package
        run: pnpm build

      - name: Run tests
        run: pnpm test

      - name: Create Release Pull Request or Publish
        uses: changesets/action@v1
        with:
          publish: pnpm run changeset:release
          title: 'chore: version packages'
          commit: 'chore: version packages'
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          NPM_TOKEN: ${{ secrets.NPM_TOKEN }}
```

## Release Process Steps

### **1. Pre-Release Preparation**

#### **Code Freeze**

```bash
# Create release branch for major releases
git checkout -b release/v2.0.0

# For minor/patch releases, work directly on main
git checkout main
git pull origin main
```

#### **Quality Assurance**

```bash
# Run comprehensive test suite
pnpm test:coverage

# Run integration tests
pnpm test:integration

# Run security audit
pnpm audit

# Check build integrity
pnpm build
pnpm check-exports

# Validate package contents
npm pack --dry-run
```

#### **Documentation Review**

- [ ] Update README.md if needed
- [ ] Review and update API documentation
- [ ] Verify all examples work with current version
- [ ] Check troubleshooting guide is current
- [ ] Update performance benchmarks if applicable

### **2. Version Management**

#### **Changeset Processing**

```bash
# Review pending changesets
pnpm changeset status

# Generate version bumps and changelog
pnpm changeset:version

# Review generated changes
git diff
```

#### **Manual Verification**

- [ ] Verify version bumps are correct
- [ ] Review generated changelog entries
- [ ] Ensure all breaking changes are documented
- [ ] Validate dependency updates

### **3. Release Validation**

#### **Pre-Release Testing**

```bash
# Test the built package locally
npm pack
npm install -g tsc-files-*.tgz

# Test CLI functionality
tsc-files --version
tsc-files --help
tsc-files "tests/fixtures/valid-project/**/*.ts"

# Clean up
npm uninstall -g @jbabin91/tsc-files
```

#### **Integration Testing**

```bash
# Test with different Node.js versions
nvm use 20 && pnpm test
nvm use 22 && pnpm test

# Test on different platforms (CI handles this)
# - Ubuntu (CI)
# - macOS (CI)
# - Windows (CI)
```

### **4. Release Execution**

#### **Automated Release**

When a PR with changeset version bumps is merged to main:

1. **CI Pipeline Triggers**:
   - Static analysis and linting
   - Full test suite execution
   - Build process validation
   - Package validation

2. **Release Automation** (GitHub Actions):
   - **Signed Commits**: Uses GitHub App for verified signatures
   - **npm Provenance**: Publishes with cryptographic attestation (SLSA Build Level 2)
   - **Publishes to npm registry**: Automated with proper authentication
   - **Creates GitHub release**: With auto-generated release notes
   - **Security Validation**: Dependency audits and vulnerability scanning

#### **Manual Release** (Emergency/Hotfix)

```bash
# Emergency release process
git checkout main
git pull origin main

# Create hotfix changeset
pnpm changeset add --type patch

# Version bump
pnpm changeset:version

# Build and test
pnpm build
pnpm test

# Publish manually
pnpm changeset:release
```

### **5. Post-Release Activities**

#### **Release Verification**

```bash
# Verify npm package
npm view @jbabin91/tsc-files

# Test installation
npm install -g @jbabin91/tsc-files
tsc-files --version

# Verify GitHub release
# Check https://github.com/jbabin91/tsc-files/releases
```

#### **Communication**

- [ ] Update project README badges
- [ ] Announce release on relevant channels
- [ ] Update documentation sites
- [ ] Notify major users of breaking changes

#### **Monitoring**

- [ ] Monitor npm download statistics
- [ ] Watch for issue reports
- [ ] Monitor performance metrics
- [ ] Track error reports

## Release Checklist Templates

### **Major Release Checklist**

#### **Pre-Release (T-1 week)**

- [ ] Code freeze announcement
- [ ] Feature complete milestone
- [ ] Breaking changes documented
- [ ] Migration guide prepared
- [ ] Beta release published
- [ ] Community feedback incorporated

#### **Release Day**

- [ ] All tests passing
- [ ] Security audit clean
- [ ] Performance benchmarks meet requirements
- [ ] Documentation updated
- [ ] Changelog reviewed
- [ ] Release notes prepared
- [ ] Backup plan ready

#### **Post-Release (T+1 day)**

- [ ] Release announcement published
- [ ] Documentation sites updated
- [ ] Issue tracking enabled
- [ ] Community feedback monitoring
- [ ] Download metrics tracking

### **Patch Release Checklist**

#### **Pre-Release**

- [ ] Bug fixes verified
- [ ] Regression tests added
- [ ] No breaking changes
- [ ] Minimal scope validation

#### **Release**

- [ ] Automated pipeline triggered
- [ ] Quick smoke tests
- [ ] Release notes generated

#### **Post-Release**

- [ ] Verify fix deployment
- [ ] Monitor for regressions
- [ ] Update issue status

## Emergency Response

### **Critical Security Vulnerability**

#### **Immediate Response (T+0 hours)**

```bash
# Create security patch branch
git checkout -b security/CVE-YYYY-XXXXX

# Implement minimal fix
# Write regression test
# Verify fix

# Emergency release
pnpm changeset add --type patch
pnpm changeset:version
pnpm build && pnpm test
pnpm changeset:release
```

#### **Communication (T+2 hours)**

- [ ] Security advisory published
- [ ] Affected versions identified
- [ ] Upgrade path documented
- [ ] Community notification sent

#### **Follow-up (T+24 hours)**

- [ ] Detailed post-mortem
- [ ] Process improvements identified
- [ ] Additional security measures implemented

### **Production Outage**

#### **Rollback Procedure**

```bash
# Identify last known good version
npm view @jbabin91/tsc-files versions --json

# Deprecate problematic version
npm deprecate @jbabin91/tsc-files@X.Y.Z "Critical issue, please upgrade to X.Y.Z+1"

# Emergency hotfix release
# (follow emergency release process)
```

## Release Metrics and KPIs

### **Quality Metrics**

- Test coverage percentage
- Security audit results
- Performance benchmark results
- Documentation completeness

### **Release Metrics**

- Time from code complete to release
- Number of issues found post-release
- Rollback frequency
- User adoption rate

### **Success Criteria**

- [ ] Zero critical bugs in first 48 hours
- [ ] Less than 5% user-reported issues
- [ ] Performance within 5% of benchmarks
- [ ] Documentation accuracy >95%

## Rollback Procedures

### **NPM Package Rollback**

```bash
# Deprecate problematic version
npm deprecate @jbabin91/tsc-files@X.Y.Z "Critical issue found, use version X.Y.Z-1"

# Publish hotfix
pnpm changeset:release

# Or republish previous version with patch increment
git checkout vX.Y.Z-1
pnpm changeset add --type patch
pnpm changeset:version
pnpm changeset:release
```

### **GitHub Release Rollback**

```bash
# Mark release as pre-release
gh release edit vX.Y.Z --prerelease

# Or delete release entirely
gh release delete vX.Y.Z --yes
```

## Release Documentation

### **Release Notes Template**

```markdown
# Release vX.Y.Z

## 🚀 Features

- New feature descriptions

## 🐛 Bug Fixes

- Bug fix descriptions

## 💥 Breaking Changes

- Breaking change descriptions
- Migration instructions

## 📈 Performance

- Performance improvements

## 🔒 Security

- Security enhancements

## 📚 Documentation

- Documentation updates

## 🏠 Internal

- Internal improvements

## Migration Guide

[Detailed migration instructions for breaking changes]

## Contributors

Thanks to all contributors who made this release possible!
```

### **Changelog Maintenance**

The changelog is automatically generated from changesets, but manual curation ensures:

- Clear categorization
- User-friendly language
- Proper attribution
- Migration guidance

## Continuous Improvement

### **Release Process Review**

**Quarterly Review Topics:**

- Release frequency optimization
- Automation improvement opportunities
- Quality gate effectiveness
- Community feedback integration
- Tool and process updates

### **Metrics Analysis**

- Release cycle time trends
- Quality metrics over time
- User adoption patterns
- Issue resolution times

This comprehensive release process ensures reliable, high-quality releases while maintaining development velocity and community trust.
