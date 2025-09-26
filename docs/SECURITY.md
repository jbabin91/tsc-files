# Security Policy

## Package Security Features

- **npm Provenance**: Published packages include cryptographic attestation proving they were built from this GitHub repository
- **Automated CI/CD**: All releases go through automated testing and validation
- **Dependency Auditing**: Regular security audits of dependencies
- **Multi-Platform Testing**: Tested on Ubuntu, macOS, and Windows

## Verifying Package Authenticity

You can verify published packages come from this repository:

```bash
# View provenance information (npm 9.5.0+)
npm view @jbabin91/tsc-files --json | jq .dist.attestations
```

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 0.1.x   | :white_check_mark: |

## Reporting a Vulnerability

We take security seriously. If you discover a security vulnerability, please follow these steps:

### For Security Issues

**DO NOT** create a public GitHub issue for security vulnerabilities.

Instead, please:

1. **GitHub Security Advisory**: Use GitHub's private security advisory feature (preferred)
2. **GitHub Issue**: Create a private security issue if security advisory is not available
3. **Include**:
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact
   - Suggested fix (if any)

### Response Timeline

- **Initial Response**: Within 48 hours
- **Status Update**: Within 7 days
- **Resolution**: Target 30 days for non-critical, 7 days for critical

### What to Expect

1. **Acknowledgment**: We'll confirm receipt of your report
2. **Investigation**: We'll investigate and validate the issue
3. **Resolution**: We'll develop and test a fix
4. **Disclosure**: We'll coordinate responsible disclosure with you
5. **Credit**: You'll be credited in the security advisory (if desired)

## Questions?

For security-related questions that don't involve vulnerabilities:

- 🐛 GitHub Issues: [Create an issue](https://github.com/jbabin91/tsc-files/issues)
- 📚 Documentation: Check our [README](README.md) and [docs/](docs/)
