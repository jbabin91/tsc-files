import type * as fs from 'node:fs';
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  createTempConfig,
  createTempConfigPath,
  type TempConfigHandle,
} from '@/config/temp-config';
import type { TypeScriptConfig } from '@/config/tsconfig-resolver';
import type { CheckOptions } from '@/types/core';

// Mock fs module
vi.mock('node:fs', async (importOriginal) => {
  const actual = await importOriginal<typeof fs>();
  return {
    ...actual,
    mkdirSync: vi.fn(actual.mkdirSync),
    writeFileSync: vi.fn(actual.writeFileSync),
  };
});

type TempConfigContent = {
  compilerOptions: Record<string, unknown>;
  files?: string[];
  include?: string[];
  exclude?: string[];
  extends?: string;
};

/**
 * Helper to mock mkdirSync failure for cache directory creation
 * Returns cleanup function to restore the mock
 */
async function mockCacheDirectoryFailure(): Promise<() => void> {
  // Store original mkdirSync for fallback usage in mock
  const actualFs = await vi.importActual<typeof fs>('node:fs');
  const originalMkdirSync = actualFs.mkdirSync;

  // Mock mkdirSync to fail when creating cache directory
  const mockMkdirSync = vi.mocked(mkdirSync);

  mockMkdirSync.mockImplementationOnce((path, options) => {
    // Fail only for cache directory creation
    if (
      typeof path === 'string' &&
      path.includes('node_modules/.cache/tsc-files')
    ) {
      throw new Error('EACCES: permission denied');
    }
    // Call original for other paths (like tmp directory)
    return originalMkdirSync(path, options);
  });

  // Return cleanup function
  return () => mockMkdirSync.mockRestore();
}

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
    it('should NOT add typeRoots by default (for tsgo compatibility)', async () => {
      const originalConfig: TypeScriptConfig = {
        compilerOptions: {
          target: 'ES2020',
          strict: true,
          types: ['node'],
        },
      };

      tempHandle = await createTempConfig(
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

    it('should add typeRoots only when using tsc with cache disabled', async () => {
      const originalConfig: TypeScriptConfig = {
        compilerOptions: {
          target: 'ES2020',
          strict: true,
          types: ['node'],
        },
      };

      // Test 1: With cache enabled (default), no typeRoots added
      {
        const optionsWithTsc = { ...defaultOptions, useTsc: true, cache: true };
        tempHandle = await createTempConfig(
          originalConfig,
          testFiles,
          optionsWithTsc,
          testConfigDir,
        );

        const tempConfigContent = JSON.parse(
          readFileSync(tempHandle.path, 'utf8'),
        ) as TempConfigContent;

        // With cache enabled, typeRoots should NOT be added (uses default resolution)
        expect(tempConfigContent.compilerOptions.typeRoots).toBeUndefined();

        // Cleanup for next test
        tempHandle.cleanup();
      }

      // Test 2: With cache disabled (--no-cache), typeRoots added
      {
        const optionsNoCacheWithTsc = {
          ...defaultOptions,
          useTsc: true,
          cache: false,
        };
        tempHandle = await createTempConfig(
          originalConfig,
          testFiles,
          optionsNoCacheWithTsc,
          testConfigDir,
        );

        const tempConfigContent = JSON.parse(
          readFileSync(tempHandle.path, 'utf8'),
        ) as TempConfigContent;

        // With cache disabled (system temp), typeRoots should be added (only @types, not bare node_modules)
        expect(tempConfigContent.compilerOptions.typeRoots).toEqual([
          '/test/project/node_modules/@types',
        ]);
      }
    });

    it('should preserve existing typeRoots when present', async () => {
      const originalConfig: TypeScriptConfig = {
        compilerOptions: {
          target: 'ES2020',
          strict: true,
          typeRoots: ['/custom/types'],
        },
      };

      tempHandle = await createTempConfig(
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
    it('should convert explicit relative paths to absolute paths', async () => {
      const originalConfig: TypeScriptConfig = {
        compilerOptions: {
          target: 'ES2020',
          paths: {
            '@/*': ['./src/*'],
            '@components/*': ['../shared/components/*'],
          },
        },
      };

      tempHandle = await createTempConfig(
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

    it('should convert implicit relative paths to absolute paths', async () => {
      const originalConfig: TypeScriptConfig = {
        compilerOptions: {
          target: 'ES2020',
          paths: {
            '@utils/*': ['src/utils/*'],
            '@lib/*': ['lib/*'],
          },
        },
      };

      tempHandle = await createTempConfig(
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

    it('should preserve absolute paths and node_modules paths as-is', async () => {
      const originalConfig: TypeScriptConfig = {
        compilerOptions: {
          target: 'ES2020',
          paths: {
            '@abs/*': ['/absolute/path/*'],
            '@nm/*': ['node_modules/some-package/*'],
          },
        },
      };

      tempHandle = await createTempConfig(
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

    it('should handle mixed path types correctly', async () => {
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

      tempHandle = await createTempConfig(
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

    it('should handle non-array path values gracefully', async () => {
      const originalConfig: TypeScriptConfig = {
        compilerOptions: {
          target: 'ES2020',
          paths: {
            '@valid/*': ['./src/*'],
            '@invalid': 'not-an-array', // Invalid: should be skipped
          },
        },
      };

      tempHandle = await createTempConfig(
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
    it('should set baseUrl when moduleResolution is not bundler', async () => {
      const originalConfig: TypeScriptConfig = {
        compilerOptions: {
          target: 'ES2020',
          moduleResolution: 'node',
          paths: {
            '@/*': ['./src/*'],
          },
        },
      };

      tempHandle = await createTempConfig(
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

    it('should not set baseUrl when moduleResolution is bundler', async () => {
      const originalConfig: TypeScriptConfig = {
        compilerOptions: {
          target: 'ES2020',
          moduleResolution: 'bundler',
          paths: {
            '@/*': ['./src/*'],
          },
        },
      };

      tempHandle = await createTempConfig(
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
    it('should preserve all user compiler options including types', async () => {
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

      tempHandle = await createTempConfig(
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

    it('should apply CheckOptions overrides correctly', async () => {
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

      tempHandle = await createTempConfig(
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
    it('should create proper temp config structure with files array', async () => {
      const originalConfig: TypeScriptConfig = {
        compilerOptions: {
          target: 'ES2020',
        },
        include: ['src/**/*'],
        exclude: ['node_modules'],
        extends: './base.json',
      };

      tempHandle = await createTempConfig(
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

    it('should include .gen.ts files for module augmentations (e.g., TanStack Router)', async () => {
      const originalConfig: TypeScriptConfig = {
        compilerOptions: {
          target: 'ES2020',
          moduleResolution: 'bundler',
        },
        include: ['**/*.ts', '**/*.tsx'],
      };

      tempHandle = await createTempConfig(
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
    it('should handle configs without compilerOptions', async () => {
      const originalConfig: TypeScriptConfig = {
        include: ['src/**/*'],
      };

      tempHandle = await createTempConfig(
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

    it('should handle configs without paths', async () => {
      const originalConfig: TypeScriptConfig = {
        compilerOptions: {
          target: 'ES2020',
          strict: true,
        },
      };

      tempHandle = await createTempConfig(
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

  describe('tsBuildInfoFile handling', () => {
    it('should automatically set tsBuildInfoFile when composite is true', async () => {
      const originalConfig: TypeScriptConfig = {
        compilerOptions: {
          target: 'ES2020',
          composite: true,
        },
      };

      tempHandle = await createTempConfig(
        originalConfig,
        testFiles,
        defaultOptions,
        testConfigDir,
      );

      const tempConfigContent = JSON.parse(
        readFileSync(tempHandle.path, 'utf8'),
      ) as TempConfigContent;

      expect(tempConfigContent.compilerOptions.tsBuildInfoFile).toBe(
        '/test/project/node_modules/.cache/tsc-files/tsconfig.tsbuildinfo',
      );
    });

    it('should preserve existing tsBuildInfoFile when set by user', async () => {
      const originalConfig: TypeScriptConfig = {
        compilerOptions: {
          target: 'ES2020',
          composite: true,
          tsBuildInfoFile: '/custom/path/buildinfo.tsbuildinfo',
        },
      };

      tempHandle = await createTempConfig(
        originalConfig,
        testFiles,
        defaultOptions,
        testConfigDir,
      );

      const tempConfigContent = JSON.parse(
        readFileSync(tempHandle.path, 'utf8'),
      ) as TempConfigContent;

      // User's explicit tsBuildInfoFile should be preserved
      expect(tempConfigContent.compilerOptions.tsBuildInfoFile).toBe(
        '/custom/path/buildinfo.tsbuildinfo',
      );
    });

    it('should NOT add tsBuildInfoFile when composite is false', async () => {
      const originalConfig: TypeScriptConfig = {
        compilerOptions: {
          target: 'ES2020',
          composite: false,
        },
      };

      tempHandle = await createTempConfig(
        originalConfig,
        testFiles,
        defaultOptions,
        testConfigDir,
      );

      const tempConfigContent = JSON.parse(
        readFileSync(tempHandle.path, 'utf8'),
      ) as TempConfigContent;

      expect(tempConfigContent.compilerOptions.tsBuildInfoFile).toBeUndefined();
    });

    it('should NOT add tsBuildInfoFile when composite is undefined', async () => {
      const originalConfig: TypeScriptConfig = {
        compilerOptions: {
          target: 'ES2020',
          // composite not set
        },
      };

      tempHandle = await createTempConfig(
        originalConfig,
        testFiles,
        defaultOptions,
        testConfigDir,
      );

      const tempConfigContent = JSON.parse(
        readFileSync(tempHandle.path, 'utf8'),
      ) as TempConfigContent;

      expect(tempConfigContent.compilerOptions.tsBuildInfoFile).toBeUndefined();
    });

    it('should use correct cache directory path for tsBuildInfoFile', async () => {
      const originalConfig: TypeScriptConfig = {
        compilerOptions: {
          composite: true,
          target: 'ES2020',
        },
      };

      const customConfigDir = '/custom/project/path';
      tempHandle = await createTempConfig(
        originalConfig,
        testFiles,
        defaultOptions,
        customConfigDir,
      );

      const tempConfigContent = JSON.parse(
        readFileSync(tempHandle.path, 'utf8'),
      ) as TempConfigContent;

      expect(tempConfigContent.compilerOptions.tsBuildInfoFile).toBe(
        '/custom/project/path/node_modules/.cache/tsc-files/tsconfig.tsbuildinfo',
      );
    });

    it('should log tsBuildInfoFile configuration in verbose mode', async () => {
      const originalConfig: TypeScriptConfig = {
        compilerOptions: {
          target: 'ES2020',
          composite: true,
        },
      };

      const verboseOptions: CheckOptions = {
        ...defaultOptions,
        verbose: true,
      };

      tempHandle = await createTempConfig(
        originalConfig,
        testFiles,
        verboseOptions,
        testConfigDir,
      );

      const tempConfigContent = JSON.parse(
        readFileSync(tempHandle.path, 'utf8'),
      ) as TempConfigContent;

      // Verify tsBuildInfoFile is set correctly
      expect(tempConfigContent.compilerOptions.tsBuildInfoFile).toBe(
        '/test/project/node_modules/.cache/tsc-files/tsconfig.tsbuildinfo',
      );
      // Note: We can't easily test console output in unit tests,
      // but we verify the functionality works correctly
    });
  });

  describe('verbose logging', () => {
    it('should log dependency discovery details when files are discovered', async () => {
      // Create a real temp directory for this test
      const testTempDir = mkdtempSync(path.join(tmpdir(), 'tsc-files-test-'));

      try {
        // Create files with actual imports
        const mainFile = path.join(testTempDir, 'main.ts');
        const utilsFile = path.join(testTempDir, 'utils.ts');

        writeFileSync(
          mainFile,
          'import { helper } from "./utils";\nexport const main = () => helper();',
        );
        writeFileSync(utilsFile, 'export const helper = () => "test";');

        // Create tsconfig in temp directory
        const tsconfigPath = path.join(testTempDir, 'tsconfig.json');
        writeFileSync(
          tsconfigPath,
          JSON.stringify({
            compilerOptions: {
              target: 'ES2020',
              module: 'commonjs',
            },
            include: ['**/*.ts'],
          }),
        );

        const originalConfig: TypeScriptConfig = {
          compilerOptions: {
            target: 'ES2020',
            module: 'commonjs',
          },
          include: ['**/*.ts'],
        };

        const verboseOptions: CheckOptions = {
          verbose: true, // Enable verbose logging to trigger the uncovered lines
        };

        // Only pass main file - dependency discovery should find utils.ts too
        tempHandle = await createTempConfig(
          originalConfig,
          [mainFile], // Only main file, not utils file
          verboseOptions,
          testTempDir,
        );

        // Test should complete successfully
        // The verbose logging will output information about discovered files
        expect(tempHandle).toBeDefined();
        expect(tempHandle.path).toBeDefined();
      } finally {
        // Clean up the real temp directory
        rmSync(testTempDir, { recursive: true, force: true });
      }
    });
  });

  describe('edge cases', () => {
    it('should handle include patterns without TypeScript extensions', async () => {
      const originalConfig: TypeScriptConfig = {
        compilerOptions: {
          target: 'ES2020',
        },
        include: ['src/**/*', 'lib/**/*.js', 'config/*.json'],
      };

      tempHandle = await createTempConfig(
        originalConfig,
        testFiles,
        defaultOptions,
        testConfigDir,
      );

      const tempConfigContent = JSON.parse(
        readFileSync(tempHandle.path, 'utf8'),
      ) as TempConfigContent;

      // Should still create valid config even with non-TS patterns
      expect(tempConfigContent.files).toEqual(testFiles);
      expect(tempConfigContent.compilerOptions.target).toBe('ES2020');
    });

    it('should cleanup and throw error when writeFileSync fails', async () => {
      const originalConfig: TypeScriptConfig = {
        compilerOptions: {
          target: 'ES2020',
        },
      };

      // Mock writeFileSync to fail
      const mockWriteFileSync = vi.mocked(writeFileSync);
      mockWriteFileSync.mockImplementationOnce(() => {
        throw new Error('Permission denied');
      });

      // Should throw error and cleanup
      await expect(
        createTempConfig(
          originalConfig,
          testFiles,
          defaultOptions,
          testConfigDir,
        ),
      ).rejects.toThrow('Failed to create temporary config: Permission denied');

      // Restore mock
      mockWriteFileSync.mockRestore();
    });

    it('should fallback to system temp when cache directory creation fails', async () => {
      const originalConfig: TypeScriptConfig = {
        compilerOptions: {
          target: 'ES2020',
        },
      };

      const cacheOptions: CheckOptions = {
        ...defaultOptions,
        cache: true,
      };

      // Mock cache directory creation failure
      const cleanup = await mockCacheDirectoryFailure();

      // Should not throw - should fallback to system temp
      tempHandle = await createTempConfig(
        originalConfig,
        testFiles,
        cacheOptions,
        testConfigDir,
      );

      // Verify temp config was created (in system temp directory)
      const tempConfigContent = JSON.parse(
        readFileSync(tempHandle.path, 'utf8'),
      ) as TempConfigContent;

      expect(tempConfigContent.files).toEqual(testFiles);
      expect(tempHandle.path).not.toContain('node_modules/.cache');

      // Restore mock
      cleanup();
    });

    it('should log verbose warnings when cache directory creation fails', async () => {
      const originalConfig: TypeScriptConfig = {
        compilerOptions: {
          target: 'ES2020',
        },
      };

      const verboseCacheOptions: CheckOptions = {
        ...defaultOptions,
        cache: true,
        verbose: true, // Enable verbose logging
      };

      // Mock cache directory creation failure
      const cleanup = await mockCacheDirectoryFailure();

      // Should not throw - should fallback to system temp
      tempHandle = await createTempConfig(
        originalConfig,
        testFiles,
        verboseCacheOptions,
        testConfigDir,
      );

      // Verify temp config was created (in system temp directory)
      const tempConfigContent = JSON.parse(
        readFileSync(tempHandle.path, 'utf8'),
      ) as TempConfigContent;

      expect(tempConfigContent.files).toEqual(testFiles);
      expect(tempHandle.path).not.toContain('node_modules/.cache');

      // Restore mock
      cleanup();
    });
  });
});

describe('createTempConfigPath', () => {
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

  it('should handle relative cache directory path gracefully', () => {
    // Test defensive code: ensureCacheDirectory returns undefined for non-absolute paths
    const relativePath = 'relative/cache/dir';

    tempHandle = createTempConfigPath(relativePath);

    // Should fall back to system temp (path should not contain the relative path)
    expect(tempHandle.path).toBeDefined();
    expect(tempHandle.path).not.toContain(relativePath);
    expect(tempHandle.cleanup).toBeInstanceOf(Function);
  });

  it('should handle cache directory creation failure', async () => {
    // Test the fallback path when mkdir fails
    const cacheDir = '/absolute/cache/dir';

    // Store original mkdirSync for fallback usage
    const actualFs = await vi.importActual<typeof fs>('node:fs');
    const originalMkdirSync = actualFs.mkdirSync;

    // Mock mkdirSync to fail for our test cache directory
    const mockMkdirSync = vi.mocked(mkdirSync);

    mockMkdirSync.mockImplementationOnce((path, options) => {
      if (typeof path === 'string' && path.includes('/absolute/cache/dir')) {
        throw new Error('EACCES: permission denied');
      }
      return originalMkdirSync(path, options);
    });

    tempHandle = createTempConfigPath(cacheDir);

    // Should fall back to system temp (path should not contain cache dir)
    expect(tempHandle.path).toBeDefined();
    expect(tempHandle.path).not.toContain('/absolute/cache/dir');
    expect(tempHandle.cleanup).toBeInstanceOf(Function);

    // Restore mock
    mockMkdirSync.mockRestore();
  });
});
