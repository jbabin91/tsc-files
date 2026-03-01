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

describe('CLI Types', () => {
  describe('CliOptionsSchema', () => {
    it('should parse valid options', () => {
      const validOptions = {
        project: 'tsconfig.json',
        verbose: true,
        json: false,
        cache: true,
        skipLibCheck: false,
      };

      const result = CliOptionsSchema.parse(validOptions);

      expect(result).toEqual({
        project: 'tsconfig.json',
        noEmit: true, // default
        verbose: true,
        json: false,
        cache: true,
        skipLibCheck: false,
        useTsc: false,
        useTsgo: false,
        showCompiler: false,
        benchmark: false,
        fallback: true,
        tips: false,
        recursive: true, // default
      });
    });

    it('should apply defaults for missing options', () => {
      const result = CliOptionsSchema.parse({});

      expect(result).toEqual({
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
        recursive: true, // default
      });
    });

    it('should handle no-cache option', () => {
      const result = CliOptionsSchema.parse({ cache: false });

      expect(result.cache).toBe(false);
    });

    it('should reject invalid option types', () => {
      expect(() => {
        CliOptionsSchema.parse({ project: 123 });
      }).toThrow();

      expect(() => {
        CliOptionsSchema.parse({ verbose: 'true' });
      }).toThrow();
    });
  });

  describe('validateCliOptions', () => {
    it('should validate valid options object', () => {
      const rawOptions = {
        project: 'custom.json',
        verbose: true,
        json: false,
      };

      const result = validateCliOptions(rawOptions);

      expect(result).toEqual({
        project: 'custom.json',
        noEmit: true,
        skipLibCheck: true,
        verbose: true,
        cache: true,
        json: false,
        useTsc: false,
        useTsgo: false,
        showCompiler: false,
        benchmark: false,
        fallback: true,
        tips: false,
        include: undefined,
        maxDepth: undefined,
        maxFiles: undefined,
        noRecursive: false,
        recursive: true,
      });
    });

    it('should handle null/undefined input', () => {
      expect(validateCliOptions(null)).toEqual({
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
        maxDepth: undefined,
        maxFiles: undefined,
        noRecursive: false,
        recursive: true,
      });

      expect(validateCliOptions({})).toEqual({
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
        maxDepth: undefined,
        maxFiles: undefined,
        noRecursive: false,
        recursive: true,
      });
    });

    it('should handle non-object input', () => {
      expect(validateCliOptions('string')).toEqual({
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
        maxDepth: undefined,
        maxFiles: undefined,
        noRecursive: false,
        recursive: true,
      });

      expect(validateCliOptions(123)).toEqual({
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
        maxDepth: undefined,
        maxFiles: undefined,
        noRecursive: false,
        recursive: true,
      });
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
  });

  describe('toCheckOptions', () => {
    it('should convert validated CLI options to CheckOptions', () => {
      const validatedOptions = {
        project: 'tsconfig.build.json',
        noEmit: true,
        skipLibCheck: true,
        verbose: true,
        cache: false,
        json: false,
        useTsc: false,
        useTsgo: false,
        showCompiler: false,
        benchmark: false,
        fallback: true,
        tips: false,
      };

      const result = toCheckOptions(validatedOptions, '/test/cwd');

      expect(result).toEqual({
        project: 'tsconfig.build.json',
        noEmit: true,
        skipLibCheck: true,
        verbose: true,
        cache: false,
        useTsc: false,
        useTsgo: false,
        showCompiler: false,
        benchmark: false,
        fallback: true,
        cwd: '/test/cwd',
      });
    });

    it('should work without cwd parameter', () => {
      const validatedOptions = {
        project: undefined,
        noEmit: true,
        skipLibCheck: false,
        verbose: false,
        cache: true,
        json: true, // Not included in CheckOptions
        useTsc: false,
        useTsgo: false,
        showCompiler: false,
        benchmark: false,
        fallback: true,
        tips: false,
      };

      const result = toCheckOptions(validatedOptions);

      expect(result).toEqual({
        project: undefined,
        noEmit: true,
        skipLibCheck: false,
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

    it('should exclude JSON option from CheckOptions', () => {
      const validatedOptions = {
        project: undefined,
        noEmit: true,
        skipLibCheck: false,
        verbose: false,
        cache: true,
        json: true,
        useTsc: false,
        useTsgo: false,
        showCompiler: false,
        benchmark: false,
        fallback: true,
        tips: false,
      };

      const result = toCheckOptions(validatedOptions);

      expect(result).not.toHaveProperty('json');
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

  describe('Compiler option validation', () => {
    it('should throw error when both useTsc and useTsgo are true', () => {
      const rawOptions = {
        useTsc: true,
        useTsgo: true,
      };

      expect(() => validateCliOptions(rawOptions)).toThrow(
        'Cannot specify both --use-tsc and --use-tsgo flags. Choose one compiler.',
      );
    });

    it('should allow useTsc only', () => {
      const rawOptions = {
        useTsc: true,
        useTsgo: false,
      };

      const result = validateCliOptions(rawOptions);
      expect(result.useTsc).toBe(true);
      expect(result.useTsgo).toBe(false);
    });

    it('should allow useTsgo only', () => {
      const rawOptions = {
        useTsc: false,
        useTsgo: true,
      };

      const result = validateCliOptions(rawOptions);
      expect(result.useTsc).toBe(false);
      expect(result.useTsgo).toBe(true);
    });

    it('should allow neither compiler flag', () => {
      const rawOptions = {
        useTsc: false,
        useTsgo: false,
      };

      const result = validateCliOptions(rawOptions);
      expect(result.useTsc).toBe(false);
      expect(result.useTsgo).toBe(false);
    });
  });
});
