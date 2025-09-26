import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  createOutputContext,
  formatOutput,
  outputToConsole,
  startProgress,
  updateProgress,
} from '@/cli/output';
import {
  handleCommanderError,
  runTypeCheck,
  runTypeCheckWithOutput,
} from '@/cli/runner';
import { checkFiles } from '@/core/checker';
import type { CheckResult } from '@/types/core';

// Mock the checkFiles function
vi.mock('@/core/checker', () => ({
  checkFiles: vi.fn(),
}));

// Mock console methods
vi.mock('@/cli/output', () => ({
  createOutputContext: vi.fn(() => ({
    json: false,
    verbose: false,
    showProgress: false,
  })),
  startProgress: vi.fn((ctx: unknown) => ctx),
  updateProgress: vi.fn(),
  formatOutput: vi.fn((): { stdout: string; stderr: string } => ({
    stdout: '',
    stderr: '',
  })),
  outputToConsole: vi.fn(),
  outputError: vi.fn(),
}));

const mockCheckFiles = vi.mocked(checkFiles);
const mockCreateOutputContext = vi.mocked(createOutputContext);
const mockStartProgress = vi.mocked(startProgress);
const mockUpdateProgress = vi.mocked(updateProgress);
const mockFormatOutput = vi.mocked(formatOutput);
const mockOutputToConsole = vi.mocked(outputToConsole);

