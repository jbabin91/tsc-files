import {
  provideCompilerEducation,
  provideGitHookOptimization,
} from '@/cli/education';
import {
  categorizeError,
  formatConfigError,
  formatError,
  getExitCode,
  getExitCodeFromResult,
} from '@/cli/errors';
import {
  createOutputContext,
  formatOutput,
  outputToConsole,
  startProgress,
  updateProgress,
} from '@/cli/output';
import { checkFiles } from '@/core/checker';
import { findTypeScriptCompiler } from '@/detectors/typescript';
import {
  type CliResult,
  toCheckOptions,
  validateCliOptions,
} from '@/types/cli';
import { logger } from '@/utils/logger';

/**
 * Execute type checking with given files and options
 * Returns result instead of calling process.exit() for testability
 */
export async function runTypeCheck(
  files: string[],
  rawOptions: unknown,
  cwd?: string,
): Promise<CliResult> {
  try {
    // Validate CLI options
    const validatedOptions = validateCliOptions(rawOptions);

    // Create output context and start progress
    let outputContext = createOutputContext(validatedOptions);
    outputContext = startProgress(outputContext, files.length);

    // Convert to check options
    const checkOptions = toCheckOptions(validatedOptions, cwd);

    // Detect TypeScript compiler and provide educational messaging
    const workingDir = cwd ?? process.cwd();
    let tsInfo;
    try {
      tsInfo = findTypeScriptCompiler(workingDir, {
        useTsc: validatedOptions.useTsc,
        useTsgo: validatedOptions.useTsgo,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error(`Compiler detection failed: ${message}`);
      // Still try to continue with default behavior
    }

    // Handle --show-compiler flag
    if (validatedOptions.showCompiler && tsInfo) {
      const compilerMessage = `Using ${tsInfo.compilerType} compiler: ${tsInfo.executable}`;
      logger.info(compilerMessage);
      if (tsInfo.fallbackAvailable) {
        logger.info(
          `Fallback compiler available: ${tsInfo.compilerType === 'tsgo' ? 'tsc' : 'tsgo'}`,
        );
      }
      // Also show git hook optimization tips when showing compiler info
      if (!validatedOptions.json) {
        provideGitHookOptimization();
      }
    }

    // Handle --tips flag
    if (validatedOptions.tips && !validatedOptions.json) {
      provideGitHookOptimization();
      if (tsInfo) {
        provideCompilerEducation(tsInfo, workingDir, true);
      }
      // Exit early since user just wanted tips
      return {
        exitCode: 0,
        stdout: '',
        stderr: '',
      };
    }

    // Handle --benchmark flag
    if (validatedOptions.benchmark) {
      try {
        logger.info('🏃 Running benchmark comparison...');

        // Run with tsc
        const tscStart = performance.now();
        const tscResult = await checkFiles(files, {
          ...checkOptions,
          useTsc: true,
          useTsgo: false,
        });
        const tscDuration = Math.round(performance.now() - tscStart);

        // Run with tsgo
        const tsgoStart = performance.now();
        const tsgoResult = await checkFiles(files, {
          ...checkOptions,
          useTsc: false,
          useTsgo: true,
        });
        const tsgoDuration = Math.round(performance.now() - tsgoStart);

        // Display benchmark results
        const speedup = tscDuration / tsgoDuration;
        logger.info('🏆 Benchmark Results:');
        logger.info(
          `  tsc:  ${tscDuration}ms (${tscResult.errorCount} errors)`,
        );
        logger.info(
          `  tsgo: ${tsgoDuration}ms (${tsgoResult.errorCount} errors)`,
        );
        logger.info(
          `  Speedup: ${speedup.toFixed(1)}x ${speedup > 1 ? '🚀' : '🐌'}`,
        );

        // Return result from the configured compiler (not benchmark forced)
        const finalOptions = { ...checkOptions };
        delete finalOptions.useTsc;
        delete finalOptions.useTsgo;
        const result = await checkFiles(files, finalOptions);
        return {
          exitCode: getExitCodeFromResult(result),
          stdout: formatOutput(outputContext, result).stdout,
          stderr: formatOutput(outputContext, result).stderr,
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        logger.error(`Benchmark failed: ${message}`);
        logger.info('Falling back to normal type checking...');
      }
    }

    // Run type checking
    const result = await checkFiles(files, checkOptions);

    // Update progress indicator
    updateProgress(outputContext, result);

    // Format output
    const { stdout, stderr } = formatOutput(outputContext, result);

    // Determine exit code
    const exitCode = getExitCodeFromResult(result);

    // Handle configuration errors with special formatting
    if (exitCode === 2) {
      const configErrorFormat = formatConfigError(result);
      if (configErrorFormat) {
        return {
          exitCode,
          stdout,
          stderr:
            stderr +
            configErrorFormat.message +
            '\n\n' +
            configErrorFormat.tip +
            '\n',
        };
      }
    }

    return {
      exitCode,
      stdout,
      stderr,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const category = categorizeError(message);
    const exitCode = getExitCode(category);
    const formatted = formatError(category, message);

    let stderr = formatted.message + '\n';
    if (formatted.tip) {
      stderr += '\n' + formatted.tip + '\n';
    }

    return {
      exitCode,
      stdout: '',
      stderr,
    };
  }
}

/**
 * Run type checking and output to console (for CLI usage)
 */
export async function runTypeCheckWithOutput(
  files: string[],
  rawOptions: unknown,
  cwd?: string,
): Promise<number> {
  const result = await runTypeCheck(files, rawOptions, cwd);

  outputToConsole(result.stdout, result.stderr);

  return result.exitCode;
}

/**
 * Handle commander errors (like missing arguments)
 */
export function handleCommanderError(error: Error): CliResult {
  const message = error.message;

  // Handle specific commander errors
  if (error instanceof Error && 'code' in error) {
    const commanderError = error as { code: string; exitCode?: number };

    // Handle version and help commands - these are successful exits, not errors
    // Commander.js already outputs these to stdout/stderr, so we don't need to duplicate
    if (
      commanderError.code === 'commander.version' ||
      commanderError.code === 'commander.helpDisplayed'
    ) {
      return {
        exitCode: 0,
        stdout: '', // Commander.js already printed the output
        stderr: '',
      };
    }

    // Handle argument/option errors - Commander.js already outputs these with showHelpAfterError
    if (
      commanderError.code === 'commander.missingMandatoryOptionValue' ||
      commanderError.code === 'commander.missingArgument' ||
      commanderError.code === 'commander.unknownOption' ||
      commanderError.code === 'commander.invalidArgument'
    ) {
      return {
        exitCode: 1,
        stdout: '',
        stderr: '', // Commander.js already printed the error with showHelpAfterError
      };
    }
  }

  // Treat as unknown error
  const category = categorizeError(message);
  const exitCode = getExitCode(category);
  const formatted = formatError(category, message);

  let stderr = formatted.message + '\n';
  if (formatted.tip) {
    stderr += '\n' + formatted.tip + '\n';
  }

  return {
    exitCode,
    stdout: '',
    stderr,
  };
}
