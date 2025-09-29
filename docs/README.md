# tsc-files Documentation

Welcome to the comprehensive documentation for tsc-files. This guide is organized by audience to help you quickly find what you need.

## 🚀 For Users

Start here if you're using tsc-files in your project:

- **[Quick Start](../README.md)** - Installation, basic usage, and first steps (see main README)
- **[API Reference](./api.md)** - CLI options and programmatic API
- **[Usage Examples](./usage-examples.md)** - Real-world usage scenarios
- **[Troubleshooting Guide](./troubleshooting-guide.md)** - Common issues and solutions

### Advanced Usage

- **[tsgo Compiler](./usage/tsgo-compiler.md)** - 10x faster type checking (experimental)

## 🔧 For Contributors

Want to contribute? These guides will help:

### Essential Guides

- **[Contributing Overview](./CONTRIBUTING.md)** - Quick start for contributors (GitHub displays this!)
- **[Development Setup](./contributing/setup.md)** - Prerequisites, installation, IDE configuration
- **[Coding Standards](./contributing/coding-standards.md)** - TypeScript guidelines and code style
- **[Pull Request Workflow](./contributing/pull-requests.md)** - Creating PRs, code review process

### Deep Dives

- **[Testing Guide](./testing/README.md)** - Testing overview and quick start
  - [Testing Strategy](./testing/strategy.md) - Comprehensive testing approach
  - [Best Practices](./testing/best-practices.md) - Patterns and guidelines
  - [Testing Framework](./testing/framework.md) - Vitest configuration and utilities
  - [Testing History](./testing/history.md) - Evolution and improvements
- **[Release Process](./contributing/release-process.md)** - Versioning and publishing

## 🏛️ For Architects

Understand the system design:

- **[Architecture Overview](./architecture/README.md)** - System design and components
  - [Architecture Details](./architecture/details.md) - In-depth implementation
  - [Security Requirements](./architecture/security.md) - Comprehensive security
  - [Performance Requirements](./architecture/performance.md) - Performance targets
- **[Architectural Decisions](./decisions/README.md)** - Why we made key technical choices (11 ADRs)

## 🤖 For AI Assistants

Project-specific guidance:

- **[CLAUDE.md](../CLAUDE.md)** - AI assistant instructions and project conventions
- **[OpenSpec Workflow](../openspec/AGENTS.md)** - Spec-driven development process
- **[Commit Conventions](../.claude/commit-conventions.md)** - Commit message format

## 📚 Documentation Map

### By Topic

**Getting Started & Usage:**

- README (Quick Start) → API Reference → Usage Examples → Troubleshooting

**Contributing:**

- CONTRIBUTING.md → Setup → Coding Standards → Pull Requests → Testing

**Architecture:**

- Architecture Overview → Details → Security → Performance → Decisions (ADRs)

### By File Organization

```text
docs/
├── README.md (you are here)       # Documentation index
│
├── 🔖 GitHub Special Files
│   ├── CONTRIBUTING.md            # ✅ Displayed on GitHub
│   ├── CODE_OF_CONDUCT.md         # ✅ Displayed on GitHub
│   └── SECURITY.md                # ✅ Displayed on GitHub
│
├── 🚀 User Guides
│   ├── api.md
│   ├── usage-examples.md
│   ├── troubleshooting-guide.md
│   └── usage/
│       └── tsgo-compiler.md         # Advanced: 10x faster type checking
│
├── 🔧 Contributing
│   └── contributing/
│       ├── README.md              # Index
│       ├── setup.md               # Dev environment
│       ├── coding-standards.md    # Code style
│       ├── pull-requests.md       # PR workflow
│       └── release-process.md     # Publishing
│
├── 🧪 Testing
│   └── testing/
│       ├── README.md              # Testing overview
│       ├── strategy.md            # Testing approach
│       ├── best-practices.md      # Patterns
│       ├── framework.md           # Vitest setup
│       └── history.md             # Evolution
│
├── 🏛️ Architecture
│   ├── architecture/
│   │   ├── README.md              # System design
│   │   ├── details.md             # Deep dive
│   │   ├── security.md            # Security reqs
│   │   └── performance.md         # Performance
│   └── decisions/                 # 11 ADRs
│       ├── README.md
│       └── 001-011-*.md
│
```

## 🎯 Quick Links by Task

**I want to...**

- **Use tsc-files** → [Quick Start (README)](../README.md)
- **Speed up type checking** → [tsgo Compiler Guide](./usage/tsgo-compiler.md)
- **Fix an issue** → [Troubleshooting Guide](./troubleshooting-guide.md)
- **Learn the API** → [API Reference](./api.md)
- **Contribute code** → [Contributing Guide](./CONTRIBUTING.md)
- **Write tests** → [Testing Guide](./testing/README.md)
- **Understand design** → [Architecture](./architecture/README.md)
- **See past decisions** → [ADRs](./decisions/README.md)
- **Report security issue** → [Security Policy](./SECURITY.md)

## 📖 Documentation Standards

When contributing documentation:

1. **User docs** (README, api, usage-examples, usage/\*) - Focus on clarity and examples
2. **Contributor docs** (contributing/\*) - Include setup steps and code examples
3. **Architecture docs** (architecture/\*) - Use diagrams and explain "why"
4. **ADRs** (decisions/\*) - Follow [ADR format](./decisions/README.md)

See [Contributing Guide](./CONTRIBUTING.md) for more details.

## 🔄 Documentation Updates

Major documentation reorganization (v0.5.0+):

- ✅ Reorganized into clear directories (contributing/, testing/, architecture/)
- ✅ Added comprehensive guides (setup, coding standards, PR workflow)
- ✅ Improved navigation with visual categories
- ✅ GitHub special files remain in docs/ root for visibility

## 🤝 Getting Help

- **Questions?** [GitHub Discussions](https://github.com/jbabin91/tsc-files/discussions)
- **Bug reports?** [GitHub Issues](https://github.com/jbabin91/tsc-files/issues)
- **Security issues?** See [Security Policy](./SECURITY.md)
- **Community standards?** See [Code of Conduct](./CODE_OF_CONDUCT.md)

## 📈 Project Status

**Current Version:** v0.4.0 (production ready)

**Documentation Health:** ⭐⭐⭐⭐⭐ Excellent

- Comprehensive coverage for all audiences
- Clear separation (users, contributors, architects)
- Minimal duplication
- Well-organized structure
- GitHub special files properly positioned
