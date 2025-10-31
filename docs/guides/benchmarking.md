# Performance Benchmarking Guide

This guide covers how to benchmark tsc-files performance using the built-in `--benchmark` flag.

## Quick Start

```bash
# Run comprehensive benchmark on your project
pnpm benchmark

# Or run directly with tsc-files
tsc-files --benchmark "src/**/*.ts"
```

## Overview

tsc-files provides a built-in benchmarking system that measures real-world performance by comparing:

1. **Tool Comparison**: Full `tsc` vs `tsc-files` (specific files)
2. **Compiler Comparison**: `tsc` vs `tsgo` within tsc-files (if tsgo is available)

This gives you two valuable insights:

- How much faster is tsc-files compared to checking your entire project?
- How much faster is the native tsgo compiler compared to standard tsc?

## Using the Benchmark Flag

### Basic Usage

```bash
# Benchmark specific files
tsc-files --benchmark "src/**/*.ts"

# Benchmark with custom tsconfig
tsc-files --benchmark --project tsconfig.build.json "src/**/*.ts"

# Use the package.json script
pnpm benchmark
```

### What Gets Measured

The `--benchmark` flag runs three scenarios:

1. **Full tsc** - Runs `tsc --noEmit` on your entire project
2. **tsc-files + tsc** - Runs tsc-files with standard TypeScript compiler on specific files
3. **tsc-files + tsgo** - Runs tsc-files with native TypeScript compiler (if available)

### Example Output

```txt
🏃 Running comprehensive benchmark...

Running full tsc on entire project...
Running tsc-files with tsc compiler...
Running tsc-files with tsgo compiler...

🏆 Benchmark Results:

Tool Comparison (tsc-files value):
  Full tsc (entire project):  3250ms
  tsc-files (specific files):  875ms (12 errors)
  Speedup: 3.71x 🚀

Compiler Comparison (within tsc-files):
  tsc-files + tsc:   875ms (12 errors)
  tsc-files + tsgo:  127ms (12 errors)
  Speedup: 6.89x 🚀
```

## Understanding Results

### Tool Comparison

**What it shows**: How much faster tsc-files is compared to checking your entire project.

**Typical speedups**:

- Small projects (10-50 files): 2-3x faster
- Medium projects (50-200 files): 3-5x faster
- Large projects (200+ files): 5-10x faster

**When it's most valuable**:

- Git hooks checking only changed files
- Pre-commit checks with lint-staged
- CI/CD checking only PR changes

### Compiler Comparison

**What it shows**: How much faster the native tsgo compiler is compared to standard tsc.

**Typical speedups**:

- Standard workloads: 5-10x faster
- Large codebases: 10-15x faster
- Complex type checking: up to 20x faster

**When to use tsgo**:

- Large projects with many files
- Complex type relationships
- Performance-critical workflows
- See [tsgo compiler guide](../usage/tsgo-compiler.md) for setup

## Real-World Scenarios

### Git Hook Performance

Most git hooks check 5-50 files per commit. In these scenarios:

```bash
# Pre-commit hook with lint-staged
# Typical: 10-20 changed files
# Expected: 3-5x speedup over full tsc
tsc-files $(git diff --cached --name-only | grep '\.ts$')
```

### Pull Request Checks

PR checks often involve 10-100 changed files:

```bash
# PR check workflow
# Typical: 20-50 changed files
# Expected: 4-7x speedup over full tsc
tsc-files $(git diff main...HEAD --name-only | grep '\.ts$')
```

### Continuous Integration

CI environments benefit most from focused type checking:

```bash
# CI workflow checking specific packages
# Typical: 50-200 files
# Expected: 5-10x speedup over full tsc
tsc-files "packages/core/src/**/*.ts"
```

## Comparing with tsc

### When tsc-files is Faster

✅ **Git hooks** - Checking only changed files (5-50 files)
✅ **PR checks** - Checking only modified files (10-100 files)
✅ **Monorepos** - Checking specific packages
✅ **Large projects** - Focused type checking on subsets

### When Full tsc Might Be Comparable

⚠️ **Very small projects** - < 10 total files (overhead similar to benefit)
⚠️ **Initial full checks** - When you need to check everything anyway

### Benchmark Accuracy

The built-in benchmark provides accurate real-world measurements because:

- Uses actual file system operations
- Includes CLI startup overhead
- Measures wall-clock time (what users experience)
- Tests on your actual project structure

## Performance Tips

### Optimize tsc-files Performance

```bash
# 1. Skip library type checking for speed
tsc-files --benchmark --skip-lib-check "src/**/*.ts"

# 2. Use tsgo for maximum performance
tsc-files --benchmark --use-tsgo "src/**/*.ts"

# 3. Disable caching when debugging config issues
tsc-files --benchmark --no-cache "src/**/*.ts"
```

### Optimize Project Structure

For best performance with tsc-files:

1. **Use Project References** - Enable incremental compilation
2. **Organize by Feature** - Group related files together
3. **Minimize Cross-Dependencies** - Reduce transitive imports
4. **Use Path Aliases** - Cleaner imports, better caching

## Troubleshooting

### Unexpected Results

**Issue**: tsc-files slower than full tsc on small projects

**Cause**: Process spawning overhead dominates on tiny projects

**Solution**: Only use tsc-files when checking < 50% of total files

---

**Issue**: Benchmark shows minimal speedup

**Cause**: May be checking most/all files anyway

**Solution**: Verify you're only checking changed files with `--verbose`

---

**Issue**: tsgo compiler not available

**Cause**: @typescript/native-preview not installed

**Solution**: See [tsgo compiler guide](../usage/tsgo-compiler.md)

### Environment Factors

**Inconsistent results?**

- Close other applications (reduce CPU contention)
- Disable CPU throttling
- Run multiple times and average results
- Check disk I/O (especially on network drives)

**Benchmark takes too long?**

- Expected runtime: 30-120 seconds depending on project size
- Use fewer files if testing: `tsc-files --benchmark "src/core/**/*.ts"`
- Results are cached during runs (node_modules)

## Best Practices

### When to Benchmark

1. **Before releases** - Validate performance improvements
2. **After major changes** - Ensure no regressions
3. **When investigating slowness** - Identify bottlenecks
4. **When comparing compilers** - Decide tsc vs tsgo

### Interpreting Results

**Focus on relative improvements:**

- 2x speedup = Good for git hooks
- 3-5x speedup = Excellent for most workflows
- 5-10x speedup = Outstanding, especially with tsgo
- < 2x speedup = Consider if overhead worth it

**Consider absolute times:**

- < 500ms = Excellent git hook performance
- 500ms-1s = Good for interactive workflows
- 1-3s = Acceptable for CI/CD
- > 3s = Investigate optimization opportunities

### Documentation Best Practices

When reporting benchmark results:

1. **Include environment** - OS, Node version, project size
2. **Show both comparisons** - Tool and compiler speedups
3. **Note configurations** - Flags used, tsconfig settings
4. **Provide context** - Number of files checked, project type

## Related Documentation

- [tsgo Compiler Guide](../usage/tsgo-compiler.md) - 10x performance boost setup
- [Troubleshooting Guide](troubleshooting-guide.md) - Common issues and solutions
- [Architecture Details](../architecture/details.md) - System design and performance
- [Usage Examples](usage-examples.md) - Real-world usage patterns
