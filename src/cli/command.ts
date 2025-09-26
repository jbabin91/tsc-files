import { Command } from 'commander';
import kleur from 'kleur';

import packageJson from '../../package.json' with { type: 'json' };

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
    .action(actionHandler);

  // Configure better error handling and help display
  program
    .showHelpAfterError('(add --help for additional information)')
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
  return `
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
`;
}

/**
 * Parse and validate command arguments
 */
export function parseArguments(
  program: Command,
  args?: string[],
): { files: string[]; options: unknown } {
  const parsedArgs = program.parse(args, { from: 'user' });
  return {
    files: parsedArgs.args,
    options: parsedArgs.opts(),
  };
}
