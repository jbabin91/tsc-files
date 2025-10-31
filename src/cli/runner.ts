import { performance } from 'node:perf_hooks';

import { execa } from 'execa';

import {
  provideCompilerEducation,
  provideGitHookOptimization,
  provideSetupFileEducation,
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
 * Run full tsc --noEmit on entire project
 */
async function runFullTsc(cwd: string): Promise<number> {
  const start = performance.now();
  try {
    await execa('npx', ['tsc', '--noEmit'], { cwd, reject: false });
    return Math.round(performance.now() - start);
  } catch {
    // If tsc fails, still return timing
    return Math.round(performance.now() - start);
  }
}

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
        logger.info('🏃 Running comprehensive benchmark...');
        logger.info('');

        // 1. Run full tsc on entire project
        logger.info('Running full tsc on entire project...');
        const fullTscDuration = await runFullTsc(process.cwd());

        // 2. Run tsc-files with tsc compiler
        logger.info('Running tsc-files with tsc compiler...');
        const tscStart = performance.now();
        const tscResult = await checkFiles(files, {
          ...checkOptions,
          useTsc: true,
          useTsgo: false,
        });
        const tscFilesDuration = Math.round(performance.now() - tscStart);

        // 3. Run tsc-files with tsgo compiler (if available)
        logger.info('Running tsc-files with tsgo compiler...');
        let tsgoFilesDuration = 0;
        let tsgoResult = null;
        let tsgoAvailable = false;

        try {
          const tsgoStart = performance.now();
          tsgoResult = await checkFiles(files, {
            ...checkOptions,
            useTsc: false,
            useTsgo: true,
          });
          tsgoFilesDuration = Math.round(performance.now() - tsgoStart);
          tsgoAvailable = true;
        } catch {
          logger.info('  (tsgo not available)');
        }

        // Display comprehensive benchmark results
        logger.info('');
        logger.info('🏆 Benchmark Results:');
        logger.info('');
        logger.info('Tool Comparison (tsc-files value):');
        const toolSpeedup = fullTscDuration / tscFilesDuration;
        logger.info(`  Full tsc (entire project):  ${fullTscDuration}ms`);
        logger.info(
          `  tsc-files (specific files):  ${tscFilesDuration}ms (${tscResult.errorCount} errors)`,
        );
        logger.info(
          `  Speedup: ${toolSpeedup.toFixed(2)}x ${toolSpeedup > 1 ? '🚀' : '🐌'}`,
        );

        if (tsgoAvailable && tsgoResult) {
          logger.info('');
          logger.info('Compiler Comparison (within tsc-files):');
          const compilerSpeedup = tscFilesDuration / tsgoFilesDuration;
          logger.info(
            `  tsc-files + tsc:   ${tscFilesDuration}ms (${tscResult.errorCount} errors)`,
          );
          logger.info(
            `  tsc-files + tsgo:  ${tsgoFilesDuration}ms (${tsgoResult.errorCount} errors)`,
          );
          logger.info(
            `  Speedup: ${compilerSpeedup.toFixed(2)}x ${compilerSpeedup > 1 ? '🚀' : '🐌'}`,
          );
        }

        logger.info('');

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

    // Provide education about automatically included setup files
    if (
      result.includedSetupFiles &&
      result.includedSetupFiles.length > 0 &&
      !validatedOptions.json
    ) {
      provideSetupFileEducation(
        result.includedSetupFiles,
        validatedOptions.tips,
      );
    }

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