describe('CLI Runner', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('runTypeCheck', () => {
    it('should return success result for successful type check', async () => {
      const mockResult: CheckResult = {
        success: true,
        errorCount: 0,
        warningCount: 0,
        errors: [],
        warnings: [],
        duration: 100,
        checkedFiles: ['test.ts'],
      };

      mockCheckFiles.mockResolvedValue(mockResult);
      mockFormatOutput.mockReturnValue({
        stdout: '✓ Type check passed\n',
        stderr: '',
      });

      const result = await runTypeCheck(['test.ts'], {
        verbose: false,
        json: false,
      });

      expect(result).toEqual({
        exitCode: 0,
        stdout: '✓ Type check passed\n',
        stderr: '',
      });

      expect(mockCheckFiles).toHaveBeenCalledWith(['test.ts'], {
        project: undefined,
        noEmit: true,
        skipLibCheck: false,
        verbose: false,
        cache: true,
        cwd: undefined,
      });
    });

    it('should return type error result for failed type check', async () => {
      const mockResult: CheckResult = {
        success: false,
        errorCount: 1,
        warningCount: 0,
        errors: [
          {
            file: 'test.ts',
            line: 1,
            column: 1,
            message: "Type 'string' is not assignable to type 'number'",
            code: 'TS2322',
            severity: 'error',
          },
        ],
        warnings: [],
        duration: 100,
        checkedFiles: ['test.ts'],
      };

      mockCheckFiles.mockResolvedValue(mockResult);
      mockFormatOutput.mockReturnValue({
        stdout: '',
        stderr:
          "test.ts:1:1 - Type 'string' is not assignable to type 'number'\n",
      });

      const result = await runTypeCheck(['test.ts'], {
        verbose: false,
        json: false,
      });

      expect(result.exitCode).toBe(1);
      expect(result.stderr).toContain("Type 'string' is not assignable");
    });

    it('should return config error result for configuration errors', async () => {
      const mockResult: CheckResult = {
        success: false,
        errorCount: 1,
        warningCount: 0,
        errors: [
          {
            file: 'tsc-files',
            line: 1,
            column: 1,
            message: 'No tsconfig.json found',
            code: 'CONFIG_ERROR',
            severity: 'error',
          },
        ],
        warnings: [],
        duration: 50,
        checkedFiles: [],
      };

      mockCheckFiles.mockResolvedValue(mockResult);
      mockFormatOutput.mockReturnValue({
        stdout: '',
        stderr: '',
      });

      const result = await runTypeCheck(['test.ts'], {
        verbose: false,
        json: false,
      });

      expect(result.exitCode).toBe(2);
      expect(result.stderr).toContain('Configuration Error:');
      expect(result.stderr).toContain('No tsconfig.json found');
      expect(result.stderr).toContain('Use --project flag');
    });

    it('should handle verbose and JSON options', async () => {
      const mockResult: CheckResult = {
        success: true,
        errorCount: 0,
        warningCount: 0,
        errors: [],
        warnings: [],
        duration: 150,
        checkedFiles: ['test1.ts', 'test2.ts'],
      };

      mockCheckFiles.mockResolvedValue(mockResult);
      mockCreateOutputContext.mockReturnValue({
        json: true,
        verbose: true,
        showProgress: false,
      });
      mockFormatOutput.mockReturnValue({
        stdout: JSON.stringify(mockResult, null, 2),
        stderr: '',
      });

      const result = await runTypeCheck(['test1.ts', 'test2.ts'], {
        verbose: true,
        json: true,
        project: 'custom.json',
      });

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('"success": true');

      expect(mockCheckFiles).toHaveBeenCalledWith(['test1.ts', 'test2.ts'], {
        project: 'custom.json',
        noEmit: true,
        skipLibCheck: false,
        verbose: true,
        cache: true,
        cwd: undefined,
      });
    });

    it('should handle thrown errors correctly', async () => {
      mockCheckFiles.mockRejectedValue(
        new Error('TypeScript config not found: /path/to/tsconfig.json'),
      );

      const result = await runTypeCheck(['test.ts'], {
        verbose: false,
        json: false,
      });

      expect(result.exitCode).toBe(2);
      expect(result.stderr).toContain('Configuration Error:');
      expect(result.stderr).toContain('TypeScript config not found');
      expect(result.stderr).toContain('Use --project flag');
    });

    it('should handle system errors', async () => {
      mockCheckFiles.mockRejectedValue(new Error('TypeScript compiler failed'));

      const result = await runTypeCheck(['test.ts'], {
        verbose: false,
        json: false,
      });

      expect(result.exitCode).toBe(3);
      expect(result.stderr).toContain('System Error:');
      expect(result.stderr).toContain('TypeScript compiler failed');
      expect(result.stderr).toContain('npm install -D typescript');
    });

    it('should handle unknown errors', async () => {
      mockCheckFiles.mockRejectedValue(new Error('Unknown error occurred'));

      const result = await runTypeCheck(['test.ts'], {
        verbose: false,
        json: false,
      });

      expect(result.exitCode).toBe(99);
      expect(result.stderr).toContain('Error:');
      expect(result.stderr).toContain('Unknown error occurred');
    });

    it('should pass cwd to checkOptions', async () => {
      const mockResult: CheckResult = {
        success: true,
        errorCount: 0,
        warningCount: 0,
        errors: [],
        warnings: [],
        duration: 100,
        checkedFiles: ['test.ts'],
      };

      mockCheckFiles.mockResolvedValue(mockResult);

      await runTypeCheck(['test.ts'], { verbose: false }, '/custom/cwd');

      expect(mockCheckFiles).toHaveBeenCalledWith(['test.ts'], {
        project: undefined,
        noEmit: true,
        skipLibCheck: false,
        verbose: false,
        cache: true,
        cwd: '/custom/cwd',
      });
    });

    it('should call progress management functions', async () => {
      const mockResult: CheckResult = {
        success: true,
        errorCount: 0,
        warningCount: 0,
        errors: [],
        warnings: [],
        duration: 100,
        checkedFiles: ['test.ts'],
      };

      mockCheckFiles.mockResolvedValue(mockResult);

      await runTypeCheck(['test.ts'], { verbose: false });

      expect(mockCreateOutputContext).toHaveBeenCalled();
      expect(mockStartProgress).toHaveBeenCalled();
      expect(mockUpdateProgress).toHaveBeenCalledWith(
        expect.anything(),
        mockResult,
      );
      expect(mockFormatOutput).toHaveBeenCalledWith(
        expect.anything(),
        mockResult,
      );
    });
  });

  describe('runTypeCheckWithOutput', () => {
    it('should call runTypeCheck and output to console', async () => {
      const mockResult: CheckResult = {
        success: true,
        errorCount: 0,
        warningCount: 0,
        errors: [],
        warnings: [],
        duration: 100,
        checkedFiles: ['test.ts'],
      };

      mockCheckFiles.mockResolvedValue(mockResult);
      mockFormatOutput.mockReturnValue({
        stdout: '✓ Type check passed\n',
        stderr: '',
      });

      const exitCode = await runTypeCheckWithOutput(['test.ts'], {
        verbose: false,
      });

      expect(exitCode).toBe(0);
      expect(mockOutputToConsole).toHaveBeenCalledWith(
        '✓ Type check passed\n',
        '',
      );
    });

    it('should return error exit code and output errors', async () => {
      const mockResult: CheckResult = {
        success: false,
        errorCount: 1,
        warningCount: 0,
        errors: [
          {
            file: 'test.ts',
            line: 1,
            column: 1,
            message: 'Type error',
            code: 'TS2322',
            severity: 'error',
          },
        ],
        warnings: [],
        duration: 100,
        checkedFiles: ['test.ts'],
      };

      mockCheckFiles.mockResolvedValue(mockResult);
      mockFormatOutput.mockReturnValue({
        stdout: '',
        stderr: 'test.ts:1:1 - Type error\n',
      });

      const exitCode = await runTypeCheckWithOutput(['test.ts'], {
        verbose: false,
      });

      expect(exitCode).toBe(1);
      expect(mockOutputToConsole).toHaveBeenCalledWith(
        '',
        'test.ts:1:1 - Type error\n',
      );
    });
  });

  describe('handleCommanderError', () => {
    it('should handle missing mandatory option error', () => {
      const error = new Error('Required option missing') as Error & {
        code: string;
      };
      error.code = 'commander.missingMandatoryOptionValue';

      const result = handleCommanderError(error);

      expect(result).toEqual({
        exitCode: 1,
        stdout: '',
        stderr: 'Required option missing\n',
      });
    });

    it('should handle missing argument error', () => {
      const error = new Error('Missing required argument') as Error & {
        code: string;
      };
      error.code = 'commander.missingArgument';

      const result = handleCommanderError(error);

      expect(result).toEqual({
        exitCode: 1,
        stdout: '',
        stderr: 'Missing required argument\n',
      });
    });

    it('should handle unknown commander errors', () => {
      const error = new Error('Unknown commander error') as Error & {
        code: string;
      };
      error.code = 'commander.unknownError';

      const result = handleCommanderError(error);

      expect(result.exitCode).toBe(99);
      expect(result.stderr).toContain('Error:');
      expect(result.stderr).toContain('Unknown commander error');
    });

    it('should handle general errors', () => {
      const error = new Error('General error');

      const result = handleCommanderError(error);

      expect(result.exitCode).toBe(99);
      expect(result.stderr).toContain('Error:');
      expect(result.stderr).toContain('General error');
    });
  });
});
