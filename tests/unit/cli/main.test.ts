import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createCli } from '@/cli/main';

// Mock process.exit to prevent actual exits in tests
const mockExit = vi.fn();
vi.stubGlobal('process', {
  ...process,
  exit: mockExit,
  cwd: vi.fn(() => '/test/cwd'),
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
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {
        /* empty */
      });

      const exitCode = await cli.parseAsync(['node', 'tsc-files', '--help']);

      // Help should exit with specific code (99 from commander error handling)
      expect(exitCode).toBe(99);
      consoleSpy.mockRestore();
    });

    it('should handle version flag', async () => {
      const cli = createCli();
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {
        /* empty */
      });

      const exitCode = await cli.parseAsync(['node', 'tsc-files', '--version']);

      // Version should exit with specific code (99 from commander error handling)
      expect(exitCode).toBe(99);
      consoleSpy.mockRestore();
    });

    it('should handle unknown arguments gracefully', async () => {
      const cli = createCli();
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {
        /* empty */
      });

      const exitCode = await cli.parseAsync([
        'node',
        'tsc-files',
        '--unknown-flag',
      ]);

      // Commander errors are handled by our error handler (exit code 99)
      expect(exitCode).toBe(99);
      consoleSpy.mockRestore();
    });

    it('should handle configuration error paths', async () => {
      const cli = createCli();

      // Mock a scenario where type checking succeeds (exit code 0)
      const exitCode = await cli.parseAsync(['node', 'tsc-files', 'test.ts']);

      // Should get exit code from configuration error (no tsconfig found)
      expect(exitCode).toBe(0);
    });
  });
});
