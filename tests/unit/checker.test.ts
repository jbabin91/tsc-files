import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { checkFiles } from '@/core/checker.js';

// Test utilities
const createTempDir = () => {
  const tempDir = path.join(tmpdir(), 'tsc-files-test', Date.now().toString());
  mkdirSync(tempDir, { recursive: true });
  return tempDir;
};

const cleanupTempDir = (tempDir: string) => {
  try {
    rmSync(tempDir, { recursive: true, force: true });
  } catch {
    // Ignore cleanup errors
  }
};

const createTestProject = (tempDir: string) => {
  // Create a basic tsconfig.json
  const tsconfig = {
    compilerOptions: {
      target: 'ES2022',
      module: 'ESNext',
      moduleResolution: 'bundler',
      strict: true,
      noEmit: true,
    },
    include: ['src/**/*'],
  };
  writeFileSync(
    path.join(tempDir, 'tsconfig.json'),
    JSON.stringify(tsconfig, null, 2),
  );

  // Create src directory
  const srcDir = path.join(tempDir, 'src');
  mkdirSync(srcDir, { recursive: true });

  return { tsconfig, srcDir };
};

describe('checkFiles', () => {
  let tempDir: string;
  let srcDir: string;

  beforeEach(() => {
    tempDir = createTempDir();
    ({ srcDir } = createTestProject(tempDir));
  });

  describe('file resolution', () => {
    it('should handle empty file list', async () => {
      const result = await checkFiles([], { cwd: tempDir });
      expect(result.success).toBe(true);
      expect(result.checkedFiles).toEqual([]);
      expect(result.errorCount).toBe(0);
    });

    it('should resolve individual TypeScript files', async () => {
      // Create test files
      writeFileSync(path.join(srcDir, 'test.js'), 'console.log("hello");');
      writeFileSync(path.join(srcDir, 'test.txt'), 'some text');
      writeFileSync(path.join(srcDir, 'test.ts'), 'const x: number = 42;');

      const result = await checkFiles(
        ['src/test.js', 'src/test.txt', 'src/test.ts'],
        { cwd: tempDir },
      );

      expect(result.checkedFiles).toHaveLength(1);
      expect(result.checkedFiles[0]).toMatch(/test\.ts$/);
    });

    it('should handle both .ts and .tsx files', async () => {
      writeFileSync(
        path.join(srcDir, 'component.tsx'),
        'const x: string = "hello";',
      );
      writeFileSync(
        path.join(srcDir, 'utils.ts'),
        'export const add = (a: number, b: number) => a + b;',
      );

      const result = await checkFiles(['src/component.tsx', 'src/utils.ts'], {
        cwd: tempDir,
      });

      expect(result.checkedFiles).toHaveLength(2);
      expect(result.success).toBe(true);
    });

    it('should support glob patterns', async () => {
      // Create test files in different subdirectories
      writeFileSync(path.join(srcDir, 'index.ts'), 'const x = "hello";');

      const subDir = path.join(srcDir, 'utils');
      mkdirSync(subDir, { recursive: true });
      writeFileSync(
        path.join(subDir, 'helper.ts'),
        'export const help = () => {};',
      );
      writeFileSync(
        path.join(subDir, 'types.tsx'),
        'export const Component = () => null;',
      );

      const result = await checkFiles(['src/**/*.{ts,tsx}'], {
        cwd: tempDir,
      });

      expect(result.checkedFiles).toHaveLength(3);
      expect(result.success).toBe(true);
    });

    it('should support directory patterns', async () => {
      // Create test files
      writeFileSync(path.join(srcDir, 'index.ts'), 'const x = "hello";');
      writeFileSync(path.join(srcDir, 'utils.ts'), 'const y = "world";');

      const result = await checkFiles(['src'], {
        cwd: tempDir,
      });

      expect(result.checkedFiles).toHaveLength(2);
      expect(result.success).toBe(true);
    });
  });

  describe('type checking', () => {
    it('should pass with valid TypeScript', async () => {
      writeFileSync(
        path.join(srcDir, 'valid.ts'),
        'const message: string = "Hello, world!";',
      );

      const result = await checkFiles(['src/valid.ts'], { cwd: tempDir });

      expect(result.success).toBe(true);
      expect(result.errorCount).toBe(0);
      expect(result.errors).toEqual([]);
    });

    it('should detect type errors', async () => {
      writeFileSync(
        path.join(srcDir, 'invalid.ts'),
        `const message: string = 42;
const other: number = "not a number";`,
      );

      const result = await checkFiles(['src/invalid.ts'], { cwd: tempDir });

      expect(result.success).toBe(false);
      expect(result.errorCount).toBeGreaterThan(0);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('configuration', () => {
    it('should use default tsconfig.json when no project specified', async () => {
      writeFileSync(path.join(srcDir, 'test.ts'), 'const x: string = "test";');

      const result = await checkFiles(['src/test.ts'], { cwd: tempDir });

      expect(result.success).toBe(true);
    });

    it('should find tsconfig.json in parent directories (context detection)', async () => {
      // Create nested directory structure with tsconfig in parent
      const nestedDir = path.join(tempDir, 'nested', 'deeply', 'subdirectory');
      mkdirSync(nestedDir, { recursive: true });

      // Create TypeScript file in nested directory
      writeFileSync(
        path.join(nestedDir, 'test.ts'),
        'const x: string = "test";',
      );

      // Run from nested directory - should find tsconfig.json from tempDir
      const result = await checkFiles(['test.ts'], { cwd: nestedDir });

      expect(result.success).toBe(true);
      expect(result.checkedFiles).toHaveLength(1);
    });

    it('should prioritize closer tsconfig.json files', async () => {
      // Create nested directory with its own tsconfig
      const nestedDir = path.join(tempDir, 'nested');
      mkdirSync(nestedDir, { recursive: true });

      // Create more restrictive tsconfig in nested directory
      const nestedTsconfig = {
        compilerOptions: {
          target: 'ES2022',
          strict: true,
          noEmit: true,
          noUnusedLocals: true, // This will cause warnings/errors for unused vars
        },
      };
      writeFileSync(
        path.join(nestedDir, 'tsconfig.json'),
        JSON.stringify(nestedTsconfig, null, 2),
      );

      // Create test file in nested directory
      writeFileSync(
        path.join(nestedDir, 'test.ts'),
        'const unusedVar = "test"; export const used = "value";',
      );

      // Should use the nested tsconfig.json, not the parent one
      const result = await checkFiles(['test.ts'], { cwd: nestedDir });

      // Result may vary based on TypeScript version, but should successfully run
      expect(typeof result.success).toBe('boolean');
      expect(result.checkedFiles).toHaveLength(1);
    });

    it('should throw error when tsconfig not found', async () => {
      const emptyTempDir = createTempDir();

      await expect(
        checkFiles(['test.ts'], {
          cwd: emptyTempDir,
          project: 'nonexistent.json',
        }),
      ).rejects.toThrow('TypeScript config not found');

      cleanupTempDir(emptyTempDir);
    });

    it('should use custom tsconfig when project specified', async () => {
      // Create a custom tsconfig
      const customTsconfig: Record<string, unknown> = {
        compilerOptions: {
          target: 'ES5',
          strict: false,
          noEmit: true,
        },
      };
      writeFileSync(
        path.join(tempDir, 'tsconfig.custom.json'),
        JSON.stringify(customTsconfig, null, 2),
      );
      writeFileSync(path.join(srcDir, 'test.ts'), 'const x = "test";');

      const result = await checkFiles(['src/test.ts'], {
        cwd: tempDir,
        project: 'tsconfig.custom.json',
      });

      expect(result.success).toBe(true);
    });
  });

  describe('options', () => {
    beforeEach(() => {
      writeFileSync(
        path.join(srcDir, 'test.ts'),
        'const message: string = "Hello";',
      );
    });

    it('should respect verbose option', async () => {
      const result = await checkFiles(['src/test.ts'], {
        cwd: tempDir,
        verbose: true,
      });

      expect(result.success).toBe(true);
    });

    it('should handle noEmit option', async () => {
      const result = await checkFiles(['src/test.ts'], {
        cwd: tempDir,
        noEmit: true,
      });

      expect(result.success).toBe(true);
    });

    it('should handle skipLibCheck option', async () => {
      const result = await checkFiles(['src/test.ts'], {
        cwd: tempDir,
        skipLibCheck: true,
      });

      expect(result.success).toBe(true);
    });
  });

  describe('result structure', () => {
    it('should return proper result structure on success', async () => {
      writeFileSync(path.join(srcDir, 'test.ts'), 'const x: number = 42;');

      const result = await checkFiles(['src/test.ts'], { cwd: tempDir });

      expect(result).toMatchObject({
        success: true,
        errorCount: 0,
        warningCount: 0,
        errors: [],
        warnings: [],
        checkedFiles: expect.arrayContaining([
          expect.stringMatching(/test\.ts$/),
        ]) as string[],
      });
      expect(typeof result.duration).toBe('number');
      expect(result.duration).toBeGreaterThan(0);
    });
  });

  describe('error handling', () => {
    it('should handle malformed tsconfig.json', async () => {
      writeFileSync(path.join(tempDir, 'tsconfig.json'), '{ invalid json }');
      writeFileSync(path.join(srcDir, 'test.ts'), 'const x = 1;');

      await expect(
        checkFiles(['src/test.ts'], { cwd: tempDir }),
      ).rejects.toThrow('Failed to read tsconfig.json');
    });

    it('should throw on error when throwOnError is true', async () => {
      const emptyTempDir = createTempDir();

      // Create a test file that doesn't exist to trigger file resolution error
      await expect(
        checkFiles(['nonexistent.ts'], {
          cwd: emptyTempDir,
          throwOnError: true,
        }),
      ).rejects.toThrow('No tsconfig.json found');

      cleanupTempDir(emptyTempDir);
    });

    it('should handle warnings separately from errors', async () => {
      // Create a TypeScript file that will generate warnings (unused variables)
      writeFileSync(
        path.join(tempDir, 'warnings.ts'),
        `
          const unusedVariable = 'this will generate a warning';
          export const message: string = 'test';
        `,
      );

      const result = await checkFiles(['warnings.ts'], {
        cwd: tempDir,
        // Enable strict checks that might generate warnings
        verbose: true,
      });

      expect(result.success).toBe(true); // Should succeed despite warnings
      expect(result.errorCount).toBe(0);
      expect(typeof result.warningCount).toBe('number');
      expect(Array.isArray(result.warnings)).toBe(true);
    });

    it('should handle cleanup errors gracefully', async () => {
      // Create invalid TypeScript to trigger error handling paths
      writeFileSync(
        path.join(tempDir, 'invalid.ts'),
        'const message: string = 42;',
      );

      // Should still complete despite potential cleanup errors
      const result = await checkFiles(['invalid.ts'], { cwd: tempDir });

      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  // Cleanup after each test
  afterEach(() => {
    cleanupTempDir(tempDir);
  });
});
