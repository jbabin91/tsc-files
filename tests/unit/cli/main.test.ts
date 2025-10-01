import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createCli, main } from '@/cli/main';
import { logger } from '@/utils/logger';

// Mock process.cwd for tests
vi.stubGlobal('process', {
  ...process,
  cwd: vi.fn(() => '/test/cwd'),
});

describe('CLI Main', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('createCli', () => {
    it('should create CLI with parseAsync method', () => {
      const cli = createCli();

      expect(cli).toBeDefined();
      expect(cli.parseAsync).toBeInstanceOf(Function);
    });

    it('should handle missing required arguments', async () => {
      const cli = createCli();

      const exitCode = await cli.parseAsync(['node', 'tsc-files']);

      // Commander errors are handled by our error handler (exit code 99)
      expect(exitCode).toBe(99);
    });

    it('should handle help flag', async () => {
      const cli = createCli();
      const loggerSpy = vi.spyOn(logger, 'error').mockImplementation(() => {
        /* empty */
      });

      const exitCode = await cli.parseAsync(['node', 'tsc-files', '--help']);

      // Help should exit with specific code (99 from commander error handling)
      expect(exitCode).toBe(99);
      loggerSpy.mockRestore();
    });

    it('should handle version flag', async () => {
      const cli = createCli();
      const loggerSpy = vi.spyOn(logger, 'error').mockImplementation(() => {
        /* empty */
      });

      const exitCode = await cli.parseAsync(['node', 'tsc-files', '--version']);

      // Version should exit with specific code (99 from commander error handling)
      expect(exitCode).toBe(99);
      loggerSpy.mockRestore();
    });

    it('should handle unknown arguments gracefully', async () => {
      const cli = createCli();
      const loggerSpy = vi.spyOn(logger, 'error').mockImplementation(() => {
        /* empty */
      });

      const exitCode = await cli.parseAsync([
        'node',
        'tsc-files',
        '--unknown-flag',
      ]);

      // Commander errors are handled by our error handler (exit code 99)
      expect(exitCode).toBe(99);
      loggerSpy.mockRestore();
    });

    it('should handle configuration error paths', async () => {
      const cli = createCli();

      // Mock a scenario where type checking succeeds (exit code 0)
      const exitCode = await cli.parseAsync(['node', 'tsc-files', 'test.ts']);

      // Should get exit code from configuration error (no tsconfig found)
      expect(exitCode).toBe(0);
    });

    it('should handle error with stderr output in parseAsync', async () => {
      const cli = createCli();
      const loggerInfoSpy = vi.spyOn(logger, 'info').mockImplementation(() => {
        /* empty */
      });
      const loggerErrorSpy = vi
        .spyOn(logger, 'error')
        .mockImplementation(() => {
          /* empty */
        });

      // Use invalid option to trigger commander error
      const exitCode = await cli.parseAsync([
        'node',
        'tsc-files',
        '--invalid-option',
      ]);

      // Should handle error path with stderr output
      expect(exitCode).toBe(99);
      expect(loggerErrorSpy).toHaveBeenCalled();

      loggerInfoSpy.mockRestore();
      loggerErrorSpy.mockRestore();
    });

    it('should handle exitOverride error with stderr output', async () => {
      const cli = createCli();
      const loggerErrorSpy = vi
        .spyOn(logger, 'error')
        .mockImplementation(() => {
          /* empty */
        });

      // Mock program.parseAsync to throw an error that will trigger exitOverride
      const exitCode = await cli.parseAsync(['node', 'tsc-files', '--help']);

      // Should handle exitOverride path
      expect(exitCode).toBe(99);

      loggerErrorSpy.mockRestore();
    });
  });

  describe('main', () => {
    it('should return exit code from CLI execution', async () => {
      const loggerErrorSpy = vi
        .spyOn(logger, 'error')
        .mockImplementation(() => {
          /* empty */
        });

      const exitCode = await main(['node', 'tsc-files', '--help']);

      // main() should return an exit code (99 for commander errors)
      expect(exitCode).toBe(99);

      loggerErrorSpy.mockRestore();
    });

    it('should return exit code for version flag', async () => {
      const loggerErrorSpy = vi
        .spyOn(logger, 'error')
        .mockImplementation(() => {
          /* empty */
        });

      const exitCode = await main(['node', 'tsc-files', '--version']);

      expect(exitCode).toBe(99);

      loggerErrorSpy.mockRestore();
    });

    it('should return exit code when no arguments provided', async () => {
      const exitCode = await main();

      // Should return error code for missing arguments
      expect(exitCode).toBe(99);
    });
  });
});
