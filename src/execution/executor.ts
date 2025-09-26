import { execa, type ExecaError } from 'execa';

import { findTypeScriptCompiler } from '@/detectors/typescript';
import { parseAndSeparateOutput } from '@/execution/output-parser';
import type { CheckOptions, CheckResult } from '@/types/core';
import { logger } from '@/utils/logger';

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
 * Extract execution details from ExecaError
 * @param execError - ExecaError from execa
 * @returns Extracted execution details
 */
function extractExecutionDetails(execError: ExecaError): {
  stdout: string;
  stderr: string;
  allOutput: string;
  exitCode: number;
  message: string;
} {
  const stdout = typeof execError.stdout === 'string' ? execError.stdout : '';
  const stderr = typeof execError.stderr === 'string' ? execError.stderr : '';
  const allOutput =
    typeof execError.all === 'string'
      ? execError.all
      : `${stdout}\n${stderr}`.trim();

  return {
    stdout,
    stderr,
    allOutput,
    exitCode: execError.exitCode ?? 1,
    message:
      execError.shortMessage || execError.originalMessage || execError.message,
  };
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
    logger.info(`Using ${tsInfo.packageManager.manager} package manager`);
  }

  try {
    const result = await execa(tsInfo.executable, args, {
      cwd,
      timeout: 30_000,
      cleanup: true,
      shell: tsInfo.useShell,
      all: true, // Capture combined stdout/stderr
      maxBuffer: 50 * 1024 * 1024, // 50MB buffer for large TypeScript outputs
    });

    const allOutput =
      typeof result.all === 'string'
        ? result.all
        : `${result.stdout}\n${result.stderr}`.trim();

    return {
      success: true,
      stdout: result.stdout,
      stderr: result.stderr,
      allOutput,
      exitCode: result.exitCode ?? 0,
    };
  } catch (execError: unknown) {
    // Handle both ExecaError and other errors gracefully
    if (execError && typeof execError === 'object' && 'exitCode' in execError) {
      const { stdout, stderr, allOutput, exitCode, message } =
        extractExecutionDetails(execError as ExecaError);

      return {
        success: false,
        stdout,
        stderr,
        allOutput,
        exitCode,
        errorMessage: message,
      };
    }

    // Fallback for non-ExecaError exceptions (including simple error objects)
    const errorMessage =
      execError instanceof Error
        ? execError.message
        : execError &&
            typeof execError === 'object' &&
            'message' in execError &&
            typeof execError.message === 'string'
          ? execError.message
          : typeof execError === 'string'
            ? execError
            : String(execError);

    return {
      success: false,
      stdout: '',
      stderr: '',
      allOutput: '',
      exitCode: 1,
      errorMessage,
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
