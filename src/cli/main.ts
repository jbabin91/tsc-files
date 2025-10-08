import { createProgram } from '@/cli/command';
import { handleCommanderError, runTypeCheckWithOutput } from '@/cli/runner';
import { logger } from '@/utils/logger';

/**
 * Create and configure the CLI program
 */
export function createCli(): {
  parseAsync: (args?: string[]) => Promise<number>;
} {
  const program = createProgram(async (files: string[], options: unknown) => {
    const exitCode = await runTypeCheckWithOutput(
      files,
      options,
      process.cwd(),
    );
    // Return exit code for immediate process.exit() in cli.ts
    process.exitCode = exitCode;
  });

  // Override exitOverride for testing
  program.exitOverride((err) => {
    const result = handleCommanderError(err);
    if (result.stdout) {
      logger.info(result.stdout.replace(/\n$/, ''));
    }
    if (result.stderr) {
      logger.error(result.stderr.replace(/\n$/, ''));
    }
    // Use exitCode assignment to allow event loop to drain
    process.exitCode = result.exitCode;
  });

  return {
    parseAsync: async (args?: string[]): Promise<number> => {
      try {
        await program.parseAsync(args);
        // Return the exit code that was set by the action handler
        const exitCode = process.exitCode ?? 0;
        return exitCode as number;
      } catch (error) {
        const result = handleCommanderError(error as Error);
        if (result.stdout) {
          logger.info(result.stdout.replace(/\n$/, ''));
        }
        if (result.stderr) {
          logger.error(result.stderr.replace(/\n$/, ''));
        }
        return result.exitCode;
      }
    },
  };
}

/**
 * Main CLI entry point - returns exit code for testability
 */
export async function main(args?: string[]): Promise<number> {
  const cli = createCli();
  return await cli.parseAsync(args);
}
