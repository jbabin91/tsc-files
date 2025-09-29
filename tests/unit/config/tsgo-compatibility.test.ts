import { describe, expect, it } from 'vitest';

import type { TypeScriptConfig } from '@/config/parser';
import { analyzeTsgoCompatibility } from '@/config/tsgo-compatibility';

describe('tsgo-compatibility', () => {
  describe('analyzeTsgoCompatibility', () => {
    it('should return compatible for simple config without paths', () => {
      const config: TypeScriptConfig = {
        compilerOptions: {
          target: 'ES2020',
          strict: true,
        },
      };

      const result = analyzeTsgoCompatibility(config);

      expect(result.compatible).toBe(true);
      expect(result.incompatibleFeatures).toEqual([]);
      expect(result.recommendation).toContain(
        'Configuration is compatible with tsgo',
      );
    });

    it('should return compatible for bundler moduleResolution with paths', () => {
      const config: TypeScriptConfig = {
        compilerOptions: {
          target: 'ES2020',
          moduleResolution: 'bundler',
          paths: {
            '@/*': ['./src/*'],
          },
        },
      };

      const result = analyzeTsgoCompatibility(config);

      expect(result.compatible).toBe(true);
      expect(result.incompatibleFeatures).toEqual([]);
    });

    it('should return incompatible for non-bundler moduleResolution with paths', () => {
      const config: TypeScriptConfig = {
        compilerOptions: {
          target: 'ES2020',
          moduleResolution: 'node',
          paths: {
            '@/*': ['./src/*'],
          },
        },
      };

      const result = analyzeTsgoCompatibility(config);

      expect(result.compatible).toBe(false);
      expect(result.incompatibleFeatures).toEqual(['baseUrl']);
      expect(result.recommendation).toContain('Using tsc due to: baseUrl');
    });

    it('should return incompatible for default moduleResolution with paths', () => {
      const config: TypeScriptConfig = {
        compilerOptions: {
          target: 'ES2020',
          // moduleResolution undefined defaults to non-bundler
          paths: {
            '@/*': ['./src/*'],
          },
        },
      };

      const result = analyzeTsgoCompatibility(config);

      expect(result.compatible).toBe(false);
      expect(result.incompatibleFeatures).toEqual(['baseUrl']);
    });

    it('should return compatible when no paths are defined', () => {
      const config: TypeScriptConfig = {
        compilerOptions: {
          target: 'ES2020',
          moduleResolution: 'node',
          // No paths defined
        },
      };

      const result = analyzeTsgoCompatibility(config);

      expect(result.compatible).toBe(true);
      expect(result.incompatibleFeatures).toEqual([]);
    });

    it('should return compatible for config without compilerOptions', () => {
      const config: TypeScriptConfig = {};

      const result = analyzeTsgoCompatibility(config);

      expect(result.compatible).toBe(true);
      expect(result.incompatibleFeatures).toEqual([]);
      expect(result.recommendation).toContain(
        'Configuration is compatible with tsgo',
      );
    });

    it('should return compatible for config with empty compilerOptions', () => {
      const config: TypeScriptConfig = {
        compilerOptions: {},
      };

      const result = analyzeTsgoCompatibility(config);

      expect(result.compatible).toBe(true);
      expect(result.incompatibleFeatures).toEqual([]);
      expect(result.recommendation).toContain(
        'Configuration is compatible with tsgo',
      );
    });

    it('should handle various moduleResolution values with paths', () => {
      const incompatibleResolutions = ['node', 'classic', 'node10'] as const;

      for (const moduleResolution of incompatibleResolutions) {
        const config: TypeScriptConfig = {
          compilerOptions: {
            target: 'ES2020',
            moduleResolution,
            paths: {
              '@utils/*': ['./src/utils/*'],
            },
          },
        };

        const result = analyzeTsgoCompatibility(config);

        expect(result.compatible).toBe(false);
        expect(result.incompatibleFeatures).toEqual(['baseUrl']);
        expect(result.recommendation).toContain('Using tsc due to: baseUrl');
      }
    });

    it('should provide recommendation for bundler module resolution', () => {
      const config: TypeScriptConfig = {
        compilerOptions: {
          target: 'ES2020',
          moduleResolution: 'node',
          paths: {
            '@/*': ['./src/*'],
          },
        },
      };

      const result = analyzeTsgoCompatibility(config);

      expect(result.recommendation).toContain('bundler moduleResolution');
    });
  });
});
