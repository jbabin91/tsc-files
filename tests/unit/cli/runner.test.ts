import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  provideCompilerEducation,
  provideGitHookOptimization,
} from '@/cli/education';
import {
  createOutputContext,
  formatOutput,
  outputTip,
  outputToConsole,
  startProgress,
  updateProgress,
} from '@/cli/output';
import {
  handleCleyeError,
  runTypeCheck,
  runTypeCheckWithOutput,
} from '@/cli/runner';
import { checkFiles } from '@/core/checker';
import type { CheckResult } from '@/types/core';
import { logger } from '@/utils/logger';

// Mock the checkFiles function
vi.mock('@/core/checker', () => ({
  checkFiles: vi.fn(),
}));

// Mock the education module
vi.mock('@/cli/education', () => ({
  provideCompilerEducation: vi.fn(),
  provideGitHookOptimization: vi.fn(),
}));

// Mock the TypeScript detector
vi.mock('@/detectors/typescript', () => ({
  findTypeScriptCompiler: vi.fn(() => ({
    executable: '/usr/bin/tsc',
    args: [],
    useShell: false,
    packageManager: { manager: 'npm' },
    isWindows: false,
    compilerType: 'tsc',
    fallbackAvailable: true,
  })),
}));

// Mock console methods
vi.mock('@/cli/output', () => ({
  createOutputContext: vi.fn(() => ({
    json: false,
    verbose: false,
  })),
  startProgress: vi.fn((ctx: unknown) => ctx),
  updateProgress: vi.fn(),
  formatOutput: vi.fn((): { stdout: string; stderr: string } => ({
    stdout: '',
    stderr: '',
  })),
  outputToConsole: vi.fn(),
  outputError: vi.fn(),
  outputTip: vi.fn(),
  outputPerformanceInsight: vi.fn(),
}));

