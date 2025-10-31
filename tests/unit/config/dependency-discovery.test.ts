import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import tmp from 'tmp';
import * as ts from 'typescript';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  clearDependencyCache,
  discoverDependencyClosure,
  getCacheStats,
  getPotentialSetupFiles,
  getSetupFilesFromConfig,
} from '@/config/dependency-discovery';
import type { TypeScriptConfig } from '@/config/tsconfig-resolver';
import { logger } from '@/utils/logger';

// Ensure graceful cleanup of temp files
tmp.setGracefulCleanup();

describe('Dependency Discovery', () => {
  let tempDir: string;
  let tempDirCleanup: (() => void) | undefined;

  beforeEach(() => {
    // Use tmp library for temp directory creation (same as other tests)
    // This creates temp dirs in system temp directory, not project root
    const tmpDir = tmp.dirSync({
      prefix: 'tsc-files-test-dep-discovery-',
      unsafeCleanup: true,
    });
    tempDir = tmpDir.name;
    tempDirCleanup = tmpDir.removeCallback;
    clearDependencyCache();
  });

  afterEach(() => {
    // Clean up temp directory
    if (tempDirCleanup) {
      try {
        tempDirCleanup();
      } catch (error) {
        logger.debug?.(
          `Temp dir cleanup error (removeCallback): ${String(error)}`,
        );
      }
      tempDirCleanup = undefined;
    }
    // Fallback cleanup
    try {
      rmSync(tempDir, { recursive: true, force: true });
    } catch (error) {
      logger.debug?.(`Temp dir cleanup error (rmSync): ${String(error)}`);
    }
    clearDependencyCache();
  });

  describe('discoverDependencyClosure', () => {
    it('should discover basic TypeScript files', async () => {
      // Create test files
      const mainFile = path.join(tempDir, 'main.ts');
      const utilsFile = path.join(tempDir, 'utils.ts');
      const typesFile = path.join(tempDir, 'types.d.ts');

      writeFileSync(
        mainFile,
        '/// <reference path="./types.d.ts" />\nimport { helper } from "./utils";\nexport const main = () => helper();',
      );
      writeFileSync(utilsFile, 'export const helper = () => "test";');
      writeFileSync(typesFile, 'declare global { const TEST: string; }');

      // Create basic tsconfig
      const tsconfigPath = path.join(tempDir, 'tsconfig.json');
      writeFileSync(
        tsconfigPath,
        JSON.stringify({
          compilerOptions: {
            target: 'ES2020',
            module: 'commonjs',
            strict: true,
          },
          include: ['**/*.ts'],
        }),
      );

      const config: TypeScriptConfig = {
        compilerOptions: {
          target: 'ES2020',
          module: 'commonjs',
          strict: true,
        },
        include: ['**/*.ts'],
      };

      const result = await discoverDependencyClosure(
        ts,
        config,
        [mainFile],
        tempDir,
        false,
      );

      expect(result.discovered).toBe(true);
      expect(result.sourceFiles).toContain(mainFile);
      expect(result.sourceFiles).toContain(utilsFile);
      // Note: types.d.ts may not be included if not referenced
      expect(result.cacheKey).toBeDefined();
    });

    it('should filter out node_modules files', async () => {
      const mainFile = path.join(tempDir, 'main.ts');
      writeFileSync(mainFile, 'import * as fs from "fs";');

      // Create tsconfig in temp dir
      const tsconfigPath = path.join(tempDir, 'tsconfig.json');
      writeFileSync(
        tsconfigPath,
        JSON.stringify({
          compilerOptions: {
            target: 'ES2020',
            module: 'commonjs',
            strict: true,
          },
        }),
      );

      const config: TypeScriptConfig = {
        compilerOptions: {
          target: 'ES2020',
          module: 'commonjs',
          strict: true,
        },
      };

      const result = await discoverDependencyClosure(
        ts,
        config,
        [mainFile],
        tempDir,
        false,
      );

      expect(result.discovered).toBe(true);
      expect(result.sourceFiles).toContain(mainFile);
      // Should not include node_modules files
      expect(result.sourceFiles.some((f) => f.includes('node_modules'))).toBe(
        false,
      );
    });

    it('should cache results and invalidate on file changes', async () => {
      const mainFile = path.join(tempDir, 'main.ts');
      const utilsFile = path.join(tempDir, 'utils.ts');

      writeFileSync(mainFile, 'import { helper } from "./utils";');
      writeFileSync(utilsFile, 'export const helper = () => "test";');

      // Create tsconfig in temp dir
      const tsconfigPath = path.join(tempDir, 'tsconfig.json');
      writeFileSync(
        tsconfigPath,
        JSON.stringify({
          compilerOptions: {
            target: 'ES2020',
            module: 'commonjs',
          },
        }),
      );

      const config: TypeScriptConfig = {
        compilerOptions: {
          target: 'ES2020',
          module: 'commonjs',
        },
      };

      // First discovery
      const result1 = await discoverDependencyClosure(
        ts,
        config,
        [mainFile],
        tempDir,
      );
      expect(result1.discovered).toBe(true);

      // Second discovery should use cache
      const result2 = await discoverDependencyClosure(
        ts,
        config,
        [mainFile],
        tempDir,
      );
      expect(result2.discovered).toBe(true);
      expect(result2.cacheKey).toBe(result1.cacheKey);

      // Modify file to invalidate cache
      writeFileSync(utilsFile, 'export const helper = () => "modified";');

      const result3 = await discoverDependencyClosure(
        ts,
        config,
        [mainFile],
        tempDir,
      );
      expect(result3.discovered).toBe(true);
      // Cache key should be the same, but mtime hash should cause recomputation
      expect(result3.cacheKey).toBe(result1.cacheKey);
    });

    it('should handle generated .gen.ts files', async () => {
      // Create test files with generated types
      const mainFile = path.join(tempDir, 'main.ts');
      const genFile = path.join(tempDir, 'routes.gen.ts');

      writeFileSync(
        mainFile,
        'import type { Route } from "./routes.gen";\nexport const route: Route = {};',
      );
      writeFileSync(genFile, 'export interface Route { path: string; }');

      // Create tsconfig
      const tsconfigPath = path.join(tempDir, 'tsconfig.json');
      writeFileSync(
        tsconfigPath,
        JSON.stringify({
          compilerOptions: {
            target: 'ES2020',
            module: 'commonjs',
            strict: true,
          },
        }),
      );

      const config: TypeScriptConfig = {
        compilerOptions: {
          target: 'ES2020',
          module: 'commonjs',
          strict: true,
        },
      };

      const result = await discoverDependencyClosure(
        ts,
        config,
        [mainFile],
        tempDir,
        false,
      );

      expect(result.discovered).toBe(true);
      expect(result.sourceFiles).toContain(mainFile);
      expect(result.sourceFiles).toContain(genFile);
    });

    it('should handle path aliases', async () => {
      // Create directory structure with path alias
      const srcDir = path.join(tempDir, 'src');
      const libDir = path.join(tempDir, 'lib');

      // Create directories
      mkdirSync(srcDir);
      mkdirSync(libDir);

      const mainFile = path.join(srcDir, 'main.ts');
      const libFile = path.join(libDir, 'utils.ts');

      writeFileSync(
        mainFile,
        'import { helper } from "@/lib/utils";\nexport const main = () => helper();',
      );
      writeFileSync(libFile, 'export const helper = () => "test";');

      // Create tsconfig with paths
      const tsconfigPath = path.join(tempDir, 'tsconfig.json');
      writeFileSync(
        tsconfigPath,
        JSON.stringify({
          compilerOptions: {
            target: 'ES2020',
            module: 'commonjs',
            strict: true,
            baseUrl: '.',
            paths: {
              '@/*': ['src/*'],
              '@/lib/*': ['lib/*'],
            },
          },
        }),
      );

      const config: TypeScriptConfig = {
        compilerOptions: {
          target: 'ES2020',
          module: 'commonjs',
          strict: true,
          baseUrl: '.',
          paths: {
            '@/*': ['src/*'],
            '@/lib/*': ['lib/*'],
          },
        },
      };

      const result = await discoverDependencyClosure(
        ts,
        config,
        [mainFile],
        tempDir,
        false,
      );

      expect(result.discovered).toBe(true);
      expect(result.sourceFiles).toContain(mainFile);
      expect(result.sourceFiles).toContain(libFile);
    });
  });

  describe('Cache Management', () => {
    it('should provide cache statistics', () => {
      const stats = getCacheStats();
      expect(stats).toHaveProperty('size');
      expect(stats).toHaveProperty('entries');
      expect(Array.isArray(stats.entries)).toBe(true);
    });

    it('should clear cache', async () => {
      const mainFile = path.join(tempDir, 'main.ts');
      writeFileSync(mainFile, 'export const test = 1;');

      const config: TypeScriptConfig = {
        compilerOptions: {
          target: 'ES2020',
        },
      };

      await discoverDependencyClosure(ts, config, [mainFile], tempDir);
      expect(getCacheStats().size).toBeGreaterThan(0);

      clearDependencyCache();
      expect(getCacheStats().size).toBe(0);
    });
  });

  describe('getSetupFilesFromConfig', () => {
    it('should extract setupFiles from vitest.config.ts', () => {
      const setupFile = path.join(tempDir, 'vitest.setup.ts');
      writeFileSync(setupFile, 'console.log("setup");');

      const vitestConfig = path.join(tempDir, 'vitest.config.ts');
      writeFileSync(
        vitestConfig,
        `import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    setupFiles: ['./vitest.setup.ts'],
  },
});`,
      );

      const result = getSetupFilesFromConfig(tempDir);
      expect(result).toContain(setupFile);
    });

    it('should extract setupFilesAfterEnv from jest.config.js', () => {
      const setupFile = path.join(tempDir, 'jest.setup.js');
      writeFileSync(setupFile, 'console.log("jest setup");');

      const jestConfig = path.join(tempDir, 'jest.config.js');
      writeFileSync(
        jestConfig,
        `module.exports = {
  setupFilesAfterEnv: ['./jest.setup.js'],
};`,
      );

      const result = getSetupFilesFromConfig(tempDir);
      expect(result).toContain(setupFile);
    });

    it('should handle multiple setup files in array', () => {
      const setupFile1 = path.join(tempDir, 'setup1.ts');
      const setupFile2 = path.join(tempDir, 'setup2.ts');
      writeFileSync(setupFile1, 'console.log("setup1");');
      writeFileSync(setupFile2, 'console.log("setup2");');

      const vitestConfig = path.join(tempDir, 'vitest.config.ts');
      writeFileSync(
        vitestConfig,
        `export default {
  test: {
    setupFiles: ['./setup1.ts', './setup2.ts'],
  },
};`,
      );

      const result = getSetupFilesFromConfig(tempDir);
      expect(result).toContain(setupFile1);
      expect(result).toContain(setupFile2);
    });

    it('should resolve relative paths correctly', () => {
      const subDir = path.join(tempDir, 'config');
      mkdirSync(subDir);

      const setupFile = path.join(subDir, 'setup.ts');
      writeFileSync(setupFile, 'console.log("setup");');

      const vitestConfig = path.join(tempDir, 'vitest.config.ts');
      writeFileSync(
        vitestConfig,
        `export default {
  test: {
    setupFiles: ['./config/setup.ts'],
  },
};`,
      );

      const result = getSetupFilesFromConfig(tempDir);
      expect(result).toContain(setupFile);
    });

    it('should filter out non-existent setup files', () => {
      const existingSetupFile = path.join(tempDir, 'existing.ts');
      writeFileSync(existingSetupFile, 'console.log("exists");');

      const vitestConfig = path.join(tempDir, 'vitest.config.ts');
      writeFileSync(
        vitestConfig,
        `export default {
  test: {
    setupFiles: ['./existing.ts', './nonexistent.ts'],
  },
};`,
      );

      const result = getSetupFilesFromConfig(tempDir);
      expect(result).toContain(existingSetupFile);
      expect(result).not.toContain(path.join(tempDir, 'nonexistent.ts'));
    });

    it('should handle missing config files gracefully', () => {
      const result = getSetupFilesFromConfig(tempDir);
      expect(result).toEqual([]);
    });

    it('should handle malformed config files gracefully', () => {
      const vitestConfig = path.join(tempDir, 'vitest.config.ts');
      writeFileSync(vitestConfig, 'invalid typescript syntax {{{');

      const result = getSetupFilesFromConfig(tempDir);
      expect(result).toEqual([]);
    });

    it('should support different config file extensions', () => {
      const setupFile = path.join(tempDir, 'setup.js');
      writeFileSync(setupFile, 'console.log("setup");');

      // Test .js extension
      const jestConfigJs = path.join(tempDir, 'jest.config.js');
      writeFileSync(
        jestConfigJs,
        `module.exports = {
  setupFilesAfterEnv: ['./setup.js'],
};`,
      );

      // Test .mjs extension
      const vitestConfigMjs = path.join(tempDir, 'vitest.config.mjs');
      writeFileSync(
        vitestConfigMjs,
        `export default {
  test: {
    setupFiles: ['./setup.js'],
  },
};`,
      );

      const result = getSetupFilesFromConfig(tempDir);
      expect(result).toContain(setupFile);
      // Should find it twice (once from each config)
      expect(result.filter((f) => f === setupFile)).toHaveLength(2);
    });
  });

  describe('getPotentialSetupFiles', () => {
    it('should find setup files in common test directories', () => {
      const testDir = path.join(tempDir, 'tests');
      mkdirSync(testDir);

      const setupFile = path.join(testDir, 'setup.ts');
      writeFileSync(setupFile, 'console.log("setup");');

      const result = getPotentialSetupFiles(tempDir);
      expect(result).toContain(setupFile);
    });

    it('should find setup files with various naming patterns', () => {
      const testDir = path.join(tempDir, '__tests__');
      mkdirSync(testDir);

      const patterns = [
        'setup.ts',
        'setupTests.js',
        'test-setup.ts',
        'globals.js',
        'testGlobals.ts',
      ];

      const expectedFiles: string[] = [];
      for (const pattern of patterns) {
        const filePath = path.join(testDir, pattern);
        writeFileSync(filePath, `console.log("${pattern}");`);
        expectedFiles.push(filePath);
      }

      const result = getPotentialSetupFiles(tempDir);
      for (const expectedFile of expectedFiles) {
        expect(result).toContain(expectedFile);
      }
    });

    it('should search multiple test directory patterns', () => {
      const dirs = ['tests', 'src/tests', '__tests__', 'test', 'spec'];
      const expectedFiles: string[] = [];

      for (const dirName of dirs) {
        const dirPath = path.join(tempDir, ...dirName.split('/'));
        mkdirSync(dirPath, { recursive: true });

        const setupFile = path.join(dirPath, 'setup.ts');
        writeFileSync(setupFile, `console.log("${dirName} setup");`);
        expectedFiles.push(setupFile);
      }

      const result = getPotentialSetupFiles(tempDir);
      for (const expectedFile of expectedFiles) {
        expect(result).toContain(expectedFile);
      }
    });

    it('should find setup files in test subdirectories', () => {
      const testDir = path.join(tempDir, 'tests');
      const configDir = path.join(testDir, 'config');
      const helpersDir = path.join(testDir, 'helpers');

      mkdirSync(testDir);
      mkdirSync(configDir);
      mkdirSync(helpersDir);

      const setupInConfig = path.join(configDir, 'setup.ts');
      const setupInHelpers = path.join(helpersDir, 'globals.js');

      writeFileSync(setupInConfig, 'console.log("config setup");');
      writeFileSync(setupInHelpers, 'console.log("helpers setup");');

      const result = getPotentialSetupFiles(tempDir);
      expect(result).toContain(setupInConfig);
      expect(result).toContain(setupInHelpers);
    });

    it('should integrate config-based setup files', () => {
      // Create a setup file via config
      const configSetupFile = path.join(tempDir, 'vitest.setup.ts');
      writeFileSync(configSetupFile, 'console.log("config setup");');

      const vitestConfig = path.join(tempDir, 'vitest.config.ts');
      writeFileSync(
        vitestConfig,
        `export default {
  test: {
    setupFiles: ['./vitest.setup.ts'],
  },
};`,
      );

      // Create a setup file via directory scanning
      const testDir = path.join(tempDir, 'tests');
      mkdirSync(testDir);
      const dirSetupFile = path.join(testDir, 'setup.ts');
      writeFileSync(dirSetupFile, 'console.log("dir setup");');

      const result = getPotentialSetupFiles(tempDir);
      expect(result).toContain(configSetupFile);
      expect(result).toContain(dirSetupFile);
    });

    it('should deduplicate setup files', () => {
      const testDir = path.join(tempDir, 'tests');
      mkdirSync(testDir);

      // Create the same setup file that would be found via config and directory scanning
      const setupFile = path.join(tempDir, 'setup.ts');
      writeFileSync(setupFile, 'console.log("setup");');

      // Add it via config
      const vitestConfig = path.join(tempDir, 'vitest.config.ts');
      writeFileSync(
        vitestConfig,
        `export default {
  test: {
    setupFiles: ['./setup.ts'],
  },
};`,
      );

      // Also create it in test directory (same file)
      const testSetupFile = path.join(testDir, 'setup.ts');
      writeFileSync(testSetupFile, 'console.log("test setup");'); // Different content

      const result = getPotentialSetupFiles(tempDir);
      // Should contain both files (they're different paths)
      expect(result).toContain(setupFile);
      expect(result).toContain(testSetupFile);
      expect(result).toHaveLength(2);
    });

    it('should return sorted results', () => {
      const testDir = path.join(tempDir, '__tests__');
      mkdirSync(testDir);

      // Create files in reverse alphabetical order using valid setup file names
      const fileZ = path.join(testDir, 'testSetup.ts');
      const fileA = path.join(testDir, 'setup.ts');

      writeFileSync(fileZ, 'console.log("z");');
      writeFileSync(fileA, 'console.log("a");');

      const result = getPotentialSetupFiles(tempDir);
      expect(result).toContain(fileA);
      expect(result).toContain(fileZ);
      // Files should be sorted alphabetically (setup.ts comes before testSetup.ts)
      const aIndex = result.indexOf(fileA);
      const zIndex = result.indexOf(fileZ);
      expect(aIndex).toBeLessThan(zIndex);
    });

    it('should handle missing directories gracefully', () => {
      const result = getPotentialSetupFiles(tempDir);
      expect(result).toEqual([]);
    });

    it('should integrate setup files into dependency closure discovery', async () => {
      // Create a setup file via config
      const configSetupFile = path.join(tempDir, 'vitest.setup.ts');
      writeFileSync(configSetupFile, 'console.log("config setup");');

      const vitestConfig = path.join(tempDir, 'vitest.config.ts');
      writeFileSync(
        vitestConfig,
        `export default {
  test: {
    setupFiles: ['./vitest.setup.ts'],
  },
};`,
      );

      // Create a setup file via directory scanning
      const testDir = path.join(tempDir, 'tests');
      mkdirSync(testDir);
      const dirSetupFile = path.join(testDir, 'setup.ts');
      writeFileSync(dirSetupFile, 'console.log("dir setup");');

      // Create a main file in the tests directory (so hasTestFiles returns true)
      const mainFile = path.join(testDir, 'main.ts');
      writeFileSync(mainFile, 'export const main = () => "test";');

      // Create tsconfig
      const tsconfigPath = path.join(tempDir, 'tsconfig.json');
      writeFileSync(
        tsconfigPath,
        JSON.stringify({
          compilerOptions: {
            target: 'ES2020',
            module: 'commonjs',
            strict: true,
          },
        }),
      );

      const config: TypeScriptConfig = {
        compilerOptions: {
          target: 'ES2020',
          module: 'commonjs',
          strict: true,
        },
      };

      const result = await discoverDependencyClosure(
        ts,
        config,
        [mainFile],
        tempDir,
        false,
      );

      expect(result.discovered).toBe(true);
      expect(result.sourceFiles).toContain(mainFile);
      // Setup files should be automatically included
      expect(result.includedSetupFiles).toContain(configSetupFile);
      expect(result.includedSetupFiles).toContain(dirSetupFile);
      expect(result.includedSetupFiles).toHaveLength(2);
    });

    it('should not include setup files when includeFiles are explicitly provided', async () => {
      // Create setup files
      const setupFile = path.join(tempDir, 'setup.ts');
      writeFileSync(setupFile, 'console.log("setup");');

      const testDir = path.join(tempDir, '__tests__');
      mkdirSync(testDir);
      const testSetupFile = path.join(testDir, 'setup.ts');
      writeFileSync(testSetupFile, 'console.log("test setup");');

      // Create main file in test directory
      const mainFile = path.join(testDir, 'main.ts');
      writeFileSync(mainFile, 'export const main = () => "test";');

      // Create tsconfig
      const tsconfigPath = path.join(tempDir, 'tsconfig.json');
      writeFileSync(
        tsconfigPath,
        JSON.stringify({
          compilerOptions: {
            target: 'ES2020',
            module: 'commonjs',
            strict: true,
          },
          include: ['**/*.ts'],
        }),
      );

      const config: TypeScriptConfig = {
        compilerOptions: {
          target: 'ES2020',
          module: 'commonjs',
          strict: true,
        },
      };

      // Pass explicit includeFiles with some other file to prevent automatic setup inclusion
      const otherFile = path.join(tempDir, 'other.ts');
      writeFileSync(otherFile, 'export const other = 1;');

      const result = await discoverDependencyClosure(
        ts,
        config,
        [mainFile],
        tempDir,
        false,
        [otherFile], // Non-empty includeFiles prevents automatic setup inclusion
      );

      expect(result.discovered).toBe(true);
      expect(result.sourceFiles).toContain(mainFile);
      expect(result.sourceFiles).toContain(otherFile);
      // Setup files should NOT be included when includeFiles is provided
      expect(result.includedSetupFiles).toHaveLength(0);
    });
  });

  describe('Verbose logging scenarios', () => {
    it('logs inclusion of user-specified files', async () => {
      const mainFile = path.join(tempDir, 'main.ts');
      writeFileSync(mainFile, 'export const value = 1;');
      const extraFile = path.join(tempDir, 'extra.ts');
      writeFileSync(extraFile, 'export const extra = 2;');

      const tsconfigPath = path.join(tempDir, 'tsconfig.json');
      writeFileSync(
        tsconfigPath,
        JSON.stringify({
          compilerOptions: {
            target: 'ES2020',
            module: 'commonjs',
          },
        }),
      );

      const config: TypeScriptConfig = {
        compilerOptions: {
          target: 'ES2020',
          module: 'commonjs',
        },
      };

      const infoSpy = vi.spyOn(logger, 'info').mockImplementation(() => {
        /* noop */
      });

      await discoverDependencyClosure(ts, config, [mainFile], tempDir, true, [
        extraFile,
      ]);

      expect(infoSpy).toHaveBeenCalledWith(
        expect.stringContaining('Including user-specified file'),
      );

      infoSpy.mockRestore();
    });

    it('logs when user-specified file is already included', async () => {
      const mainFile = path.join(tempDir, 'main.ts');
      writeFileSync(mainFile, 'export const value = 1;');

      const tsconfigPath = path.join(tempDir, 'tsconfig.json');
      writeFileSync(tsconfigPath, JSON.stringify({ compilerOptions: {} }));

      const config: TypeScriptConfig = {
        compilerOptions: {},
      };

      const infoSpy = vi.spyOn(logger, 'info').mockImplementation(() => {
        /* noop */
      });

      await discoverDependencyClosure(ts, config, [mainFile], tempDir, true, [
        mainFile,
      ]);

      expect(infoSpy).toHaveBeenCalledWith(
        expect.stringContaining('User-specified file already included'),
      );

      infoSpy.mockRestore();
    });

    it('logs when no potential setup files are found for test roots', async () => {
      const testsDir = path.join(tempDir, 'tests');
      mkdirSync(testsDir);
      const testFile = path.join(testsDir, 'main.ts');
      writeFileSync(testFile, 'export const value = 1;');

      const tsconfigPath = path.join(tempDir, 'tsconfig.json');
      writeFileSync(tsconfigPath, JSON.stringify({ compilerOptions: {} }));

      const config: TypeScriptConfig = {
        compilerOptions: {},
      };

      const infoSpy = vi.spyOn(logger, 'info').mockImplementation(() => {
        /* noop */
      });

      await discoverDependencyClosure(ts, config, [testFile], tempDir, true);

      expect(infoSpy).toHaveBeenCalledWith(
        expect.stringContaining('No potential setup files found'),
      );

      infoSpy.mockRestore();
    });

    it('logs when root files have no test patterns under verbose mode', async () => {
      const mainFile = path.join(tempDir, 'src', 'main.ts');
      mkdirSync(path.dirname(mainFile), { recursive: true });
      writeFileSync(mainFile, 'export const value = 1;');

      const tsconfigPath = path.join(tempDir, 'tsconfig.json');
      writeFileSync(tsconfigPath, JSON.stringify({ compilerOptions: {} }));

      const config: TypeScriptConfig = {
        compilerOptions: {},
      };

      const infoSpy = vi.spyOn(logger, 'info').mockImplementation(() => {
        /* noop */
      });

      await discoverDependencyClosure(ts, config, [mainFile], tempDir, true);

      expect(infoSpy).toHaveBeenCalledWith(
        expect.stringContaining('No test files detected'),
      );

      infoSpy.mockRestore();
    });

    it('logs warnings when discovery falls back to include patterns', async () => {
      const mainFile = path.join(tempDir, 'main.ts');
      writeFileSync(mainFile, 'export const value = 1;');

      const tsconfigPath = path.join(tempDir, 'tsconfig.json');
      writeFileSync(tsconfigPath, '{ invalid json');

      const config: TypeScriptConfig = {
        compilerOptions: {},
      };

      const warnSpy = vi.spyOn(logger, 'warn').mockImplementation(() => {
        /* noop */
      });

      const result = await discoverDependencyClosure(
        ts,
        config,
        [mainFile],
        tempDir,
        true,
      );

      expect(result.discovered).toBe(false);
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Dependency discovery failed'),
      );
      expect(warnSpy).toHaveBeenCalledWith(
        'Falling back to include patterns for type checking',
      );

      warnSpy.mockRestore();
    });
  });

  describe('ambient declaration discovery', () => {
    it('should discover basic .d.ts files', async () => {
      // Create ambient declaration file
      const ambientFile = path.join(tempDir, 'custom.d.ts');
      writeFileSync(
        ambientFile,
        'declare module "*.svg" { const content: string; export default content; }',
      );

      // Create main file
      const mainFile = path.join(tempDir, 'main.ts');
      writeFileSync(mainFile, 'export const main = () => "test";');

      // Create tsconfig
      const tsconfigPath = path.join(tempDir, 'tsconfig.json');
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

      const config: TypeScriptConfig = {
        compilerOptions: { target: 'ES2020', module: 'commonjs' },
        include: ['**/*.ts'],
      };

      const result = await discoverDependencyClosure(
        ts,
        config,
        [mainFile],
        tempDir,
      );

      expect(result.discovered).toBe(true);
      expect(result.sourceFiles).toContain(mainFile);
      expect(result.sourceFiles).toContain(ambientFile);
    });

    it('should discover .d.mts and .d.cts files', async () => {
      // Create module-specific declaration files
      const mtsDeclFile = path.join(tempDir, 'module.d.mts');
      const ctsDeclFile = path.join(tempDir, 'commonjs.d.cts');

      writeFileSync(
        mtsDeclFile,
        'declare module "*.module.css" { const content: Record<string, string>; export default content; }',
      );
      writeFileSync(
        ctsDeclFile,
        'declare module "legacy" { export function legacy(): string; }',
      );

      // Create main file
      const mainFile = path.join(tempDir, 'main.ts');
      writeFileSync(mainFile, 'export const main = () => "test";');

      // Create tsconfig
      const tsconfigPath = path.join(tempDir, 'tsconfig.json');
      writeFileSync(
        tsconfigPath,
        JSON.stringify({
          compilerOptions: {
            target: 'ES2020',
            module: 'esnext',
          },
          include: ['**/*'],
        }),
      );

      const config: TypeScriptConfig = {
        compilerOptions: { target: 'ES2020', module: 'esnext' },
        include: ['**/*'],
      };

      const result = await discoverDependencyClosure(
        ts,
        config,
        [mainFile],
        tempDir,
      );

      expect(result.discovered).toBe(true);
      expect(result.sourceFiles).toContain(mainFile);
      expect(result.sourceFiles).toContain(mtsDeclFile);
      expect(result.sourceFiles).toContain(ctsDeclFile);
    });

    it('should discover .gen.ts generated files', async () => {
      // Create generated file (e.g., from TanStack Router or GraphQL)
      const genFile = path.join(tempDir, 'routes.gen.ts');
      writeFileSync(
        genFile,
        'export const routes = { home: "/", about: "/about" };',
      );

      // Create main file
      const mainFile = path.join(tempDir, 'main.ts');
      writeFileSync(mainFile, 'export const main = () => "test";');

      // Create tsconfig
      const tsconfigPath = path.join(tempDir, 'tsconfig.json');
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

      const config: TypeScriptConfig = {
        compilerOptions: { target: 'ES2020', module: 'commonjs' },
        include: ['**/*.ts'],
      };

      const result = await discoverDependencyClosure(
        ts,
        config,
        [mainFile],
        tempDir,
      );

      expect(result.discovered).toBe(true);
      expect(result.sourceFiles).toContain(mainFile);
      expect(result.sourceFiles).toContain(genFile);
    });

    it('should respect exclude patterns', async () => {
      // Create ambient file in excluded directory
      const distDir = path.join(tempDir, 'dist');
      mkdirSync(distDir);
      const excludedAmbientFile = path.join(distDir, 'excluded.d.ts');
      writeFileSync(excludedAmbientFile, 'declare const EXCLUDED: string;');

      // Create ambient file in included directory
      const srcDir = path.join(tempDir, 'src');
      mkdirSync(srcDir);
      const includedAmbientFile = path.join(srcDir, 'included.d.ts');
      writeFileSync(includedAmbientFile, 'declare const INCLUDED: string;');

      // Create main file
      const mainFile = path.join(srcDir, 'main.ts');
      writeFileSync(mainFile, 'export const main = () => "test";');

      // Create tsconfig
      const tsconfigPath = path.join(tempDir, 'tsconfig.json');
      writeFileSync(
        tsconfigPath,
        JSON.stringify({
          compilerOptions: {
            target: 'ES2020',
            module: 'commonjs',
          },
          include: ['src/**/*.ts'],
          exclude: ['dist/**/*'],
        }),
      );

      const config: TypeScriptConfig = {
        compilerOptions: { target: 'ES2020', module: 'commonjs' },
        include: ['src/**/*.ts'],
        exclude: ['dist/**/*'],
      };

      const result = await discoverDependencyClosure(
        ts,
        config,
        [mainFile],
        tempDir,
      );

      expect(result.discovered).toBe(true);
      expect(result.sourceFiles).toContain(mainFile);
      expect(result.sourceFiles).toContain(includedAmbientFile);
      expect(result.sourceFiles).not.toContain(excludedAmbientFile);
    });

    it('should discover ambient files in nested directories', async () => {
      // Create nested directory structure
      const typesDir = path.join(tempDir, 'src', 'types');
      mkdirSync(typesDir, { recursive: true });

      const nestedAmbientFile = path.join(typesDir, 'global.d.ts');
      writeFileSync(
        nestedAmbientFile,
        'declare global { interface Window { MY_APP: boolean; } }',
      );

      // Create main file
      const srcDir = path.join(tempDir, 'src');
      const mainFile = path.join(srcDir, 'main.ts');
      writeFileSync(mainFile, 'export const main = () => "test";');

      // Create tsconfig
      const tsconfigPath = path.join(tempDir, 'tsconfig.json');
      writeFileSync(
        tsconfigPath,
        JSON.stringify({
          compilerOptions: {
            target: 'ES2020',
            module: 'commonjs',
          },
          include: ['src/**/*'],
        }),
      );

      const config: TypeScriptConfig = {
        compilerOptions: { target: 'ES2020', module: 'commonjs' },
        include: ['src/**/*'],
      };

      const result = await discoverDependencyClosure(
        ts,
        config,
        [mainFile],
        tempDir,
      );

      expect(result.discovered).toBe(true);
      expect(result.sourceFiles).toContain(mainFile);
      expect(result.sourceFiles).toContain(nestedAmbientFile);
    });

    it('should invalidate cache when new ambient file is added', async () => {
      // Create main file
      const mainFile = path.join(tempDir, 'main.ts');
      writeFileSync(mainFile, 'export const main = () => "test";');

      // Create tsconfig
      const tsconfigPath = path.join(tempDir, 'tsconfig.json');
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

      const config: TypeScriptConfig = {
        compilerOptions: { target: 'ES2020', module: 'commonjs' },
        include: ['**/*.ts'],
      };

      // First discovery - no ambient files
      const result1 = await discoverDependencyClosure(
        ts,
        config,
        [mainFile],
        tempDir,
      );

      expect(result1.discovered).toBe(true);
      expect(result1.sourceFiles).toContain(mainFile);
      expect(result1.sourceFiles).toHaveLength(1);

      // Add ambient file
      const ambientFile = path.join(tempDir, 'new.d.ts');
      writeFileSync(ambientFile, 'declare const NEW: string;');

      // Second discovery - should detect new ambient file and invalidate cache
      const result2 = await discoverDependencyClosure(
        ts,
        config,
        [mainFile],
        tempDir,
        false, // verbose off
      );

      expect(result2.discovered).toBe(true);
      expect(result2.sourceFiles).toContain(mainFile);
      expect(result2.sourceFiles).toContain(ambientFile);
      expect(result2.sourceFiles).toHaveLength(2);
    });

    it('should log cache invalidation reasons in verbose mode', async () => {
      // Create main file
      const mainFile = path.join(tempDir, 'main.ts');
      writeFileSync(mainFile, 'export const main = () => "test";');

      // Create tsconfig
      const tsconfigPath = path.join(tempDir, 'tsconfig.json');
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

      const config: TypeScriptConfig = {
        compilerOptions: { target: 'ES2020', module: 'commonjs' },
        include: ['**/*.ts'],
      };

      // First discovery
      await discoverDependencyClosure(ts, config, [mainFile], tempDir, false);

      // Add ambient file
      const ambientFile = path.join(tempDir, 'new.d.ts');
      writeFileSync(ambientFile, 'declare const NEW: string;');

      const infoSpy = vi.spyOn(logger, 'info').mockImplementation(() => {
        /* noop */
      });

      // Second discovery with verbose - should log cache invalidation reason
      await discoverDependencyClosure(ts, config, [mainFile], tempDir, true);

      // Should log that cache was invalidated due to ambient file count change
      expect(infoSpy).toHaveBeenCalledWith(
        expect.stringMatching(/Cache invalidated: ambient file count changed/),
      );

      infoSpy.mockRestore();
    });

    it('should log cache invalidation when files are modified', async () => {
      const mainFile = path.join(tempDir, 'main.ts');
      const utilsFile = path.join(tempDir, 'utils.ts');

      writeFileSync(mainFile, 'import { helper } from "./utils";');
      writeFileSync(utilsFile, 'export const helper = () => "test";');

      const tsconfigPath = path.join(tempDir, 'tsconfig.json');
      writeFileSync(
        tsconfigPath,
        JSON.stringify({
          compilerOptions: {
            target: 'ES2020',
            module: 'commonjs',
          },
        }),
      );

      const config: TypeScriptConfig = {
        compilerOptions: {
          target: 'ES2020',
          module: 'commonjs',
        },
      };

      // First discovery
      await discoverDependencyClosure(ts, config, [mainFile], tempDir, false);

      // Modify file to invalidate cache
      writeFileSync(utilsFile, 'export const helper = () => "modified";');

      const infoSpy = vi.spyOn(logger, 'info').mockImplementation(() => {
        /* noop */
      });

      // Second discovery with verbose - should log file modification detection
      await discoverDependencyClosure(ts, config, [mainFile], tempDir, true);

      // Should log that cache was invalidated due to file modifications
      expect(infoSpy).toHaveBeenCalledWith(
        'Cache invalidated: file modifications detected',
      );

      infoSpy.mockRestore();
    });
  });

  describe('recursive import discovery', () => {
    it('should discover transitive dependencies through import chains', async () => {
      // Create chain: main.ts -> utils.ts -> helpers.ts
      const mainFile = path.join(tempDir, 'main.ts');
      const utilsFile = path.join(tempDir, 'utils.ts');
      const helpersFile = path.join(tempDir, 'helpers.ts');

      writeFileSync(
        mainFile,
        'import { util } from "./utils";\nexport const main = () => util();',
      );
      writeFileSync(
        utilsFile,
        'import { helper } from "./helpers";\nexport const util = () => helper();',
      );
      writeFileSync(helpersFile, 'export const helper = () => "test";');

      // Create tsconfig
      const tsconfigPath = path.join(tempDir, 'tsconfig.json');
      writeFileSync(
        tsconfigPath,
        JSON.stringify({
          compilerOptions: { target: 'ES2020', module: 'commonjs' },
          include: ['**/*.ts'],
        }),
      );

      const config: TypeScriptConfig = {
        compilerOptions: { target: 'ES2020', module: 'commonjs' },
        include: ['**/*.ts'],
      };

      const result = await discoverDependencyClosure(
        ts,
        config,
        [mainFile],
        tempDir,
        false,
      );

      expect(result.discovered).toBe(true);
      expect(result.sourceFiles).toContain(mainFile);
      expect(result.sourceFiles).toContain(utilsFile);
      expect(result.sourceFiles).toContain(helpersFile);
      expect(result.sourceFiles).toHaveLength(3);
    });

    it('should handle export from syntax', async () => {
      // Create chain with export from
      const mainFile = path.join(tempDir, 'main.ts');
      const indexFile = path.join(tempDir, 'index.ts');
      const utilsFile = path.join(tempDir, 'utils.ts');

      writeFileSync(mainFile, 'import { util } from "./index";');
      writeFileSync(indexFile, 'export { util } from "./utils";');
      writeFileSync(utilsFile, 'export const util = () => "test";');

      // Create tsconfig
      const tsconfigPath = path.join(tempDir, 'tsconfig.json');
      writeFileSync(
        tsconfigPath,
        JSON.stringify({
          compilerOptions: { target: 'ES2020', module: 'commonjs' },
          include: ['**/*.ts'],
        }),
      );

      const config: TypeScriptConfig = {
        compilerOptions: { target: 'ES2020', module: 'commonjs' },
        include: ['**/*.ts'],
      };

      const result = await discoverDependencyClosure(
        ts,
        config,
        [mainFile],
        tempDir,
        false,
      );

      expect(result.discovered).toBe(true);
      expect(result.sourceFiles).toContain(mainFile);
      expect(result.sourceFiles).toContain(indexFile);
      expect(result.sourceFiles).toContain(utilsFile);
    });

    it('should handle require() syntax', async () => {
      // Create chain with require()
      const mainFile = path.join(tempDir, 'main.ts');
      const utilsFile = path.join(tempDir, 'utils.ts');

      writeFileSync(mainFile, 'const utils = require("./utils");');
      writeFileSync(utilsFile, 'module.exports = { test: "value" };');

      // Create tsconfig
      const tsconfigPath = path.join(tempDir, 'tsconfig.json');
      writeFileSync(
        tsconfigPath,
        JSON.stringify({
          compilerOptions: { target: 'ES2020', module: 'commonjs' },
          include: ['**/*.ts'],
        }),
      );

      const config: TypeScriptConfig = {
        compilerOptions: { target: 'ES2020', module: 'commonjs' },
        include: ['**/*.ts'],
      };

      const result = await discoverDependencyClosure(
        ts,
        config,
        [mainFile],
        tempDir,
        false,
      );

      expect(result.discovered).toBe(true);
      expect(result.sourceFiles).toContain(mainFile);
      expect(result.sourceFiles).toContain(utilsFile);
    });

    it('should handle dynamic import() syntax', async () => {
      // Create chain with dynamic import
      const mainFile = path.join(tempDir, 'main.ts');
      const utilsFile = path.join(tempDir, 'utils.ts');

      writeFileSync(
        mainFile,
        'export const loadUtils = async () => await import("./utils");',
      );
      writeFileSync(utilsFile, 'export const util = () => "test";');

      // Create tsconfig
      const tsconfigPath = path.join(tempDir, 'tsconfig.json');
      writeFileSync(
        tsconfigPath,
        JSON.stringify({
          compilerOptions: { target: 'ES2020', module: 'esnext' },
          include: ['**/*.ts'],
        }),
      );

      const config: TypeScriptConfig = {
        compilerOptions: { target: 'ES2020', module: 'esnext' },
        include: ['**/*.ts'],
      };

      const result = await discoverDependencyClosure(
        ts,
        config,
        [mainFile],
        tempDir,
        false,
      );

      expect(result.discovered).toBe(true);
      expect(result.sourceFiles).toContain(mainFile);
      expect(result.sourceFiles).toContain(utilsFile);
    });

    it('should skip node_modules imports', async () => {
      // Create file that imports from node_modules
      const mainFile = path.join(tempDir, 'main.ts');
      writeFileSync(
        mainFile,
        'import { test } from "vitest";\nimport { util } from "./utils";\n',
      );

      const utilsFile = path.join(tempDir, 'utils.ts');
      writeFileSync(utilsFile, 'export const util = () => "test";');

      // Create tsconfig
      const tsconfigPath = path.join(tempDir, 'tsconfig.json');
      writeFileSync(
        tsconfigPath,
        JSON.stringify({
          compilerOptions: { target: 'ES2020', module: 'commonjs' },
          include: ['**/*.ts'],
        }),
      );

      const config: TypeScriptConfig = {
        compilerOptions: { target: 'ES2020', module: 'commonjs' },
        include: ['**/*.ts'],
      };

      const result = await discoverDependencyClosure(
        ts,
        config,
        [mainFile],
        tempDir,
        false,
      );

      expect(result.discovered).toBe(true);
      expect(result.sourceFiles).toContain(mainFile);
      expect(result.sourceFiles).toContain(utilsFile);
      // Should not include vitest from node_modules
      expect(result.sourceFiles.every((f) => !f.includes('node_modules'))).toBe(
        true,
      );
    });

    it('should respect maxDepth limit and warn', async () => {
      // Create deep chain: A -> B -> C -> D -> E
      const fileA = path.join(tempDir, 'a.ts');
      const fileB = path.join(tempDir, 'b.ts');
      const fileC = path.join(tempDir, 'c.ts');
      const fileD = path.join(tempDir, 'd.ts');
      const fileE = path.join(tempDir, 'e.ts');

      writeFileSync(fileA, 'import "./b";');
      writeFileSync(fileB, 'import "./c";');
      writeFileSync(fileC, 'import "./d";');
      writeFileSync(fileD, 'import "./e";');
      writeFileSync(fileE, 'export const e = "test";');

      // Create tsconfig with explicit files array (prevents auto-discovery by TS compiler)
      const tsconfigPath = path.join(tempDir, 'tsconfig.json');
      writeFileSync(
        tsconfigPath,
        JSON.stringify({
          compilerOptions: {
            target: 'ES2020',
            module: 'commonjs',
            moduleResolution: 'node',
            baseUrl: '.',
            noResolve: true, // Prevent TypeScript from auto-resolving imports
          },
          files: [fileA], // Only include entry point explicitly
        }),
      );

      const config: TypeScriptConfig = {
        compilerOptions: {
          target: 'ES2020',
          module: 'commonjs',
          moduleResolution: 'node',
          baseUrl: '.',
          noResolve: true, // Prevent TypeScript from auto-resolving imports
        },
        files: [fileA], // Only include entry point explicitly
      };

      const warnSpy = vi.spyOn(logger, 'warn');

      // Set maxDepth to 2 - chain is A(0) -> B(1) -> C(2) -> D(3) -> E(4)
      // Should warn when trying to go from C to D at depth 3
      const result = await discoverDependencyClosure(
        ts,
        config,
        [fileA],
        tempDir,
        false,
        undefined,
        { maxDepth: 2, maxFiles: 100 },
      );

      expect(result.discovered).toBe(true);
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Reached maximum depth (2)'),
      );

      warnSpy.mockRestore();
    });

    it('should respect maxFiles limit and warn', async () => {
      // Create many files that import each other
      const files: string[] = [];
      for (let i = 0; i < 10; i++) {
        const file = path.join(tempDir, `file${i}.ts`);
        files.push(file);
        if (i < 9) {
          writeFileSync(file, `import "./file${i + 1}";`);
        } else {
          writeFileSync(file, 'export const last = "test";');
        }
      }

      // Create tsconfig
      const tsconfigPath = path.join(tempDir, 'tsconfig.json');
      writeFileSync(
        tsconfigPath,
        JSON.stringify({
          compilerOptions: { target: 'ES2020', module: 'commonjs' },
          include: ['**/*.ts'],
        }),
      );

      const config: TypeScriptConfig = {
        compilerOptions: { target: 'ES2020', module: 'commonjs' },
        include: ['**/*.ts'],
      };

      const warnSpy = vi.spyOn(logger, 'warn');

      // Set maxFiles to 5 - should warn
      const result = await discoverDependencyClosure(
        ts,
        config,
        [files[0]],
        tempDir,
        false,
        undefined,
        { maxDepth: 20, maxFiles: 5 },
      );

      expect(result.discovered).toBe(true);
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Reached maximum file limit (5)'),
      );

      warnSpy.mockRestore();
    });

    it('should handle circular dependencies gracefully', async () => {
      // Create circular dependency: A -> B -> C -> A
      const fileA = path.join(tempDir, 'a.ts');
      const fileB = path.join(tempDir, 'b.ts');
      const fileC = path.join(tempDir, 'c.ts');

      writeFileSync(fileA, 'import "./b";\nexport const a = "a";');
      writeFileSync(fileB, 'import "./c";\nexport const b = "b";');
      writeFileSync(fileC, 'import "./a";\nexport const c = "c";');

      // Create tsconfig
      const tsconfigPath = path.join(tempDir, 'tsconfig.json');
      writeFileSync(
        tsconfigPath,
        JSON.stringify({
          compilerOptions: { target: 'ES2020', module: 'commonjs' },
          include: ['**/*.ts'],
        }),
      );

      const config: TypeScriptConfig = {
        compilerOptions: { target: 'ES2020', module: 'commonjs' },
        include: ['**/*.ts'],
      };

      // Should not hang or error on circular dependencies
      const result = await discoverDependencyClosure(
        ts,
        config,
        [fileA],
        tempDir,
        false,
      );

      expect(result.discovered).toBe(true);
      expect(result.sourceFiles).toContain(fileA);
      expect(result.sourceFiles).toContain(fileB);
      expect(result.sourceFiles).toContain(fileC);
      expect(result.sourceFiles).toHaveLength(3);
    });

    it('should disable recursive discovery with noRecursive flag', async () => {
      // Create chain: main.ts -> utils.ts -> helpers.ts
      const mainFile = path.join(tempDir, 'main.ts');
      const utilsFile = path.join(tempDir, 'utils.ts');
      const helpersFile = path.join(tempDir, 'helpers.ts');

      writeFileSync(mainFile, 'import { util } from "./utils";');
      writeFileSync(utilsFile, 'import { helper } from "./helpers";');
      writeFileSync(helpersFile, 'export const helper = () => "test";');

      // Create tsconfig
      const tsconfigPath = path.join(tempDir, 'tsconfig.json');
      writeFileSync(
        tsconfigPath,
        JSON.stringify({
          compilerOptions: { target: 'ES2020', module: 'commonjs' },
          include: ['**/*.ts'],
        }),
      );

      const config: TypeScriptConfig = {
        compilerOptions: { target: 'ES2020', module: 'commonjs' },
        include: ['**/*.ts'],
      };

      // With noRecursive: true, should only get files from TypeScript program
      const result = await discoverDependencyClosure(
        ts,
        config,
        [mainFile],
        tempDir,
        false,
        undefined,
        { noRecursive: true },
      );

      expect(result.discovered).toBe(true);
      // TypeScript's program.getSourceFiles() will include utils.ts but may not include helpers.ts
      // depending on whether TypeScript loads it during type checking
      expect(result.sourceFiles).toContain(mainFile);
      expect(result.sourceFiles).toContain(utilsFile);
    });

    it('should log verbose output during recursive discovery', async () => {
      // Create chain: main.ts -> utils.ts
      const mainFile = path.join(tempDir, 'main.ts');
      const utilsFile = path.join(tempDir, 'utils.ts');

      writeFileSync(mainFile, 'import { util } from "./utils";');
      writeFileSync(utilsFile, 'export const util = () => "test";');

      // Create tsconfig
      const tsconfigPath = path.join(tempDir, 'tsconfig.json');
      writeFileSync(
        tsconfigPath,
        JSON.stringify({
          compilerOptions: { target: 'ES2020', module: 'commonjs' },
          include: ['**/*.ts'],
        }),
      );

      const config: TypeScriptConfig = {
        compilerOptions: { target: 'ES2020', module: 'commonjs' },
        include: ['**/*.ts'],
      };

      const infoSpy = vi.spyOn(logger, 'info');

      const result = await discoverDependencyClosure(
        ts,
        config,
        [mainFile],
        tempDir,
        true, // verbose
      );

      expect(result.discovered).toBe(true);
      expect(infoSpy).toHaveBeenCalledWith(
        expect.stringContaining('Performing recursive import discovery'),
      );
      expect(infoSpy).toHaveBeenCalledWith(
        expect.stringContaining('Starting recursive import discovery'),
      );

      infoSpy.mockRestore();
    });
  });
});
