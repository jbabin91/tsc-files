# Troubleshooting Guide

This comprehensive guide helps you diagnose and resolve common issues when using tsc-files.

## Quick Diagnostics

### **Basic Health Check**

```bash
# Verify tsc-files installation
tsc-files --version

# Check TypeScript availability
tsc --version

# Verify project structure
ls -la tsconfig*.json

# Test with verbose output
tsc-files --verbose src/index.ts
```

### **Environment Information**

```bash
# Check Node.js version (requires >=22.19.0)
node --version

# Check package manager
npm --version
yarn --version
pnpm --version

# Check project dependencies
npm ls typescript
# or
pnpm ls typescript
```

## Common Issues and Solutions

### **1. TypeScript Not Found**

#### **Error Messages:**

```text
❌ TypeScript compiler not found
❌ Cannot find module 'typescript'
❌ 'tsc' is not recognized as an internal or external command
```

#### **Diagnosis:**

```bash
# Check if TypeScript is installed locally
ls node_modules/.bin/tsc

# Check if TypeScript is installed globally
which tsc

# Check package.json dependencies
grep -E "(typescript|@types)" package.json
```

#### **Solutions:**

**Install TypeScript locally (recommended):**

```bash
# npm
npm install --save-dev typescript

# pnpm
pnpm add -D typescript

# yarn
yarn add --dev typescript
```

**Install TypeScript globally:**

```bash
# npm
npm install -g typescript

# pnpm
pnpm add -g typescript

# yarn
yarn global add typescript
```

**Verify installation:**

```bash
# Check local installation
npx tsc --version

# Check global installation
tsc --version
```

### **2. tsconfig.json Not Found**

#### **Error Messages:**

```text
❌ No tsconfig.json found
❌ Cannot read property 'compilerOptions' of undefined
❌ Configuration file not found
```

#### **Diagnosis:**

```bash
# Check for tsconfig.json in current directory
ls -la tsconfig*.json

# Search for tsconfig.json in parent directories
find . -name "tsconfig*.json" -type f

# Check current working directory
pwd
```

#### **Solutions:**

**Create a basic tsconfig.json:**

```json
{
  "compilerOptions": {
    "target": "es2020",
    "module": "commonjs",
    "lib": ["es2020"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

**Specify tsconfig.json explicitly:**

```bash
# Use specific config file
tsc-files --project ./config/tsconfig.json src/*.ts

# Use different config for different scenarios
tsc-files --project tsconfig.build.json src/*.ts
```

**Initialize TypeScript configuration:**

```bash
# Create default tsconfig.json
npx tsc --init

# Create with specific options
npx tsc --init --target es2020 --module commonjs
```

### **3. Module Resolution Issues**

#### **Error Messages:**

```text
❌ Cannot find module '@/utils'
❌ Module resolution failed
❌ Cannot resolve path mapping
```

#### **Diagnosis:**

```bash
# Check path mapping in tsconfig.json
cat tsconfig.json | jq '.compilerOptions.paths'

# Check baseUrl configuration
cat tsconfig.json | jq '.compilerOptions.baseUrl'

# Verify file exists at resolved path
ls -la src/utils/index.ts
```

#### **Solutions:**

**Fix path mapping in tsconfig.json:**

```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"],
      "@/utils/*": ["src/utils/*"],
      "@/components/*": ["src/components/*"]
    }
  }
}
```

**Use relative imports temporarily:**

```typescript
// Instead of: import { helper } from '@/utils'
import { helper } from '../utils';
```

**Debug module resolution:**

```bash
# Use TypeScript's trace resolution
tsc-files --verbose src/problematic-file.ts 2>&1 | grep -A5 -B5 "Module resolution"
```

### **4. Performance Issues**

#### **Symptoms:**

- Type checking takes too long
- High memory usage
- Process hangs or times out

#### **Diagnosis:**

```bash
# Profile execution time
time tsc-files "src/**/*.ts"

