import { readFileSync } from 'node:fs';

import { afterEach, describe, expect, it } from 'vitest';

import type { TypeScriptConfig } from '@/config/parser';
import { createTempConfig, type TempConfigHandle } from '@/config/temp-config';
import type { CheckOptions } from '@/types/core';

type TempConfigContent = {
  compilerOptions: Record<string, unknown>;
  files?: string[];
  include?: string[];
  exclude?: string[];
  extends?: string;
};

describe('createTempConfig', () => {
  const testConfigDir = '/test/project';
  const testFiles = [
    '/test/project/src/index.ts',
    '/test/project/src/utils.ts',
  ];
  const defaultOptions: CheckOptions = {};

  let tempHandle: TempConfigHandle | null = null;

  afterEach(() => {
    // Clean up any temp files created during tests
    if (tempHandle) {
      try {
        tempHandle.cleanup();
      } catch {
        // Ignore cleanup errors in tests
      }
      tempHandle = null;
    }
  });

  describe('TypeRoots functionality', () => {
    it('should NOT add typeRoots by default (for tsgo compatibility)', () => {
      const originalConfig: TypeScriptConfig = {
        compilerOptions: {
          target: 'ES2020',
          strict: true,
          types: ['node'],
        },
      };

      tempHandle = createTempConfig(
        originalConfig,
        testFiles,
        defaultOptions,
        testConfigDir,
      );

      // Read the created temp config
      const tempConfigContent = JSON.parse(
        readFileSync(tempHandle.path, 'utf8'),
      ) as TempConfigContent;

      // typeRoots should NOT be added by default (allows both tsc and tsgo to work)
      expect(tempConfigContent.compilerOptions.typeRoots).toBeUndefined();
    });

    it('should add typeRoots only when explicitly using tsc', () => {
      const originalConfig: TypeScriptConfig = {
        compilerOptions: {
          target: 'ES2020',
          strict: true,
          types: ['node'],
        },
      };

      const optionsWithTsc = { ...defaultOptions, useTsc: true };
      tempHandle = createTempConfig(
        originalConfig,
        testFiles,
        optionsWithTsc,
        testConfigDir,
      );

      const tempConfigContent = JSON.parse(
        readFileSync(tempHandle.path, 'utf8'),
      ) as TempConfigContent;

      // When using tsc explicitly, typeRoots should be added
      expect(tempConfigContent.compilerOptions.typeRoots).toEqual([
        '/test/project/node_modules/@types',
        '/test/project/node_modules',
      ]);
    });

    it('should preserve existing typeRoots when present', () => {
      const originalConfig: TypeScriptConfig = {
        compilerOptions: {
          target: 'ES2020',
          strict: true,
          typeRoots: ['/custom/types'],
        },
      };

      tempHandle = createTempConfig(
        originalConfig,
        testFiles,
        defaultOptions,
        testConfigDir,
      );

      const tempConfigContent = JSON.parse(
        readFileSync(tempHandle.path, 'utf8'),
      ) as TempConfigContent;

      expect(tempConfigContent.compilerOptions.typeRoots).toEqual([
        '/custom/types',
      ]);
    });
  });

  describe('Path alias resolution', () => {
    it('should convert explicit relative paths to absolute paths', () => {
      const originalConfig: TypeScriptConfig = {
        compilerOptions: {
          target: 'ES2020',
          paths: {
            '@/*': ['./src/*'],
            '@components/*': ['../shared/components/*'],
          },
        },
      };

      tempHandle = createTempConfig(
        originalConfig,
        testFiles,
        defaultOptions,
        testConfigDir,
      );

      const tempConfigContent = JSON.parse(
        readFileSync(tempHandle.path, 'utf8'),
      ) as TempConfigContent;

      expect(tempConfigContent.compilerOptions.paths).toEqual({
        '@/*': ['/test/project/src/*'],
        '@components/*': ['/test/shared/components/*'], // Resolves relative to testConfigDir
      });
    });

    it('should convert implicit relative paths to absolute paths', () => {
      const originalConfig: TypeScriptConfig = {
        compilerOptions: {
          target: 'ES2020',
          paths: {
            '@utils/*': ['src/utils/*'],
            '@lib/*': ['lib/*'],
          },
        },
      };

      tempHandle = createTempConfig(
        originalConfig,
        testFiles,
        defaultOptions,
        testConfigDir,
      );

      const tempConfigContent = JSON.parse(
        readFileSync(tempHandle.path, 'utf8'),
      ) as TempConfigContent;

      expect(tempConfigContent.compilerOptions.paths).toEqual({
        '@utils/*': ['/test/project/src/utils/*'],
        '@lib/*': ['/test/project/lib/*'],
      });
    });

    it('should preserve absolute paths and node_modules paths as-is', () => {
      const originalConfig: TypeScriptConfig = {
        compilerOptions: {
          target: 'ES2020',
          paths: {
            '@abs/*': ['/absolute/path/*'],
            '@nm/*': ['node_modules/some-package/*'],
          },
        },
      };

      tempHandle = createTempConfig(
        originalConfig,
        testFiles,
        defaultOptions,
        testConfigDir,
      );

      const tempConfigContent = JSON.parse(
        readFileSync(tempHandle.path, 'utf8'),
      ) as TempConfigContent;

      expect(tempConfigContent.compilerOptions.paths).toEqual({
        '@abs/*': ['/absolute/path/*'],
        '@nm/*': ['node_modules/some-package/*'],
      });
    });

    it('should handle mixed path types correctly', () => {
      const originalConfig: TypeScriptConfig = {
        compilerOptions: {
          target: 'ES2020',
          paths: {
            '@/*': ['./src/*'], // explicit relative
            '@utils/*': ['src/utils/*'], // implicit relative
            '@abs/*': ['/absolute/path/*'], // absolute
            '@nm/*': ['node_modules/package/*'], // node_modules
          },
        },
      };

      tempHandle = createTempConfig(
        originalConfig,
        testFiles,
        defaultOptions,
        testConfigDir,
      );

      const tempConfigContent = JSON.parse(
        readFileSync(tempHandle.path, 'utf8'),
      ) as TempConfigContent;

      expect(tempConfigContent.compilerOptions.paths).toEqual({
        '@/*': ['/test/project/src/*'],
        '@utils/*': ['/test/project/src/utils/*'],
        '@abs/*': ['/absolute/path/*'],
        '@nm/*': ['node_modules/package/*'],
      });
    });

    it('should handle non-array path values gracefully', () => {
      const originalConfig: TypeScriptConfig = {
        compilerOptions: {
          target: 'ES2020',
          paths: {
            '@valid/*': ['./src/*'],
            '@invalid': 'not-an-array', // Invalid: should be skipped
          },
        },
      };

      tempHandle = createTempConfig(
        originalConfig,
        testFiles,
        defaultOptions,
        testConfigDir,
      );

      const tempConfigContent = JSON.parse(
        readFileSync(tempHandle.path, 'utf8'),
      ) as TempConfigContent;

      // Only the valid path should be processed
      expect(tempConfigContent.compilerOptions.paths).toEqual({
        '@valid/*': ['/test/project/src/*'],
      });
    });
  });

  describe('BaseUrl handling', () => {
    it('should set baseUrl when moduleResolution is not bundler', () => {
      const originalConfig: TypeScriptConfig = {
        compilerOptions: {
          target: 'ES2020',
          moduleResolution: 'node',
          paths: {
            '@/*': ['./src/*'],
          },
        },
      };

      tempHandle = createTempConfig(
        originalConfig,
        testFiles,
        defaultOptions,
        testConfigDir,
      );

      const tempConfigContent = JSON.parse(
        readFileSync(tempHandle.path, 'utf8'),
      ) as TempConfigContent;

      expect(tempConfigContent.compilerOptions.baseUrl).toBe('/test/project');
    });

    it('should not set baseUrl when moduleResolution is bundler', () => {
      const originalConfig: TypeScriptConfig = {
        compilerOptions: {
          target: 'ES2020',
          moduleResolution: 'bundler',
          paths: {
            '@/*': ['./src/*'],
          },
        },
      };

      tempHandle = createTempConfig(
        originalConfig,
        testFiles,
        defaultOptions,
        testConfigDir,
      );

      const tempConfigContent = JSON.parse(
        readFileSync(tempHandle.path, 'utf8'),
      ) as TempConfigContent;

      expect(tempConfigContent.compilerOptions.baseUrl).toBeUndefined();
    });
  });

  describe('User environment preservation', () => {
    it('should preserve all user compiler options including types', () => {
      const originalConfig: TypeScriptConfig = {
        compilerOptions: {
          target: 'ES2020',
          module: 'ESNext',
          strict: true,
          types: ['node', '@types/jest'],
          typeRoots: ['/custom/types'],
          lib: ['ES2020', 'DOM'],
          esModuleInterop: true,
        },
      };

      tempHandle = createTempConfig(
        originalConfig,
        testFiles,
        defaultOptions,
        testConfigDir,
      );

      const tempConfigContent = JSON.parse(
        readFileSync(tempHandle.path, 'utf8'),
      ) as TempConfigContent;

      // All original compiler options should be preserved
      expect(tempConfigContent.compilerOptions.target).toBe('ES2020');
      expect(tempConfigContent.compilerOptions.module).toBe('ESNext');
      expect(tempConfigContent.compilerOptions.strict).toBe(true);
      expect(tempConfigContent.compilerOptions.types).toEqual([
        'node',
        '@types/jest',
      ]);
      expect(tempConfigContent.compilerOptions.typeRoots).toEqual([
        '/custom/types',
      ]);
      expect(tempConfigContent.compilerOptions.lib).toEqual(['ES2020', 'DOM']);
      expect(tempConfigContent.compilerOptions.esModuleInterop).toBe(true);
    });

    it('should apply CheckOptions overrides correctly', () => {
      const originalConfig: TypeScriptConfig = {
        compilerOptions: {
          target: 'ES2020',
          skipLibCheck: false,
          noEmit: false,
        },
      };

      const options: CheckOptions = {
        skipLibCheck: true,
        noEmit: true,
      };

      tempHandle = createTempConfig(
        originalConfig,
        testFiles,
        options,
        testConfigDir,
      );

      const tempConfigContent = JSON.parse(
        readFileSync(tempHandle.path, 'utf8'),
      ) as TempConfigContent;

      expect(tempConfigContent.compilerOptions.skipLibCheck).toBe(true);
      expect(tempConfigContent.compilerOptions.noEmit).toBe(true);
    });
  });

  describe('Config structure', () => {
    it('should create proper temp config structure with files array', () => {
      const originalConfig: TypeScriptConfig = {
        compilerOptions: {
          target: 'ES2020',
        },
        include: ['src/**/*'],
        exclude: ['node_modules'],
        extends: './base.json',
      };

      tempHandle = createTempConfig(
        originalConfig,
        testFiles,
        defaultOptions,
        testConfigDir,
      );

      const tempConfigContent = JSON.parse(
        readFileSync(tempHandle.path, 'utf8'),
      ) as TempConfigContent;

      // Check structure
      expect(tempConfigContent.files).toEqual(testFiles);
      // Include should contain both *.d.ts and *.gen.ts patterns
      expect(tempConfigContent.include).toContain('**/*.d.ts');
      expect(tempConfigContent.include).toContain('**/*.gen.ts');
      // Exclude should always contain node_modules and dist patterns
      expect(tempConfigContent.exclude).toContain('**/node_modules/**');
      expect(tempConfigContent.exclude).toContain('**/dist/**');
      expect(tempConfigContent.extends).toBeUndefined();
    });

    it('should include .gen.ts files for module augmentations (e.g., TanStack Router)', () => {
      const originalConfig: TypeScriptConfig = {
        compilerOptions: {
          target: 'ES2020',
          moduleResolution: 'bundler',
        },
        include: ['**/*.ts', '**/*.tsx'],
      };

      tempHandle = createTempConfig(
        originalConfig,
        testFiles,
        defaultOptions,
        testConfigDir,
      );

      const tempConfigContent = JSON.parse(
        readFileSync(tempHandle.path, 'utf8'),
      ) as TempConfigContent;

      // Should include both .d.ts and .gen.ts patterns to support:
      // - Ambient type declarations (.d.ts)
      // - Generated files with module augmentations (.gen.ts, like routeTree.gen.ts)
      expect(tempConfigContent.include).toEqual([
        '**/*.d.ts',
        '**/*.gen.ts',
        '**/*.d.ts',
        '**/*.gen.ts',
      ]);
    });
  });

  describe('Edge cases', () => {
    it('should handle configs without compilerOptions', () => {
      const originalConfig: TypeScriptConfig = {
        include: ['src/**/*'],
      };

      tempHandle = createTempConfig(
        originalConfig,
        testFiles,
        defaultOptions,
        testConfigDir,
      );

      const tempConfigContent = JSON.parse(
        readFileSync(tempHandle.path, 'utf8'),
      ) as TempConfigContent;

      // Should have default compiler options
      expect(tempConfigContent.compilerOptions).toBeDefined();
      expect(tempConfigContent.compilerOptions.noEmit).toBe(true);
      expect(tempConfigContent.compilerOptions.skipLibCheck).toBe(true);
    });

    it('should handle configs without paths', () => {
      const originalConfig: TypeScriptConfig = {
        compilerOptions: {
          target: 'ES2020',
          strict: true,
        },
      };

      tempHandle = createTempConfig(
        originalConfig,
        testFiles,
        defaultOptions,
        testConfigDir,
      );

      const tempConfigContent = JSON.parse(
        readFileSync(tempHandle.path, 'utf8'),
      ) as TempConfigContent;

      // Should NOT add typeRoots by default (for tsgo compatibility)
      expect(tempConfigContent.compilerOptions.typeRoots).toBeUndefined();
      expect(tempConfigContent.compilerOptions.paths).toBeUndefined();
    });
  });
});
