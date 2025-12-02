/**
 * Comprehensive tests for relative path resolution in monorepos
 *
 * These tests verify the fix for the issue where relative paths in monorepos
 * without a root tsconfig.json would fail to find per-file tsconfig files.
 */

import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { checkFiles } from '@/core/checker';

describe('Monorepo Relative Path Resolution', () => {
  let monorepoDir: string;

  beforeEach(() => {
    monorepoDir = createTempDir();
  });

  afterEach(() => {
    cleanupTempDir(monorepoDir);
  });

  describe('monorepo without root tsconfig', () => {
    beforeEach(() => {
      // Ensure no root tsconfig exists
      const rootTsconfig = path.join(monorepoDir, 'tsconfig.json');
      if (existsSync(rootTsconfig)) {
        rmSync(rootTsconfig);
      }
    });

    it('should find per-package tsconfig with relative paths', async () => {
      // Create apps/web package
      const webDir = path.join(monorepoDir, 'apps', 'web', 'src');
      mkdirSync(webDir, { recursive: true });
      writeFileSync(
        path.join(monorepoDir, 'apps', 'web', 'tsconfig.json'),
        JSON.stringify({
          compilerOptions: { strict: true, noEmit: true },
        }),
      );
      writeFileSync(
        path.join(webDir, 'index.ts'),
        'export const web: string = "web";',
      );

      // Create apps/api package
      const apiDir = path.join(monorepoDir, 'apps', 'api', 'src');
      mkdirSync(apiDir, { recursive: true });
      writeFileSync(
        path.join(monorepoDir, 'apps', 'api', 'tsconfig.json'),
        JSON.stringify({
          compilerOptions: { strict: true, noEmit: true },
        }),
      );
      writeFileSync(
        path.join(apiDir, 'index.ts'),
        'export const api: string = "api";',
      );

      // Run with relative paths from monorepo root
      const result = await checkFiles(
        ['apps/web/src/index.ts', 'apps/api/src/index.ts'],
        { cwd: monorepoDir },
      );

      expect(result.success).toBe(true);
      expect(result.checkedFiles).toHaveLength(2);
      expect(result.errorCount).toBe(0);
    });

    it('should detect monorepo with multiple tsconfig groups', async () => {
      // Create packages/core
      const coreDir = path.join(monorepoDir, 'packages', 'core');
      mkdirSync(coreDir, { recursive: true });
      writeFileSync(
        path.join(coreDir, 'tsconfig.json'),
        JSON.stringify({
          compilerOptions: { strict: true, noEmit: true },
        }),
      );
      writeFileSync(
        path.join(coreDir, 'index.ts'),
        'export const core = "core";',
      );

      // Create packages/utils
      const utilsDir = path.join(monorepoDir, 'packages', 'utils');
      mkdirSync(utilsDir, { recursive: true });
      writeFileSync(
        path.join(utilsDir, 'tsconfig.json'),
        JSON.stringify({
          compilerOptions: { strict: true, noEmit: true },
        }),
      );
      writeFileSync(
        path.join(utilsDir, 'index.ts'),
        'export const utils = "utils";',
      );

      // Create packages/ui
      const uiDir = path.join(monorepoDir, 'packages', 'ui');
      mkdirSync(uiDir, { recursive: true });
      writeFileSync(
        path.join(uiDir, 'tsconfig.json'),
        JSON.stringify({
          compilerOptions: { strict: true, noEmit: true, jsx: 'react' },
        }),
      );
      writeFileSync(
        path.join(uiDir, 'button.tsx'),
        'export const Button = () => null;',
      );

      const result = await checkFiles(
        [
          'packages/core/index.ts',
          'packages/utils/index.ts',
          'packages/ui/button.tsx',
        ],
        { cwd: monorepoDir, verbose: true },
      );

      expect(result.success).toBe(true);
      expect(result.checkedFiles).toHaveLength(3);
    });

    it('should handle type errors in specific packages', async () => {
      // Create package with valid code
      const validDir = path.join(monorepoDir, 'packages', 'valid');
      mkdirSync(validDir, { recursive: true });
      writeFileSync(
        path.join(validDir, 'tsconfig.json'),
        JSON.stringify({
          compilerOptions: { strict: true, noEmit: true },
        }),
      );
      writeFileSync(
        path.join(validDir, 'index.ts'),
        'export const valid: string = "valid";',
      );

      // Create package with type error
      const errorDir = path.join(monorepoDir, 'packages', 'error');
      mkdirSync(errorDir, { recursive: true });
      writeFileSync(
        path.join(errorDir, 'tsconfig.json'),
        JSON.stringify({
          compilerOptions: { strict: true, noEmit: true },
        }),
      );
      writeFileSync(
        path.join(errorDir, 'index.ts'),
        'export const error: string = 42; // Type error',
      );

      const result = await checkFiles(
        ['packages/valid/index.ts', 'packages/error/index.ts'],
        { cwd: monorepoDir },
      );

      expect(result.success).toBe(false);
      expect(result.errorCount).toBeGreaterThan(0);
      // Type error should be about assigning number to string
      expect(
        result.errors.some((e) => e.message.includes('not assignable to type')),
      ).toBe(true);
    });
  });

  describe('mixed relative and absolute paths', () => {
    it('should handle mix of relative and absolute paths', async () => {
      // Create package
      const pkgDir = path.join(monorepoDir, 'packages', 'mixed');
      mkdirSync(pkgDir, { recursive: true });
      writeFileSync(
        path.join(pkgDir, 'tsconfig.json'),
        JSON.stringify({
          compilerOptions: { strict: true, noEmit: true },
        }),
      );
      writeFileSync(
        path.join(pkgDir, 'relative.ts'),
        'export const relative = "relative";',
      );
      writeFileSync(
        path.join(pkgDir, 'absolute.ts'),
        'export const absolute = "absolute";',
      );

      const absolutePath = path.join(pkgDir, 'absolute.ts');
      const relativePath = 'packages/mixed/relative.ts';

      const result = await checkFiles([absolutePath, relativePath], {
        cwd: monorepoDir,
      });

      expect(result.success).toBe(true);
      expect(result.checkedFiles).toHaveLength(2);
    });

    it('should group mixed paths by same tsconfig', async () => {
      // Create single package with multiple files
      const pkgDir = path.join(monorepoDir, 'packages', 'single');
      mkdirSync(pkgDir, { recursive: true });
      writeFileSync(
        path.join(pkgDir, 'tsconfig.json'),
        JSON.stringify({
          compilerOptions: { strict: true, noEmit: true },
        }),
      );
      writeFileSync(path.join(pkgDir, 'a.ts'), 'export const a = "a";');
      writeFileSync(path.join(pkgDir, 'b.ts'), 'export const b = "b";');
      writeFileSync(path.join(pkgDir, 'c.ts'), 'export const c = "c";');

      // Mix of absolute and relative paths to same package
      const result = await checkFiles(
        [
          path.join(pkgDir, 'a.ts'), // absolute
          'packages/single/b.ts', // relative
          path.join(pkgDir, 'c.ts'), // absolute
        ],
        { cwd: monorepoDir },
      );

      expect(result.success).toBe(true);
      expect(result.checkedFiles).toHaveLength(3);
    });
  });

  describe('path format variations', () => {
    beforeEach(() => {
      // Create a test package
      const pkgDir = path.join(monorepoDir, 'packages', 'test');
      mkdirSync(pkgDir, { recursive: true });
      writeFileSync(
        path.join(pkgDir, 'tsconfig.json'),
        JSON.stringify({
          compilerOptions: { strict: true, noEmit: true },
        }),
      );
      writeFileSync(
        path.join(pkgDir, 'index.ts'),
        'export const test = "test";',
      );
    });

    it('should handle paths with ./ prefix', async () => {
      const result = await checkFiles(['./packages/test/index.ts'], {
        cwd: monorepoDir,
      });

      expect(result.success).toBe(true);
      expect(result.checkedFiles).toHaveLength(1);
    });

    it('should handle paths with ../ components', async () => {
      // Create a subdirectory to test ../ resolution
      const subDir = path.join(monorepoDir, 'some', 'subdir');
      mkdirSync(subDir, { recursive: true });

      // Path that goes up and then down
      const result = await checkFiles(['some/../packages/test/index.ts'], {
        cwd: monorepoDir,
      });

      expect(result.success).toBe(true);
      expect(result.checkedFiles).toHaveLength(1);
    });

    it('should handle deeply nested relative paths', async () => {
      // Create deeply nested structure
      const deepDir = path.join(
        monorepoDir,
        'packages',
        'deep',
        'src',
        'components',
        'ui',
      );
      mkdirSync(deepDir, { recursive: true });
      writeFileSync(
        path.join(monorepoDir, 'packages', 'deep', 'tsconfig.json'),
        JSON.stringify({
          compilerOptions: { strict: true, noEmit: true },
        }),
      );
      writeFileSync(
        path.join(deepDir, 'button.ts'),
        'export const Button = {};',
      );

      const result = await checkFiles(
        ['packages/deep/src/components/ui/button.ts'],
        { cwd: monorepoDir },
      );

      expect(result.success).toBe(true);
      expect(result.checkedFiles).toHaveLength(1);
    });
  });

  describe('lefthook-style usage patterns', () => {
    it('should handle staged files pattern (individual paths)', async () => {
      // Simulate lefthook expanding {staged_files} to individual paths
      // This is the primary use case for the fix

      // Create multiple packages
      const packages = ['auth', 'api', 'web'];
      for (const pkg of packages) {
        const pkgDir = path.join(monorepoDir, 'apps', pkg);
        mkdirSync(pkgDir, { recursive: true });
        writeFileSync(
          path.join(pkgDir, 'tsconfig.json'),
          JSON.stringify({
            compilerOptions: { strict: true, noEmit: true },
          }),
        );
        writeFileSync(
          path.join(pkgDir, 'index.ts'),
          `export const ${pkg} = "${pkg}";`,
        );
      }

      // Simulate lefthook passing individual staged files
      const stagedFiles = [
        'apps/auth/index.ts',
        'apps/api/index.ts',
        'apps/web/index.ts',
      ];

      const result = await checkFiles(stagedFiles, { cwd: monorepoDir });

      expect(result.success).toBe(true);
      expect(result.checkedFiles).toHaveLength(3);
    });

    it('should handle mixed file types from staged files', async () => {
      // Create package with both TS and TSX files
      const pkgDir = path.join(monorepoDir, 'apps', 'frontend');
      mkdirSync(pkgDir, { recursive: true });
      writeFileSync(
        path.join(pkgDir, 'tsconfig.json'),
        JSON.stringify({
          compilerOptions: {
            strict: true,
            noEmit: true,
            jsx: 'react-jsx',
          },
        }),
      );
      writeFileSync(
        path.join(pkgDir, 'utils.ts'),
        'export const util = () => {};',
      );
      writeFileSync(
        path.join(pkgDir, 'App.tsx'),
        'export const App = () => null;',
      );

      const result = await checkFiles(
        ['apps/frontend/utils.ts', 'apps/frontend/App.tsx'],
        { cwd: monorepoDir },
      );

      expect(result.success).toBe(true);
      expect(result.checkedFiles).toHaveLength(2);
    });
  });

  describe('explicit project path with relative files', () => {
    it('should use explicit project path for all relative files', async () => {
      // Create root tsconfig
      writeFileSync(
        path.join(monorepoDir, 'tsconfig.json'),
        JSON.stringify({
          compilerOptions: { strict: true, noEmit: true },
        }),
      );

      // Create package with its own tsconfig
      const pkgDir = path.join(monorepoDir, 'packages', 'lib');
      mkdirSync(pkgDir, { recursive: true });
      writeFileSync(
        path.join(pkgDir, 'tsconfig.json'),
        JSON.stringify({
          compilerOptions: { strict: false, noEmit: true }, // Different settings
        }),
      );
      writeFileSync(path.join(pkgDir, 'index.ts'), 'export const lib = "lib";');

      // When explicit project is specified, it should override per-file detection
      const result = await checkFiles(['packages/lib/index.ts'], {
        cwd: monorepoDir,
        project: 'tsconfig.json', // Use root tsconfig
      });

      expect(result.success).toBe(true);
      expect(result.checkedFiles).toHaveLength(1);
    });

    it('should resolve explicit project path relative to cwd', async () => {
      // Create custom tsconfig in a subdirectory
      const configDir = path.join(monorepoDir, 'config');
      mkdirSync(configDir, { recursive: true });
      writeFileSync(
        path.join(configDir, 'tsconfig.build.json'),
        JSON.stringify({
          compilerOptions: { strict: true, noEmit: true },
        }),
      );

      // Create source file
      const srcDir = path.join(monorepoDir, 'src');
      mkdirSync(srcDir, { recursive: true });
      writeFileSync(
        path.join(srcDir, 'index.ts'),
        'export const main = "main";',
      );

      const result = await checkFiles(['src/index.ts'], {
        cwd: monorepoDir,
        project: 'config/tsconfig.build.json',
      });

      expect(result.success).toBe(true);
      expect(result.checkedFiles).toHaveLength(1);
    });
  });

  describe('edge cases', () => {
    it('should handle files at different nesting levels', async () => {
      // Root level file
      writeFileSync(
        path.join(monorepoDir, 'tsconfig.json'),
        JSON.stringify({
          compilerOptions: { strict: true, noEmit: true },
        }),
      );
      writeFileSync(
        path.join(monorepoDir, 'root.ts'),
        'export const root = "root";',
      );

      // Nested package
      const pkgDir = path.join(monorepoDir, 'packages', 'nested');
      mkdirSync(pkgDir, { recursive: true });
      writeFileSync(
        path.join(pkgDir, 'tsconfig.json'),
        JSON.stringify({
          compilerOptions: { strict: true, noEmit: true },
        }),
      );
      writeFileSync(
        path.join(pkgDir, 'index.ts'),
        'export const nested = "nested";',
      );

      const result = await checkFiles(['root.ts', 'packages/nested/index.ts'], {
        cwd: monorepoDir,
      });

      expect(result.success).toBe(true);
      expect(result.checkedFiles).toHaveLength(2);
    });

    it('should handle package with tsconfig in parent directory', async () => {
      // Create tsconfig at packages level
      const packagesDir = path.join(monorepoDir, 'packages');
      mkdirSync(packagesDir, { recursive: true });
      writeFileSync(
        path.join(packagesDir, 'tsconfig.json'),
        JSON.stringify({
          compilerOptions: { strict: true, noEmit: true },
        }),
      );

      // Create sub-package without its own tsconfig
      const subPkgDir = path.join(packagesDir, 'sub-pkg', 'src');
      mkdirSync(subPkgDir, { recursive: true });
      writeFileSync(
        path.join(subPkgDir, 'index.ts'),
        'export const subPkg = "sub";',
      );

      const result = await checkFiles(['packages/sub-pkg/src/index.ts'], {
        cwd: monorepoDir,
      });

      expect(result.success).toBe(true);
      expect(result.checkedFiles).toHaveLength(1);
    });

    it('should fail gracefully when no tsconfig found', async () => {
      // Create file without any tsconfig in ancestry
      const orphanDir = path.join(monorepoDir, 'orphan');
      mkdirSync(orphanDir, { recursive: true });
      writeFileSync(
        path.join(orphanDir, 'index.ts'),
        'export const orphan = "orphan";',
      );

      // Should fail with clear error about missing tsconfig
      await expect(
        checkFiles(['orphan/index.ts'], {
          cwd: monorepoDir,
          throwOnError: true,
        }),
      ).rejects.toThrow('No tsconfig.json found');
    });
  });
});
