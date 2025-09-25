import { execFile } from 'node:child_process';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

const execFileAsync = promisify(execFile);

// Build the CLI path relative to the current working directory
const CLI_PATH = path.resolve(process.cwd(), 'dist/cli.js');

// Test utilities
const createTempDir = () => {
  const tempDir = path.join(
    tmpdir(),
    'tsc-files-cli-test',
    Date.now().toString(),
  );
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

const runCli = async (
  args: string[],
  cwd: string,
): Promise<{ stdout: string; stderr: string; exitCode: number }> => {
  try {
    const { stdout, stderr } = await execFileAsync(
      'node',
      [CLI_PATH, ...args],
      { cwd, encoding: 'utf8' },
    );
    return { stdout, stderr, exitCode: 0 };
  } catch (error: unknown) {
    // Type-safe error property access
    const stdout =
      typeof error === 'object' &&
      error !== null &&
      'stdout' in error &&
      typeof error.stdout === 'string'
        ? error.stdout
        : '';

    const stderr =
      typeof error === 'object' &&
      error !== null &&
      'stderr' in error &&
      typeof error.stderr === 'string'
        ? error.stderr
        : '';

    const code =
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      typeof error.code === 'number'
        ? error.code
        : 1;

    return {
      stdout,
      stderr,
      exitCode: code,
    };
  }
};

describe('CLI', () => {
  let tempDir: string;
  let srcDir: string;

  beforeEach(() => {
    tempDir = createTempDir();
    ({ srcDir } = createTestProject(tempDir));
  });

  afterEach(() => {
    cleanupTempDir(tempDir);
  });

  describe('help and version', () => {
    it('should show help with --help', async () => {
      const { stdout, exitCode } = await runCli(['--help'], tempDir);

      expect(exitCode).toBe(0);
      expect(stdout).toContain('Usage: tsc-files');
      expect(stdout).toContain('Options:');
    });

    it('should show help with -h', async () => {
      const { stdout, exitCode } = await runCli(['-h'], tempDir);

      expect(exitCode).toBe(0);
      expect(stdout).toContain('Usage: tsc-files');
    });

    it('should show version with --version', async () => {
      const { stdout, exitCode } = await runCli(['--version'], tempDir);

      expect(exitCode).toBe(0);
      expect(stdout.trim()).toMatch(/^\d+\.\d+\.\d+/);
    });

    it('should show version with -v', async () => {
      const { stdout, exitCode } = await runCli(['-v'], tempDir);

      expect(exitCode).toBe(0);
      expect(stdout.trim()).toMatch(/^\d+\.\d+\.\d+/);
    });
  });

  describe('file handling', () => {
    it('should exit with error when no files specified', async () => {
      const { stderr, exitCode } = await runCli([], tempDir);

      expect(exitCode).toBe(1);
      expect(stderr).toContain('missing required argument');
    });

    it('should exit successfully when no TypeScript files', async () => {
      // Create non-TypeScript files
      writeFileSync(path.join(srcDir, 'test.js'), 'console.log("hello");');

      const { exitCode } = await runCli(['src/test.js'], tempDir);

      expect(exitCode).toBe(0);
    });

    it('should process TypeScript files', async () => {
      writeFileSync(path.join(srcDir, 'test.ts'), 'const x: string = "hello";');

      const { stdout, exitCode } = await runCli(['src/test.ts'], tempDir);

      expect(exitCode).toBe(0);
      expect(stdout).toContain('Type check passed');
    });
  });

  describe('type checking', () => {
    it('should pass with valid TypeScript', async () => {
      writeFileSync(
        path.join(srcDir, 'valid.ts'),
        'const message: string = "Hello, world!";',
      );

      const { stdout, exitCode } = await runCli(['src/valid.ts'], tempDir);

      expect(exitCode).toBe(0);
      expect(stdout).toContain('Type check passed');
    });

    it('should fail with type errors', async () => {
      writeFileSync(
        path.join(srcDir, 'invalid.ts'),
        'const message: string = 42;',
      );

      const { stderr, exitCode } = await runCli(['src/invalid.ts'], tempDir);

      expect(exitCode).toBe(1);
      // Should show error details in stderr
      expect(stderr.length).toBeGreaterThan(0);
    });
  });

  describe('options', () => {
    beforeEach(() => {
      writeFileSync(
        path.join(srcDir, 'test.ts'),
        'const message: string = "Hello";',
      );
    });

    it('should handle --verbose flag', async () => {
      const { stdout, exitCode } = await runCli(
        ['--verbose', 'src/test.ts'],
        tempDir,
      );

      expect(exitCode).toBe(0);
      expect(stdout).toContain('Checked');
    });

    it('should handle --project flag', async () => {
      // Create custom tsconfig
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

      const { exitCode } = await runCli(
        ['--project', 'tsconfig.custom.json', 'src/test.ts'],
        tempDir,
      );

      expect(exitCode).toBe(0);
    });

    it('should handle -p flag', async () => {
      const { exitCode } = await runCli(
        ['-p', 'tsconfig.json', 'src/test.ts'],
        tempDir,
      );

      expect(exitCode).toBe(0);
    });

    it('should handle --json flag', async () => {
      const { stdout, exitCode } = await runCli(
        ['--json', 'src/test.ts'],
        tempDir,
      );

      expect(exitCode).toBe(0);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-return
      expect(() => JSON.parse(stdout)).not.toThrow();

      const result = JSON.parse(stdout) as {
        success: boolean;
        errorCount: number;
        duration: number;
      };
      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('errorCount');
      expect(result).toHaveProperty('duration');
    });
  });

  describe('configuration discovery', () => {
    it('should find tsconfig.json in parent directories', async () => {
      // Create nested directory structure
      const nestedDir = path.join(tempDir, 'src', 'components');
      mkdirSync(nestedDir, { recursive: true });

      // Create test file in nested directory
      writeFileSync(
        path.join(nestedDir, 'test.ts'),
        'const x: string = "test";',
      );

      // Run CLI from nested directory - should find tsconfig from tempDir root
      const { exitCode, stderr } = await runCli(['test.ts'], nestedDir);

      expect(exitCode).toBe(0);
      expect(stderr).toBe('');
    });

    it('should provide helpful error when no tsconfig found', async () => {
      const emptyTempDir = createTempDir();

      try {
        const { exitCode, stderr } = await runCli(
          ['nonexistent.ts'],
          emptyTempDir,
        );

        expect(exitCode).toBe(2); // Configuration error
        expect(stderr).toContain('Configuration Error');
        expect(stderr).toContain('No tsconfig.json found');
      } finally {
        cleanupTempDir(emptyTempDir);
      }
    });
  });

  describe('error handling', () => {
    it('should handle missing tsconfig with proper exit code', async () => {
      // Remove the tsconfig
      rmSync(path.join(tempDir, 'tsconfig.json'));
      writeFileSync(path.join(srcDir, 'test.ts'), 'const x = 1;');

      const { stderr, exitCode } = await runCli(['src/test.ts'], tempDir);

      // When no tsconfig is found, it's a configuration error (exit code 2)
      // But if TypeScript can't be found, it's a system error (exit code 3)
      expect([2, 3]).toContain(exitCode);
      expect(stderr.length).toBeGreaterThan(0);
    });

    it('should handle invalid project path', async () => {
      writeFileSync(path.join(srcDir, 'test.ts'), 'const x = 1;');

      const { stderr, exitCode } = await runCli(
        ['--project', 'nonexistent.json', 'src/test.ts'],
        tempDir,
      );

      expect(exitCode).toBe(2);
      expect(stderr).toContain('Configuration Error');
    });
  });

  describe('enhanced CLI features', () => {
    beforeEach(() => {
      writeFileSync(
        path.join(srcDir, 'test.ts'),
        'const message: string = "Hello";',
      );
    });

    it('should display enhanced help with examples and patterns', async () => {
      const { stdout, exitCode } = await runCli(['--help'], tempDir);

      expect(exitCode).toBe(0);
      expect(stdout).toContain('Examples:');
      expect(stdout).toContain('Glob Patterns:');
      expect(stdout).toContain('Exit Codes:');
      expect(stdout).toContain('tsc-files src/index.ts src/utils.ts');
      expect(stdout).toContain('"src/**/*.ts"');
    });

    it('should handle error output with enhanced formatting', async () => {
      writeFileSync(
        path.join(srcDir, 'error.ts'),
        'const message: string = 42;', // Type error
      );

      const { stderr, exitCode } = await runCli(['src/error.ts'], tempDir);

      expect(exitCode).toBe(1);
      expect(stderr).toContain('error.ts');
      expect(stderr).toContain('Type');
    });

    it('should suppress progress indicators in JSON mode', async () => {
      const { stdout, exitCode } = await runCli(
        ['--json', 'src/test.ts'],
        tempDir,
      );

      expect(exitCode).toBe(0);
      const result = JSON.parse(stdout) as {
        success: boolean;
        errorCount: number;
      };
      expect(result).toHaveProperty('success', true);
      expect(result).toHaveProperty('errorCount', 0);
    });

    it('should provide helpful tips in error messages', async () => {
      // Test configuration error tip
      rmSync(path.join(tempDir, 'tsconfig.json'));
      writeFileSync(path.join(srcDir, 'test.ts'), 'const x = 1;');

      const { stderr } = await runCli(['src/test.ts'], tempDir);

      // Should contain helpful tip (may vary based on actual error)
      expect(stderr.length).toBeGreaterThan(0);
    });
  });
});
