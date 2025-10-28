# Usage Examples

<!-- AUTO-GENERATED SECTIONS: Examples maintained by Claude Code -->

This document provides comprehensive examples of using tsc-files in real-world scenarios, from basic usage to complex integration patterns.

## Basic Usage Examples

### **Simple File Checking**

```bash
# Check specific TypeScript files
tsc-files src/index.ts src/utils.ts

# Check files with glob patterns (quoted to prevent shell expansion)
tsc-files "src/**/*.ts"

# Check all TypeScript files in a directory
tsc-files src/
```

### **Custom Configuration**

```bash
# Use specific tsconfig.json
tsc-files --project tsconfig.build.json src/*.ts

# Use different tsconfig for different file sets
tsc-files --project tsconfig.strict.json "src/core/**/*.ts"
tsc-files --project tsconfig.lib.json "src/utils/**/*.ts"

# Skip library type checking for faster execution
tsc-files --skip-lib-check "src/**/*.ts"
```

### **Output Formats**

```bash
# Verbose output with detailed information
tsc-files --verbose src/index.ts

# JSON output for programmatic consumption
tsc-files --json "src/**/*.ts" > type-check-results.json

# Quiet mode (only errors, no success messages)
tsc-files --quiet src/
```

## Git Hooks Integration

### **Pre-commit Hook with lint-staged**

**package.json:**

```json
{
  "lint-staged": {
    "*.{ts,tsx}": ["eslint --fix", "tsc-files", "prettier --write"]
  }
}
```

**Alternative with separate type checking:**

```json
{
  "lint-staged": {
    "*.{ts,tsx}": ["eslint --fix", "prettier --write"],
    "*.ts": "tsc-files"
  }
}
```

### **Husky Pre-commit Hook**

**.husky/pre-commit:**

```bash
#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

# Run lint-staged which includes tsc-files
npx lint-staged

# Alternative: Direct type checking of staged files
staged_files=$(git diff --cached --name-only --diff-filter=ACM | grep -E '\.(ts|tsx)$')
if [ -n "$staged_files" ]; then
  echo "Type checking staged TypeScript files..."
  tsc-files $staged_files
fi
```

### **Pre-push Hook**

**.husky/pre-push:**

```bash
#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

# Type check all TypeScript files before push
echo "Running full TypeScript type check..."
tsc-files "src/**/*.ts" "tests/**/*.ts"

if [ $? -ne 0 ]; then
  echo "❌ Type checking failed. Push aborted."
  exit 1
fi

echo "✅ Type checking passed."
```

## CI/CD Integration Examples

### **GitHub Actions**

**.github/workflows/ci.yml:**

```yaml
name: CI

on: [push, pull_request]

jobs:
  type-check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'

      - name: Install dependencies
        run: pnpm install

      - name: Type check
        run: tsc-files "src/**/*.ts" "tests/**/*.ts"

      - name: Type check with JSON output
        run: |
          tsc-files --json "src/**/*.ts" > type-check-results.json
          cat type-check-results.json

      - name: Upload type check results
        if: failure()
        uses: actions/upload-artifact@v4
        with:
          name: type-check-results
          path: type-check-results.json
```

### **GitHub Actions with Changed Files Only**

```yaml
name: Type Check Changed Files

on:
  pull_request:
    paths:
      - '**/*.ts'
      - '**/*.tsx'

jobs:
  type-check-changed:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Get changed TypeScript files
        id: changed-files
        run: |
          # Get changed TypeScript files
          changed_files=$(git diff --name-only --diff-filter=ACM origin/main...HEAD | grep -E '\.(ts|tsx)$' | tr '\n' ' ')
          echo "files=$changed_files" >> $GITHUB_OUTPUT

      - name: Setup Node.js
        if: steps.changed-files.outputs.files != ''
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'

      - name: Install dependencies
        if: steps.changed-files.outputs.files != ''
        run: pnpm install

      - name: Type check changed files
        if: steps.changed-files.outputs.files != ''
        run: |
          echo "Type checking: ${{ steps.changed-files.outputs.files }}"
          tsc-files ${{ steps.changed-files.outputs.files }}
```

### **GitLab CI**

**.gitlab-ci.yml:**

