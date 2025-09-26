/**
 * TypeScript compiler execution utilities
 */

import { execa } from 'execa';

import { findTypeScriptCompiler } from '@/detectors/typescript';
import type { CheckOptions, CheckResult } from '@/types';

import { parseAndSeparateOutput } from './output-parser';

/**
 * Execution result from TypeScript compiler
 */
export type ExecutionResult = {
  /** Whether execution was successful */
  success: boolean;
  /** Raw stdout output */
  stdout: string;
  /** Raw stderr output */
  stderr: string;
  /** Combined stdout and stderr */
  allOutput: string;
  /** Exit code from process */
  exitCode: number;
  /** Error message if execution failed */
  errorMessage?: string;
};

/**
 * Extract execution details from error object
 * @param execError - Error object from execa
 * @returns Extracted execution details
 */
function extractExecutionDetails(execError: unknown): {
  stdout: string;
  stderr: string;
  exitCode: number;
  message: string;
} {
  const stdout =
    typeof execError === 'object' &&
    execError !== null &&
    'stdout' in execError &&
    typeof execError.stdout === 'string'
      ? execError.stdout
      : '';

  const stderr =
    typeof execError === 'object' &&
    execError !== null &&
    'stderr' in execError &&
    typeof execError.stderr === 'string'
      ? execError.stderr
      : '';

  const exitCode =
    typeof execError === 'object' &&
    execError !== null &&
    'exitCode' in execError &&
    typeof execError.exitCode === 'number'
      ? execError.exitCode
      : 1;

  const message =
    typeof execError === 'object' &&
    execError !== null &&
    'message' in execError &&
    typeof execError.message === 'string'
      ? execError.message
      : String(execError);

  return { stdout, stderr, exitCode, message };
}

/**
 * Execute TypeScript compiler with given configuration
 * @param tempConfigPath - Path to temporary TypeScript configuration
 * @param cwd - Current working directory
 * @param options - Check options for verbose logging
 * @returns Promise resolving to execution result
 */
export async function executeTypeScriptCompiler(
  tempConfigPath: string,
  cwd: string,
  options: Pick<CheckOptions, 'verbose'>,
): Promise<ExecutionResult> {
  const tsInfo = findTypeScriptCompiler(cwd);
  const args = [...tsInfo.args, '--project', tempConfigPath];

  if (options.verbose) {
    // eslint-disable-next-line no-console
    console.log(`Using ${tsInfo.packageManager.manager} package manager`);
  }

  try {
    const result = await execa(tsInfo.executable, args, {
      cwd,
      timeout: 30_000,
      cleanup: true,
      shell: tsInfo.useShell,
    });

    const allOutput = `${result.stdout}\n${result.stderr}`.trim();

    return {
      success: true,
      stdout: result.stdout,
      stderr: result.stderr,
      allOutput,
      exitCode: result.exitCode ?? 0,
    };
  } catch (execError: unknown) {
    const { stdout, stderr, exitCode, message } =
      extractExecutionDetails(execError);
    const allOutput = `${stdout}\n${stderr}`.trim();

    return {
      success: false,
      stdout,
      stderr,
      allOutput,
      exitCode,
      errorMessage: message,
    };
  }
}

/**
 * Execute TypeScript compiler and parse results into CheckResult
 * @param tempConfigPath - Path to temporary TypeScript configuration
 * @param checkedFiles - List of files being checked
 * @param cwd - Current working directory
 * @param options - Check options
 * @param startTime - Start time for duration calculation
 * @returns Promise resolving to check result
 */
export async function executeAndParseTypeScript(
  tempConfigPath: string,
  checkedFiles: string[],
  cwd: string,
  options: CheckOptions,
  startTime: number,
): Promise<CheckResult> {
  const executionResult = await executeTypeScriptCompiler(
    tempConfigPath,
    cwd,
    options,
  );
  const { errors, warnings } = parseAndSeparateOutput(
    executionResult.allOutput,
  );

  // If no errors were parsed but execution failed with non-zero exit code,
  // treat it as a system error
  if (
    errors.length === 0 &&
    !executionResult.success &&
    executionResult.exitCode !== 0
  ) {
    const errorMessage =
      executionResult.allOutput ??
      executionResult.errorMessage ??
      'Unknown error';
    throw new Error(`TypeScript compiler failed: ${errorMessage}`);
  }

  return {
    success: errors.length === 0,
    errorCount: errors.length,
    warningCount: warnings.length,
    errors,
    warnings,
    duration: Math.round(performance.now() - startTime),
    checkedFiles,
  };
}
