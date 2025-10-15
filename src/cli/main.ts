import { createProgram } from '@/cli/command';
import { runTypeCheckWithOutput } from '@/cli/runner';

/**
 * Create action handler for CLI program
 */
export function createActionHandler(): (
  files: string[],
  options: unknown,
) => Promise<number> {
  return async (files: string[], options: unknown): Promise<number> => {
    return await runTypeCheckWithOutput(files, options, process.cwd());
  };
}

/**
 * Create parseAsync function that returns the exit code using provider
 */
export function createParseAsyncFunction(
  getExitCode: () => number,
): (args?: string[]) => Promise<number> {
  return (_args?: string[]): Promise<number> => {
    // Cleye automatically parses process.argv when createProgram is called
    // The callback is executed if parsing succeeds
    // For help/version, cleye shows output and exits automatically
    // We just need to return the exit code that was set
    return Promise.resolve(getExitCode());
  };
}

/**
 * Create and configure the CLI program
 * Note: cleye automatically parses process.argv when called
 */
export function createCli(): {
  parseAsync: (args?: string[]) => Promise<number>;
} {
  let exitCode = 0;

  const actionHandler = createActionHandler();

  createProgram(async (files: string[], options: unknown) => {
    exitCode = await actionHandler(files, options);
  });

  return {
    parseAsync: createParseAsyncFunction(() => exitCode),
  };
}

/**
 * Main CLI entry point - returns exit code for testability
 * Note: This function is mainly for testing - cleye handles the main execution
 */
export async function main(args?: string[]): Promise<number> {
  const cli = createCli();
  return await cli.parseAsync(args);
}
