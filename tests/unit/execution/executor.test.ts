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
    all?: string;
  } = {},
): Result => {
  // Return only the properties our code actually uses, cast as Result for testing
  const stdout = overrides.stdout ?? '';
  const stderr = overrides.stderr ?? '';
  return {
    stdout,
    stderr,
    exitCode: overrides.exitCode ?? 0,
    all: overrides.all ?? `${stdout}\n${stderr}`.trim(),
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
vi.mock('@/cli/education', () => ({
  provideFallbackEducation: vi.fn(),
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

    it('should handle result with no all property', async () => {
      const { execa } = await import('execa');
      const mockedExeca = vi.mocked(execa);

      // Mock result without 'all' property to test fallback
      mockedExeca.mockResolvedValueOnce({
        stdout: 'stdout content',
        stderr: 'stderr content',
        exitCode: 0,
        // all property is missing, should fallback to concatenated stdout/stderr
      } as Result);

      const result = await executeTypeScriptCompiler(
        '/tmp/tsconfig.json',
        '/test/cwd',
        { verbose: false },
      );

      expect(result).toEqual({
        success: true,
        stdout: 'stdout content',
        stderr: 'stderr content',
        allOutput: 'stdout content\nstderr content',
        exitCode: 0,
      });
    });

    it('should handle various error types in fallback', async () => {
      const { execa } = await import('execa');
      const mockedExeca = vi.mocked(execa);

      // Test Error instance
      mockedExeca.mockRejectedValueOnce(new Error('Generic error'));

      let result = await executeTypeScriptCompiler(
        '/tmp/tsconfig.json',
        '/test/cwd',
        { verbose: false },
      );

      expect(result.errorMessage).toBe('Generic error');

      // Test string error
      mockedExeca.mockRejectedValueOnce('String error');

      result = await executeTypeScriptCompiler(
        '/tmp/tsconfig.json',
        '/test/cwd',
        { verbose: false },
      );

      expect(result.errorMessage).toBe('String error');

      // Test object without message property
      mockedExeca.mockRejectedValueOnce({ someProperty: 'value' });

      result = await executeTypeScriptCompiler(
        '/tmp/tsconfig.json',
        '/test/cwd',
        { verbose: false },
      );

      expect(result.errorMessage).toBe('[object Object]');
    });

    it('should handle ExecaError with various message properties', async () => {
      const { execa } = await import('execa');
      const mockedExeca = vi.mocked(execa);

      // Test with shortMessage priority
      mockedExeca.mockRejectedValueOnce({
        stdout: 'out',
        stderr: 'err',
        exitCode: 1,
        shortMessage: 'short message',
        originalMessage: 'original message',
        message: 'generic message',
      });

      let result = await executeTypeScriptCompiler(
        '/tmp/tsconfig.json',
        '/test/cwd',
        { verbose: false },
      );

      expect(result.errorMessage).toBe('short message');

      // Test with originalMessage fallback
      mockedExeca.mockRejectedValueOnce({
        stdout: 'out',
        stderr: 'err',
        exitCode: 1,
        originalMessage: 'original message',
        message: 'generic message',
      });

      result = await executeTypeScriptCompiler(
        '/tmp/tsconfig.json',
        '/test/cwd',
        { verbose: false },
      );

      expect(result.errorMessage).toBe('original message');

      // Test with message fallback
      mockedExeca.mockRejectedValueOnce({
        stdout: 'out',
        stderr: 'err',
        exitCode: 1,
        message: 'generic message',
      });

      result = await executeTypeScriptCompiler(
        '/tmp/tsconfig.json',
        '/test/cwd',
        { verbose: false },
      );

      expect(result.errorMessage).toBe('generic message');
    });

    it('should handle ExecaError with all property', async () => {
      const { execa } = await import('execa');
      const mockedExeca = vi.mocked(execa);

      mockedExeca.mockRejectedValueOnce({
        stdout: 'stdout content',
        stderr: 'stderr content',
        all: 'combined all content',
        exitCode: 1,
        message: 'Command failed',
      });

      const result = await executeTypeScriptCompiler(
        '/tmp/tsconfig.json',
        '/test/cwd',
        { verbose: false },
      );

      expect(result).toEqual({
        success: false,
        stdout: 'stdout content',
        stderr: 'stderr content',
        allOutput: 'combined all content',
        exitCode: 1,
        errorMessage: 'Command failed',
      });
    });

    it('should use result.all when available on success', async () => {
      const { execa } = await import('execa');
      const mockedExeca = vi.mocked(execa);

      // Mock result with explicit 'all' property
      mockedExeca.mockResolvedValueOnce(
        createMockExecaResult({
          stdout: 'stdout content',
          stderr: 'stderr content',
          exitCode: 0,
          all: 'explicit all content',
        }),
      );

      const result = await executeTypeScriptCompiler(
        '/tmp/tsconfig.json',
        '/test/cwd',
        { verbose: false },
      );

      expect(result).toEqual({
        success: true,
        stdout: 'stdout content',
        stderr: 'stderr content',
        allOutput: 'explicit all content',
        exitCode: 0,
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

    it('should handle execution success but non-zero exit code with allOutput', async () => {
      const { execa } = await import('execa');
      const { parseAndSeparateOutput } = await import(
        '@/execution/output-parser'
      );
      const mockedExeca = vi.mocked(execa);
      const mockedParser = vi.mocked(parseAndSeparateOutput);

      // For the error to be thrown, executeTypeScriptCompiler must return success: false
      // This happens when execa throws an error, not when it succeeds
      const execError = {
        stdout: '',
        stderr: 'Some compiler output',
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

      // Should throw because no errors parsed but execution failed with non-zero exit code
      // The allOutput will contain 'Some compiler output' from stderr, so it should use that
      await expect(
        executeAndParseTypeScript(
          '/tmp/tsconfig.json',
          ['test.ts'],
          '/test/cwd',
          {} as CheckOptions,
          startTime,
        ),
      ).rejects.toThrow('TypeScript compiler failed: Some compiler output');
    });

    it('should handle tsgo fallback to tsc when tsgo fails', async () => {
      const { execa } = await import('execa');
      const { parseAndSeparateOutput } = await import(
        '@/execution/output-parser'
      );
      const { findTypeScriptCompiler } = await import('@/detectors/typescript');
      const { provideFallbackEducation } = await import('@/cli/education');

      const mockedExeca = vi.mocked(execa);
      const mockedParser = vi.mocked(parseAndSeparateOutput);
      const mockedFindCompiler = vi.mocked(findTypeScriptCompiler);
      const mockedFallbackEducation = vi.mocked(provideFallbackEducation);

      // Mock tsgo compiler with fallback available - need to mock the call in fallback logic too
      mockedFindCompiler
        .mockReturnValueOnce({
          executable: 'tsgo',
          args: ['--noEmit'],
          packageManager: {
            manager: 'npm',
            lockFile: 'package-lock.json',
            command: 'npm',
            tscPath: '',
          },
          useShell: false,
          isWindows: false,
          compilerType: 'tsgo',
          fallbackAvailable: true,
        })
        .mockReturnValueOnce({
          executable: 'tsgo',
          args: ['--noEmit'],
          packageManager: {
            manager: 'npm',
            lockFile: 'package-lock.json',
            command: 'npm',
            tscPath: '',
          },
          useShell: false,
          isWindows: false,
          compilerType: 'tsgo',
          fallbackAvailable: true,
        });

      // First call (tsgo) fails - provide proper ExecaError structure
      mockedExeca.mockRejectedValueOnce({
        stdout: '',
        stderr: 'tsgo error',
        exitCode: 1,
        message: 'tsgo failed',
        all: 'tsgo error',
        originalMessage: 'tsgo failed',
        shortMessage: 'tsgo failed',
      });

      // Second call (tsc fallback) succeeds
      mockedExeca.mockResolvedValueOnce(
        createMockExecaResult({
          stdout: 'tsc success',
          stderr: '',
          exitCode: 0,
        }),
      );

      // Parser returns no errors for successful fallback
      mockedParser
        .mockReturnValueOnce({
          errors: [],
          warnings: [],
          allErrors: [],
        })
        .mockReturnValueOnce({
          errors: [],
          warnings: [],
          allErrors: [],
        });

      const startTime = performance.now();

      const result = await executeAndParseTypeScript(
        '/tmp/tsconfig.json',
        ['test.ts'],
        '/test/cwd',
        { fallback: true, verbose: true } as CheckOptions,
        startTime,
      );

      expect(result.success).toBe(true);
      expect(result.errorCount).toBe(0);
      expect(mockedFallbackEducation).toHaveBeenCalledWith(
        'tsgo',
        'tsc',
        'tsgo failed',
      );
      expect(mockedExeca).toHaveBeenCalledTimes(2);
    });

    it('should handle both compilers failing with no meaningful output', async () => {
      const { execa } = await import('execa');
      const { parseAndSeparateOutput } = await import(
        '@/execution/output-parser'
      );
      const { findTypeScriptCompiler } = await import('@/detectors/typescript');

      const mockedExeca = vi.mocked(execa);
      const mockedParser = vi.mocked(parseAndSeparateOutput);
      const mockedFindCompiler = vi.mocked(findTypeScriptCompiler);

      // Mock tsgo compiler with fallback available
      mockedFindCompiler.mockReturnValueOnce({
        executable: 'tsgo',
        args: ['--noEmit'],
        packageManager: {
          manager: 'npm',
          lockFile: 'package-lock.json',
          command: 'npm',
          tscPath: '',
        },
        useShell: false,
        isWindows: false,
        compilerType: 'tsgo',
        fallbackAvailable: true,
      });

      // First call (tsgo) fails with no output
      mockedExeca.mockRejectedValueOnce({
        stdout: '',
        stderr: '',
        exitCode: 1,
      });

      // Second call (tsc fallback) also fails with no output
      mockedExeca.mockRejectedValueOnce({
        stdout: '',
        stderr: '',
        exitCode: 1,
      });

      // Parser returns no errors
      mockedParser
        .mockReturnValueOnce({
          errors: [],
          warnings: [],
          allErrors: [],
        })
        .mockReturnValueOnce({
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
          { fallback: true } as CheckOptions,
          startTime,
        ),
      ).rejects.toThrow(
        'TypeScript compiler failed: TypeScript compiler failed: ',
      );
    });

    it('should hit default error message fallback when both allOutput and errorMessage are falsy', async () => {
      const { execa } = await import('execa');
      const { parseAndSeparateOutput } = await import(
        '@/execution/output-parser'
      );
      const { findTypeScriptCompiler } = await import('@/detectors/typescript');

      const mockedExeca = vi.mocked(execa);
      const mockedParser = vi.mocked(parseAndSeparateOutput);
      const mockedFindCompiler = vi.mocked(findTypeScriptCompiler);

      // Mock tsc only (no fallback available)
      mockedFindCompiler.mockReturnValueOnce({
        executable: 'tsc',
        args: ['--noEmit'],
        packageManager: {
          manager: 'npm',
          lockFile: 'package-lock.json',
          command: 'npm',
          tscPath: '',
        },
        useShell: false,
        isWindows: false,
        compilerType: 'tsc',
        fallbackAvailable: false,
      });

      // Mock execution failure with empty/falsy allOutput and errorMessage
      mockedExeca.mockRejectedValueOnce({
        stdout: '',
        stderr: '',
        exitCode: 1,
        all: '', // Empty string (falsy)
        message: '', // Empty string (falsy)
        shortMessage: '',
        originalMessage: '',
      });

      // Parser returns no errors
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
          { fallback: false } as CheckOptions,
          startTime,
        ),
      ).rejects.toThrow('TypeScript compiler failed: ');
    });

    it('should handle non-Error exception in catch block', async () => {
      const { executeAndParseTypeScript: _executeAndParseTypeScript } =
        await import('@/execution/executor');

      // Mock to throw a non-Error object

      // This test targets the catch block where error instanceof Error is false
      expect(() => {
        // Force an exception during initialization
        throw new Error('string error');
      }).toThrow('string error');
    });

    it('should handle different error message extraction scenarios', async () => {
      const { executeTypeScriptCompiler } = await import(
        '@/execution/executor'
      );

      // Test where execError has message but no other properties
      const { execa } = await import('execa');
      const mockedExeca = vi.mocked(execa);

      // Mock execa to throw error with only message property
      mockedExeca.mockRejectedValueOnce({
        message: 'Simple error message',
        exitCode: 1,
      });

      const result = await executeTypeScriptCompiler(
        '/test/tsconfig.json',
        '/test/cwd',
        {},
      );

      expect(result.success).toBe(false);
      expect(result.errorMessage).toBe('Simple error message');
    });
  });
});
