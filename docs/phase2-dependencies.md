# Phase 2 Dependencies Guide

This document provides comprehensive coverage of the enhanced dependencies added for Phase 2 implementation, including usage patterns, integration strategies, and how they solve specific tsc-files community issues.

## 📋 Dependency Overview

| Package            | Version | Size | Purpose                     | Solves Issues                  |
| ------------------ | ------- | ---- | --------------------------- | ------------------------------ |
| **commander**      | ^14.0.1 | 46kB | Professional CLI framework  | Better UX, argument validation |
| **kleur**          | ^4.1.5  | 2kB  | Lightweight terminal colors | Enhanced error visibility      |
| **ora**            | ^9.0.0  | 12kB | Terminal spinners           | Progress feedback              |
| **cosmiconfig**    | ^9.0.0  | 25kB | Configuration resolution    | Issue #29: extends chain       |
| **tsconfig-paths** | ^4.2.0  | 18kB | TypeScript path mapping     | Issue #37: monorepo support    |
| **fs-extra**       | ^11.3.2 | 35kB | Enhanced file operations    | Atomic file handling           |
| **deepmerge**      | ^4.3.1  | 3kB  | Object merging              | Smart config merging           |
| **zod**            | ^4.1.11 | 60kB | Schema validation           | CLI/config validation          |

**Total Impact**: ~201kB additional bundle size for professional CLI capabilities.

## 🎯 Implementation Patterns by Issue Priority

### 1. Monorepo Support (Issue #37 - Priority #1)

**Key Dependencies**: `tsconfig-paths`, `cosmiconfig`, `fs-extra`

```typescript
import { loadConfig } from 'tsconfig-paths';
import { cosmiconfigSync } from 'cosmiconfig';
import { existsSync } from 'fs-extra';
import { dirname, join } from 'path';

// Per-file tsconfig resolution (from PR #66 analysis)
function getTsConfigForTypeScriptFile(filePath: string): string {
  let currentDirectory = dirname(filePath);

  while (
    currentDirectory &&
    currentDirectory !== '/' &&
    currentDirectory !== '.'
  ) {
    const tsconfigPath = join(currentDirectory, 'tsconfig.json');
    if (existsSync(tsconfigPath)) {
      return tsconfigPath;
    }
    currentDirectory = dirname(currentDirectory);
  }

  return 'tsconfig.json'; // fallback to root
}

// Group files by their associated tsconfig
function groupFilesByTsConfig(files: string[]): Map<string, string[]> {
  const groups = new Map<string, string[]>();

  for (const file of files) {
    const tsconfig = getTsConfigForTypeScriptFile(file);
    if (!groups.has(tsconfig)) {
      groups.set(tsconfig, []);
    }
    groups.get(tsconfig)!.push(file);
  }

  return groups;
}

// Process each group separately with individual temp configs
async function processMonorepoFiles(files: string[]): Promise<CheckResult[]> {
  const fileGroups = groupFilesByTsConfig(files);
  const results: CheckResult[] = [];

  for (const [tsconfigPath, groupFiles] of fileGroups) {
    // Load path mapping for this tsconfig
    const { absoluteBaseUrl, paths } = loadConfig(dirname(tsconfigPath));

    // Process this group with its specific configuration
    const result = await processFileGroup(groupFiles, tsconfigPath, {
      absoluteBaseUrl,
      paths,
    });
    results.push(result);
  }

  return results;
}
```

### 2. Enhanced Error Reporting (Issue #74 - Priority #2)

**Key Dependencies**: `kleur`, `ora`, `zod`