```yaml
stages:
  - test

type-check:
  stage: test
  image: node:20
  cache:
    paths:
      - node_modules/
  script:
    - npm ci
    - npx tsc-files "src/**/*.ts" "tests/**/*.ts"
  artifacts:
    when: on_failure
    reports:
      junit: type-check-results.xml
    expire_in: 1 week
  rules:
    - changes:
        - '**/*.ts'
        - '**/*.tsx'
        - 'tsconfig*.json'
```

## Monorepo Examples

### **Nx Workspace**

**packages/app/package.json:**

```json
{
  "scripts": {
    "type-check": "tsc-files --project tsconfig.app.json \"src/**/*.ts\"",
    "type-check:watch": "tsc-files --project tsconfig.app.json --watch \"src/**/*.ts\""
  }
}
```

**Root level type checking:**

```bash
# Type check all packages
for package in packages/*; do
  if [ -f "$package/tsconfig.json" ]; then
    echo "Type checking $package..."
    tsc-files --project "$package/tsconfig.json" "$package/src/**/*.ts"
  fi
done
```

### **Lerna/Rush Integration**

**rush.json (custom commands):**

```json
{
  "commands": [
    {
      "name": "type-check",
      "commandKind": "bulk",
      "summary": "Type check all packages",
      "description": "Run TypeScript type checking on all packages",
      "enableParallelism": true,
      "ignoreMissingScript": true
    }
  ]
}
```

## IDE Integration Examples

### **VS Code Tasks**

**.vscode/tasks.json:**

```json
{
  "version": "2.0.0",
  "tasks": [
    {
      "label": "Type Check Current File",
      "type": "shell",
      "command": "tsc-files",
      "args": ["${file}"],
      "group": "build",
      "presentation": {
        "echo": true,
        "reveal": "always",
        "focus": false,
        "panel": "shared"
      },
      "problemMatcher": {
        "owner": "typescript",
        "fileLocation": "absolute",
        "pattern": {
          "regexp": "^(.+)\\((\\d+),(\\d+)\\):\\s+(error|warning|info)\\s+(TS\\d+):\\s+(.*)$",
          "file": 1,
          "line": 2,
          "column": 3,
          "severity": 4,
          "code": 5,
          "message": 6
        }
      }
    },
    {
      "label": "Type Check All",
      "type": "shell",
      "command": "tsc-files",
      "args": ["src/**/*.ts"],
      "group": "build",
      "presentation": {
        "echo": true,
        "reveal": "always",
        "focus": false,
        "panel": "shared"
      }
    }
  ]
}
```

### **VS Code Launch Configuration**

**.vscode/launch.json:**

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Debug tsc-files",
      "type": "node",
      "request": "launch",
      "program": "${workspaceFolder}/dist/cli.js",
      "args": ["${file}"],
      "console": "integratedTerminal",
      "cwd": "${workspaceFolder}",
      "env": {
        "NODE_ENV": "development"
      }
    }
  ]
}
```

## Advanced Usage Patterns

### **Incremental Type Checking**

```bash
# Type check only files modified in last commit
git diff --name-only HEAD~1 HEAD | grep '\.ts$' | xargs tsc-files

# Type check files modified since main branch
git diff --name-only main...HEAD | grep '\.ts$' | xargs tsc-files

# Type check files in current git staging area
git diff --cached --name-only | grep '\.ts$' | xargs tsc-files
```

### **Conditional Type Checking**

```bash
#!/bin/bash
# type-check-smart.sh - Only type check if TypeScript files changed

# Check if any TypeScript files were modified
if git diff --name-only | grep -q '\.ts$'; then
  echo "TypeScript files detected, running type check..."
  tsc-files "src/**/*.ts"
else
  echo "No TypeScript files modified, skipping type check."
fi
```

### **Performance Optimization**

```bash
# Skip lib checking for faster development runs
alias tsc-dev='tsc-files --skip-lib-check'

# Parallel checking for large projects (be careful with resource usage)
find src -name "*.ts" -print0 | xargs -0 -P 4 -I {} tsc-files {}

# Cache control (enabled by default; disable when debugging temp configs)
tsc-files --no-cache "src/**/*.ts"
```

## Error Handling Examples

### **Scripted Error Processing**

```bash
#!/bin/bash
# type-check-with-retry.sh

max_retries=3
retry_count=0

