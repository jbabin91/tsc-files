import { execa, type ExecaError } from 'execa';

import { provideFallbackEducation } from '@/cli/education';
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
  // Combine stdout and stderr for error parsing
  const allOutput = `${stdout}\n${stderr}`.trim();

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
  options: Pick<CheckOptions, 'verbose' | 'useTsc' | 'useTsgo'>,
): Promise<ExecutionResult> {
  const tsInfo = findTypeScriptCompiler(cwd, {
    useTsc: options.useTsc,
    useTsgo: options.useTsgo,
  });
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
      stdin: 'ignore', // Prevent hanging in git hooks by not inheriting stdin
      stdout: 'pipe', // Explicitly pipe instead of inheriting
      stderr: 'pipe', // Explicitly pipe instead of inheriting
      buffer: true, // Buffer output to prevent hanging on large outputs
      maxBuffer: 50 * 1024 * 1024, // 50MB buffer for large TypeScript outputs
    });

    // Combine stdout and stderr for error parsing
    const allOutput = `${result.stdout}\n${result.stderr}`.trim();

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
 * Execute TypeScript compiler with graceful fallback from tsgo to tsc
 * @param tempConfigPath - Path to temporary TypeScript configuration
 * @param checkedFiles - List of files being checked
 * @param cwd - Current working directory
 * @param options - Check options
 * @param startTime - Start time for duration calculation
 * @returns Promise resolving to check result
 */
export async function executeWithFallback(
  tempConfigPath: string,
  checkedFiles: string[],
  cwd: string,
  options: CheckOptions,
  startTime: number,
): Promise<CheckResult> {
  // First attempt with user-configured compiler
  try {
    const executionResult = await executeTypeScriptCompiler(
      tempConfigPath,
      cwd,
      options,
    );

    const { errors, warnings } = parseAndSeparateOutput(
      executionResult.allOutput,
    );

    // If execution succeeded or we got parseable TypeScript errors, return the result
    if (executionResult.success || errors.length > 0) {
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

    // If execution failed with no parseable errors, check if we can fallback
    const tsInfo = findTypeScriptCompiler(cwd, {
      useTsc: options.useTsc,
      useTsgo: options.useTsgo,
    });

    // Only attempt fallback if we were using tsgo, user didn't force it, and fallback is enabled
    if (
      tsInfo.compilerType === 'tsgo' &&
      !options.useTsgo &&
      options.fallback !== false &&
      tsInfo.fallbackAvailable
    ) {
      // Provide educational messaging about the fallback
      provideFallbackEducation(
        'tsgo',
        'tsc',
        executionResult.errorMessage ?? 'Execution failed',
      );

      // Retry with tsc
      const fallbackOptions = { ...options, useTsc: true, useTsgo: false };
      const fallbackResult = await executeTypeScriptCompiler(
        tempConfigPath,
        cwd,
        fallbackOptions,
      );

      const { errors: fbErrors, warnings: fbWarnings } = parseAndSeparateOutput(
        fallbackResult.allOutput,
      );

      if (fallbackResult.success || fbErrors.length > 0) {
        if (options.verbose) {
          logger.info('✅ Fallback to tsc successful');
        }
        return {
          success: fbErrors.length === 0,
          errorCount: fbErrors.length,
          warningCount: fbWarnings.length,
          errors: fbErrors,
          warnings: fbWarnings,
          duration: Math.round(performance.now() - startTime),
          checkedFiles,
        };
      }
    }

    // If we get here, both compilers failed
    const errorMessage =
      executionResult.allOutput ??
      executionResult.errorMessage ??
      'TypeScript compiler execution failed';
    throw new Error(`TypeScript compiler failed: ${errorMessage}`);
  } catch (error) {
    // Handle unexpected errors during execution
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`TypeScript compiler failed: ${errorMessage}`);
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
  compilerPreference?: {
    useTsgo?: boolean;
    reason?: string;
  },
): Promise<CheckResult> {
  // Use the fallback mechanism unless user explicitly disabled it
  // Apply compiler preference if provided
  const effectiveOptions = compilerPreference
    ? {
        ...options,
        useTsgo: compilerPreference.useTsgo,
        useTsc: !compilerPreference.useTsgo,
      }
    : options;

  return executeWithFallback(
    tempConfigPath,
    checkedFiles,
    cwd,
    effectiveOptions,
    startTime,
  );
}