```typescript
import kleur from 'kleur';
import ora from 'ora';
import { z } from 'zod';

// Error schema validation with zod
const TSErrorSchema = z.object({
  file: z.string(),
  line: z.number(),
  column: z.number(),
  message: z.string(),
  code: z.string().optional(),
});

type TSError = z.infer<typeof TSErrorSchema>;

// Enhanced error reporting with colors
class ErrorReporter {
  private spinner?: ReturnType<typeof ora>;

  startProgress(message: string): void {
    this.spinner = ora(message).start();
  }

  stopProgress(success: boolean, message: string): void {
    if (!this.spinner) return;

    if (success) {
      this.spinner.succeed(kleur.green(message));
    } else {
      this.spinner.fail(kleur.red(message));
    }
  }

  // Proper error propagation (from PR #49 analysis)
  reportSpawnError(error: Error, status?: number): never {
    this.stopProgress(false, 'Type checking failed');

    // Enhanced error context
    console.error(kleur.red('✗ TypeScript compilation failed'));
    console.error(kleur.gray(`Error: ${error.message}`));

    if (status) {
      console.error(kleur.gray(`Exit code: ${status}`));
    }

    // Critical: Propagate spawn errors (prevents silent failures)
    if (error) throw error;

    process.exit(status || 1);
  }

  reportTypeErrors(errors: TSError[]): void {
    console.error(kleur.red(`\n✗ Found ${errors.length} type error(s):\n`));

    for (const error of errors) {
      // Validate error structure
      const validatedError = TSErrorSchema.parse(error);

      console.error(
        [
          kleur.cyan(validatedError.file),
          kleur.yellow(`${validatedError.line}:${validatedError.column}`),
          kleur.red('error'),
          validatedError.code ? kleur.gray(`TS${validatedError.code}:`) : '',
          validatedError.message,
        ]
          .filter(Boolean)
          .join(' '),
      );
    }

    console.error(); // empty line
  }
}
```

### 3. Cross-Platform Compatibility (Issue #62, #75 - Priority #3)

**Key Dependencies**: `execa` (existing), `fs-extra`, `commander`

```typescript
import { execa } from 'execa';
import { ensureDir } from 'fs-extra';
import { Command } from 'commander';

// Package manager detection (from PR #75 analysis)
interface PackageManagerInfo {
  name: 'npm' | 'yarn' | 'pnpm' | 'bun';
  lockFile: string;
  tscPath: string;
}

async function detectPackageManager(): Promise<PackageManagerInfo> {
  // Lock file detection patterns
  const detectors = [
    {
      name: 'pnpm' as const,
      lockFile: 'pnpm-lock.yaml',
      tscPath: '../../../.bin/tsc',
    },
    { name: 'yarn' as const, lockFile: 'yarn.lock', tscPath: '../.bin/tsc' },
    { name: 'bun' as const, lockFile: 'bun.lockb', tscPath: '../.bin/tsc' },
    {
      name: 'npm' as const,
      lockFile: 'package-lock.json',
      tscPath: '../.bin/tsc',
    },
  ];

  for (const detector of detectors) {
    if (existsSync(detector.lockFile)) {
      return {
        name: detector.name,
        lockFile: detector.lockFile,
        tscPath: detector.tscPath,
      };
    }
  }

  return { name: 'npm', lockFile: '', tscPath: '../.bin/tsc' };
}

// Cross-platform TypeScript execution
async function executeTsc(
  args: string[],
  options: { cwd: string },
): Promise<void> {
  const pm = await detectPackageManager();

  // Handle different package manager paths
  const tscPath = join('node_modules', pm.tscPath);
  const tscCommand = process.platform === 'win32' ? `${tscPath}.cmd` : tscPath;

  try {
    // Use execa for reliable cross-platform execution
    await execa(tscCommand, args, {
      cwd: options.cwd,
      stdio: 'inherit',
      // Windows compatibility (from PR #62 analysis)
      shell: process.platform === 'win32',
    });
  } catch (error: any) {
    // Enhanced error reporting (from PR #49 analysis)
    if (error.code === 'ENOENT') {
      throw new Error(`TypeScript compiler not found at ${tscCommand}`);
    }

    // Critical: Propagate the error (prevents silent failures)
    throw error;
  }
}
```

### 4. TypeScript Configuration Respect (Issue #29 - Priority #4)

**Key Dependencies**: `cosmiconfig`, `deepmerge`, `zod`

