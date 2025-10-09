import { describe, expect, it } from 'vitest';

import {
  CliOptionsSchema,
  type CliResult,
  type ErrorCategory,
  type RawCliOptions,
  toCheckOptions,
  validateCliOptions,
  type ValidatedCliOptions,
} from '@/types/cli';
import type { CheckOptions } from '@/types/core';

describe('CLI Types', () => {
  describe('CliOptionsSchema', () => {
    it('should validate valid CLI options', () => {
      const validOptions = {
        project: './tsconfig.json',
        verbose: true,
        json: false,
        cache: true,
        skipLibCheck: false,
        useTsc: false,
        useTsgo: true,
        showCompiler: false,
        benchmark: false,
        fallback: true,
        tips: false,
        include: 'src/**/*.ts',
      };

      const result = CliOptionsSchema.parse(validOptions);
      expect(result.project).toBe('./tsconfig.json');
      expect(result.verbose).toBe(true);
      expect(result.include).toBe('src/**/*.ts');
    });

    it('should provide default values', () => {
      const minimalOptions = {};
      const result = CliOptionsSchema.parse(minimalOptions);

      expect(result.noEmit).toBe(true);
      expect(result.skipLibCheck).toBe(true);
      expect(result.verbose).toBe(false);
      expect(result.cache).toBe(true);
      expect(result.json).toBe(false);
      expect(result.useTsc).toBe(false);
      expect(result.useTsgo).toBe(false);
      expect(result.showCompiler).toBe(false);
      expect(result.benchmark).toBe(false);
      expect(result.fallback).toBe(true);
      expect(result.tips).toBe(false);
    });

    it('should accept optional fields', () => {
      const partialOptions = {
        project: './custom-tsconfig.json',
        verbose: true,
      };

      const result = CliOptionsSchema.parse(partialOptions);
      expect(result.project).toBe('./custom-tsconfig.json');
      expect(result.verbose).toBe(true);
      expect(result.include).toBeUndefined();
    });
  });

  describe('toCheckOptions', () => {
    it('should convert validated CLI options to CheckOptions', () => {
      const validatedOptions: ValidatedCliOptions = {
        project: './tsconfig.json',
        noEmit: true,
        skipLibCheck: false,
        verbose: true,
        cache: false,
        json: true,
        useTsc: false,
        useTsgo: true,
        showCompiler: false,
        benchmark: false,
        fallback: true,
        tips: false,
        include: ['src/**/*.ts', 'tests/**/*.ts'],
      };

      const cwd = '/path/to/project';
      const result = toCheckOptions(validatedOptions, cwd);

      const expected: CheckOptions = {
        project: './tsconfig.json',
        noEmit: true,
        skipLibCheck: false,
        verbose: true,
        cache: false,
        useTsc: false,
        useTsgo: true,
        showCompiler: false,
        benchmark: false,
        fallback: true,
        include: ['src/**/*.ts', 'tests/**/*.ts'],
        cwd: '/path/to/project',
      };

      expect(result).toEqual(expected);
    });

    it('should handle undefined cwd', () => {
      const validatedOptions: ValidatedCliOptions = {
        noEmit: true,
        skipLibCheck: true,
        verbose: false,
        cache: true,
        json: false,
        useTsc: false,
        useTsgo: false,
        showCompiler: false,
        benchmark: false,
        fallback: true,
        tips: false,
      };

      const result = toCheckOptions(validatedOptions);
      expect(result.cwd).toBeUndefined();
    });

    it('should handle undefined include array', () => {
      const validatedOptions: ValidatedCliOptions = {
        noEmit: true,
        skipLibCheck: true,
        verbose: false,
        cache: true,
        json: false,
        useTsc: false,
        useTsgo: false,
        showCompiler: false,
        benchmark: false,
        fallback: true,
        tips: false,
        include: undefined,
      };

      const result = toCheckOptions(validatedOptions);
      expect(result.include).toBeUndefined();
    });
  });

  describe('validateCliOptions', () => {
    it('should validate and convert raw CLI options', () => {
      const rawOptions: RawCliOptions = {
        project: './tsconfig.json',
        verbose: true,
        json: false,
        cache: true,
        skipLibCheck: false,
        useTsc: false,
        useTsgo: true,
        showCompiler: false,
        benchmark: false,
        fallback: true,
        tips: false,
        include: 'src/**/*.ts,tests/**/*.ts',
      };

      const result = validateCliOptions(rawOptions);

      expect(result.project).toBe('./tsconfig.json');
      expect(result.verbose).toBe(true);
      expect(result.include).toEqual(['src/**/*.ts', 'tests/**/*.ts']);
    });

    it('should parse comma-separated include string', () => {
      const rawOptions = {
        include: 'src/**/*.ts, tests/**/*.ts ,utils/**/*.ts',
      };

      const result = validateCliOptions(rawOptions);
      expect(result.include).toEqual([
        'src/**/*.ts',
        'tests/**/*.ts',
        'utils/**/*.ts',
      ]);
    });

    it('should handle empty include string', () => {
      const rawOptions = {
        include: '',
      };

      const result = validateCliOptions(rawOptions);
      expect(result.include).toBeUndefined();
    });

    it('should handle include string with only commas and spaces', () => {
      const rawOptions = {
        include: ' , , ',
      };

      const result = validateCliOptions(rawOptions);
      expect(result.include).toEqual([]);
    });

    it('should throw error for conflicting compiler options', () => {
      const rawOptions = {
        useTsc: true,
        useTsgo: true,
      };

      expect(() => validateCliOptions(rawOptions)).toThrow(
        'Cannot specify both --use-tsc and --use-tsgo flags. Choose one compiler.',
      );
    });

    it('should handle null input', () => {
      const result = validateCliOptions(null);

      // Should use all defaults
      expect(result.noEmit).toBe(true);
      expect(result.skipLibCheck).toBe(true);
      expect(result.verbose).toBe(false);
      expect(result.include).toBeUndefined();
    });

    it('should handle non-object input', () => {
      const result = validateCliOptions('invalid');

      // Should use all defaults
      expect(result.noEmit).toBe(true);
      expect(result.skipLibCheck).toBe(true);
      expect(result.verbose).toBe(false);
      expect(result.include).toBeUndefined();
    });
  });

  describe('Type definitions', () => {
    it('should export RawCliOptions type', () => {
      const options: RawCliOptions = {
        project: './tsconfig.json',
        verbose: true,
      };

      expect(options.project).toBe('./tsconfig.json');
      expect(options.verbose).toBe(true);
    });

    it('should export ValidatedCliOptions type', () => {
      const options: ValidatedCliOptions = {
        noEmit: true,
        skipLibCheck: false,
        verbose: true,
        cache: false,
        json: true,
        useTsc: false,
        useTsgo: true,
        showCompiler: false,
        benchmark: false,
        fallback: true,
        tips: false,
        include: ['src/**/*.ts'],
      };

      expect(options.noEmit).toBe(true);
      expect(options.include).toEqual(['src/**/*.ts']);
    });

    it('should export CliResult type', () => {
      const result: CliResult = {
        exitCode: 0,
        stdout: 'Success',
        stderr: '',
      };

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toBe('Success');
      expect(result.stderr).toBe('');
    });

    it('should export ErrorCategory type', () => {
      const categories: ErrorCategory[] = [
        'CONFIG_ERROR',
        'SYSTEM_ERROR',
        'TYPE_ERROR',
        'UNKNOWN_ERROR',
      ];

      expect(categories).toHaveLength(4);
      expect(categories).toContain('TYPE_ERROR');
      expect(categories).toContain('CONFIG_ERROR');
    });
  });
});
