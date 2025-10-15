import { cli } from 'cleye';
import kleur from 'kleur';

import { logger } from '@/utils/logger';

import packageJson from '../../package.json' with { type: 'json' };

/**
 * Validate project path argument
 */
export function validateProjectPath(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) {
    throw new Error('Project path cannot be empty.');
  }
  if (!trimmed.endsWith('.json')) {
    throw new Error(
      'Project path must point to a JSON file (e.g., tsconfig.json).',
    );
  }
  return trimmed;
}

/**
 * Create cleye CLI program with all options and help text
 * Note: cleye automatically parses process.argv when called
 */
export function createProgram(
  actionHandler: (files: string[], options: unknown) => Promise<void>,
) {
  return cli(
    {
      name: 'tsc-files',
      version: packageJson.version,
      parameters: ['<files...>'],
      flags: {
        project: {
          type: String,
          alias: 'p',
          description:
            'path to tsconfig.json (default: auto-detected from current directory)',
          default: process.env.TSC_PROJECT,
        },
        verbose: {
          type: Boolean,
          description: 'enable detailed output including file processing steps',
        },
        json: {
          type: Boolean,
          description: 'output results as JSON for CI/CD integration',
        },
        cache: {
          type: Boolean,
          default: true,
          description:
            'enable temporary file caching (use --no-cache to disable)',
        },
        skipLibCheck: {
          type: Boolean,
          description:
            'skip type checking of declaration files for faster execution',
        },
        useTsc: {
          type: Boolean,
          description: 'force use of tsc compiler even if tsgo is available',
        },
        useTsgo: {
          type: Boolean,
          description: 'force use of tsgo compiler (fail if not available)',
        },
        showCompiler: {
          type: Boolean,
          description: 'display which TypeScript compiler is being used',
        },
        benchmark: {
          type: Boolean,
          description: 'run performance comparison between available compilers',
        },
        fallback: {
          type: Boolean,
          default: true,
          description:
            'enable automatic fallback from tsgo to tsc on failure (use --no-fallback to disable)',
        },
        tips: {
          type: Boolean,
          description:
            'show performance optimization tips for git hooks and TypeScript compilation',
        },
        include: {
          type: String,
          description:
            'additional files to include in type checking (comma-separated, useful for test setup files)',
        },
      },
      help: {
        description:
          'Run TypeScript compiler on specific files while respecting tsconfig.json',
        examples: createHelpExamples(),
      },
    },
    (parsed) => {
      try {
        // Validate project path manually (cleye doesn't support validation)
        if (parsed.flags.project) {
          validateProjectPath(parsed.flags.project);
        }

        // Pre-action logging (replaces commander's hook)
        handleVerboseLogging(parsed);

        // Convert cleye flags to commander-style options for compatibility
        const options = convertCleyeFlagsToOptions(parsed.flags);

        // Call the action handler
        void actionHandler(parsed._, options);
      } catch (error) {
        // Handle errors in the callback - don't call process.exit() in tests
        const errorMessage = (error as Error).message;
        logger.error(kleur.red(`Error: ${errorMessage}`));

        // Add helpful hint for common errors
        if (errorMessage.includes('Project path must point to a JSON file')) {
          logger.error(
            kleur.yellow(
              'Tip: Use --project flag to specify a different tsconfig.json path',
            ),
          );
        } else if (
          errorMessage.includes('not found') ||
          errorMessage.includes('Cannot find')
        ) {
          logger.error(
            kleur.yellow(
              'Tip: Ensure TypeScript is installed: npm install -D typescript',
            ),
          );
        }

        if (process.env.NODE_ENV !== 'test') {
          process.exit(1);
        }
        // In test environment, throw the error so tests can catch it
        throw error;
      }
    },
  );
}

/**
 * Convert cleye flags to commander-style options for compatibility
 */
export function convertCleyeFlagsToOptions(
  flags: Record<string, unknown>,
): Record<string, unknown> {
  return {
    ...flags,
    // Handle negated flags
    'no-cache': !flags.cache,
    'no-fallback': !flags.fallback,
  };
}

/**
 * Handle verbose logging for cleye callback
 */
export function handleVerboseLogging(parsed: {
  flags: Record<string, unknown>;
  _: string[];
}): void {
  if (parsed.flags.verbose) {
    logger.debug(
      `🔍 About to execute tsc-files with ${parsed._.length} file argument(s)`,
    );
    logger.debug(`📋 Options: ${JSON.stringify(parsed.flags, null, 2)}`);
    logger.debug(`📁 Arguments: ${JSON.stringify(parsed._)}`);
    if (process.env.TSC_PROJECT) {
      logger.debug(
        `🌍 TSC_PROJECT environment variable: ${process.env.TSC_PROJECT}`,
      );
    }
  }
}

/**
 * Create help examples for cleye
 */
export function createHelpExamples(): string[] {
  return [
    '# Check specific files',
    'tsc-files src/index.ts src/utils.ts',
    '',
    '# Use glob patterns (quote to prevent shell expansion)',
    'tsc-files "src/**/*.ts" "tests/**/*.ts"',
    '',
    '# With custom tsconfig',
    'tsc-files --project tsconfig.build.json "src/**/*.ts"',
    '',
    '# Using environment variable',
    'TSC_PROJECT=tsconfig.build.json tsc-files "src/**/*.ts"',
    '',
    '# Git hook usage (lint-staged)',
    String.raw`tsc-files $(git diff --cached --name-only --diff-filter=ACM | grep -E '\.(ts|tsx)$')`,
    '',
    '# Compiler selection',
    'tsc-files --use-tsgo "src/**/*.ts"     # Force use tsgo for speed',
    'tsc-files --use-tsc "src/**/*.ts"      # Force use tsc for compatibility',
    'tsc-files --show-compiler "src/**/*.ts" # Show which compiler is used',
    'tsc-files --benchmark "src/**/*.ts"    # Compare compiler performance',
    '',
    'Glob Patterns:',
    '"src/**/*.ts"       All .ts files in src/ and subdirectories',
    '"**/*.{ts,tsx}"     All TypeScript files (including JSX)',
    '"!**/*.test.ts"     Exclude test files',
    '',
    'Exit Codes:',
    '0  Success (no type errors)',
    '1  Type errors found',
    '2  Configuration errors (tsconfig.json issues)',
    '3  System errors (TypeScript not found)',
    '',
    'For more information, visit: https://github.com/jbabin91/tsc-files',
  ];
}
