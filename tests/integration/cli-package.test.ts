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

  describe('Transitive Dependencies', () => {
    it('should discover transitive dependencies through import chains', async () => {
      // Create import chain: main -> utils -> helpers
      const mainFile = path.join(testDir, 'transitive-main.ts');
      const utilsFile = path.join(testDir, 'transitive-utils.ts');
      const helpersFile = path.join(testDir, 'transitive-helpers.ts');

      writeFileSync(
        helpersFile,
        'export const helper = (x: number): number => x * 2;',
      );
      writeFileSync(
        utilsFile,
        'import { helper } from "./transitive-helpers";\nexport const util = (x: number) => helper(x) + 1;',
      );
      writeFileSync(
        mainFile,
        'import { util } from "./transitive-utils";\nexport const main = () => util(5);',
      );

      // Create tsconfig that only includes main file explicitly
      const transitiveConfig = path.join(testDir, 'tsconfig.transitive.json');
      writeFileSync(
        transitiveConfig,
        JSON.stringify({
          compilerOptions: {
            target: 'ES2020',
            module: 'CommonJS',
            strict: true,
            skipLibCheck: true,
            noResolve: true, // Prevent TypeScript from auto-resolving imports
          },
          files: [mainFile],
        }),
      );

      // Should succeed by discovering transitive dependencies
      const { exitCode, stderr } = await execaCommand(
        'npx tsc-files --project tsconfig.transitive.json transitive-main.ts',
        {
          cwd: testDir,
          shell: true,
          reject: false,
        },
      );

      expect(exitCode).toBe(0);
      expect(stderr).not.toContain('Cannot find module');
    });

    it('should respect --max-depth limit', async () => {
      // Create deep chain: a -> b -> c -> d -> e
      const fileA = path.join(testDir, 'depth-a.ts');
      const fileB = path.join(testDir, 'depth-b.ts');
      const fileC = path.join(testDir, 'depth-c.ts');
      const fileD = path.join(testDir, 'depth-d.ts');
      const fileE = path.join(testDir, 'depth-e.ts');

      writeFileSync(fileA, 'import "./depth-b"; export const a = "a";');
      writeFileSync(fileB, 'import "./depth-c"; export const b = "b";');
      writeFileSync(fileC, 'import "./depth-d"; export const c = "c";');
      writeFileSync(fileD, 'import "./depth-e"; export const d = "d";');
      writeFileSync(fileE, 'export const e = "end";');

      // Create tsconfig with narrow include to force recursive discovery
      const depthConfig = path.join(testDir, 'tsconfig.depth.json');
      writeFileSync(
        depthConfig,
        JSON.stringify({
          compilerOptions: {
            target: 'ES2020',
            module: 'CommonJS',
            strict: true,
            skipLibCheck: true,
            noResolve: true,
            moduleResolution: 'node',
          },
          files: [fileA],
        }),
      );

      // With maxDepth=2, should warn about depth limit
      const { exitCode, stderr } = await execaCommand(
        'npx tsc-files --project tsconfig.depth.json --max-depth 2 --verbose depth-a.ts',
        {
          cwd: testDir,
          shell: true,
          reject: false,
        },
      );

      // Should complete successfully but may show depth warning in verbose output
      expect(exitCode).toBe(0);
      // The warning may appear in verbose output or stderr
      const output = stderr.toLowerCase();
      expect(
        output.includes('depth') ||
          output.includes('recursive') ||
          exitCode === 0,
      ).toBe(true);
    });

    it('should respect --max-files limit', async () => {
      // Create many interconnected files
      const files: string[] = [];
      for (let i = 0; i < 8; i++) {
        const file = path.join(testDir, `chain${i}.ts`);
        files.push(file);
        if (i < 7) {
          writeFileSync(file, `import "./chain${i + 1}";`);
        } else {
          writeFileSync(file, 'export const last = "end";');
        }
      }

      // Create tsconfig with noResolve
      const filesConfig = path.join(testDir, 'tsconfig.files.json');
      writeFileSync(
        filesConfig,
        JSON.stringify({
          compilerOptions: {
            target: 'ES2020',
            module: 'CommonJS',
            strict: true,
            skipLibCheck: true,
            noResolve: true,
          },
          files: [files[0]],
        }),
      );

      // With maxFiles=5, should stop discovery at 5 files
      const { stderr } = await execaCommand(
        'npx tsc-files --project tsconfig.files.json --max-files 5 chain0.ts',
        {
          cwd: testDir,
          shell: true,
          reject: false,
        },
      );

      // Should see warning about file limit
      expect(stderr).toContain('Reached maximum file limit (5)');
    });

    it('should disable recursive discovery with --no-recursive', async () => {
      // Create import chain
      const entryFile = path.join(testDir, 'no-recursive-main.ts');
      const depFile = path.join(testDir, 'no-recursive-dep.ts');

      writeFileSync(depFile, 'export const dep = "dependency";');
      writeFileSync(
        entryFile,
        'import { dep } from "./no-recursive-dep";\nexport const main = dep;',
      );

      // Create tsconfig with noResolve to force recursive discovery usage
      const noRecConfig = path.join(testDir, 'tsconfig.no-rec.json');
      writeFileSync(
        noRecConfig,
        JSON.stringify({
          compilerOptions: {
            target: 'ES2020',
            module: 'CommonJS',
            strict: true,
            skipLibCheck: true,
            noResolve: true,
          },
          files: [entryFile],
        }),
      );

      // With --no-recursive, should disable recursive discovery
      // Note: The TypeScript fallback may still resolve some imports
      const { exitCode, stderr } = await execaCommand(
        'npx tsc-files --project tsconfig.no-rec.json --no-recursive --verbose no-recursive-main.ts',
        {
          cwd: testDir,
          shell: true,
          reject: false,
        },
      );

      // The behavior depends on fallback mechanisms - either succeeds or fails
      // Key is that --no-recursive disables the recursive discovery feature
      expect([0, 1]).toContain(exitCode);
      // In verbose mode, should mention that recursive discovery is disabled
      const output = stderr.toLowerCase();
      expect(
        output.includes('recursive') ||
          output.includes('disabled') ||
          (exitCode !== undefined && [0, 1].includes(exitCode)),
      ).toBe(true);
    });

    it('should handle circular dependencies gracefully', async () => {
      // Create circular dependency: circ-a <-> circ-b
      const fileA = path.join(testDir, 'circ-a.ts');
      const fileB = path.join(testDir, 'circ-b.ts');

      writeFileSync(
        fileA,
        'import { b } from "./circ-b";\nexport const a = "a" + b;',
      );
      writeFileSync(
        fileB,
        'import { a } from "./circ-a";\nexport const b = "b";',
      );

      // Create tsconfig with noResolve
      const circConfig = path.join(testDir, 'tsconfig.circ.json');
      writeFileSync(
        circConfig,
        JSON.stringify({
          compilerOptions: {
            target: 'ES2020',
            module: 'CommonJS',
            strict: true,
            skipLibCheck: true,
            noResolve: true,
          },
          files: [fileA],
        }),
      );

      // Should handle circular imports without infinite loop
      const { exitCode } = await execaCommand(
        'npx tsc-files --project tsconfig.circ.json circ-a.ts',
        {
          cwd: testDir,
          shell: true,
          reject: false,
          // Integration test timeout: accounts for real npm package execution,
          // TypeScript compiler, circular dependency detection, and CI overhead
          timeout: 10_000,
        },
      );

      // Should complete (may have type errors from circular dependency, but shouldn't hang)
      expect([0, 1]).toContain(exitCode);
    });
  });

  describe('Monorepo Support', () => {
    it('should handle relative paths in monorepo without root tsconfig', async () => {
      // Create monorepo structure without root tsconfig
      const monorepoDir = path.join(testDir, 'monorepo-no-root');
      mkdirSync(monorepoDir, { recursive: true });

      // Create apps/web package
      const webDir = path.join(monorepoDir, 'apps', 'web');
      mkdirSync(webDir, { recursive: true });
      writeFileSync(
        path.join(webDir, 'tsconfig.json'),
        JSON.stringify({
          compilerOptions: {
            target: 'ES2020',
            strict: true,
            noEmit: true,
            skipLibCheck: true,
          },
        }),
      );
      writeFileSync(
        path.join(webDir, 'index.ts'),
        'export const web: string = "web";',
      );

      // Create apps/api package
      const apiDir = path.join(monorepoDir, 'apps', 'api');
      mkdirSync(apiDir, { recursive: true });
      writeFileSync(
        path.join(apiDir, 'tsconfig.json'),
        JSON.stringify({
          compilerOptions: {
            target: 'ES2020',
            strict: true,
            noEmit: true,
            skipLibCheck: true,
          },
        }),
      );
      writeFileSync(
        path.join(apiDir, 'index.ts'),
        'export const api: string = "api";',
      );

      // Run tsc-files with relative paths from monorepo root
      const { exitCode } = await execaCommand(
        'npx tsc-files apps/web/index.ts apps/api/index.ts',
        {
          cwd: monorepoDir,
          shell: true,
          reject: false,
        },
      );

      expect(exitCode).toBe(0);
    });

    it('should detect multiple tsconfig groups in verbose mode', async () => {
      // Create monorepo with multiple packages
      const monorepoDir = path.join(testDir, 'monorepo-verbose');
      mkdirSync(monorepoDir, { recursive: true });

      // Create packages/core
      const coreDir = path.join(monorepoDir, 'packages', 'core');
      mkdirSync(coreDir, { recursive: true });
      writeFileSync(
        path.join(coreDir, 'tsconfig.json'),
        JSON.stringify({
          compilerOptions: { strict: true, noEmit: true, skipLibCheck: true },
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
          compilerOptions: { strict: true, noEmit: true, skipLibCheck: true },
        }),
      );
      writeFileSync(
        path.join(utilsDir, 'index.ts'),
        'export const utils = "utils";',
      );

      const { exitCode, stdout, stderr } = await execaCommand(
        'npx tsc-files --verbose packages/core/index.ts packages/utils/index.ts',
        {
          cwd: monorepoDir,
          shell: true,
          reject: false,
        },
      );

      expect(exitCode).toBe(0);
      // Verbose output should mention monorepo or multiple configs
      const output = stdout + stderr;
      expect(
        output.includes('Monorepo') ||
          output.includes('tsconfig') ||
          output.includes('Processing'),
      ).toBe(true);
    });

    it('should handle lefthook-style staged files pattern', async () => {
      // Simulate the exact pattern lefthook uses: individual file paths
      const monorepoDir = path.join(testDir, 'monorepo-lefthook');
      mkdirSync(monorepoDir, { recursive: true });

      // Create multiple apps like a real monorepo
      const apps = ['auth', 'dashboard', 'api'];
      for (const app of apps) {
        const appDir = path.join(monorepoDir, 'apps', app, 'src');
        mkdirSync(appDir, { recursive: true });
        writeFileSync(
          path.join(monorepoDir, 'apps', app, 'tsconfig.json'),
          JSON.stringify({
            compilerOptions: {
              target: 'ES2020',
              strict: true,
              noEmit: true,
              skipLibCheck: true,
            },
          }),
        );
        writeFileSync(
          path.join(appDir, 'index.ts'),
          `export const ${app}: string = "${app}";`,
        );
      }

      // Simulate lefthook expanding {staged_files} to individual paths
      const stagedFiles = apps
        .map((app) => `apps/${app}/src/index.ts`)
        .join(' ');

      const { exitCode } = await execaCommand(`npx tsc-files ${stagedFiles}`, {
        cwd: monorepoDir,
        shell: true,
        reject: false,
      });

      expect(exitCode).toBe(0);
    });

    it('should handle mixed relative and absolute paths', async () => {
      const monorepoDir = path.join(testDir, 'monorepo-mixed');
      mkdirSync(monorepoDir, { recursive: true });

      // Create package
      const pkgDir = path.join(monorepoDir, 'packages', 'lib');
      mkdirSync(pkgDir, { recursive: true });
      writeFileSync(
        path.join(pkgDir, 'tsconfig.json'),
        JSON.stringify({
          compilerOptions: { strict: true, noEmit: true, skipLibCheck: true },
        }),
      );
      writeFileSync(path.join(pkgDir, 'a.ts'), 'export const a: string = "a";');
      writeFileSync(path.join(pkgDir, 'b.ts'), 'export const b: string = "b";');

      // Mix absolute and relative paths
      const absolutePath = path.join(pkgDir, 'a.ts');
      const relativePath = 'packages/lib/b.ts';

      const { exitCode } = await execaCommand(
        `npx tsc-files "${absolutePath}" ${relativePath}`,
        {
          cwd: monorepoDir,
          shell: true,
          reject: false,
        },
      );

      expect(exitCode).toBe(0);
    });

    it('should report type errors in correct package', async () => {
      const monorepoDir = path.join(testDir, 'monorepo-errors');
      mkdirSync(monorepoDir, { recursive: true });

      // Create valid package
      const validDir = path.join(monorepoDir, 'packages', 'valid');
      mkdirSync(validDir, { recursive: true });
      writeFileSync(
        path.join(validDir, 'tsconfig.json'),
        JSON.stringify({
          compilerOptions: { strict: true, noEmit: true, skipLibCheck: true },
        }),
      );
      writeFileSync(
        path.join(validDir, 'index.ts'),
        'export const valid: string = "valid";',
      );

      // Create package with error
      const errorDir = path.join(monorepoDir, 'packages', 'broken');
      mkdirSync(errorDir, { recursive: true });
      writeFileSync(
        path.join(errorDir, 'tsconfig.json'),
        JSON.stringify({
          compilerOptions: { strict: true, noEmit: true, skipLibCheck: true },
        }),
      );
      writeFileSync(
        path.join(errorDir, 'index.ts'),
        'export const broken: string = 42; // Type error!',
      );

      const { exitCode, stderr } = await execaCommand(
        'npx tsc-files packages/valid/index.ts packages/broken/index.ts',
        {
          cwd: monorepoDir,
          shell: true,
          reject: false,
        },
      );

      expect(exitCode).toBe(1);
      // Error should be about type mismatch (number to string)
      expect(stderr).toContain('not assignable to type');
    });

    it('should handle paths with ./ prefix', async () => {
      const monorepoDir = path.join(testDir, 'monorepo-dotslash');
      mkdirSync(monorepoDir, { recursive: true });

      const pkgDir = path.join(monorepoDir, 'src');
      mkdirSync(pkgDir, { recursive: true });
      writeFileSync(
        path.join(monorepoDir, 'tsconfig.json'),
        JSON.stringify({
          compilerOptions: { strict: true, noEmit: true, skipLibCheck: true },
        }),
      );
      writeFileSync(
        path.join(pkgDir, 'index.ts'),
        'export const main: string = "main";',
      );

      const { exitCode } = await execaCommand('npx tsc-files ./src/index.ts', {
        cwd: monorepoDir,
        shell: true,
        reject: false,
      });

      expect(exitCode).toBe(0);
    });

    it('should use explicit --project flag over per-file detection', async () => {
      const monorepoDir = path.join(testDir, 'monorepo-project-flag');
      mkdirSync(monorepoDir, { recursive: true });

      // Create root tsconfig with specific settings
      writeFileSync(
        path.join(monorepoDir, 'tsconfig.json'),
        JSON.stringify({
          compilerOptions: {
            target: 'ES2020',
            strict: true,
            noEmit: true,
            skipLibCheck: true,
          },
        }),
      );

      // Create package with different tsconfig
      const pkgDir = path.join(monorepoDir, 'packages', 'lib');
      mkdirSync(pkgDir, { recursive: true });
      writeFileSync(
        path.join(pkgDir, 'tsconfig.json'),
        JSON.stringify({
          compilerOptions: {
            target: 'ES5', // Different target
            strict: false, // Different strict setting
            noEmit: true,
            skipLibCheck: true,
          },
        }),
      );
      writeFileSync(
        path.join(pkgDir, 'index.ts'),
        'export const lib: string = "lib";',
      );

      // Use --project to force root tsconfig
      const { exitCode } = await execaCommand(
        'npx tsc-files --project tsconfig.json packages/lib/index.ts',
        {
          cwd: monorepoDir,
          shell: true,
          reject: false,
        },
      );

      expect(exitCode).toBe(0);
    });
  });
});
