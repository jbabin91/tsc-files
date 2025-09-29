# tsgo Native TypeScript Compiler

> **⚠️ Experimental Feature:** tsgo is Microsoft's experimental native TypeScript compiler. While it offers significant performance benefits, it's not yet production-ready for all use cases.

## Overview

tsgo (TypeScript Native Compiler) is a native implementation of the TypeScript compiler that can provide **up to 10x faster** type checking compared to the standard `tsc` compiler.

**Best Use Cases:**

- Git hooks (pre-commit type checking)
- CI/CD pipelines (faster builds)
- Large monorepos (faster incremental checks)
- Development workflows (faster feedback loops)

## Installation

```bash
# npm
npm install --save-dev @typescript/native-preview

# yarn
yarn add --dev @typescript/native-preview

# pnpm
pnpm add --save-dev @typescript/native-preview

# bun
bun add --dev @typescript/native-preview
```

## Automatic Detection

tsc-files automatically detects and uses tsgo when available:

```bash
# tsgo will be used automatically if installed
tsc-files "src/**/*.ts"

# Show which compiler is being used
tsc-files --show-compiler "src/**/*.ts"
```

**Output:**

```text
ℹ Using TypeScript compiler: tsgo (native)
✓ Type check passed (247ms)
```

## Manual Compiler Selection

### Force Use tsgo

```bash
# Fail if tsgo is not available
tsc-files --use-tsgo "src/**/*.ts"

# With verbose output
tsc-files --use-tsgo --verbose "src/**/*.ts"
```

**When to use:**

- Ensuring consistent fast performance in CI/CD
- Validating tsgo compatibility
- Performance-critical workflows

### Force Use tsc

```bash
# Skip tsgo even if available
tsc-files --use-tsc "src/**/*.ts"

# Useful for debugging compatibility issues
tsc-files --use-tsc --verbose "src/**/*.ts"
```

**When to use:**

- Troubleshooting type checking differences
- Known tsgo compatibility issues
- Maximum compatibility needed

### Disable Automatic Fallback

```bash
# Fail instead of falling back to tsc
tsc-files --use-tsgo --no-fallback "src/**/*.ts"
```

**When to use:**

- Ensuring tsgo is always used
- Preventing unexpected performance regressions
- CI/CD performance guarantees

## Performance Benchmarking

Compare performance between compilers:

```bash
# Benchmark both compilers
tsc-files --benchmark "src/**/*.ts"
```

**Example Output:**

```text
Running benchmark: tsc vs tsgo

tsc (Standard Compiler):
  Duration: 2,431ms
  Files checked: 247

tsgo (Native Compiler):
  Duration: 243ms
  Files checked: 247

Performance gain: 10.0x faster with tsgo
```

## Git Hooks Integration

### With lint-staged

```json
{
  "lint-staged": {
    "*.{ts,tsx}": "tsc-files --use-tsgo"
  }
}
```

### With husky

```bash
#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

# Use tsgo for faster pre-commit checks
tsc-files --use-tsgo $(git diff --cached --name-only --diff-filter=ACM | grep -E '\.(ts|tsx)$')
```

### With lefthook

```yaml
# lefthook.yml
pre-commit:
  commands:
    type-check:
      glob: '*.{ts,tsx}'
      run: tsc-files --use-tsgo {staged_files}
```

## CI/CD Integration

### GitHub Actions

```yaml
# .github/workflows/ci.yml
- name: Install tsgo
  run: npm install -D @typescript/native-preview

- name: Type Check with tsgo
  run: tsc-files --use-tsgo "src/**/*.ts"

# With fallback on failure
- name: Type Check (with fallback)
  run: tsc-files --use-tsgo "src/**/*.ts" || tsc-files --use-tsc "src/**/*.ts"
```

### Package.json Scripts

```json
{
  "scripts": {
    "type-check": "tsc-files 'src/**/*.ts'",
    "type-check:fast": "tsc-files --use-tsgo 'src/**/*.ts'",
    "type-check:safe": "tsc-files --use-tsc 'src/**/*.ts'",
    "type-check:benchmark": "tsc-files --benchmark 'src/**/*.ts'"
  }
}
```

## Known Limitations

### Current tsgo Limitations (as of preview)

