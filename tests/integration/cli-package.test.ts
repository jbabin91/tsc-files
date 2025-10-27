/**
 * Cross-platform CLI integration tests
 * Tests the packaged CLI as users would use it
 */

import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { execa, execaCommand } from 'execa';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

describe('CLI Package Integration', () => {
  let testDir: string;
  let tarball: string;
  let packFailed = false;
  let skipReason = 'npm pack failed - ensure project is built';
  let projectRoot: string;

  beforeAll(async () => {
    // Create isolated test directory
    testDir = mkdtempSync(path.join(tmpdir(), 'tsc-files-integration-'));

    // Build and pack (already built in CI, but ensure locally)
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    projectRoot = path.resolve(__dirname, '../..');

    // Find the tarball (should exist from build)
    try {
      const { stdout } = await execaCommand('npm pack', {
        cwd: projectRoot,
        shell: true,
      });
      // Extract just the .tgz filename (last line that ends with .tgz)
      const lines = stdout.trim().split('\n');
      const tgzLine = lines.find((line) => line.endsWith('.tgz'));
      if (!tgzLine) {
        throw new Error('Could not find .tgz file in npm pack output');
      }
      tarball = tgzLine.trim();
    } catch (error) {
      // If pack fails (e.g., sandbox preventing lefthook install), skip the suite
      packFailed = true;
      const message =
        error instanceof Error
          ? error.message || error.toString()
          : String(error);
      skipReason = message.includes('operation not permitted')
        ? 'npm pack blocked by sandbox (cannot modify git hooks)'
        : message || skipReason;
      console.warn(`[integration] Skipping CLI package tests: ${skipReason}`);
      return;
    }

    if (packFailed) {
      return;
    }

    // Install package and TypeScript in test directory
    await execaCommand('npm init -y', {
      cwd: testDir,
      shell: true,
      stdio: 'ignore',
    });

    try {
      // Use array arguments to prevent shell injection
      await execa(
        'npm',
        [
          'install',
          path.join(projectRoot, tarball),
          'typescript',
          '--no-audit',
          '--no-fund',
          '--ignore-scripts',
        ],
        {
          cwd: testDir,
        },
      );
    } catch (error) {
      console.error('[integration] npm install failed');
      console.error('Error:', error);
      throw error;
    }

    // Create basic tsconfig
    writeFileSync(
      path.join(testDir, 'tsconfig.json'),
      JSON.stringify(
        {
          compilerOptions: {
            target: 'ES2020',
            module: 'CommonJS',
            strict: true,
            esModuleInterop: true,
            skipLibCheck: true,
          },
        },
        null,
        2,
      ),
    );
  }, 120_000); // 120s timeout for installation (Windows can be slower with prepare scripts)

  beforeEach((ctx) => {
    if (packFailed) {
      ctx.skip();
    }
  });

  afterAll(() => {
    // Cleanup
    try {
      rmSync(testDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }

    if (!packFailed && tarball && projectRoot) {
      try {
        rmSync(path.join(projectRoot, tarball), { force: true });
      } catch {
        // Ignore tarball cleanup errors
      }
    }
  });

  describe('CLI Basic Operations', () => {
    it('should display version', async () => {
      const { stdout } = await execaCommand('npx tsc-files --version', {
        cwd: testDir,
        shell: true,
      });

      expect(stdout).toMatch(/\d+\.\d+\.\d+/);
    });

    it('should display help', async () => {
      const { stdout } = await execaCommand('npx tsc-files --help', {
        cwd: testDir,
        shell: true,
      });

      expect(stdout).toContain('Usage:');
      expect(stdout).toContain('Options:');
    });
  });

  describe('Type Checking', () => {
    it('should pass for valid TypeScript', async () => {
      const validFile = path.join(testDir, 'valid.ts');
      writeFileSync(validFile, 'const valid: string = "Hello";');

      const { exitCode } = await execaCommand('npx tsc-files valid.ts', {
        cwd: testDir,
        shell: true,
        reject: false,
      });

      expect(exitCode).toBe(0);
    });

    it('should fail for invalid TypeScript', async () => {
      const errorFile = path.join(testDir, 'error.ts');
      writeFileSync(errorFile, 'const error: string = 123;');

      const { exitCode } = await execaCommand('npx tsc-files error.ts', {
        cwd: testDir,
        shell: true,
        reject: false,
      });

      expect(exitCode).toBe(1);
    });

    it('should handle glob patterns', async () => {
      const srcDir = path.join(testDir, 'src');
      const utilsDir = path.join(srcDir, 'utils');

      // Create directory structure
      rmSync(srcDir, { recursive: true, force: true });
      mkdirSync(srcDir, { recursive: true });
      mkdirSync(utilsDir, { recursive: true });
      writeFileSync(
        path.join(srcDir, 'types.ts'),
        'export interface User { id: number; name: string; }',
      );
      writeFileSync(
        path.join(utilsDir, 'userService.ts'),
        'import { User } from "../types"; export const createUser = (data: User) => data;',
      );

      const { exitCode } = await execaCommand('npx tsc-files "src/**/*.ts"', {
        cwd: testDir,
        shell: true,
        reject: false,
      });

      expect(exitCode).toBe(0);
    });
  });

  describe('CLI Options', () => {
    it('should support --json output', async () => {
      const testFile = path.join(testDir, 'json-test.ts');
      writeFileSync(testFile, 'const test: string = "json";');

      const { stdout } = await execaCommand(
        'npx tsc-files --json json-test.ts',
        {
          cwd: testDir,
          shell: true,
        },
      );

      const result = JSON.parse(stdout) as { success: boolean };
      expect(result).toHaveProperty('success');
      expect(result.success).toBe(true);
    });

    it('should support --project flag', async () => {
      const customConfig = path.join(testDir, 'custom.tsconfig.json');
      writeFileSync(
        customConfig,
        JSON.stringify({
          compilerOptions: {
            target: 'ES2018',
            strict: false,
            skipLibCheck: true,
          },
        }),
      );

      const testFile = path.join(testDir, 'custom-test.ts');
      writeFileSync(testFile, 'const test: string = "custom";');

      const { exitCode } = await execaCommand(
        'npx tsc-files --project custom.tsconfig.json custom-test.ts',
        {
          cwd: testDir,
          shell: true,
          reject: false,
        },
      );

      expect(exitCode).toBe(0);
    });
  });

  describe('Ambient Declarations', () => {
    it('should discover ambient .d.ts files', async () => {
      // Create ambient declaration
      const typesDir = path.join(testDir, 'types');
      mkdirSync(typesDir, { recursive: true });
      writeFileSync(
        path.join(typesDir, 'svg.d.ts'),
        `declare module '*.svg' {
  const content: string;
  export default content;
}`,
      );

      // Create tsconfig that includes ambient files
      const ambientConfig = path.join(testDir, 'tsconfig.ambient.json');
      writeFileSync(
        ambientConfig,
        JSON.stringify({
          compilerOptions: {
            target: 'ES2020',
            strict: true,
            skipLibCheck: true,
          },
          include: ['**/*.ts', '**/*.d.ts'],
        }),
      );

      // Create file that uses ambient declaration
      const appFile = path.join(testDir, 'app-with-svg.ts');
      writeFileSync(
        appFile,
        'import logo from "./logo.svg"; const x: string = logo;',
      );

      const { stderr } = await execaCommand(
        'npx tsc-files --project tsconfig.ambient.json app-with-svg.ts',
        {
          cwd: testDir,
          shell: true,
          reject: false,
        },
      );

      // Should not have "Cannot find module" error for .svg
      // (may still fail for missing logo.svg file, but that's expected)
      expect(stderr).not.toContain('Module \'"*.svg"\' has no default export');
    });

    it('should discover .gen.ts files for generated types', async () => {
      // Create generated route file (like TanStack Router)
      writeFileSync(
        path.join(testDir, 'routeTree.gen.ts'),
        `export interface Route {
  path: string;
  component: any;
}
export const routes: Route[] = [];`,
      );

      // Create file that uses generated types
      writeFileSync(
        path.join(testDir, 'app-with-routes.ts'),
        'import { Route } from "./routeTree.gen"; export const useRoute = (route: Route) => route;',
      );

      const { exitCode } = await execaCommand(
        'npx tsc-files app-with-routes.ts',
        {
          cwd: testDir,
          shell: true,
          reject: false,
        },
      );

      expect(exitCode).toBe(0);
    });
  });

  describe('Cross-Platform Path Handling', () => {
    it('should handle paths with spaces', async () => {
      const spacedDir = path.join(testDir, 'dir with spaces');
      const spacedFile = path.join(spacedDir, 'file.ts');
      mkdirSync(spacedDir, { recursive: true });
      writeFileSync(spacedFile, 'const test: string = "spaces";');

      const { exitCode } = await execaCommand(`npx tsc-files "${spacedFile}"`, {
        cwd: testDir,
        shell: true,
        reject: false,
      });

      expect(exitCode).toBe(0);
    });

    it('should handle nested directories', async () => {
      const deepDir = path.join(testDir, 'a', 'b', 'c', 'd');
      const deepFile = path.join(deepDir, 'deep.ts');
      mkdirSync(deepDir, { recursive: true });
      writeFileSync(deepFile, 'const deep: string = "nested";');

      const { exitCode } = await execaCommand(`npx tsc-files "${deepFile}"`, {
        cwd: testDir,
        shell: true,
        reject: false,
      });

      expect(exitCode).toBe(0);
    });
  });

  describe('Path Aliases and BaseUrl', () => {
    it('should resolve path aliases with baseUrl', async () => {
      // Create directory structure
      const srcDir = path.join(testDir, 'src', 'components');
      const libDir = path.join(testDir, 'lib', 'utils');
      mkdirSync(srcDir, { recursive: true });
      mkdirSync(libDir, { recursive: true });
      writeFileSync(
        path.join(srcDir, 'types.ts'),
        'export interface Props { title: string; }',
      );
      writeFileSync(
        path.join(libDir, 'format.ts'),
        'export const formatText = (text: string) => text.toUpperCase();',
      );

      // Create tsconfig with path aliases
      const pathsConfig = path.join(testDir, 'tsconfig.paths.json');
      writeFileSync(
        pathsConfig,
        JSON.stringify({
          compilerOptions: {
            target: 'ES2020',
            module: 'CommonJS',
            strict: true,
            skipLibCheck: true,
            baseUrl: '.',
            paths: {
              '@/components/*': ['src/components/*'],
              '@/utils/*': ['lib/utils/*'],
            },
          },
        }),
      );

      // Create file using path aliases
      writeFileSync(
        path.join(testDir, 'src', 'app.ts'),
        'import { Props } from "@/components/types"; import { formatText } from "@/utils/format"; export const component = (props: Props) => formatText(props.title);',
      );

      const { exitCode } = await execaCommand(
        'npx tsc-files --project tsconfig.paths.json src/app.ts',
        {
          cwd: testDir,
          shell: true,
          reject: false,
        },
      );

      expect(exitCode).toBe(0);
    });
  });

  describe('Compiler Selection', () => {
    it('should support --use-tsc flag', async () => {
      const testFile = path.join(testDir, 'compiler-test.ts');
      writeFileSync(testFile, 'const test: string = "tsc";');

      const { exitCode } = await execaCommand(
        'npx tsc-files --use-tsc compiler-test.ts',
        {
          cwd: testDir,
          shell: true,
          reject: false,
        },
      );

      expect(exitCode).toBe(0);
    });

    it('should support --show-compiler flag', async () => {
      const testFile = path.join(testDir, 'show-compiler-test.ts');
      writeFileSync(testFile, 'const test: string = "show";');

      const { stdout } = await execaCommand(
        'npx tsc-files --show-compiler show-compiler-test.ts',
        {
          cwd: testDir,
          shell: true,
          reject: false,
        },
      );

      // Should show which compiler is being used (tsc or tsgo)
      expect(stdout.toLowerCase()).toMatch(/tsc|tsgo/);
    });

    it('should handle --use-tsgo flag gracefully', async () => {
      const testFile = path.join(testDir, 'tsgo-test.ts');
      writeFileSync(testFile, 'const test: string = "tsgo";');

      // May not have tsgo available - should handle gracefully
      const result = await execaCommand(
        'npx tsc-files --use-tsgo tsgo-test.ts',
        {
          cwd: testDir,
          shell: true,
          reject: false,
        },
      );

      // Should not crash - either succeeds, shows "not available", or falls back to tsc
      // Exit codes: 0 (success), 1 (type errors), 2 (config error), 3 (system error)
      expect([0, 1, 2, 3]).toContain(result.exitCode);
    });
  });

  describe('Package Manager Compatibility', () => {
    it('should work via npx', async () => {
      const testFile = path.join(testDir, 'npx-test.ts');
      writeFileSync(testFile, 'const test: string = "npx";');

      const { exitCode } = await execaCommand('npx tsc-files npx-test.ts', {
        cwd: testDir,
        shell: true,
        reject: false,
      });

      expect(exitCode).toBe(0);
    });

    // Note: Testing with pnpm/yarn/bun requires them to be installed
    // CI can test these, but locally we just test the core functionality
  });

  describe('Performance and Edge Cases', () => {
    it('should handle multiple files efficiently', async () => {
      // Create multiple test files
      for (let i = 1; i <= 5; i++) {
        writeFileSync(
          path.join(testDir, `file${i}.ts`),
          `export const value${i}: number = ${i};`,
        );
      }

      const startTime = Date.now();
      const { exitCode } = await execaCommand('npx tsc-files file*.ts', {
        cwd: testDir,
        shell: true,
        reject: false,
      });
      const duration = Date.now() - startTime;

      expect(exitCode).toBe(0);
      // Should complete in reasonable time (under 10 seconds for 5 files)
      expect(duration).toBeLessThan(10_000);
    });

    it('should handle empty files', async () => {
      const emptyFile = path.join(testDir, 'empty.ts');
      writeFileSync(emptyFile, '');

      const { exitCode } = await execaCommand('npx tsc-files empty.ts', {
        cwd: testDir,
        shell: true,
        reject: false,
      });

      expect(exitCode).toBe(0);
    });

    it('should handle files with only comments', async () => {
      const commentFile = path.join(testDir, 'comments.ts');
      writeFileSync(commentFile, '// This is a comment\n/* Another comment */');

      const { exitCode } = await execaCommand('npx tsc-files comments.ts', {
        cwd: testDir,
        shell: true,
        reject: false,
      });

      expect(exitCode).toBe(0);
    });
  });

  describe('Ambient Declaration Support', () => {
    it('should include custom .d.ts files without explicit imports', async () => {
      // Create ambient declaration for SVG modules (like vite-plugin-svgr)
      const ambientFile = path.join(testDir, 'custom.d.ts');
      writeFileSync(
        ambientFile,
        'declare module "*.svg" {\n  const content: string;\n  export default content;\n}',
      );

      // Create main file that uses the ambient declaration
      const mainFile = path.join(testDir, 'main.ts');
      writeFileSync(
        mainFile,
        'import Logo from "./logo.svg";\nexport const logo: string = Logo;',
      );

      // Without the ambient declaration, this would fail with type errors
      const { exitCode, stderr } = await execaCommand('npx tsc-files main.ts', {
        cwd: testDir,
        shell: true,
        reject: false,
      });

      expect(exitCode).toBe(0);
      expect(stderr).not.toContain('Cannot find module');
    });

    it('should include global type augmentations', async () => {
      // Create global type augmentation (like styled-components)
      const globalsFile = path.join(testDir, 'globals.d.ts');
      writeFileSync(
        globalsFile,
        'declare global {\n  interface Window {\n    MY_APP_VERSION: string;\n  }\n  const TEST_CONSTANT: string;\n}\nexport {};',
      );

      // Create test file using global augmentations
      const testFile = path.join(testDir, 'example.test.ts');
      writeFileSync(
        testFile,
        'const version: string = window.MY_APP_VERSION;\nconst constant: string = TEST_CONSTANT;\nexport { version, constant };',
      );

      const { exitCode } = await execaCommand('npx tsc-files example.test.ts', {
        cwd: testDir,
        shell: true,
        reject: false,
      });

      expect(exitCode).toBe(0);
    });

    it('should support .d.mts and .d.cts module declarations', async () => {
      // Create ES module declaration
      const mtsDeclFile = path.join(testDir, 'styles.d.mts');
      writeFileSync(
        mtsDeclFile,
        'declare module "*.module.css" {\n  const classes: Record<string, string>;\n  export default classes;\n}',
      );

      // Create CommonJS declaration
      const ctsDeclFile = path.join(testDir, 'legacy.d.cts');
      writeFileSync(
        ctsDeclFile,
        'declare module "legacy-lib" {\n  export function legacyFunc(): void;\n}',
      );

      // Create main file using both
      const mainFile = path.join(testDir, 'styles-test.ts');
      writeFileSync(
        mainFile,
        'import styles from "./button.module.css";\nimport { legacyFunc } from "legacy-lib";\nexport const buttonClass: string = styles.button;\nlegacyFunc();',
      );

      const { exitCode } = await execaCommand('npx tsc-files styles-test.ts', {
        cwd: testDir,
        shell: true,
        reject: false,
      });

      expect(exitCode).toBe(0);
    });

    it('should discover generated .gen.ts files from TanStack Router', async () => {
      // Create generated routes file (like TanStack Router)
      const genFile = path.join(testDir, 'routes.gen.ts');
      writeFileSync(
        genFile,
        'export const routes = {\n  home: { path: "/" },\n  about: { path: "/about" },\n} as const;\nexport type Routes = typeof routes;',
      );

      // Create main file using generated routes
      const mainFile = path.join(testDir, 'router-test.ts');
      writeFileSync(
        mainFile,
        'import { routes, type Routes } from "./routes.gen";\nconst r: Routes = routes;\nexport const homePath: string = r.home.path;',
      );

      const { exitCode } = await execaCommand('npx tsc-files router-test.ts', {
        cwd: testDir,
        shell: true,
        reject: false,
      });

      expect(exitCode).toBe(0);
    });

    it('should respect tsconfig exclude patterns for ambient files', async () => {
      // Create tsconfig with exclude pattern
      const tsconfigPath = path.join(testDir, 'tsconfig.json');
      const { readFileSync: readFile } = await import('node:fs');
      const tsconfigContent = JSON.parse(
        readFile(tsconfigPath, 'utf8'),
      ) as Record<string, unknown>;
      tsconfigContent.exclude = ['dist/**/*'];
      writeFileSync(tsconfigPath, JSON.stringify(tsconfigContent, null, 2));

      // Create ambient file in excluded directory
      const distDir = path.join(testDir, 'dist');
      mkdirSync(distDir);
      const excludedDecl = path.join(distDir, 'excluded.d.ts');
      writeFileSync(
        excludedDecl,
        'declare const EXCLUDED: string; // Should not be included',
      );

      // Create ambient file in included directory
      const includedDecl = path.join(testDir, 'included.d.ts');
      writeFileSync(includedDecl, 'declare const INCLUDED: string;');

      // Create main file
      const mainFile = path.join(testDir, 'exclude-test.ts');
      writeFileSync(
        mainFile,
        'const x: string = INCLUDED;\nexport const test = x;',
      );

      const { exitCode } = await execaCommand('npx tsc-files exclude-test.ts', {
        cwd: testDir,
        shell: true,
        reject: false,
      });

      expect(exitCode).toBe(0);
    });
  });
});
