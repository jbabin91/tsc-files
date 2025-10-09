import { describe, expect, it } from 'vitest';

import {
  type CheckOptions,
  type CheckResult,
  ErrorSource,
  type PackageManager,
  type TypeScriptError,
} from '@/types/core';

describe('Core Types', () => {
  describe('CheckOptions', () => {
    it('should accept minimal options', () => {
      const options: CheckOptions = {};
      expect(options).toEqual({});
    });

    it('should accept all optional properties', () => {
      const options: CheckOptions = {
        project: './tsconfig.json',
        noEmit: true,
        skipLibCheck: false,
        cache: true,
        cacheDir: '/tmp/cache',
        verbose: true,
        cwd: '/path/to/project',
        throwOnError: false,
        useTsc: false,
        useTsgo: true,
        showCompiler: false,
        benchmark: false,
        fallback: true,
        include: ['src/**/*.ts', 'tests/**/*.ts'],
      };

      expect(options.project).toBe('./tsconfig.json');
      expect(options.noEmit).toBe(true);
      expect(options.include).toEqual(['src/**/*.ts', 'tests/**/*.ts']);
    });

    it('should accept partial options', () => {
      const options: CheckOptions = {
        project: './custom-tsconfig.json',
        verbose: true,
        include: ['src/**/*.ts'],
      };

      expect(options.project).toBe('./custom-tsconfig.json');
      expect(options.verbose).toBe(true);
      expect(options.include).toEqual(['src/**/*.ts']);
      expect(options.noEmit).toBeUndefined();
    });
  });

  describe('TypeScriptError', () => {
    it('should create error objects', () => {
      const error: TypeScriptError = {
        file: 'src/index.ts',
        line: 10,
        column: 5,
        message: 'Type string is not assignable to type number',
        code: 'TS2322',
        severity: 'error',
      };

      expect(error.file).toBe('src/index.ts');
      expect(error.line).toBe(10);
      expect(error.column).toBe(5);
      expect(error.message).toBe(
        'Type string is not assignable to type number',
      );
      expect(error.code).toBe('TS2322');
      expect(error.severity).toBe('error');
    });

    it('should create warning objects', () => {
      const warning: TypeScriptError = {
        file: 'src/utils.ts',
        line: 25,
        column: 12,
        message: 'Unused variable detected',
        code: 'TS6133',
        severity: 'warning',
      };

      expect(warning.file).toBe('src/utils.ts');
      expect(warning.severity).toBe('warning');
      expect(warning.code).toBe('TS6133');
    });
  });

  describe('CheckResult', () => {
    it('should create successful result', () => {
      const result: CheckResult = {
        success: true,
        errorCount: 0,
        warningCount: 0,
        errors: [],
        warnings: [],
        duration: 150,
        checkedFiles: ['src/index.ts', 'src/utils.ts'],
        includedSetupFiles: ['tests/setup.ts'],
      };

      expect(result.success).toBe(true);
      expect(result.errorCount).toBe(0);
      expect(result.warningCount).toBe(0);
      expect(result.errors).toEqual([]);
      expect(result.warnings).toEqual([]);
      expect(result.duration).toBe(150);
      expect(result.checkedFiles).toEqual(['src/index.ts', 'src/utils.ts']);
      expect(result.includedSetupFiles).toEqual(['tests/setup.ts']);
    });

    it('should create result with errors and warnings', () => {
      const error: TypeScriptError = {
        file: 'src/index.ts',
        line: 10,
        column: 5,
        message: 'Type error',
        code: 'TS2322',
        severity: 'error',
      };

      const warning: TypeScriptError = {
        file: 'src/utils.ts',
        line: 25,
        column: 12,
        message: 'Unused variable',
        code: 'TS6133',
        severity: 'warning',
      };

      const result: CheckResult = {
        success: false,
        errorCount: 1,
        warningCount: 1,
        errors: [error],
        warnings: [warning],
        duration: 200,
        checkedFiles: ['src/index.ts', 'src/utils.ts'],
      };

      expect(result.success).toBe(false);
      expect(result.errorCount).toBe(1);
      expect(result.warningCount).toBe(1);
      expect(result.errors).toHaveLength(1);
      expect(result.warnings).toHaveLength(1);
      expect(result.errors[0]).toEqual(error);
      expect(result.warnings[0]).toEqual(warning);
    });

    it('should handle optional includedSetupFiles', () => {
      const result: CheckResult = {
        success: true,
        errorCount: 0,
        warningCount: 0,
        errors: [],
        warnings: [],
        duration: 100,
        checkedFiles: ['src/index.ts'],
        // includedSetupFiles is optional
      };

      expect(result.includedSetupFiles).toBeUndefined();
    });
  });

  describe('PackageManager', () => {
    it('should accept all valid package manager values', () => {
      const managers: PackageManager[] = [
        'npm',
        'yarn',
        'pnpm',
        'bun',
        'unknown',
      ];

      expect(managers).toHaveLength(5);
      expect(managers).toContain('npm');
      expect(managers).toContain('yarn');
      expect(managers).toContain('pnpm');
      expect(managers).toContain('bun');
      expect(managers).toContain('unknown');
    });

    it('should be assignable to variables', () => {
      let manager: PackageManager = 'npm';
      expect(manager).toBe('npm');

      manager = 'pnpm';
      expect(manager).toBe('pnpm');

      manager = 'unknown';
      expect(manager).toBe('unknown');
    });
  });

  describe('ErrorSource', () => {
    it('should have correct enum values', () => {
      expect(ErrorSource.TSC).toBe('tsc');
      expect(ErrorSource.TSC_FILES).toBe('tsc-files');
    });

    it('should be assignable to variables', () => {
      let source: ErrorSource = ErrorSource.TSC;
      expect(source).toBe('tsc');

      source = ErrorSource.TSC_FILES;
      expect(source).toBe('tsc-files');
    });
  });
});
