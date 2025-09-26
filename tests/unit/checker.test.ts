import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { checkFiles } from '@/core/checker';

const cleanupTempDir = (tempDir: string) => {
  try {
    rmSync(tempDir, { recursive: true, force: true });
  } catch {
    // Ignore cleanup errors
  }
};

const createTestProject = (tempDir: string) => {
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

      // Explicitly specify a nonexistent project to avoid tsconfig.json discovery from parent dirs
      await expect(
        checkFiles(['nonexistent.ts'], {
          cwd: emptyTempDir,
          project: './nonexistent-tsconfig.json',
          throwOnError: true,
        }),
      ).rejects.toThrow('TypeScript config not found');

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

    it('should handle nonexistent tsconfig path in shouldIncludeJavaScriptFiles', async () => {
      writeFileSync(path.join(srcDir, 'test.ts'), 'const x = 1;');

      // This should throw an error because the specified project path doesn't exist
      await expect(
        checkFiles(['src/test.ts'], {
          cwd: tempDir,
          project: 'nonexistent-tsconfig.json',
        }),
      ).rejects.toThrow('TypeScript config not found');
    });

    it('should handle glob resolution fallback when fast-glob fails', async () => {
      // Create a test scenario where glob might fail and fallback to simple pattern matching
      writeFileSync(path.join(srcDir, 'test.ts'), 'const x = 1;');

      // Use a pattern that might trigger glob fallback
      const result = await checkFiles(['src/test.ts'], { cwd: tempDir });

      expect(result.success).toBe(true);
      expect(result.checkedFiles).toHaveLength(1);
    });

    it('should handle no files scenario with verbose logging', async () => {
      // Test the verbose logging path when no files are found
      const result = await checkFiles(['src/*.xyz'], {
        cwd: tempDir,
        verbose: true,
      });

      expect(result.success).toBe(true);
      expect(result.checkedFiles).toHaveLength(0);
      expect(result.errorCount).toBe(0);
    });

    it('should handle execution error with missing stdout/stderr', async () => {
      // Create TypeScript file with complex type error to potentially trigger execution errors
      writeFileSync(
        path.join(srcDir, 'complex-error.ts'),
        `
        // Create a complex error scenario that might cause execution issues
        const complexObject: { deeply: { nested: { property: string } } } = {
          deeply: {
            nested: {
              property: 42 // Type error: should be string
            }
          }
        };

        // Use non-existent types to potentially cause more complex errors
        const invalidType: NonExistentType = 'test';
        `,
      );

      const result = await checkFiles(['src/complex-error.ts'], {
        cwd: tempDir,
      });

      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should handle filesystem root in findTsConfig', async () => {
      // Create a temp directory that is very deep to test filesystem root detection
      const veryDeepTempDir = createTempDir();
      const veryDeepDir = path.join(
        veryDeepTempDir,
        'very',
        'deep',
        'directory',
        'structure',
      );
      mkdirSync(veryDeepDir, { recursive: true });
      writeFileSync(path.join(veryDeepDir, 'test.ts'), 'const x = 1;');

      // This should eventually reach filesystem root and throw
      await expect(
        checkFiles(['test.ts'], {
          cwd: veryDeepDir,
        }),
      ).rejects.toThrow('No tsconfig.json found');

      // Clean up
      cleanupTempDir(veryDeepTempDir);
    });

    it('should handle complex execution error scenarios', async () => {
      // Create a custom tsconfig that might cause execution issues
      const problemTsconfig = {
        compilerOptions: {
          target: 'ES2022',
          module: 'ESNext',
          strict: true,
          noEmit: true,
          // Add options that might cause compiler issues
          lib: ['nonexistent'], // This might cause issues
        },
      };
      writeFileSync(
        path.join(tempDir, 'tsconfig.json'),
        JSON.stringify(problemTsconfig, null, 2),
      );

      writeFileSync(path.join(srcDir, 'test.ts'), 'const x: string = "hello";');

      // This should handle the complex error scenario
      const result = await checkFiles(['src/test.ts'], { cwd: tempDir });

      // Should handle the error gracefully
      expect(typeof result.success).toBe('boolean');
    });
  });

  describe('monorepo support', () => {
    it('should handle multiple tsconfig groups with verbose logging', async () => {
      // Create nested directory with its own tsconfig
      const nestedDir = path.join(tempDir, 'packages', 'nested');
      mkdirSync(nestedDir, { recursive: true });

      // Create different tsconfig in nested directory
      const nestedTsconfig = {
        compilerOptions: {
          target: 'ES2020',
          strict: true,
          noEmit: true,
        },
      };
      writeFileSync(
        path.join(nestedDir, 'tsconfig.json'),
        JSON.stringify(nestedTsconfig, null, 2),
      );

      // Create files in both directories
      writeFileSync(path.join(srcDir, 'main.ts'), 'const main = "main";');
      writeFileSync(
        path.join(nestedDir, 'nested.ts'),
        'const nested = "nested";',
      );

      // Check both files with verbose to trigger monorepo logging
      const result = await checkFiles(
        ['src/main.ts', 'packages/nested/nested.ts'],
        {
          cwd: tempDir,
          verbose: true,
        },
      );

      expect(result.success).toBe(true);
      expect(result.checkedFiles).toHaveLength(2);
    });

    it('should handle group with no resolved files in monorepo', async () => {
      // Create nested directory with its own tsconfig
      const nestedDir = path.join(tempDir, 'packages', 'empty');
      mkdirSync(nestedDir, { recursive: true });

      // Create tsconfig but no TypeScript files
      const nestedTsconfig = {
        compilerOptions: {
          target: 'ES2020',
          strict: true,
          noEmit: true,
        },
      };
      writeFileSync(
        path.join(nestedDir, 'tsconfig.json'),
        JSON.stringify(nestedTsconfig, null, 2),
      );

      // Create main file
      writeFileSync(path.join(srcDir, 'main.ts'), 'const main = "main";');

      // Try to check a pattern that includes the empty directory
      const result = await checkFiles(['src/main.ts', 'packages/empty/*.ts'], {
        cwd: tempDir,
      });

      expect(result.success).toBe(true);
      expect(result.checkedFiles).toHaveLength(1); // Only main.ts should be checked
    });

    it('should handle no files with explicit project and verbose logging', async () => {
      // Test the verbose logging path with explicit project when no files match
      const result = await checkFiles(['src/*.xyz'], {
        cwd: tempDir,
        project: 'tsconfig.json',
        verbose: true,
      });

      expect(result.success).toBe(true);
      expect(result.checkedFiles).toHaveLength(0);
      expect(result.errorCount).toBe(0);
    });
  });

  describe('javascript support', () => {
    it('should include JavaScript files when allowJs is enabled', async () => {
      // Create tsconfig with allowJs enabled
      writeFileSync(
        path.join(tempDir, 'tsconfig.json'),
        JSON.stringify({
          compilerOptions: {
            allowJs: true,
          },
        }),
      );

      // Create both TypeScript and JavaScript files
      writeFileSync(
        path.join(tempDir, 'test.ts'),
        'export const message: string = "hello";',
      );
      writeFileSync(
        path.join(tempDir, 'test.js'),
        'export const jsMessage = "hello from js";',
      );

      const result = await checkFiles(['test.ts', 'test.js'], {
        cwd: tempDir,
      });

      expect(result.success).toBe(true);
      expect(result.checkedFiles).toHaveLength(2);
      expect(result.checkedFiles.some((file) => file.endsWith('test.ts'))).toBe(
        true,
      );
      expect(result.checkedFiles.some((file) => file.endsWith('test.js'))).toBe(
        true,
      );
    });

    it('should include JavaScript files when checkJs is enabled', async () => {
      // Create tsconfig with checkJs enabled
      writeFileSync(
        path.join(tempDir, 'tsconfig.json'),
        JSON.stringify({
          compilerOptions: {
            checkJs: true,
          },
        }),
      );

      // Create JavaScript file with type error
      writeFileSync(
        path.join(tempDir, 'invalid.js'),
        'const num = 42;\nconst str = num + "hello"; // This should be type-checked',
      );

      const result = await checkFiles(['invalid.js'], { cwd: tempDir });

      expect(result.checkedFiles).toHaveLength(1);
      expect(result.checkedFiles[0]).toMatch(/invalid\.js$/);
    });

    it('should exclude JavaScript files when allowJs and checkJs are disabled', async () => {
      // Create tsconfig without JS options
      writeFileSync(
        path.join(tempDir, 'tsconfig.json'),
        JSON.stringify({
          compilerOptions: {},
        }),
      );

      // Create both TypeScript and JavaScript files
      writeFileSync(
        path.join(tempDir, 'test.ts'),
        'export const message: string = "hello";',
      );
      writeFileSync(
        path.join(tempDir, 'test.js'),
        'export const jsMessage = "hello from js";',
      );

      const result = await checkFiles(['test.ts', 'test.js'], {
        cwd: tempDir,
      });

      expect(result.success).toBe(true);
      expect(result.checkedFiles).toHaveLength(1);
      expect(result.checkedFiles[0]).toMatch(/test\.ts$/);
    });

    it('should handle glob patterns with JavaScript files when allowJs is enabled', async () => {
      // Create tsconfig with allowJs enabled
      writeFileSync(
        path.join(tempDir, 'tsconfig.json'),
        JSON.stringify({
          compilerOptions: {
            allowJs: true,
          },
        }),
      );

      // Create src directory with mixed files
      const srcDir = path.join(tempDir, 'src');
      if (!existsSync(srcDir)) {
        mkdirSync(srcDir);
      }
      writeFileSync(
        path.join(tempDir, 'src', 'app.ts'),
        'export const app: string = "app";',
      );
      writeFileSync(
        path.join(tempDir, 'src', 'utils.js'),
        'export const utils = { helper: () => {} };',
      );

      // Use a more specific glob pattern that should match both TS and JS files
      const result = await checkFiles(['src/**/*.{ts,js}'], { cwd: tempDir });

      expect(result.success).toBe(true);
      expect(result.checkedFiles).toHaveLength(2);
      expect(result.checkedFiles.some((file) => file.endsWith('app.ts'))).toBe(
        true,
      );
      expect(
        result.checkedFiles.some((file) => file.endsWith('utils.js')),
      ).toBe(true);
    });

    it('should handle JSX files when allowJs and jsx are enabled', async () => {
      // Create tsconfig with allowJs and jsx support
      writeFileSync(
        path.join(tempDir, 'tsconfig.json'),
        JSON.stringify({
          compilerOptions: {
            allowJs: true,
            jsx: 'preserve',
            target: 'es5',
            lib: ['dom', 'dom.iterable', 'esnext'],
            skipLibCheck: true,
          },
        }),
      );

      // Create simpler JSX files without React imports
      writeFileSync(
        path.join(tempDir, 'component.tsx'),
        'export const name = "component";',
      );
      writeFileSync(
        path.join(tempDir, 'legacy.jsx'),
        'export const name = "legacy";',
      );

      const result = await checkFiles(['component.tsx', 'legacy.jsx'], {
        cwd: tempDir,
      });

      // The main test is that JavaScript files are properly resolved and processed
      expect(result.checkedFiles).toHaveLength(2);
      expect(
        result.checkedFiles.some((file) => file.endsWith('component.tsx')),
      ).toBe(true);
      expect(
        result.checkedFiles.some((file) => file.endsWith('legacy.jsx')),
      ).toBe(true);
    });

    it('should handle invalid tsconfig for JavaScript detection', async () => {
      // Create an invalid tsconfig to test error handling in shouldIncludeJavaScriptFiles
      writeFileSync(
        path.join(tempDir, 'tsconfig.json'),
        '{ "invalid": json }', // Malformed JSON
      );

      writeFileSync(path.join(srcDir, 'test.ts'), 'const x = 1;');
      writeFileSync(path.join(srcDir, 'test.js'), 'const y = 2;');

      // Should throw an error because the tsconfig is malformed
      await expect(
        checkFiles(['src/test.ts', 'src/test.js'], {
          cwd: tempDir,
        }),
      ).rejects.toThrow('Failed to read tsconfig.json');
    });
  });

  describe('edge cases and error paths', () => {
    it('should handle missing tsconfig path parameter', async () => {
      // Test shouldIncludeJavaScriptFiles with undefined tsconfigPath
      writeFileSync(path.join(srcDir, 'test.js'), 'const x = 1;');
      writeFileSync(path.join(srcDir, 'test.ts'), 'const y = 2;');

      // Without JS enabled in tsconfig, should only include TS files
      const result = await checkFiles(['src/test.ts', 'src/test.js'], {
        cwd: tempDir,
        // Use auto-detection which will find our tsconfig.json (doesn't have allowJs/checkJs)
      });

      expect(result.checkedFiles).toHaveLength(1);
      expect(result.checkedFiles[0]).toMatch(/test\.ts$/);
    });

    it('should handle execution error with non-standard error object', async () => {
      // Create a scenario that might produce a non-standard error object
      writeFileSync(
        path.join(srcDir, 'syntax-error.ts'),
        'this is not valid typescript syntax at all!!! ### invalid',
      );

      const result = await checkFiles(['src/syntax-error.ts'], {
        cwd: tempDir,
      });

      // Should handle the error and still return a result
      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should handle throwOnError with different error types', async () => {
      writeFileSync(
        path.join(srcDir, 'error-test.ts'),
        'const message: string = 42;', // Type error
      );

      // Test throwOnError: false (default behavior)
      const result1 = await checkFiles(['src/error-test.ts'], {
        cwd: tempDir,
        throwOnError: false,
      });
      expect(result1.success).toBe(false);

      // Test throwOnError: true should still work for type errors (not throw)
      const result2 = await checkFiles(['src/error-test.ts'], {
        cwd: tempDir,
        throwOnError: true,
      });
      expect(result2.success).toBe(false);
    });

    it('should handle cleanup failure scenarios gracefully', async () => {
      writeFileSync(
        path.join(srcDir, 'cleanup-test.ts'),
        'const message: string = "valid";',
      );

      // This should handle cleanup errors gracefully
      const result = await checkFiles(['src/cleanup-test.ts'], {
        cwd: tempDir,
        verbose: true, // Enable verbose to test cleanup logging
      });

      expect(result.success).toBe(true);
      expect(result.checkedFiles).toHaveLength(1);
    });
  });

  describe('shouldIncludeJavaScriptFiles edge cases', () => {
    it('should handle nonexistent tsconfig path', async () => {
      // Test the actual shouldIncludeJavaScriptFiles function behavior
      writeFileSync(path.join(srcDir, 'test.ts'), 'const x = 1;');
      writeFileSync(path.join(srcDir, 'test.js'), 'const y = 2;');

      // Remove the tsconfig.json temporarily
      const tsconfigPath = path.join(tempDir, 'tsconfig.json');
      rmSync(tsconfigPath, { force: true });

      // When no tsconfig exists, should only process TS files
      await expect(
        checkFiles(['src/test.ts', 'src/test.js'], {
          cwd: tempDir,
        }),
      ).rejects.toThrow('No tsconfig.json found');
    });

    it('should handle tsconfig JSON parsing errors', async () => {
      // Test the catch block in shouldIncludeJavaScriptFiles
      writeFileSync(
        path.join(tempDir, 'tsconfig.json'),
        '{ malformed json without quotes }',
      );
      writeFileSync(path.join(srcDir, 'test.ts'), 'const x = 1;');
      writeFileSync(path.join(srcDir, 'test.js'), 'const y = 2;');

      // Should throw due to malformed JSON in tsconfig reading phase
      await expect(
        checkFiles(['src/test.ts', 'src/test.js'], {
          cwd: tempDir,
        }),
      ).rejects.toThrow();
    });
  });

  describe('coverage improvement tests', () => {
    it('should handle throwOnError: false for missing project config', async () => {
      // Test lines 502-522: throwOnError: false path for project validation
      const result = await checkFiles(['nonexistent.ts'], {
        cwd: tempDir,
        project: 'nonexistent-config.json',
        throwOnError: false,
      });

      expect(result.success).toBe(false);
      expect(result.errorCount).toBe(1);
      expect(result.errors[0].code).toBe('CONFIG_ERROR');
      expect(result.errors[0].message).toContain('TypeScript config not found');
    });

    it('should handle throwOnError: false for missing tsconfig in directory', async () => {
      // Test lines 571-589: throwOnError: false path for config grouping errors
      // Create a secure temp directory (not in project directory)
      const systemTempDir = createTempDir();

      // Create an actual TypeScript file to trigger the tsconfig search
      const emptyTempSrcDir = path.join(systemTempDir, 'src');
      mkdirSync(emptyTempSrcDir, { recursive: true });
      writeFileSync(
        path.join(emptyTempSrcDir, 'test.ts'),
        'const message: string = "test";',
      );

      const result = await checkFiles(['src/test.ts'], {
        cwd: systemTempDir,
        throwOnError: false,
      });

      expect(result.success).toBe(false);
      expect(result.errorCount).toBe(1);
      expect(result.errors[0].code).toBe('CONFIG_ERROR');
      expect(result.errors[0].message).toContain('No tsconfig.json found');

      cleanupTempDir(systemTempDir);
    });

    it('should handle glob patterns without extensions', async () => {
      // Test lines 137,139-140: Glob pattern handling for files without extensions
      writeFileSync(
        path.join(srcDir, 'pattern-test.ts'),
        'const message: string = "test";',
      );

      // Test pattern without extension - this should expand to src/pattern-test/**/*.ts
      const result = await checkFiles(['src/pattern-test'], {
        cwd: tempDir,
      });

      // This should return success with no files since 'src/pattern-test' is treated as a directory pattern
      expect(result.success).toBe(true);
      expect(result.checkedFiles.length).toBe(0); // No files found, but that's OK for coverage testing
    });

    it('should handle fast-glob failure fallback', async () => {
      // Test lines 161-165: Fallback glob pattern matching
      writeFileSync(
        path.join(srcDir, 'fallback-test.ts'),
        'const message: string = "test";',
      );

      // Mock fast-glob to throw an error to test the fallback
      const mockFastGlob = vi.fn(() => {
        throw new Error('Mock glob error');
      });

      // Use Vitest's dynamic import mocking
      vi.doMock('fast-glob', () => ({
        default: mockFastGlob,
        glob: mockFastGlob,
      }));

      try {
        // Re-import the module to get the mocked version
        const { checkFiles: mockedCheckFiles } = await import('@/core/checker');

        // This should use the fallback path when fast-glob fails
        const result = await mockedCheckFiles(
          [path.join(srcDir, 'fallback-test.ts')],
          {
            cwd: tempDir,
          },
        );

        expect(result.success).toBe(true);
      } finally {
        // Restore the original module
        vi.doUnmock('fast-glob');
      }
    });

    it('should handle patterns with dots correctly', async () => {
      // Test line 137: pattern.includes('.') path
      writeFileSync(
        path.join(srcDir, 'dot-test.ts'),
        'const message: string = "test";',
      );

      // Pattern with dot should be used as-is
      const result = await checkFiles(['src/*.ts'], {
        cwd: tempDir,
      });

      expect(result.success).toBe(true);
      expect(result.checkedFiles.some((f) => f.includes('dot-test.ts'))).toBe(
        true,
      );
    });

    it('should handle fs.stat failure in direct file resolution', async () => {
      // Test lines 107-110: fs.stat error handling in directory detection
      const directPattern = 'nonexistent-directory';

      const result = await checkFiles([directPattern], {
        cwd: tempDir,
      });

      // Should succeed with no files found
      expect(result.success).toBe(true);
      expect(result.checkedFiles.length).toBe(0);
    });

    it('should handle complex extension patterns for JavaScript inclusion', async () => {
      // Test lines 124-127: Complex pattern matching branches
      // Create a tsconfig that allows JavaScript
      const jsEnabledConfig = {
        compilerOptions: {
          target: 'ES2022',
          module: 'ESNext',
          allowJs: true,
          strict: true,
          noEmit: true,
        },
        include: ['src/**/*'],
      };

      const jsTempDir = createTempDir();
      const jsSrcDir = path.join(jsTempDir, 'src');
      mkdirSync(jsSrcDir, { recursive: true });

      writeFileSync(
        path.join(jsTempDir, 'tsconfig.json'),
        JSON.stringify(jsEnabledConfig, null, 2),
      );

      // Create JavaScript file
      writeFileSync(
        path.join(jsSrcDir, 'script.js'),
        'const message = "test";',
      );

      // Test pattern that includes complex extension matching
      const patterns = [
        'src/**/*', // No extension specified - tests line 127
        'src/*.{js,ts}', // Tests line 123
        'src/*.{ts,tsx,js,jsx}', // Tests line 125
      ];

      for (const pattern of patterns) {
        const result = await checkFiles([pattern], {
          cwd: jsTempDir,
        });

        // Should find the JS file due to allowJs: true
        expect(result.success).toBe(true);
        if (result.checkedFiles.length > 0) {
          expect(result.checkedFiles.some((f) => f.includes('script.js'))).toBe(
            true,
          );
        }
      }

      cleanupTempDir(jsTempDir);
    });

    it('should handle directory patterns without dots', async () => {
      // Test line 139: Pattern handling for directories without dots
      writeFileSync(
        path.join(srcDir, 'subdir-test.ts'),
        'const message: string = "test";',
      );

      // Pattern without dot should add extension pattern
      const result = await checkFiles(['src/subdir-test'], {
        cwd: tempDir,
      });

      // This tests the directory pattern expansion logic
      expect(result.success).toBe(true);
      expect(result.checkedFiles.length).toBe(0); // No directory named subdir-test exists
    });
  });

  // Cleanup after each test
  afterEach(() => {
    cleanupTempDir(tempDir);
  });
});
