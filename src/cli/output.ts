import kleur from 'kleur';

import type { ValidatedCliOptions } from '@/types/cli';
import type { CheckResult } from '@/types/core';
import { logger } from '@/utils/logger';

/**
 * Output context for managing progress and formatting
 */
export type OutputContext = {
  json: boolean;
  verbose: boolean;
};

/**
 * Create output context based on CLI options
 */
export function createOutputContext(
  options: ValidatedCliOptions,
): OutputContext {
  return {
    json: options.json,
    verbose: options.verbose,
  };
}

/**
 * Start progress indicator (no-op, spinners removed)
 */
export function startProgress(
  context: OutputContext,
  _fileCount: number,
): OutputContext {
  return context;
}

/**
 * Update progress indicator based on result (no-op, spinners removed)
 */
export function updateProgress(
  _context: OutputContext,
  _result: CheckResult,
): void {
  // No spinner to update
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

    // Format success message to stdout
    if (result.success) {
      stdout += kleur.green('✓ Type check passed') + '\n';
    }

    // Format verbose info to stdout
    if (context.verbose) {
      const duration = kleur.dim(`${result.duration}ms`);
      const fileCount = kleur.bold(result.checkedFiles.length.toString());
      stdout += `Checked ${fileCount} files in ${duration}\n`;
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
  logger.error(message);
  if (tip) {
    logger.error(`\n${tip}`);
  }
}

/**
 * Output educational tips to console
 */
export function outputTip(message: string): void {
  logger.info(kleur.dim(`💡 ${message}`));
}

/**
 * Output performance insight to console
 */
export function outputPerformanceInsight(message: string): void {
  logger.info(kleur.cyan(`⚡ ${message}`));
}