# Monitor memory usage
(/usr/bin/time -v tsc-files "src/**/*.ts") 2>&1 | grep -E "(Maximum resident|User time)"

# Check project size
find src -name "*.ts" | wc -l
du -sh node_modules/@types
```

#### **Solutions:**

**Use skipLibCheck for development:**

```bash
tsc-files --skipLibCheck "src/**/*.ts"
```

**Exclude unnecessary files:**

```json
{
  "exclude": [
    "node_modules",
    "dist",
    "build",
    "coverage",
    "**/*.test.ts",
    "**/*.spec.ts"
  ]
}
```

**Process files in smaller batches:**

```bash
# Instead of checking all files at once
find src -name "*.ts" | head -50 | xargs tsc-files

# Check specific directories
tsc-files "src/components/**/*.ts"
tsc-files "src/utils/**/*.ts"
```

**Optimize TypeScript configuration:**

```json
{
  "compilerOptions": {
    "skipLibCheck": true,
    "incremental": true,
    "composite": false
  }
}
```

### **5. Permission and Access Issues**

#### **Error Messages:**

```text
❌ EACCES: permission denied
❌ EPERM: operation not permitted
❌ Cannot write to temporary directory
```

#### **Diagnosis:**

```bash
# Check file permissions
ls -la tsconfig.json
ls -la src/

# Check temp directory permissions
ls -la /tmp/
echo $TMPDIR

# Check current user permissions
whoami
groups
```

#### **Solutions:**

**Fix file permissions:**

```bash
# Make files readable
chmod 644 tsconfig.json src/**/*.ts

# Fix directory permissions
chmod 755 src/
```

**Use alternative temp directory:**

```bash
# Set custom temp directory
export TMPDIR=/path/to/writable/temp
tsc-files "src/**/*.ts"
```

**Run with appropriate permissions:**

```bash
# On Unix systems, avoid running as root
# Instead, fix ownership
sudo chown -R $USER:$USER .
```

### **6. Git Hooks Integration Issues**

#### **Error Messages:**

```text
❌ tsc-files: command not found (in git hooks)
❌ Git hook failed with exit code 1
❌ lint-staged execution failed
```

#### **Diagnosis:**

```bash
# Check if tsc-files is available in PATH
which tsc-files

# Test git hook manually
.husky/pre-commit

# Check lint-staged configuration
cat package.json | jq '.["lint-staged"]'
```

#### **Solutions:**

**Fix PATH in git hooks:**

```bash
# .husky/pre-commit
#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

# Ensure correct PATH
export PATH="$PATH:./node_modules/.bin"

npx lint-staged
```

**Use npx for reliable execution:**

```json
{
  "lint-staged": {
    "*.ts": ["npx tsc-files"]
  }
}
```

**Debug git hook execution:**

```bash
# Add debugging to git hook
#!/usr/bin/env sh
echo "PATH: $PATH"
echo "Node version: $(node --version)"
echo "tsc-files location: $(which tsc-files)"

npx tsc-files "src/**/*.ts"
```

### **7. CI/CD Pipeline Failures**

#### **Common Issues:**

- Different Node.js versions
- Missing dependencies
- Cache issues
- Timeout problems

#### **Diagnosis:**

```bash
# Check CI environment
node --version
npm --version
which tsc-files

# Verify dependencies are installed
npm ls typescript
```

#### **Solutions:**

**Ensure consistent environment:**

```yaml
# GitHub Actions
- name: Setup Node.js
  uses: actions/setup-node@v4
  with:
    node-version: '20'
    cache: 'pnpm'

- name: Install dependencies
  run: pnpm install --frozen-lockfile
```

**Add explicit TypeScript installation:**

```yaml
- name: Install TypeScript
  run: pnpm add -D typescript

- name: Verify installation
  run: |
    node --version
    npx tsc --version
    npx tsc-files --version
```

**Handle timeouts:**

```yaml
- name: Type check with timeout
  timeout-minutes: 10
  run: npx tsc-files "src/**/*.ts"