1. **baseUrl with paths Configuration**
   - tsgo doesn't fully support `baseUrl` with `paths` in non-bundler `moduleResolution`
   - tsc-files automatically falls back to tsc when this configuration is detected

2. **Experimental Status**
   - Not yet production-ready for all use cases
   - May have subtle differences in type checking behavior
   - Breaking changes possible in future releases

3. **Compatibility**
   - Some advanced TypeScript features may not be fully supported
   - Complex project references may not work correctly

### Automatic Compatibility Checking

tsc-files proactively checks for known compatibility issues:

```typescript
// Automatic compatibility detection
if (hasBaseUrlWithPaths && !isBundlerResolution) {
  // Falls back to tsc automatically
  console.log('ℹ Detected incompatible configuration, using tsc instead');
}
```

## Troubleshooting

### tsgo Not Being Used

**Check installation:**

```bash
npm ls @typescript/native-preview
```

**Verify detection:**

```bash
tsc-files --show-compiler "src/**/*.ts"
```

**Force tsgo with error on failure:**

```bash
tsc-files --use-tsgo --no-fallback "src/**/*.ts"
```

### Performance Not Improving

**Possible causes:**

1. **Small projects** - Overhead may outweigh benefits for <50 files
2. **Cold start** - First run includes initialization time
3. **Incompatible configuration** - Automatically falling back to tsc

**Verify with benchmark:**

```bash
tsc-files --benchmark "src/**/*.ts"
```

### Type Checking Differences

If you notice different results between tsc and tsgo:

```bash
# Compare outputs
tsc-files --use-tsc "src/**/*.ts" > tsc-output.txt
tsc-files --use-tsgo "src/**/*.ts" > tsgo-output.txt
diff tsc-output.txt tsgo-output.txt
```

**Report issues:**

- [tsc-files issues](https://github.com/jbabin91/tsc-files/issues)
- [TypeScript native-preview issues](https://github.com/microsoft/TypeScript/issues)

## Best Practices

### Development Workflow

```bash
# Fast feedback during development
pnpm type-check:fast  # Uses tsgo

# Comprehensive check before commit
pnpm type-check:safe  # Uses tsc
```

### CI/CD Strategy

```yaml
# Fast feedback in pull requests
- name: Quick Type Check
  run: tsc-files --use-tsgo "src/**/*.ts"

# Comprehensive check before merge
- name: Full Type Check
  if: github.event_name == 'push' && github.ref == 'refs/heads/main'
  run: tsc-files --use-tsc "src/**/*.ts"
```

### Gradual Adoption

1. **Start with development** - Use tsgo in local development first
2. **Add to git hooks** - Faster pre-commit checks
3. **CI/CD with fallback** - Use tsgo with automatic fallback
4. **Monitor compatibility** - Watch for issues with `--show-compiler`
5. **Full adoption** - Use `--use-tsgo` when confident

## Performance Tips

### Optimize for Speed

```bash
# Skip library checking (fastest)
tsc-files --use-tsgo --skip-lib-check "src/**/*.ts"

# Show performance tips
tsc-files --tips
```

### Measure Performance

```bash
# Time the execution
time tsc-files --use-tsgo "src/**/*.ts"

# Compare with tsc
time tsc-files --use-tsc "src/**/*.ts"

# Use built-in benchmark
tsc-files --benchmark "src/**/*.ts"
```

## Future Roadmap

As tsgo matures:

- Better compatibility with advanced TypeScript features
- Improved error messages and diagnostics
- Production-ready status
- Full feature parity with tsc

**Stay Updated:**

- Follow [@typescript](https://twitter.com/typescript) for tsgo announcements
- Check [TypeScript releases](https://github.com/microsoft/TypeScript/releases)
- Monitor [tsc-files releases](https://github.com/jbabin91/tsc-files/releases) for integration updates

## Resources

- [TypeScript Native Preview](https://github.com/microsoft/TypeScript/tree/main/packages/native-preview)
- [Performance Comparison](../architecture/performance.md)
- [Architecture Details](../architecture/details.md)
- [Troubleshooting Guide](../troubleshooting-guide.md)

---

**Questions or Issues?**

- [GitHub Discussions](https://github.com/jbabin91/tsc-files/discussions)
- [Report a Bug](https://github.com/jbabin91/tsc-files/issues)
