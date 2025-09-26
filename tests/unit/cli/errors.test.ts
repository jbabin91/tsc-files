import { describe, expect, it } from 'vitest';

import {
  categorizeError,
  EXIT_CODES,
  formatConfigError,
  formatError,
  getExitCode,
  getExitCodeFromResult,
} from '@/cli/errors';
import type { CheckResult } from '@/types/core';

describe('CLI Errors', () => {
  describe('EXIT_CODES', () => {
    it('should have correct exit code values', () => {
      expect(EXIT_CODES.SUCCESS).toBe(0);
      expect(EXIT_CODES.TYPE_ERROR).toBe(1);
      expect(EXIT_CODES.CONFIG_ERROR).toBe(2);
      expect(EXIT_CODES.SYSTEM_ERROR).toBe(3);
      expect(EXIT_CODES.UNKNOWN_ERROR).toBe(99);
    });
  });

  describe('categorizeError', () => {
    it('should categorize configuration errors', () => {
      expect(categorizeError('tsconfig.json not found')).toBe('CONFIG_ERROR');
      expect(categorizeError('Failed to read tsconfig.json')).toBe(
        'CONFIG_ERROR',
      );
      expect(
        categorizeError('TypeScript config not found: /path/to/tsconfig.json'),
      ).toBe('CONFIG_ERROR');
      expect(
        categorizeError('No tsconfig.json found in current directory'),
      ).toBe('CONFIG_ERROR');
      expect(categorizeError('Configuration Error: Invalid config')).toBe(
        'CONFIG_ERROR',
      );
    });

    it('should categorize system errors', () => {
      expect(categorizeError('TypeScript compiler failed')).toBe(
        'SYSTEM_ERROR',
      );
      expect(categorizeError('TypeScript not found')).toBe('SYSTEM_ERROR');
      expect(categorizeError('tsc command failed')).toBe('SYSTEM_ERROR');
      expect(categorizeError('System Error: Cannot find TypeScript')).toBe(
        'SYSTEM_ERROR',
      );
    });

    it('should categorize unknown errors', () => {
      expect(categorizeError('Random error message')).toBe('UNKNOWN_ERROR');
      expect(categorizeError('Unexpected error occurred')).toBe(
        'UNKNOWN_ERROR',
      );
      expect(categorizeError('')).toBe('UNKNOWN_ERROR');
    });
  });

  describe('getExitCode', () => {
    it('should return correct exit codes for categories', () => {
      expect(getExitCode('CONFIG_ERROR')).toBe(2);
      expect(getExitCode('SYSTEM_ERROR')).toBe(3);
      expect(getExitCode('TYPE_ERROR')).toBe(1);
      expect(getExitCode('UNKNOWN_ERROR')).toBe(99);
    });
  });

  describe('getExitCodeFromResult', () => {
    it('should return 0 for successful results', () => {
      const result: CheckResult = {
        success: true,
        errorCount: 0,
        warningCount: 0,
        errors: [],
        warnings: [],
        duration: 100,
        checkedFiles: ['file.ts'],
      };

      expect(getExitCodeFromResult(result)).toBe(0);
    });

    it('should return 2 for configuration errors', () => {
      const result: CheckResult = {
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
        duration: 100,
        checkedFiles: [],
      };

      expect(getExitCodeFromResult(result)).toBe(2);
    });

    it('should return 2 for tsconfig-related errors', () => {
      const result: CheckResult = {
        success: false,
        errorCount: 1,
        warningCount: 0,
        errors: [
          {
            file: 'tsc-files',
            line: 1,
            column: 1,
            message: 'TypeScript config not found: /path/to/tsconfig.json',
            code: 'TSC_FILES_ERROR',
            severity: 'error',
          },
        ],
        warnings: [],
        duration: 100,
        checkedFiles: [],
      };

      expect(getExitCodeFromResult(result)).toBe(2);
    });

    it('should return 1 for type errors', () => {
      const result: CheckResult = {
        success: false,
        errorCount: 1,
        warningCount: 0,
        errors: [
          {
            file: 'src/test.ts',
            line: 1,
            column: 1,
            message: "Type 'string' is not assignable to type 'number'",
            code: 'TS2322',
            severity: 'error',
          },
        ],
        warnings: [],
        duration: 100,
        checkedFiles: ['src/test.ts'],
      };

      expect(getExitCodeFromResult(result)).toBe(1);
    });
  });

  describe('formatError', () => {
    it('should format configuration errors', () => {
      const result = formatError('CONFIG_ERROR', 'tsconfig.json not found');

      expect(result.message).toContain('Configuration Error:');
      expect(result.message).toContain('tsconfig.json not found');
      expect(result.tip).toContain('Use --project flag');
    });

    it('should format system errors', () => {
      const result = formatError('SYSTEM_ERROR', 'TypeScript not found');

      expect(result.message).toContain('System Error:');
      expect(result.message).toContain('TypeScript not found');
      expect(result.tip).toContain('npm install -D typescript');
    });

    it('should format type errors', () => {
      const result = formatError('TYPE_ERROR', 'Type error occurred');

      expect(result.message).toContain('Type Error:');
      expect(result.message).toContain('Type error occurred');
      expect(result.tip).toBeUndefined();
    });

    it('should format unknown errors', () => {
      const result = formatError('UNKNOWN_ERROR', 'Unknown error');

      expect(result.message).toContain('Error:');
      expect(result.message).toContain('Unknown error');
      expect(result.tip).toBeUndefined();
    });
  });

  describe('formatConfigError', () => {
    it('should format config error from result', () => {
      const result: CheckResult = {
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
        duration: 100,
        checkedFiles: [],
      };

      const formatted = formatConfigError(result);

      expect(formatted).not.toBeNull();
      expect(formatted!.message).toContain('Configuration Error:');
      expect(formatted!.message).toContain('No tsconfig.json found');
      expect(formatted!.tip).toContain('Use --project flag');
    });

    it('should return null for non-config errors', () => {
      const result: CheckResult = {
        success: false,
        errorCount: 1,
        warningCount: 0,
        errors: [
          {
            file: 'src/test.ts',
            line: 1,
            column: 1,
            message: "Type 'string' is not assignable to type 'number'",
            code: 'TS2322',
            severity: 'error',
          },
        ],
        warnings: [],
        duration: 100,
        checkedFiles: ['src/test.ts'],
      };

      expect(formatConfigError(result)).toBeNull();
    });

    it('should return null for successful results', () => {
      const result: CheckResult = {
        success: true,
        errorCount: 0,
        warningCount: 0,
        errors: [],
        warnings: [],
        duration: 100,
        checkedFiles: ['src/test.ts'],
      };

      expect(formatConfigError(result)).toBeNull();
    });
  });
});
