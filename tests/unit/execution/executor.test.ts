import type { Result } from 'execa';
import { describe, expect, it, vi } from 'vitest';

import {
  executeAndParseTypeScript,
  executeTypeScriptCompiler,
} from '@/execution/executor';
import type { CheckOptions } from '@/types/core';

// Helper to create properly typed mock execa results for testing
const createMockExecaResult = (
  overrides: {
    stdout?: string;
    stderr?: string;
    exitCode?: number;
  } = {},
): Result => {
  // Return only the properties our code actually uses, cast as Result for testing
  return {
    stdout: overrides.stdout ?? '',
    stderr: overrides.stderr ?? '',
    exitCode: overrides.exitCode ?? 0,
  } as Result;
};

// Mock external dependencies
vi.mock('execa');
vi.mock('@/detectors/typescript', () => ({
  findTypeScriptCompiler: vi.fn(() => ({
    executable: 'tsc',
    args: ['--noEmit'],
    packageManager: { manager: 'npm' },
    useShell: false,
  })),
}));
vi.mock('@/execution/output-parser', () => ({
  parseAndSeparateOutput: vi.fn(() => ({
    errors: [],
    warnings: [],
  })),
}));

describe('execution/executor', () => {
  describe('executeTypeScriptCompiler', () => {
    it('should execute TypeScript compiler successfully', async () => {
      const { execa } = await import('execa');
      const mockedExeca = vi.mocked(execa);

      mockedExeca.mockResolvedValueOnce(
        createMockExecaResult({
          stdout: 'Success output',
          stderr: '',
          exitCode: 0,
        }),
      );

      const result = await executeTypeScriptCompiler(
        '/tmp/tsconfig.json',
        '/test/cwd',
        { verbose: false },
      );

      expect(result).toEqual({
        success: true,
        stdout: 'Success output',
        stderr: '',
        allOutput: 'Success output',
        exitCode: 0,
      });
    });

    it('should handle execution errors correctly', async () => {
      const { execa } = await import('execa');
      const mockedExeca = vi.mocked(execa);

      const execError = {
        stdout: 'Error output',
        stderr: 'Error message',
        exitCode: 1,
        message: 'Command failed',
      };

      mockedExeca.mockRejectedValueOnce(execError);

      const result = await executeTypeScriptCompiler(
        '/tmp/tsconfig.json',
        '/test/cwd',
        { verbose: false },
      );

      expect(result).toEqual({
        success: false,
        stdout: 'Error output',
        stderr: 'Error message',
        allOutput: 'Error output\nError message',
        exitCode: 1,
        errorMessage: 'Command failed',
      });
    });

    it('should handle undefined exitCode from execa', async () => {
      const { execa } = await import('execa');
      const mockedExeca = vi.mocked(execa);

      mockedExeca.mockResolvedValueOnce(
        createMockExecaResult({
          stdout: 'Success output',
          stderr: '',
          exitCode: undefined,
        }),
      );

      const result = await executeTypeScriptCompiler(
        '/tmp/tsconfig.json',
        '/test/cwd',
        { verbose: false },
      );

      expect(result).toEqual({
        success: true,
        stdout: 'Success output',
        stderr: '',
        allOutput: 'Success output',
        exitCode: 0,
      });
    });

    it('should log package manager when verbose is enabled', async () => {
      const { execa } = await import('execa');
      const mockedExeca = vi.mocked(execa);
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {
        /* no-op for testing */
      });

      mockedExeca.mockResolvedValueOnce(
        createMockExecaResult({
          stdout: 'Success output',
          stderr: '',
          exitCode: 0,
        }),
      );

      await executeTypeScriptCompiler('/tmp/tsconfig.json', '/test/cwd', {
        verbose: true,
      });

      expect(consoleSpy).toHaveBeenCalledWith('Using npm package manager');
      consoleSpy.mockRestore();
    });

    it('should handle execution errors with missing properties', async () => {
      const { execa } = await import('execa');
      const mockedExeca = vi.mocked(execa);

      const execError = {
        message: 'Command failed',
      };

      mockedExeca.mockRejectedValueOnce(execError);

      const result = await executeTypeScriptCompiler(
        '/tmp/tsconfig.json',
        '/test/cwd',
        { verbose: false },
      );

      expect(result).toEqual({
        success: false,
        stdout: '',
        stderr: '',
        allOutput: '',
        exitCode: 1,
        errorMessage: 'Command failed',
      });
    });
  });

  describe('executeAndParseTypeScript', () => {
    it('should execute TypeScript and parse results successfully', async () => {
      const { execa } = await import('execa');
      const { parseAndSeparateOutput } = await import(
        '@/execution/output-parser'
      );
      const mockedExeca = vi.mocked(execa);
      const mockedParser = vi.mocked(parseAndSeparateOutput);

      mockedExeca.mockResolvedValueOnce(
        createMockExecaResult({
          stdout: 'Success output',
          stderr: '',
          exitCode: 0,
        }),
      );

      mockedParser.mockReturnValueOnce({
        errors: [],
        warnings: [],
        allErrors: [],
      });

      // Use a fixed start time to ensure duration > 0
      const startTime = performance.now() - 100;
      const result = await executeAndParseTypeScript(
        '/tmp/tsconfig.json',
        ['test.ts'],
        '/test/cwd',
        {} as CheckOptions,
        startTime,
      );

      expect(result.success).toBe(true);
      expect(result.errorCount).toBe(0);
      expect(result.warningCount).toBe(0);
      expect(result.checkedFiles).toEqual(['test.ts']);
      expect(result.duration).toBeGreaterThanOrEqual(0);
    });

    it('should handle execution failures with zero exit code', async () => {
      const { execa } = await import('execa');
      const { parseAndSeparateOutput } = await import(
        '@/execution/output-parser'
      );
      const mockedExeca = vi.mocked(execa);
      const mockedParser = vi.mocked(parseAndSeparateOutput);

      // Mock execa to throw an error (simulating process failure)
      const execError = {
        stdout: '',
        stderr: 'Compilation error',
        exitCode: 1,
        message: 'Command failed',
      };

      mockedExeca.mockRejectedValueOnce(execError);

      mockedParser.mockReturnValueOnce({
        errors: [],
        warnings: [],
        allErrors: [],
      });

      const startTime = performance.now();

      await expect(
        executeAndParseTypeScript(
          '/tmp/tsconfig.json',
          ['test.ts'],
          '/test/cwd',
          {} as CheckOptions,
          startTime,
        ),
      ).rejects.toThrow('TypeScript compiler failed: Compilation error');
    });

    it('should return errors when parser finds them', async () => {
      const { execa } = await import('execa');
      const { parseAndSeparateOutput } = await import(
        '@/execution/output-parser'
      );
      const mockedExeca = vi.mocked(execa);
      const mockedParser = vi.mocked(parseAndSeparateOutput);

      mockedExeca.mockResolvedValueOnce(
        createMockExecaResult({
          stdout: 'Type error output',
          stderr: '',
          exitCode: 1,
        }),
      );

      const mockError = {
        file: 'test.ts',
        line: 1,
        column: 1,
        message: 'Type error',
        code: 'TS2322',
        severity: 'error' as const,
      };

      mockedParser.mockReturnValueOnce({
        errors: [mockError],
        warnings: [],
        allErrors: [mockError],
      });

      const startTime = performance.now();
      const result = await executeAndParseTypeScript(
        '/tmp/tsconfig.json',
        ['test.ts'],
        '/test/cwd',
        {} as CheckOptions,
        startTime,
      );

      expect(result.success).toBe(false);
      expect(result.errorCount).toBe(1);
      expect(result.errors).toEqual([mockError]);
    });
  });
});
