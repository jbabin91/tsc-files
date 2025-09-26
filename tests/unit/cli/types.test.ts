import { describe, expect, it } from 'vitest';

import {
  CliOptionsSchema,
  toCheckOptions,
  validateCliOptions,
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
      });
    });

    it('should apply defaults for missing options', () => {
      const result = CliOptionsSchema.parse({});

      expect(result).toEqual({
        noEmit: true,
        skipLibCheck: false,
        verbose: false,
        cache: true,
        json: false,
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
        skipLibCheck: false,
        verbose: true,
        cache: true,
        json: false,
      });
    });

    it('should handle null/undefined input', () => {
      expect(validateCliOptions(null)).toEqual({
        noEmit: true,
        skipLibCheck: false,
        verbose: false,
        cache: true,
        json: false,
      });

      expect(validateCliOptions({})).toEqual({
        noEmit: true,
        skipLibCheck: false,
        verbose: false,
        cache: true,
        json: false,
      });
    });

    it('should handle non-object input', () => {
      expect(validateCliOptions('string')).toEqual({
        noEmit: true,
        skipLibCheck: false,
        verbose: false,
        cache: true,
        json: false,
      });

      expect(validateCliOptions(123)).toEqual({
        noEmit: true,
        skipLibCheck: false,
        verbose: false,
        cache: true,
        json: false,
      });
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
      };

      const result = toCheckOptions(validatedOptions, '/test/cwd');

      expect(result).toEqual({
        project: 'tsconfig.build.json',
        noEmit: true,
        skipLibCheck: true,
        verbose: true,
        cache: false,
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
      };

      const result = toCheckOptions(validatedOptions);

      expect(result).toEqual({
        project: undefined,
        noEmit: true,
        skipLibCheck: false,
        verbose: false,
        cache: true,
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
      };

      const result = toCheckOptions(validatedOptions);

      expect(result).not.toHaveProperty('json');
    });
  });
});
