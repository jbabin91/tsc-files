#!/usr/bin/env node

/**
 * CLI entry point for @jbabin91/tsc-files
 */

import { parseArgs } from 'node:util';

import { checkFiles } from './core/checker.js';
import type { CheckOptions } from './types.js';

const HELP_TEXT = `
Usage: tsc-files [options] <files...>

Run TypeScript compiler on specific files without ignoring tsconfig.json

Options:
  --help, -h           Show this help message
  --version, -v        Show version number
  --project, -p        Specify tsconfig.json path
  --noEmit             Don't emit files (default: true)
  --skipLibCheck       Skip type checking of declaration files
  --verbose            Enable verbose output
  --cache              Use cache directory for temp files (default: true)
  --no-cache           Disable caching
  --json               Output results as JSON

Examples:
  tsc-files --noEmit src/index.ts
  tsc-files --project tsconfig.build.json src/**/*.ts
  tsc-files --verbose --skipLibCheck src/*.ts
`;

async function main(): Promise<void> {
  try {
    const { values, positionals } = parseArgs({
      args: process.argv.slice(2),
      allowPositionals: true,
      options: {
        help: { type: 'boolean', short: 'h' },
        version: { type: 'boolean', short: 'v' },
        project: { type: 'string', short: 'p' },
        noEmit: { type: 'boolean' },
        skipLibCheck: { type: 'boolean' },
        verbose: { type: 'boolean' },
        cache: { type: 'boolean' },
        'no-cache': { type: 'boolean' },
        json: { type: 'boolean' },
      },
    });

    // Show help
    if (values.help) {
      console.log(HELP_TEXT);
      process.exit(0);
    }

    // Show version
    if (values.version) {
      // TODO: Read from package.json
      console.log('0.1.0');
      process.exit(0);
    }

    // Get files to check
    const files = positionals;
    if (files.length === 0) {
      console.error('Error: No files specified');
      console.log(HELP_TEXT);
      process.exit(1);
    }

    // Build options
    const options: CheckOptions = {
      project: values.project,
      noEmit: values.noEmit ?? true,
      skipLibCheck: values.skipLibCheck,
      verbose: values.verbose,
      cache: values['no-cache'] ? false : (values.cache ?? true),
    };

    // Run type checking
    const result = await checkFiles(files, options);

    // Output results
    if (values.json) {
      console.log(JSON.stringify(result, null, 2));
    } else {
      if (result.errors.length > 0) {
        for (const error of result.errors) {
          console.error(
            `${error.file}:${error.line}:${error.column} - ${error.message}`,
          );
        }
      }

      if (values.verbose) {
        console.log(
          `Checked ${result.checkedFiles.length} files in ${result.duration}ms`,
        );
      }

      if (result.success) {
        console.log('✓ Type check passed');
      }
    }

    process.exit(result.success ? 0 : 1);
  } catch (error) {
    console.error(
      'Error:',
      error instanceof Error ? error.message : String(error),
    );
    process.exit(99);
  }
}

// Handle unhandled rejections
process.on('unhandledRejection', (error) => {
  console.error('Unhandled rejection:', error);
  process.exit(99);
});

// Run CLI
void main();
