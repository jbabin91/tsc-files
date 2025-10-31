import { Command, InvalidArgumentError, Option } from 'commander';
import kleur from 'kleur';

import type { RawCliOptions } from '@/types/cli';
import { logger } from '@/utils/logger';

import packageJson from '../../package.json' with { type: 'json' };

/**
 * Validate project path argument
 */
function validateProjectPath(value: string): string {
  if (!value.trim()) {
    throw new InvalidArgumentError('Project path cannot be empty.');
  }
  if (!value.endsWith('.json')) {
    throw new InvalidArgumentError(
      'Project path must point to a JSON file (e.g., tsconfig.json).',
    );
  }
  return value.trim();
}

/**
 * Create Commander.js program with all options and help text
 */
export function createProgram(
  actionHandler: (files: string[], options: unknown) => Promise<void>,
): Command {
  const program = new Command();

  program
    .name('tsc-files')
    .description(
      'Run TypeScript compiler on specific files while respecting tsconfig.json',
    )
    .version(packageJson.version, '-v, --version', 'output the version number')
    .argument(
      '<files...>',
      'TypeScript files to check (supports glob patterns like "src/**/*.ts")',
    )
    .addOption(
      new Option(
        '-p, --project <path>',
        'path to tsconfig.json (default: auto-detected from current directory)',
      )
        .env('TSC_PROJECT')
        .argParser(validateProjectPath),
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
    .option('--use-tsc', 'force use of tsc compiler even if tsgo is available')
    .option('--use-tsgo', 'force use of tsgo compiler (fail if not available)')
    .option(
      '--show-compiler',
      'display which TypeScript compiler is being used',
    )
    .option(
      '--benchmark',
      'run performance comparison between available compilers',
    )
    .option(
      '--no-fallback',
      'disable automatic fallback from tsgo to tsc on failure',
    )
    .option(
      '--tips',
      'show performance optimization tips for git hooks and TypeScript compilation',
    )
    .option(
      '--include <files>',
      'additional files to include in type checking (comma-separated, useful for test setup files)',
    )
    .option(
      '--max-depth <number>',
      'maximum recursion depth for import discovery (default: 20)',
      (value) => {
        const parsed = Number.parseInt(value, 10);
        if (Number.isNaN(parsed) || parsed < 1) {
          throw new InvalidArgumentError(
            'max-depth must be a positive integer',
          );
        }
        return parsed;
      },
    )
    .option(
      '--max-files <number>',
      'maximum files to discover recursively (default: 100)',
      (value) => {
        const parsed = Number.parseInt(value, 10);
        if (Number.isNaN(parsed) || parsed < 1) {
          throw new InvalidArgumentError(
            'max-files must be a positive integer',
          );
        }
        return parsed;
      },
    )
    .option(
      '--no-recursive',
      'disable recursive import discovery for transitive dependencies',
    )
    .hook('preAction', (_, actionCommand) => {
      const options = actionCommand.opts();
      if (options.verbose) {
        logger.debug(
          `🔍 About to execute tsc-files with ${actionCommand.args.length} file argument(s)`,
        );
        logger.debug(`📋 Options: ${JSON.stringify(options, null, 2)}`);
        logger.debug(`📁 Arguments: ${JSON.stringify(actionCommand.args)}`);
        if (process.env.TSC_PROJECT) {
          logger.debug(
            `🌍 TSC_PROJECT environment variable: ${process.env.TSC_PROJECT}`,
          );
        }
      }
    })
    .action(actionHandler);

  // Configure better error handling and help display
  program
    .showHelpAfterError('(add --help for additional information)')
    .showSuggestionAfterError(false) // Disable spelling suggestions for cleaner output
    .configureOutput({
      // Use colored output for errors
      outputError: (str, write) => write(kleur.red(str)),
    });

  program.configureHelp({
    styleTitle: kleur.bold,
    styleCommandText: kleur.cyan,
    styleCommandDescription: kleur.gray,
    styleOptionText: kleur.yellow,
    styleOptionDescription: kleur.gray,
  });

  program.addHelpText('after', createHelpText());

  return program;
}

/**
 * Create detailed help text with examples and patterns
 */
function createHelpText(): string {
  return String.raw`
${kleur.bold('Examples:')}
  ${kleur.dim('# Check specific files')}
  tsc-files src/index.ts src/utils.ts

  ${kleur.dim('# Use glob patterns (quote to prevent shell expansion)')}
  tsc-files "src/**/*.ts" "tests/**/*.ts"

  ${kleur.dim('# With custom tsconfig')}
  tsc-files --project tsconfig.build.json "src/**/*.ts"

  ${kleur.dim('# Using environment variable')}
  TSC_PROJECT=tsconfig.build.json tsc-files "src/**/*.ts"

  ${kleur.dim('# Git hook usage (lint-staged)')}
  tsc-files $(git diff --cached --name-only --diff-filter=ACM | grep -E '\.(ts|tsx)$')

  ${kleur.dim('# Compiler selection')}
  tsc-files --use-tsgo "src/**/*.ts"     # Force use tsgo for speed
  tsc-files --use-tsc "src/**/*.ts"      # Force use tsc for compatibility
  tsc-files --show-compiler "src/**/*.ts" # Show which compiler is used
  tsc-files --benchmark "src/**/*.ts"    # Compare compiler performance

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
`;
}

/**
 * Parse and validate command arguments
 */
export function parseArguments(
  program: Command,
  args?: string[],
): { files: string[]; options: RawCliOptions } {
  const parsedArgs = program.parse(args, { from: 'user' });
  return {
    files: parsedArgs.args,
    options: parsedArgs.opts(),
  };
}