```

## Advanced Troubleshooting

### **Debug Mode**

**Enable verbose logging:**

```bash
# Maximum verbosity
tsc-files --verbose "src/**/*.ts"

# Debug environment detection
DEBUG=tsc-files:* tsc-files "src/**/*.ts"
```

**Trace TypeScript compilation:**

```bash
# Enable TypeScript tracing
tsc-files --verbose --project tsconfig.json "src/**/*.ts" 2>&1 | grep -E "(Finding|Loading|Processing)"
```

### **Environment Variables**

```bash
# Debugging
export DEBUG=tsc-files:*
export TSC_FILES_VERBOSE=true

# Performance tuning
export TSC_FILES_CACHE=true
export TSC_FILES_CONCURRENCY=4

# Temporary directory
export TMPDIR=/custom/temp/path
```

### **Log Analysis**

**Common log patterns to look for:**

```bash
# Package manager detection issues
grep -i "package manager" debug.log

# TypeScript compiler issues
grep -i "compiler" debug.log

# Configuration problems
grep -i "tsconfig" debug.log

# Permission issues
grep -i "permission\|access" debug.log
```

## Platform-Specific Issues

### **Windows**

**Common Issues:**

- Path separator differences
- Command not found errors
- Permission issues with temp files

**Solutions:**

```cmd
:: Use npx for reliable execution
npx tsc-files "src/**/*.ts"

:: Fix path separators in scripts
tsc-files "src\\**\\*.ts"

:: Use PowerShell for complex operations
powershell -Command "tsc-files 'src/**/*.ts'"
```

### **macOS**

**Common Issues:**

- Rosetta compatibility on Apple Silicon
- Case-sensitive filesystem issues

**Solutions:**

```bash
# Ensure native execution on Apple Silicon
arch -arm64 tsc-files "src/**/*.ts"

# Check case sensitivity
diskutil info / | grep "File System Personality"
```

### **Linux**

**Common Issues:**

- Missing build tools
- Permission issues in containers

**Solutions:**

```bash
# Install build essentials if needed
sudo apt-get install build-essential

# Fix permissions in Docker
USER node
WORKDIR /app
COPY --chown=node:node . .
```

## Recovery Procedures

### **Clean Reset**

```bash
# Clear all caches
rm -rf node_modules/.cache
rm -rf ~/.npm/_cacache

# Reinstall dependencies
rm -rf node_modules
rm package-lock.json  # or yarn.lock, pnpm-lock.yaml
npm install  # or yarn, pnpm install

# Rebuild TypeScript
npx tsc --build --clean
npx tsc --build
```

### **Emergency Workarounds**

**Bypass tsc-files temporarily:**

```bash
# Use TypeScript directly
npx tsc --noEmit --project tsconfig.json

# Use incremental checking
npx tsc --noEmit --incremental
```

**Minimal working configuration:**

```json
{
  "compilerOptions": {
    "target": "es2020",
    "module": "commonjs",
    "noEmit": true,
    "skipLibCheck": true
  },
  "include": ["src/**/*"]
}
```

## Getting Help

### **Information to Provide**

When reporting issues, include:

1. **Environment Information:**

   ```bash
   node --version
   npm --version
   tsc-files --version
   tsc --version
   ```

2. **Configuration Files:**

   ```bash
   cat package.json
   cat tsconfig.json
   ```

3. **Error Output:**

   ```bash
   tsc-files --verbose "src/**/*.ts" 2>&1 | tee error.log
   ```

4. **Project Structure:**

   ```bash
   tree -I node_modules -L 3
   ```

### **Support Channels**

- **GitHub Issues**: [Report bugs and feature requests](https://github.com/jbabin91/tsc-files/issues)
- **Discussions**: [Community support and questions](https://github.com/jbabin91/tsc-files/discussions)
- **Documentation**: [Read the full documentation](https://github.com/jbabin91/tsc-files#readme)

This troubleshooting guide covers the most common issues and their solutions. For issues not covered here, please open a GitHub issue with detailed information about your problem.
