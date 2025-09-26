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
import {
  type CliResult,
  toCheckOptions,
  validateCliOptions,
} from '@/types/cli';

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

    // Convert to check options and run type checking
    const checkOptions = toCheckOptions(validatedOptions, cwd);
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
    if (
      commanderError.code === 'commander.missingMandatoryOptionValue' ||
      commanderError.code === 'commander.missingArgument'
    ) {
      return {
        exitCode: 1,
        stdout: '',
        stderr: message + '\n',
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
