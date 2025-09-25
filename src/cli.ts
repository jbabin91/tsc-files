#!/usr/bin/env node

/**
 * CLI entry point for @jbabin91/tsc-files
 */

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';

import { checkFiles } from '@/core/checker.js';
import type { CheckOptions } from '@/types';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

const HELP_TEXT = `
Usage: tsc-files [options] <files...>

Run TypeScript compiler on specific files or glob patterns without ignoring tsconfig.json

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
  tsc-files src/index.ts                    # Check specific file
  tsc-files "src/**/*.ts"                   # Check all .ts files in src/
  tsc-files "src/**/*.{ts,tsx}"             # Check .ts and .tsx files
  tsc-files --project tsconfig.build.json src # Check all TS files in src/
  tsc-files --verbose --skipLibCheck src/*.ts # Check with verbose output

Note: Always quote glob patterns to prevent shell expansion
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
      console.log(getVersion());
      process.exit(0);
    }

    // Get files/patterns to check
    const patterns = positionals;

    if (patterns.length === 0) {
      console.error('Error: No files or patterns specified');
      console.log(HELP_TEXT);
      process.exit(2);
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
    const result = await checkFiles(patterns, options);

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
    const message = error instanceof Error ? error.message : String(error);

    // Check for specific error types and provide appropriate exit codes
    if (
      message.includes('tsconfig.json not found') ||
      message.includes('Failed to read tsconfig.json') ||
      message.includes('TypeScript config not found')
    ) {
      console.error('Configuration Error:', message);
      process.exit(2);
    } else if (
      message.includes('TypeScript compiler failed') ||
      message.includes('tsc')
    ) {
      console.error('System Error:', message);
      process.exit(3);
    } else {
      console.error('Error:', message);
      process.exit(99);
    }
  }
}

// Handle unhandled rejections
process.on('unhandledRejection', (error) => {
  console.error('Unhandled rejection:', error);
  process.exit(99);
});

// Run CLI
void main();
