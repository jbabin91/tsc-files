import { createProgram } from '@/cli/command';
import { handleCommanderError, runTypeCheckWithOutput } from '@/cli/runner';

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
    console.error(result.stderr.replace(/\n$/, '')); // eslint-disable-line no-console
    process.exit(result.exitCode); // eslint-disable-line unicorn/no-process-exit
  });

  return {
    parseAsync: async (args?: string[]) => {
      try {
        await program.parseAsync(args);
        return 0; // Should not reach here in normal CLI usage
      } catch (error) {
        const result = handleCommanderError(error as Error);
        console.error(result.stderr.replace(/\n$/, '')); // eslint-disable-line no-console
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
    console.error('Unhandled rejection:', error); // eslint-disable-line no-console
    process.exit(99);
  });

  const cli = createCli();
  const exitCode = await cli.parseAsync(args);
  process.exit(exitCode); // eslint-disable-line unicorn/no-process-exit
}
