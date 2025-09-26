#!/usr/bin/env node

/**
 * CLI entry point for @jbabin91/tsc-files
 * Enhanced with commander.js, kleur colors, and ora progress indicators
 */

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { Command } from 'commander';
import kleur from 'kleur';
import ora from 'ora';
import { z } from 'zod';

import { checkFiles } from '@/core/checker';
import type { CheckOptions } from '@/types';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CliOptionsSchema = z.object({
  project: z.string().optional(),
  noEmit: z.boolean().default(true),
  skipLibCheck: z.boolean().default(false),
  verbose: z.boolean().default(false),
  cache: z.boolean().default(true),
  json: z.boolean().default(false),
});

function getVersion(): string {
  try {
    const packageJsonPath = path.join(__dirname, '..', 'package.json');
    const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8')) as {
      version: string;
    };
    return packageJson.version;
  } catch {
    return '0.0.0-dev';
  }
}

function createProgram(): Command {
  const program = new Command();
  const version = getVersion();

  program
    .name('tsc-files')
    .description(
      'Run TypeScript compiler on specific files while respecting tsconfig.json',
    )
    .version(version, '-v, --version', 'output the version number')
    .argument(
      '<files...>',
      'TypeScript files to check (supports glob patterns like "src/**/*.ts")',
    )
    .option(
      '-p, --project <path>',
      'path to tsconfig.json (default: auto-detected from current directory)',
    )
    .option(
      '--verbose',
      'enable detailed output including file processing steps',
    )
    .option('--json', 'output results as JSON for CI/CD integration')
    .option('--no-cache', 'disable temporary file caching for debugging')
    .option(
      '--skip-lib-check',
      'skip type checking of declaration files for faster execution',
    )
    .action(async (files: string[], options: unknown) => {
      await runTypeCheck(files, options);
    });

  program.configureHelp({
    styleTitle: kleur.bold,
    styleCommandText: kleur.cyan,
    styleCommandDescription: kleur.gray,
    styleOptionText: kleur.yellow,
    styleOptionDescription: kleur.gray,
  });

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

  return program;
}

async function runTypeCheck(files: string[], options: unknown): Promise<void> {
  let spinner: ReturnType<typeof ora> | undefined;

  try {
    const validatedOptions = CliOptionsSchema.parse(
      typeof options === 'object' && options !== null ? options : {},
    );

    const showProgress =
      !validatedOptions.json && process.stdout.isTTY && !process.env.CI;

    if (showProgress) {
      const fileCount = files.length;
      const fileText = fileCount === 1 ? 'file' : 'files';
      spinner = ora(
        kleur.cyan(
          `Type checking ${kleur.bold(fileCount.toString())} ${fileText}...`,
        ),
      ).start();
    }

    const checkOptions: CheckOptions = {
      project: validatedOptions.project,
      noEmit: validatedOptions.noEmit,
      skipLibCheck: validatedOptions.skipLibCheck,
      verbose: validatedOptions.verbose,
      cache: validatedOptions.cache,
    };

    const result = await checkFiles(files, checkOptions);
    if (spinner) {
      if (result.success) {
        spinner.succeed(kleur.green('✓ Type check completed'));
      } else {
        spinner.fail(kleur.red(`✗ Found ${result.errors.length} type errors`));
      }
    }

    if (validatedOptions.json) {
      console.log(JSON.stringify(result, null, 2));
    } else {
      if (result.errors.length > 0) {
        console.error();
        for (const error of result.errors) {
          const fileLocation = kleur.cyan(
            `${error.file}:${error.line}:${error.column}`,
          );
          const errorMessage = kleur.red(error.message);
          console.error(`${fileLocation} - ${errorMessage}`);
        }
      }

      if (validatedOptions.verbose && !spinner) {
        const duration = kleur.dim(`${result.duration}ms`);
        const fileCount = kleur.bold(result.checkedFiles.length.toString());
        console.log(`\nChecked ${fileCount} files in ${duration}`);
      }

      if (result.success && !spinner) {
        console.log(kleur.green('✓ Type check passed'));
      }
    }

    // Determine exit code based on result
    if (result.success) {
      process.exit(0);
    } else {
      // Check if any errors are configuration errors
      const hasConfigError = result.errors.some(
        (error) =>
          error.code === 'CONFIG_ERROR' ||
          error.message.includes('tsconfig.json') ||
          error.message.includes('TypeScript config not found') ||
          error.message.includes('No tsconfig.json found'),
      );

      if (hasConfigError) {
        // Format as configuration error for better output
        const configError = result.errors.find(
          (error) =>
            error.code === 'CONFIG_ERROR' ||
            error.message.includes('tsconfig.json') ||
            error.message.includes('TypeScript config not found') ||
            error.message.includes('No tsconfig.json found'),
        );
        if (configError) {
          console.error(
            kleur.red('Configuration Error:'),
            kleur.dim(configError.message),
          );
          console.error(
            kleur.yellow('\nTip:'),
            'Use --project flag to specify a different tsconfig.json path',
          );
        }
        process.exit(2);
      } else {
        process.exit(1);
      }
    }
  } catch (error) {
    if (spinner) {
      spinner.fail(kleur.red('✗ Type check failed'));
    }

    const message = error instanceof Error ? error.message : String(error);

    // Configuration errors (exit code 2)
    if (
      message.includes('tsconfig.json not found') ||
      message.includes('Failed to read tsconfig.json') ||
      message.includes('TypeScript config not found') ||
      message.includes('No tsconfig.json found') ||
      message.includes('Configuration Error')
    ) {
      console.error(kleur.red('Configuration Error:'), kleur.dim(message));
      console.error(
        kleur.yellow('\nTip:'),
        'Use --project flag to specify a different tsconfig.json path',
      );
      process.exit(2);
    }
    // System errors (exit code 3)
    else if (
      message.includes('TypeScript compiler failed') ||
      message.includes('TypeScript not found') ||
      message.includes('tsc') ||
      message.includes('System Error')
    ) {
      console.error(kleur.red('System Error:'), kleur.dim(message));
      console.error(
        kleur.yellow('\nTip:'),
        'Ensure TypeScript is installed: npm install -D typescript',
      );
      process.exit(3);
    }
    // Unknown errors (exit code 99)
    else {
      console.error(kleur.red('Error:'), kleur.dim(message));
      process.exit(99);
    }
  }
}

async function main(): Promise<void> {
  const program = createProgram();

  process.on('unhandledRejection', (error) => {
    console.error(kleur.red('Unhandled rejection:'), error);
    process.exit(99);
  });

  await program.parseAsync();
}

void main();
