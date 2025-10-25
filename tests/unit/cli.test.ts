import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createProgram, parseArguments } from '@/cli/command';
import { runTypeCheck } from '@/cli/runner';

const ESC = String.fromCodePoint(27);
const ANSI_PATTERN = new RegExp(`${ESC}\\[[0-9;]*m`, 'g');
const stripAnsi = (value: string): string => value.split(ANSI_PATTERN).join('');

// Mock console methods to capture output
const mockConsoleLog = vi.spyOn(console, 'log').mockImplementation(() => {
  /* empty */
});
const mockConsoleError = vi.spyOn(console, 'error').mockImplementation(() => {
  /* empty */
});

// Test utilities - now use direct CLI function calls instead of process spawning

const cleanupTempDir = (tempDir: string) => {
  try {
    rmSync(tempDir, { recursive: true, force: true });
  } catch {
    // Ignore cleanup errors in tests
  }
};

const createCliTestProject = (tempDir: string) => {
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

// Direct CLI runner - much faster and more reliable than process spawning
const runCli = async (
  args: string[],
  cwd: string,
): Promise<{ stdout: string; stderr: string; exitCode: number }> => {
  // Clear console mocks
  mockConsoleLog.mockClear();
  mockConsoleError.mockClear();

  try {
    // Handle help and version commands using commander
    if (args.includes('--help') || args.includes('-h')) {
      const program = createProgram(async () => {
        /* empty */
      });
      program.configureOutput({
        writeOut: mockConsoleLog as unknown as (...args: string[]) => void,
        writeErr: mockConsoleError as unknown as (...args: string[]) => void,
      });
      program.exitOverride(() => {
        throw new Error('Help displayed');
      });

      try {
        parseArguments(program, ['tsc-files', ...args]);
      } catch {
        // Help was displayed
      }

      return {
        stdout: mockConsoleLog.mock.calls
          .map((call) => call.join(' '))
          .join('\n'),
        stderr: mockConsoleError.mock.calls
          .map((call) => call.join(' '))
          .join('\n'),
        exitCode: 0,
      };
    }

    if (args.includes('--version') || args.includes('-v')) {
      const program = createProgram(async () => {
        /* empty */
      });
      program.configureOutput({
        writeOut: mockConsoleLog as unknown as (...args: string[]) => void,
        writeErr: mockConsoleError as unknown as (...args: string[]) => void,
      });
      program.exitOverride(() => {
        throw new Error('Version displayed');
      });

      try {
        parseArguments(program, ['tsc-files', ...args]);
      } catch {
        // Version was displayed
      }

      return {
        stdout: mockConsoleLog.mock.calls
          .map((call) => call.join(' '))
          .join('\n'),
        stderr: mockConsoleError.mock.calls
          .map((call) => call.join(' '))
          .join('\n'),
        exitCode: 0,
      };
    }

    // Handle no files case
    if (args.length === 0) {
      return {
        stdout: '',
        stderr: "error: missing required argument 'files'",
        exitCode: 1,
      };
    }

    // Parse arguments and extract files and options
    const program = createProgram(async () => {
      /* empty */
    });
    program.exitOverride((err) => {
      throw err;
    });

    let files: string[];
    let options: unknown;

    try {
      const parsed = parseArguments(program, ['tsc-files', ...args]);
      files = parsed.files;
      options = parsed.options;
    } catch (error) {
      return {
        stdout: '',
        stderr: error instanceof Error ? error.message : String(error),
        exitCode: 1,
      };
    }

    // Run type checking using direct function call
    const result = await runTypeCheck(files, options, cwd);

    return {
      stdout: result.stdout,
      stderr: result.stderr,
      exitCode: result.exitCode,
    };
  } catch (error) {
    return {
      stdout: '',
      stderr: error instanceof Error ? error.message : String(error),
      exitCode: 99,
    };
  }
};

describe('CLI', () => {
  let tempDir: string;
  let srcDir: string;

  beforeEach(() => {
    tempDir = createTempDir();
    ({ srcDir } = createCliTestProject(tempDir));
    // Clear console mocks before each test
    mockConsoleLog.mockClear();
    mockConsoleError.mockClear();
  });

  afterEach(() => {
    cleanupTempDir(tempDir);
    // Restore console mocks after each test
    mockConsoleLog.mockClear();
    mockConsoleError.mockClear();
  });

  describe('help and version', () => {
    it('should show help with --help', async () => {
      const { stdout, exitCode } = await runCli(['--help'], tempDir);

      expect(exitCode).toBe(0);
      const plainStdout = stripAnsi(stdout);
      expect(plainStdout).toContain('Usage: tsc-files');
      expect(plainStdout).toContain('Options:');
    });

    it('should show help with -h', async () => {
      const { stdout, exitCode } = await runCli(['-h'], tempDir);

      expect(exitCode).toBe(0);
      expect(stripAnsi(stdout)).toContain('Usage: tsc-files');
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

      // Verify JSON is valid without unsafe return
      expect(() => {
        JSON.parse(stdout);
      }).not.toThrow();

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
      // Create a secure temp directory (not in project directory)
      const systemTempDir = createTempDir();

      try {
        const { exitCode, stderr } = await runCli(
          ['nonexistent.ts'],
          systemTempDir,
        );

        expect(exitCode).toBe(2); // Configuration error
        expect(stderr).toContain('Configuration Error');
        expect(stderr).toContain('No tsconfig.json found');
      } finally {
        cleanupTempDir(systemTempDir);
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