```typescript
import { cosmiconfigSync } from 'cosmiconfig';
import deepmerge from 'deepmerge';
import { z } from 'zod';

// TypeScript configuration schema
const TSConfigSchema = z.object({
  extends: z.string().optional(),
  compilerOptions: z.object({}).passthrough().optional(),
  files: z.array(z.string()).optional(),
  include: z.array(z.string()).optional(),
  exclude: z.array(z.string()).optional(),
  // Support for checkJs/allowJs (from PR analysis)
  checkJs: z.boolean().optional(),
  allowJs: z.boolean().optional(),
  emitDeclarationOnly: z.boolean().optional(),
});

type TSConfig = z.infer<typeof TSConfigSchema>;

// Enhanced configuration resolution with extends chain support
class TSConfigResolver {
  private explorer = cosmiconfigSync('typescript', {
    searchPlaces: ['tsconfig.json', 'tsconfig.build.json', 'tsconfig.*.json'],
  });

  async resolveConfig(configPath?: string): Promise<TSConfig> {
    const result = configPath
      ? this.explorer.load(configPath)
      : this.explorer.search();

    if (!result) {
      throw new Error('TypeScript configuration not found');
    }

    // Validate configuration
    const config = TSConfigSchema.parse(result.config);

    // Handle extends chain (Issue #29)
    return this.resolveExtendsChain(config, dirname(result.filepath));
  }

  private async resolveExtendsChain(
    config: TSConfig,
    configDir: string,
  ): Promise<TSConfig> {
    if (!config.extends) return config;

    // Resolve relative extends path
    const extendsPath = resolve(configDir, config.extends);
    const parentResult = this.explorer.load(extendsPath);

    if (!parentResult) {
      throw new Error(`Extended configuration not found: ${config.extends}`);
    }

    const parentConfig = TSConfigSchema.parse(parentResult.config);
    const resolvedParent = await this.resolveExtendsChain(
      parentConfig,
      dirname(parentResult.filepath),
    );

    // Smart merging with deepmerge (preserve arrays correctly)
    return deepmerge(resolvedParent, config, {
      arrayMerge: (destination, source) => source, // Source overrides
    });
  }

  // Preserve original tsconfig.files (from PR #75 analysis)
  createTempConfig(originalConfig: TSConfig, targetFiles: string[]): TSConfig {
    const tempConfig: TSConfig = {
      ...originalConfig,
      compilerOptions: {
        ...originalConfig.compilerOptions,
        noEmit: true,
        skipLibCheck: true,
      },
      // Preserve original files and add new ones
      files: originalConfig.files
        ? [...originalConfig.files, ...targetFiles]
        : targetFiles,
      include: [], // Clear include to avoid conflicts
    };

    // Handle emitDeclarationOnly conflicts (from PR #69 analysis)
    if (tempConfig.compilerOptions?.emitDeclarationOnly) {
      // Remove conflicting option when using --noEmit
      delete tempConfig.compilerOptions.emitDeclarationOnly;
    }

    return tempConfig;
  }
}
```

## 🎨 CLI Enhancement Patterns

### CLI Design Inspiration: Industry Best Practices

**Patterns from markdownlint-cli2:**

1. **Professional Help Structure** - Clear version display with both tool and library versions
2. **Comprehensive Usage Documentation** - Detailed parameter explanations with cross-platform notes
3. **Practical Examples** - Most compatible syntax examples provided
4. **Configuration Discovery** - Multiple config file formats supported
5. **Glob Pattern Education** - User-friendly explanation of pattern matching

**Patterns from shadcn CLI:**

1. **Concise Tool Description** - Single line explains primary purpose clearly
2. **Standard Option Conventions** - Consistent `-v, --version` and `-h, --help` usage
3. **Progressive Help Disclosure** - `help [command]` for detailed per-command documentation
4. **Status Indicators** - Clear experimental/deprecated flags where needed
5. **Command Hierarchy** - Logical grouping with namespace prefixes (e.g., `registry:build`)

```bash
# Example help output combining best practices from both tools:

Usage: tsc-files [options] [files...]

run TypeScript compiler on specific files while respecting tsconfig.json

Options:
  -v, --version                    display the version number
  -p, --project <path>             path to tsconfig.json (auto-detected if not specified)
  --verbose                        enable verbose output with detailed progress
  --json                           output results as JSON for programmatic usage
  --no-cache                       disable temporary file caching
  --skip-lib-check                 skip type checking of declaration files
  -h, --help                       display help for command

Glob expressions (from the fast-glob library):
- * matches any number of characters, but not /
- ** matches any number of characters, including /
- {} allows for a comma-separated list of "or" expressions
- ! at the beginning negates the match

Cross-platform compatibility:
- Quote arguments to prevent shell glob expansion
- Use forward slashes (/) on all platforms
- Double-quotes (") are recommended for Windows compatibility

Examples:
  tsc-files src/index.ts                    # Single file
  tsc-files "src/**/*.ts"                   # Glob pattern (quoted)
  tsc-files --project tsconfig.build.json "src/**/*.ts"  # Custom config
  tsc-files --json "src/**/*.ts" > results.json          # JSON output

For more information, visit: https://github.com/jbabin91/tsc-files
```