vi.mock('@/utils/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

const mockCheckFiles = vi.mocked(checkFiles);
const mockCreateOutputContext = vi.mocked(createOutputContext);
const mockStartProgress = vi.mocked(startProgress);
const mockUpdateProgress = vi.mocked(updateProgress);
const mockFormatOutput = vi.mocked(formatOutput);
const mockOutputToConsole = vi.mocked(outputToConsole);
const mockOutputTip = vi.mocked(outputTip);

// Education module mocks
const mockProvideCompilerEducation = vi.mocked(provideCompilerEducation);
const mockProvideGitHookOptimization = vi.mocked(provideGitHookOptimization);

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
        skipLibCheck: true,
        verbose: false,
        cache: true,
        useTsc: false,
        useTsgo: false,
        showCompiler: false,
        benchmark: false,
        fallback: true,
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
        skipLibCheck: true,
        verbose: true,
        cache: true,
        useTsc: false,
        useTsgo: false,
        showCompiler: false,
        benchmark: false,
        fallback: true,
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
        skipLibCheck: true,
        verbose: false,
        cache: true,
        useTsc: false,
        useTsgo: false,
        showCompiler: false,
        benchmark: false,
        fallback: true,
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

    it('should handle --tips flag and exit early', async () => {
      const result = await runTypeCheck(['test.ts'], {
        tips: true,
        json: false,
        verbose: false,
      });

      expect(result).toEqual({
        exitCode: 0,
        stdout: '',
        stderr: '',
      });

      // Should call education functions
      expect(mockProvideGitHookOptimization).toHaveBeenCalled();
      expect(mockProvideCompilerEducation).toHaveBeenCalledWith(
        expect.any(Object),
        expect.any(String), // cwd parameter
        true, // isFirstRun - tips flag shows first-run education
      );

      // Should NOT call checkFiles since we exit early
      expect(mockCheckFiles).not.toHaveBeenCalled();
    });

    it('should handle --tips flag with json mode (no early exit)', async () => {
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
        tips: true,
        json: true, // JSON mode prevents early exit
        verbose: false,
      });

      expect(result).toEqual({
        exitCode: 0,
        stdout: '✓ Type check passed\n',
        stderr: '',
      });

      // Should still call checkFiles in JSON mode
      expect(mockCheckFiles).toHaveBeenCalled();
    });

    it('should handle --benchmark flag and run comparison', async () => {
      const mockTscResult: CheckResult = {
        success: true,
        errorCount: 1,
        warningCount: 0,
        errors: [],
        warnings: [],
        duration: 200,
        checkedFiles: ['test.ts'],
      };

      const mockTsgoResult: CheckResult = {
        success: true,
        errorCount: 1,
        warningCount: 0,
        errors: [],
        warnings: [],
        duration: 100,
        checkedFiles: ['test.ts'],
      };

      const mockFinalResult: CheckResult = {
        success: true,
        errorCount: 0,
        warningCount: 0,
        errors: [],
        warnings: [],
        duration: 150,
        checkedFiles: ['test.ts'],
      };

      // Mock the three checkFiles calls for benchmark
      mockCheckFiles
        .mockResolvedValueOnce(mockTscResult) // tsc run
        .mockResolvedValueOnce(mockTsgoResult) // tsgo run
        .mockResolvedValueOnce(mockFinalResult); // final run

      mockFormatOutput.mockReturnValue({
        stdout: '✓ Type check passed\n',
        stderr: '',
      });

      const result = await runTypeCheck(['test.ts'], {
        benchmark: true,
        verbose: false,
        json: false,
      });

      expect(result).toEqual({
        exitCode: 0,
        stdout: '✓ Type check passed\n',
        stderr: '',
      });

      // Should call checkFiles three times
      expect(mockCheckFiles).toHaveBeenCalledTimes(3);

      // First call should force tsc
      expect(mockCheckFiles).toHaveBeenNthCalledWith(
        1,
        ['test.ts'],
        expect.objectContaining({
          useTsc: true,
          useTsgo: false,
        }),
      );

      // Second call should force tsgo
      expect(mockCheckFiles).toHaveBeenNthCalledWith(
        2,
        ['test.ts'],
        expect.objectContaining({
          useTsc: false,
          useTsgo: true,
        }),
      );

      // Third call should use original options (no forced compiler)
      const thirdCallArgs = mockCheckFiles.mock.calls[2];
      expect(thirdCallArgs[0]).toEqual(['test.ts']);
      expect(thirdCallArgs[1]).not.toHaveProperty('useTsc');
      expect(thirdCallArgs[1]).not.toHaveProperty('useTsgo');
    });

    it('should handle --benchmark flag error and fallback gracefully', async () => {
      const mockFinalResult: CheckResult = {
        success: true,
        errorCount: 0,
        warningCount: 0,
        errors: [],
        warnings: [],
        duration: 150,
        checkedFiles: ['test.ts'],
      };

      // Make first benchmark call fail
      mockCheckFiles
        .mockRejectedValueOnce(new Error('Benchmark failed'))
        .mockResolvedValueOnce(mockFinalResult); // fallback run

      mockFormatOutput.mockReturnValue({
        stdout: '✓ Type check passed\n',
        stderr: '',
      });

      const result = await runTypeCheck(['test.ts'], {
        benchmark: true,
        verbose: false,
        json: false,
      });

      expect(result).toEqual({
        exitCode: 0,
        stdout: '✓ Type check passed\n',
        stderr: '',
      });

      // Should call checkFiles twice (failed benchmark + fallback)
      expect(mockCheckFiles).toHaveBeenCalledTimes(2);
    });

    it('should log compiler information when showCompiler flag is set and fallback exists', async () => {
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

      const loggerInfoMock = vi.mocked(logger.info);

      const result = await runTypeCheck(['test.ts'], {
        showCompiler: true,
        tips: false,
        json: false,
      });

      expect(result.exitCode).toBe(0);
      expect(loggerInfoMock).toHaveBeenCalledTimes(2);
      expect(loggerInfoMock).toHaveBeenCalledWith(
        expect.stringContaining('Using tsc compiler'),
      );
      expect(loggerInfoMock).toHaveBeenCalledWith(
        expect.stringContaining('Fallback compiler available'),
      );
    });

    it('should reuse compiler education helper when tips flag includes setup files', async () => {
      const mockResult: CheckResult = {
        success: true,
        errorCount: 0,
        warningCount: 0,
        errors: [],
        warnings: [],
        duration: 100,
        checkedFiles: ['test.ts'],
        includedSetupFiles: ['setup.ts'],
      };

      mockCheckFiles.mockResolvedValue(mockResult);
      mockFormatOutput.mockReturnValue({
        stdout: '✓ Type check passed\n',
        stderr: '',
      });

      await runTypeCheck(['test.ts'], {
        tips: true,
        json: false,
        verbose: false,
      });

      expect(mockProvideGitHookOptimization).toHaveBeenCalledTimes(1);
      expect(mockOutputTip).not.toHaveBeenCalled();
      expect(mockProvideCompilerEducation).toHaveBeenCalled();
    });

    it('should map cleye help and version outputs to success', () => {
      const result = handleCleyeError(new Error('version flag requested'));
      expect(result).toEqual({ exitCode: 0, stdout: '', stderr: '' });
    });

    it('should treat cleye validation errors as user errors without additional stderr', () => {
      const result = handleCleyeError(
        new Error('Missing required parameter <files...>'),
      );
      expect(result).toEqual({ exitCode: 1, stdout: '', stderr: '' });
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
});