while [ $retry_count -lt $max_retries ]; do
  if tsc-files "src/**/*.ts"; then
    echo "✅ Type checking successful"
    exit 0
  else
    retry_count=$((retry_count + 1))
    echo "❌ Type checking failed (attempt $retry_count/$max_retries)"

    if [ $retry_count -lt $max_retries ]; then
      echo "Retrying in 5 seconds..."
      sleep 5
    fi
  fi
done

echo "❌ Type checking failed after $max_retries attempts"
exit 1
```

### **JSON Output Processing**

```bash
# Extract specific error information
tsc-files --json "src/**/*.ts" | jq '.errors[] | select(.severity == "error") | .message'

# Count errors by file
tsc-files --json "src/**/*.ts" | jq '.errors | group_by(.file) | map({file: .[0].file, count: length})'

# Filter errors by TypeScript error code
tsc-files --json "src/**/*.ts" | jq '.errors[] | select(.code == "TS2345")'
```

## Integration with Build Tools

### **Webpack Integration**

```javascript
// webpack.config.js
const { spawn } = require('child_process');

class TscFilesPlugin {
  apply(compiler) {
    compiler.hooks.beforeCompile.tapAsync(
      'TscFilesPlugin',
      (params, callback) => {
        const tscFiles = spawn('tsc-files', ['src/**/*.ts'], {
          stdio: 'inherit',
        });

        tscFiles.on('close', (code) => {
          if (code !== 0) {
            callback(new Error('TypeScript type checking failed'));
          } else {
            callback();
          }
        });
      },
    );
  }
}

module.exports = {
  // ... other config
  plugins: [new TscFilesPlugin()],
};
```

### **Rollup Integration**

```javascript
// rollup.config.js
import { spawn } from 'child_process';

function tscFilesPlugin() {
  return {
    name: 'tsc-files',
    buildStart() {
      return new Promise((resolve, reject) => {
        const tscFiles = spawn('tsc-files', ['src/**/*.ts'], {
          stdio: 'inherit',
        });

        tscFiles.on('close', (code) => {
          if (code === 0) {
            resolve();
          } else {
            reject(new Error('TypeScript type checking failed'));
          }
        });
      });
    },
  };
}

export default {
  // ... other config
  plugins: [
    tscFilesPlugin(),
    // ... other plugins
  ],
};
```

## Troubleshooting Common Scenarios

### **Module Resolution Issues**

```bash
# When TypeScript can't find modules, check with verbose output
tsc-files --verbose src/problematic-file.ts

# Use the same tsconfig as your IDE
tsc-files --project tsconfig.json src/problematic-file.ts

# Check if paths mapping is working
tsc-files --project tsconfig.json "src/**/*.ts" 2>&1 | grep "Cannot find module"
```

### **Performance Issues**

```bash
# Profile type checking performance
time tsc-files "src/**/*.ts"

# Skip lib checking for development
tsc-files --skip-lib-check "src/**/*.ts"

# Check specific files causing slowdown
tsc-files --verbose src/slow-file.ts
```

### **CI/CD Failures**

```bash
# Debug CI issues with verbose output
tsc-files --verbose --json "src/**/*.ts" | tee type-check-debug.json

# Check TypeScript version compatibility
tsc --version
tsc-files --version

# Verify tsconfig resolution
tsc-files --project tsconfig.json --verbose src/index.ts
```

These examples demonstrate the flexibility and power of tsc-files across various development scenarios, from simple usage to complex CI/CD integrations.

## 📚 Related Documentation

### Implementation Guides

- [Contributing Guide](./contributing.md) - Development setup and quality requirements
- [Architecture Overview](./architecture/README.md) - Layered system design and component structure
- [Architecture Details](./architecture/details.md) - Deep dive into configuration, detection, and execution flows

### Operational Guides

- [Security Requirements](./architecture/security.md) - Security protocols and validation
- [Testing Strategy](./testing/strategy.md) - Testing framework and patterns
- [Troubleshooting Guide](../CLAUDE.md#-troubleshooting-guide) - Common issues and solutions

### Development Resources

- [CLAUDE.md](../CLAUDE.md) - Core project guidance and commands
- [Claude Code Workflows](../.claude/claude-code-workflows.md) - Development workflow patterns

### External References

- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Git Hooks Documentation](https://git-scm.com/docs/githooks)
- [lint-staged Documentation](https://github.com/okonet/lint-staged)
- [husky Documentation](https://typicode.github.io/husky/)