### CLI Pattern Comparison

| Pattern                   | markdownlint-cli2  | shadcn              | create-start-app        | antfu/ni                | Astro                | Our Implementation                |
| ------------------------- | ------------------ | ------------------- | ----------------------- | ----------------------- | -------------------- | --------------------------------- |
| **Tool Description**      | In version header  | Concise tagline     | Clear purpose statement | Context-aware           | Clean mission        | Combined approach                 |
| **Command Structure**     | Single command     | Multi-command       | Simple args             | Terse aliases           | Organized categories | Single-purpose with extensibility |
| **Help Structure**        | Comprehensive docs | Standard commander  | Clean descriptions      | Minimal                 | Category-based       | Best of all approaches            |
| **Argument Descriptions** | Functional         | Contextual          | Very descriptive        | Context-smart           | Clear with flags     | create-start-app + Astro clarity  |
| **Context Detection**     | File-based         | Not applicable      | Not shown               | Package manager aware   | Project-aware        | TypeScript config aware           |
| **Interactive Features**  | Not shown          | Prompts for choices | Not shown               | Interactive selection   | Dev hotkeys          | Progress indicators               |
| **Configuration**         | Multiple formats   | Not applicable      | Template-driven         | Smart defaults + config | Flexible flags       | Smart defaults + cosmiconfig      |
| **Error Messages**        | Descriptive        | Clean               | Not shown               | Context-aware           | Developer-friendly   | Comprehensive with context        |

**Our Approach**: Combine antfu's context-awareness and smart defaults, Astro's organized structure, markdownlint-cli2's educational approach, shadcn's clean conventions, and create-start-app's crystal-clear descriptions.

### Enhanced CLI Implementation (Industry Best Practices)

**Key Insights from antfu's CLI Tools (ni, bumpp, taze):**

From **ni** (package manager automation):

```bash
# Context-aware package manager detection
ni              # uses correct install command based on lockfile
nr dev          # runs scripts with detected package manager
nup             # upgrades dependencies intelligently
```

From **bumpp** (version management):

```typescript
// Type-safe configuration with defineConfig
import { defineConfig } from 'bumpp';
export default defineConfig({
  execute: 'npm run build',
  recursive: true,
});
```

**antfu patterns we adopt:**

- **Context Detection**: Automatically detect TypeScript config like ni detects package managers
- **Smart Defaults**: Provide sensible defaults that "just work" like ni's package manager selection
- **Type-safe Config**: Use `defineConfig()` pattern for tsc-files configuration files
- **Terse but Clear**: Short command options that are memorable and functional

**Key Insights from Astro CLI:**

```bash
astro dev         # Development with interactive hotkeys (s=sync, o=open)
astro check       # Type checking and validation
astro build       # Production build
astro preview     # Preview production build
```

**Astro patterns we adopt:**

- **Organized Command Categories**: Clear separation of concerns (dev, build, check)
- **Interactive Development**: Progress indicators and real-time feedback during type checking
- **Comprehensive Help System**: Each command has detailed help with `--help`
- **Flexible Configuration**: Support both CLI flags and config files

**Key Insights from create-start-app CLI:**

```text
  <template-name>   The name of the template to create (e.g., 'react', 'vue', 'solid')
  [project-name]    The name of your project (optional, will prompt if not provided)

Options:
  -y, --yes         Skip all prompts and use defaults
  -v, --version     Show version information
  -h, --help        Show this help message
```

**What we adopt:**

- **Crystal clear argument descriptions**: Each parameter explains what it does AND provides examples
- **Format consistency**: Clean alignment and consistent description format
- **Example inclusion**: Show actual usage examples in parentheses
- **Optional parameter clarity**: Explicitly state when parameters are optional and what happens if not provided

**Complete implementation incorporating patterns from markdownlint-cli2, shadcn, and create-start-app:**

