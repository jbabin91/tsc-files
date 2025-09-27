import kleur from 'kleur';
import ora from 'ora';

import type { ValidatedCliOptions } from '@/types/cli';
import type { CheckResult } from '@/types/core';
import { logger } from '@/utils/logger';

/**
 * Output context for managing progress and formatting
 */
export type OutputContext = {
  spinner?: ReturnType<typeof ora>;
  json: boolean;
  verbose: boolean;
  showProgress: boolean;
};

/**
 * Create output context based on CLI options
 */
export function createOutputContext(
  options: ValidatedCliOptions,
): OutputContext {
  const showProgress = !options.json && process.stdout.isTTY && !process.env.CI;

  return {
    json: options.json,
    verbose: options.verbose,
    showProgress,
  };
}

/**
 * Start progress indicator
 */
export function startProgress(
  context: OutputContext,
  fileCount: number,
): OutputContext {
  if (!context.showProgress) {
    return context;
  }

  const fileText = fileCount === 1 ? 'file' : 'files';
  const spinner = ora(
    kleur.cyan(
      `Type checking ${kleur.bold(fileCount.toString())} ${fileText}...`,
    ),
  ).start();

  return { ...context, spinner };
}

/**
 * Update progress indicator based on result
 */
export function updateProgress(
  context: OutputContext,
  result: CheckResult,
): void {
  if (!context.spinner) {
    return;
  }

  if (result.success) {
    context.spinner.succeed(kleur.green('✓ Type check completed'));
  } else {
    context.spinner.fail(
      kleur.red(`✗ Found ${result.errors.length} type errors`),
    );
  }
}

/**
 * Format output based on result and context
 */
export function formatOutput(
  context: OutputContext,
  result: CheckResult,
): { stdout: string; stderr: string } {
  let stdout = '';
  let stderr = '';

  if (context.json) {
    stdout = JSON.stringify(result, null, 2);
  } else {
    // Format errors to stderr
    if (result.errors.length > 0) {
      stderr += '\n';
      for (const error of result.errors) {
        const fileLocation = kleur.cyan(
          `${error.file}:${error.line}:${error.column}`,
        );
        const errorMessage = kleur.red(error.message);
        stderr += `${fileLocation} - ${errorMessage}\n`;
      }
    }

    // Format verbose info to stdout
    if (context.verbose && !context.spinner) {
      const duration = kleur.dim(`${result.duration}ms`);
      const fileCount = kleur.bold(result.checkedFiles.length.toString());
      stdout += `\nChecked ${fileCount} files in ${duration}\n`;
    }

    // Format success message to stdout
    if (result.success && !context.spinner) {
      stdout += kleur.green('✓ Type check passed') + '\n';
    }
  }

  return { stdout, stderr };
}

/**
 * Output formatted messages to console
 */
export function outputToConsole(stdout: string, stderr: string): void {
  if (stdout) {
    logger.info(stdout.replace(/\n$/, '')); // Remove trailing newline
  }
  if (stderr) {
    logger.error(stderr.replace(/\n$/, '')); // Remove trailing newline
  }
}

/**
 * Output error messages to console
 */
export function outputError(message: string, tip?: string): void {
  console.error(message); // eslint-disable-line no-console
  if (tip) {
    console.error(`\n${tip}`); // eslint-disable-line no-console
  }
}

/**
 * Output educational tips to console
 */
export function outputTip(message: string): void {
  console.info(kleur.dim(`💡 ${message}`)); // eslint-disable-line no-console
}

/**
 * Output performance insight to console
 */
export function outputPerformanceInsight(message: string): void {
  console.info(kleur.cyan(`⚡ ${message}`)); // eslint-disable-line no-console
}
