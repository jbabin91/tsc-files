import type { Ora } from 'ora';
import { describe, expect, it, vi } from 'vitest';

import {
  createOutputContext,
  formatOutput,
  outputError,
  outputPerformanceInsight,
  outputTip,
  outputToConsole,
  startProgress,
  updateProgress,
} from '@/cli/output';
import type { ValidatedCliOptions } from '@/types/cli';
import type { CheckResult } from '@/types/core';

// Mock logger utility
vi.mock('@/utils/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

// Import after mock is set up
const { logger } = await import('@/utils/logger');

// Mock ora since we can't test actual spinners in unit tests
vi.mock('ora', () => ({
  default: vi.fn(() => ({
    start: vi.fn().mockReturnThis(),
    succeed: vi.fn().mockReturnThis(),
    fail: vi.fn().mockReturnThis(),
  })),
}));

describe('CLI Output', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset environment
    delete process.env.CI;
    // Mock isTTY property
    Object.defineProperty(process.stdout, 'isTTY', {
      get: vi.fn(() => true),
      configurable: true,
    });
  });

  describe('createOutputContext', () => {
    it('should create context with progress enabled for TTY', () => {
      const options: ValidatedCliOptions = {
        json: false,
        verbose: true,
        noEmit: true,
        skipLibCheck: false,
        cache: true,
        useTsc: false,
        useTsgo: false,
        showCompiler: false,
        benchmark: false,
        fallback: true,
        tips: false,
      };

      const context = createOutputContext(options);

      expect(context).toEqual({
        json: false,
        verbose: true,
        showProgress: true, // TTY enabled, not CI, not JSON
      });
    });

    it('should disable progress for JSON output', () => {
      const options: ValidatedCliOptions = {
        json: true,
        verbose: false,
        noEmit: true,
        skipLibCheck: false,
        cache: true,
        useTsc: false,
        useTsgo: false,
        showCompiler: false,
        benchmark: false,
        fallback: true,
        tips: false,
      };

      const context = createOutputContext(options);

      expect(context.showProgress).toBe(false);
    });

    it('should disable progress in CI environment', () => {
      process.env.CI = 'true';
      const options: ValidatedCliOptions = {
        json: false,
        verbose: false,
        noEmit: true,
        skipLibCheck: false,
        cache: true,
        useTsc: false,
        useTsgo: false,
        showCompiler: false,
        benchmark: false,
        fallback: true,
        tips: false,
      };

      const context = createOutputContext(options);

      expect(context.showProgress).toBe(false);
    });

    it('should disable progress for non-TTY', () => {
      Object.defineProperty(process.stdout, 'isTTY', {
        get: vi.fn(() => false),
        configurable: true,
      });
      const options: ValidatedCliOptions = {
        json: false,
        verbose: false,
        noEmit: true,
        skipLibCheck: false,
        cache: true,
        useTsc: false,
        useTsgo: false,
        showCompiler: false,
        benchmark: false,
        fallback: true,
        tips: false,
      };

      const context = createOutputContext(options);

      expect(context.showProgress).toBe(false);
    });
  });

  describe('startProgress', () => {
    it('should start spinner when progress is enabled', () => {
      const context = {
        json: false,
        verbose: false,
        showProgress: true,
      };

      const updatedContext = startProgress(context, 5);

      expect(updatedContext.spinner).toBeDefined();
    });

    it('should not start spinner when progress is disabled', () => {
      const context = {
        json: false,
        verbose: false,
        showProgress: false,
      };

      const updatedContext = startProgress(context, 5);

      expect(updatedContext.spinner).toBeUndefined();
    });

    it('should handle singular file count', () => {
      const context = {
        json: false,
        verbose: false,
        showProgress: true,
      };

      const updatedContext = startProgress(context, 1);

      expect(updatedContext.spinner).toBeDefined();
    });
  });

  describe('updateProgress', () => {
    it('should update spinner on success', () => {
      const mockSpinner = {
        succeed: vi.fn(),
        fail: vi.fn(),
      };

      const context = {
        json: false,
        verbose: false,
        showProgress: true,
        spinner: mockSpinner as unknown as Ora,
      };

      const result: CheckResult = {
        success: true,
        errorCount: 0,
        warningCount: 0,
        errors: [],
        warnings: [],
        duration: 100,
        checkedFiles: ['test.ts'],
      };

      updateProgress(context, result);

      expect(mockSpinner.succeed).toHaveBeenCalledWith(
        expect.stringContaining('Type check completed'),
      );
    });

    it('should update spinner on failure', () => {
      const mockSpinner = {
        succeed: vi.fn(),
        fail: vi.fn(),
      };

      const context = {
        json: false,
        verbose: false,
        showProgress: true,
        spinner: mockSpinner as unknown as Ora,
      };

      const result: CheckResult = {
        success: false,
        errorCount: 2,
        warningCount: 0,
        errors: [
          {
            file: 'test.ts',
            line: 1,
            column: 1,
            message: 'Error 1',
            code: 'TS2322',
            severity: 'error',
          },
          {
            file: 'test.ts',
            line: 2,
            column: 1,
            message: 'Error 2',
            code: 'TS2322',
            severity: 'error',
          },
        ],
        warnings: [],
        duration: 100,
        checkedFiles: ['test.ts'],
      };

      updateProgress(context, result);

      expect(mockSpinner.fail).toHaveBeenCalledWith(
        expect.stringContaining('Found 2 type errors'),
      );
    });

    it('should do nothing without spinner', () => {
      const context = {
        json: false,
        verbose: false,
        showProgress: false,
      };

      const result: CheckResult = {
        success: true,
        errorCount: 0,
        warningCount: 0,
        errors: [],
        warnings: [],
        duration: 100,
        checkedFiles: ['test.ts'],
      };

      // Should not throw
      expect(() => updateProgress(context, result)).not.toThrow();
    });
  });

  describe('formatOutput', () => {
    it('should format JSON output', () => {
      const context = {
        json: true,
        verbose: false,
        showProgress: false,
      };

      const result: CheckResult = {
        success: true,
        errorCount: 0,
        warningCount: 0,
        errors: [],
        warnings: [],
        duration: 100,
        checkedFiles: ['test.ts'],
      };

      const { stdout, stderr } = formatOutput(context, result);

      expect(stdout).toBe(JSON.stringify(result, null, 2));
      expect(stderr).toBe('');
    });

    it('should format human-readable output with errors', () => {
      const context = {
        json: false,
        verbose: false,
        showProgress: false,
      };

      const result: CheckResult = {
        success: false,
        errorCount: 1,
        warningCount: 0,
        errors: [
          {
            file: 'src/test.ts',
            line: 5,
            column: 10,
            message: "Type 'string' is not assignable to type 'number'",
            code: 'TS2322',
            severity: 'error',
          },
        ],
        warnings: [],
        duration: 150,
        checkedFiles: ['src/test.ts'],
      };

      const { stdout, stderr } = formatOutput(context, result);

      expect(stderr).toContain('src/test.ts:5:10');
      expect(stderr).toContain(
        "Type 'string' is not assignable to type 'number'",
      );
      expect(stdout).toBe('');
    });

    it('should include verbose information when enabled without spinner', () => {
      const context = {
        json: false,
        verbose: true,
        showProgress: false,
      };

      const result: CheckResult = {
        success: true,
        errorCount: 0,
        warningCount: 0,
        errors: [],
        warnings: [],
        duration: 250,
        checkedFiles: ['src/test1.ts', 'src/test2.ts'],
      };

      const { stdout, stderr } = formatOutput(context, result);

      expect(stdout).toContain('Checked 2 files in 250ms');
      expect(stdout).toContain('Type check passed');
      expect(stderr).toBe('');
    });

    it('should not include verbose info when spinner is present', () => {
      const context = {
        json: false,
        verbose: true,
        showProgress: true,
        spinner: {} as unknown as Ora,
      };

      const result: CheckResult = {
        success: true,
        errorCount: 0,
        warningCount: 0,
        errors: [],
        warnings: [],
        duration: 250,
        checkedFiles: ['src/test1.ts'],
      };

      const { stdout, stderr } = formatOutput(context, result);

      expect(stdout).not.toContain('Checked');
      expect(stdout).toBe('');
      expect(stderr).toBe('');
    });

    it('should show success message without spinner', () => {
      const context = {
        json: false,
        verbose: false,
        showProgress: false,
      };

      const result: CheckResult = {
        success: true,
        errorCount: 0,
        warningCount: 0,
        errors: [],
        warnings: [],
        duration: 100,
        checkedFiles: ['test.ts'],
      };

      const { stdout, stderr } = formatOutput(context, result);

      expect(stdout).toContain('Type check passed');
      expect(stderr).toBe('');
    });
  });

  describe('outputToConsole', () => {
    it('should output stdout and stderr', () => {
      outputToConsole('Standard output\n', 'Error output\n');

      expect(logger.info).toHaveBeenCalledWith('Standard output');
      expect(logger.error).toHaveBeenCalledWith('Error output');
    });

    it('should handle empty outputs', () => {
      outputToConsole('', '');

      expect(logger.info).not.toHaveBeenCalled();
      expect(logger.error).not.toHaveBeenCalled();
    });

    it('should remove trailing newlines', () => {
      outputToConsole('Output with newline\n\n', 'Error with newline\n');

      expect(logger.info).toHaveBeenCalledWith('Output with newline\n');
      expect(logger.error).toHaveBeenCalledWith('Error with newline');
    });
  });

  describe('outputError', () => {
    it('should output error message', () => {
      outputError('Configuration Error: tsconfig not found');

      expect(logger.error).toHaveBeenCalledWith(
        'Configuration Error: tsconfig not found',
      );
    });

    it('should output error message with tip', () => {
      outputError(
        'Configuration Error: tsconfig not found',
        'Tip: Use --project flag',
      );

      expect(logger.error).toHaveBeenCalledWith(
        'Configuration Error: tsconfig not found',
      );
      expect(logger.error).toHaveBeenCalledWith('\nTip: Use --project flag');
    });

    it('should not output tip when not provided', () => {
      outputError('Error occurred');

      expect(logger.error).toHaveBeenCalledTimes(1);
      expect(logger.error).toHaveBeenCalledWith('Error occurred');
    });
  });

  describe('outputTip', () => {
    it('should output tip message with emoji', () => {
      outputTip('Use --verbose for detailed output');

      expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('💡'));
      expect(logger.info).toHaveBeenCalledWith(
        expect.stringContaining('Use --verbose for detailed output'),
      );
    });
  });

  describe('outputPerformanceInsight', () => {
    it('should output performance insight with emoji', () => {
      outputPerformanceInsight('tsgo is 10x faster than tsc');

      expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('⚡'));
      expect(logger.info).toHaveBeenCalledWith(
        expect.stringContaining('tsgo is 10x faster than tsc'),
      );
    });
  });
});