```typescript
import { Command } from 'commander';
import { z } from 'zod';
import kleur from 'kleur';
import { readFileSync } from 'fs';
import { join } from 'path';

// CLI argument validation schema
const CliOptionsSchema = z.object({
  project: z.string().optional(),
  verbose: z.boolean().default(false),
  json: z.boolean().default(false),
  cache: z.boolean().default(true),
  skipLibCheck: z.boolean().optional(),
});

type CliOptions = z.infer<typeof CliOptionsSchema>;

const program = new Command();

program
  .name('tsc-files')
  .description(
    'Run TypeScript compiler on specific files while respecting tsconfig.json',
  )
  .version(version)
  .arguments(
    '<files...>',
    'TypeScript files to check (supports glob patterns like "src/**/*.ts")',
  )
  .option(
    '-p, --project <path>',
    'path to tsconfig.json (default: auto-detected from current directory)',
  )
  .option('--verbose', 'enable detailed output including file processing steps')
  .option('--json', 'output results as JSON for CI/CD integration')
  .option('--no-cache', 'disable temporary file caching for debugging')
  .option(
    '--skip-lib-check',
    'skip type checking of declaration files for faster execution',
  )
  .action(async (files: string[], options: unknown) => {
    try {
      // Validate options
      const validatedOptions = CliOptionsSchema.parse(options);

      // Execute with enhanced error reporting
      await executeTypeCheck(files, validatedOptions);
    } catch (error) {
      if (validatedOptions.json) {
        console.log(JSON.stringify({ success: false, error: error.message }));
      } else {
        console.error(kleur.red(`Error: ${error.message}`));
      }
      process.exit(1);
    }
  });

// Enhanced help with colors and custom formatting
program.configureHelp({
  styleTitle: kleur.bold,
  styleCommandText: kleur.cyan,
  styleCommandDescription: kleur.gray,
  styleOptionText: kleur.yellow,
  styleOptionDescription: kleur.gray,
});

// Add custom help sections (markdownlint-cli2 style)
program.addHelpText(
  'after',
  `
${kleur.bold('Examples:')}
  ${kleur.dim('# Check specific files')}
  tsc-files src/index.ts src/utils.ts

  ${kleur.dim('# Use glob patterns (quote to prevent shell expansion)')}
  tsc-files "src/**/*.ts" "tests/**/*.ts"

  ${kleur.dim('# With custom tsconfig')}
  tsc-files --project tsconfig.build.json "src/**/*.ts"

  ${kleur.dim('# Git hook usage (lint-staged)')}
  tsc-files $(git diff --cached --name-only --diff-filter=ACM | grep -E '\\.(ts|tsx)$')

${kleur.bold('Glob Patterns:')}
  ${kleur.yellow('"src/**/*.ts"')}       All .ts files in src/ and subdirectories
  ${kleur.yellow('"**/*.{ts,tsx}"')}     All TypeScript files (including JSX)
  ${kleur.yellow('"!**/*.test.ts"')}     Exclude test files

${kleur.bold('Exit Codes:')}
  ${kleur.green('0')}  Success (no type errors)
  ${kleur.red('1')}  Type errors found
  ${kleur.red('2')}  Configuration errors (tsconfig.json issues)
  ${kleur.red('3')}  System errors (TypeScript not found)

For more information, visit: ${kleur.cyan('https://github.com/jbabin91/tsc-files')}
`,
);
```

## 🔧 Integration Strategies

### 1. Backward Compatibility

All enhancements maintain backward compatibility:

```typescript
// Old simple usage still works
await checkFiles(['src/index.ts']);

// New enhanced usage available
await checkFiles(['src/index.ts'], {
  project: './tsconfig.build.json',
  verbose: true,
  progressCallback: (message) => (spinner.text = message),
});
```

### 2. Progressive Enhancement

Features gracefully degrade if dependencies are unavailable:

```typescript
// Conditional color usage
const colorize = (text: string, color: 'red' | 'green') => {
  try {
    return kleur[color](text);
  } catch {
    return text; // Fallback to plain text
  }
};

// Conditional progress indication
const withProgress = async <T>(
  message: string,
  fn: () => Promise<T>,
): Promise<T> => {
  let spinner: any;

  try {
    spinner = ora(message).start();
  } catch {
    console.log(message); // Fallback to simple logging
  }

  try {
    const result = await fn();
    spinner?.succeed();
    return result;
  } catch (error) {
    spinner?.fail();
    throw error;
  }
};
```

### 3. Performance Optimization

Dependencies are loaded only when needed:

```typescript
// Lazy loading for optional features
let _ora: typeof ora | undefined;
const getSpinner = async () => {
  if (!_ora) {
    _ora = (await import('ora')).default;
  }
  return _ora;
};

// Tree-shaking friendly imports
import { cosmiconfigSync } from 'cosmiconfig/dist/cosmiconfigSync';
import { green, red } from 'kleur/colors';
```

