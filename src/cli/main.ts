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
    process.exit(exitCode); // eslint-disable-line unicorn/no-process-exit
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
    process.exit(result.exitCode); // eslint-disable-line unicorn/no-process-exit
  });

  return {
    parseAsync: async (args?: string[]) => {
      try {
        await program.parseAsync(args);
        return 0; // Should not reach here in normal CLI usage
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
 * Main CLI entry point with process lifecycle management
 */
export async function main(args?: string[]): Promise<void> {
  // Handle unhandled rejections
  process.on('unhandledRejection', (error) => {
    logger.error(`Unhandled rejection: ${error}`);
    process.exit(99);
  });

  const cli = createCli();
  const exitCode = await cli.parseAsync(args);
  process.exit(exitCode); // eslint-disable-line unicorn/no-process-exit
}
