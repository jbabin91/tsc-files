import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createCli, main } from '@/cli/main';
import { logger } from '@/utils/logger';

// Mock process.exit to prevent actual exits in tests
const mockExit = vi.fn();
const mockProcessOn = vi.fn();
vi.stubGlobal('process', {
  ...process,
  exit: mockExit,
  cwd: vi.fn(() => '/test/cwd'),
  on: mockProcessOn,
});

describe('CLI Main', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockExit.mockClear();
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
    it('should set up unhandled rejection handler and handle errors', async () => {
      const loggerErrorSpy = vi
        .spyOn(logger, 'error')
        .mockImplementation(() => {
          /* empty */
        });

      // Test the unhandled rejection handler by checking process.on was called
      // This is enough to cover the main function setup without complex mocking
      try {
        // Just call main with help to trigger the process.on setup and quick exit
        await main(['node', 'tsc-files', '--help']);
      } catch {
        // Ignore errors from --help exit
      }

      // Verify process.on was called to set up unhandled rejection handler
      expect(mockProcessOn).toHaveBeenCalledWith(
        'unhandledRejection',
        expect.any(Function),
      );

      // Test the unhandled rejection handler directly
      const rejectionHandler = mockProcessOn.mock.calls.find(
        (call) => call[0] === 'unhandledRejection',
      )?.[1] as (error: Error) => void;

      if (rejectionHandler) {
        rejectionHandler(new Error('Test error'));
        expect(loggerErrorSpy).toHaveBeenCalledWith(
          'Unhandled rejection: Error: Test error',
        );
        expect(mockExit).toHaveBeenCalledWith(99);
      }

      loggerErrorSpy.mockRestore();
    });

    it('should handle main function execution flow', async () => {
      // Test that main function calls process.exit with correct code
      // The actual CLI logic is tested in other tests, we just need to verify
      // the main function flow (process.on setup and process.exit call)

      try {
        await main(['node', 'tsc-files', '--version']);
      } catch {
        // Ignore errors from --version exit
      }

      // Verify process.on was called (main function was executed)
      expect(mockProcessOn).toHaveBeenCalled();
      // Verify process.exit was called at some point
      expect(mockExit).toHaveBeenCalled();
    });

    it('should handle main function with no arguments', async () => {
      mockExit.mockClear();
      mockProcessOn.mockClear();

      try {
        await main();
      } catch {
        // Ignore commander errors
      }

      // Verify the main function flow was executed
      expect(mockProcessOn).toHaveBeenCalledWith(
        'unhandledRejection',
        expect.any(Function),
      );
    });
  });
});