## 📊 Bundle Size Analysis

### Before Phase 2 (Baseline)

- **execa**: 45kB
- **fast-glob**: 18kB
- **Total**: 63kB

### After Phase 2 (Enhanced)

- **Previous**: 63kB
- **New Dependencies**: 201kB
- **Total**: 264kB

### Size Justification

- **CLI Tools**: Professional CLI tools typically range 200-500kB
- **Developer Experience**: Enhanced UX justifies size increase
- **Optional Loading**: Most features can be lazy-loaded
- **Production Impact**: Zero runtime impact (dev tool only)

## 🧪 Testing Considerations

### Dependency Mocking Patterns

```typescript
// Mock external dependencies in tests
vi.mock('ora', () => ({
  default: vi.fn(() => ({
    start: vi.fn().mockReturnThis(),
    succeed: vi.fn(),
    fail: vi.fn(),
  })),
}));

vi.mock('kleur', () => ({
  red: vi.fn((text) => text),
  green: vi.fn((text) => text),
  yellow: vi.fn((text) => text),
}));

// Integration tests with real dependencies
describe('Real dependency integration', () => {
  beforeEach(() => {
    vi.unmock('ora');
    vi.unmock('kleur');
  });

  it('should work with real dependencies', async () => {
    // Test with actual spinner and colors
  });
});
```

## 🔄 Migration Path

### Phase 2.1: CLI Enhancement (First)

1. Replace argument parsing with commander
2. Add basic color support with kleur
3. Add progress indicators with ora
4. Implement antfu-style context detection

### Phase 2.2: Configuration Enhancement (Second)

1. Implement cosmiconfig for config resolution
2. Add extends chain support with deepmerge
3. Add validation with zod
4. Add type-safe config with defineConfig pattern

### Phase 2.3: Monorepo Support (Third)

1. Implement per-file tsconfig resolution
2. Add tsconfig-paths integration
3. Add fs-extra for reliable file operations
4. Implement Astro-style organized commands

### Phase 2.4: Integration & Polish (Fourth)

1. End-to-end testing with all dependencies
2. Performance optimization
3. Interactive features (progress, real-time feedback)
4. Documentation completion

## 🚀 Phase 3 Expansion Ideas (Inspired by Advanced CLIs)

### Config Generation (antfu/Astro style)

Following the pattern from `astro create` and antfu's tools, we could add:

```bash
# Generate tsc-files configuration
tsc-files init                    # Interactive config generation
tsc-files init --template monorepo  # Pre-configured templates

# Config validation and optimization
tsc-files config check           # Validate current configuration
tsc-files config optimize        # Suggest optimizations
```

**Template Examples:**

- `monorepo`: Optimized for monorepo setups with per-package tsconfig
- `ci`: Configured for CI/CD environments
- `strict`: Maximum type safety configuration
- `performance`: Optimized for large codebases

**Configuration Pattern (bumpp-inspired):**

```typescript
// tsc-files.config.ts
import { defineConfig } from '@jbabin91/tsc-files';

export default defineConfig({
  projects: ['packages/*'],
  exclude: ['**/*.test.ts'],
  parallel: true,
  beforeCheck: 'npm run build',
  afterCheck: 'npm run lint',
});
```

### Advanced Type Checking Features

```bash
# Dependent file checking (like Astro's dependency tracking)
tsc-files check --deps           # Check dependent files too
tsc-files check --graph          # Show dependency graph
tsc-files watch                  # Watch mode with file change detection

# Project analysis
tsc-files analyze               # Project health check
tsc-files metrics               # Type coverage and metrics
```

### Multi-Project Support (antfu collective style)

```bash
# Workspace-aware type checking
tsc-files --workspace            # Check all workspace packages
tsc-files --changed-only         # Check only changed packages (CI optimization)
```

**Key Design Principles from Our Research:**

- **antfu's Context Awareness**: Automatically detect project setup and provide smart defaults
- **Astro's Command Organization**: Clean separation of concerns with logical command grouping
- **Interactive Development**: Real-time feedback and progress indicators during operations
- **Type-safe Configuration**: Use `defineConfig()` pattern for configuration files
- **Template-driven Setup**: Pre-configured templates for common use cases

This systematic approach ensures stable incremental progress with full testing at each stage.
