// No mocking - let tests run against real functions
import { execFile } from 'node:child_process';
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { promisify } from 'node:util';

import { Command } from 'commander';
import kleur from 'kleur';
import tmp from 'tmp';
import { afterEach, expect, test as baseTest } from 'vitest';
import { z } from 'zod';

import type { CheckOptions } from '@/types/core';

const execFileAsync = promisify(execFile);

// Build the CLI path relative to the current working directory
const CLI_PATH = path.resolve(process.cwd(), 'dist/cli.js');

// Global test utilities
declare global {
  var createTempDir: () => string;
  var cleanupTempDir: (tempDir: string) => void;
  var createTestProject: (
    tempDir: string,
    customTsconfig?: object,
  ) => {
    tsconfig: object;
    srcDir: string;
  };
  var runCli: (
    args: string[],
    cwd: string,
  ) => Promise<{ stdout: string; stderr: string; exitCode: number }>;
  var writeTestFile: (dir: string, filename: string, content: string) => string;
  var writeTestFiles: (dir: string, files: Record<string, string>) => string[];
}

// ================================
// TEST UTILITIES
// ================================

// ================================
// TEST FIXTURES SETUP
// ================================

type TestFixtures = {
  tempDir: string;
};

// Create extended test function with fixtures
export const test = baseTest.extend<TestFixtures>({
  // Temporary directory fixture - auto-created and cleaned up
  tempDir: [
    async ({}, use) => {
      const tempDir = tmp.dirSync({
        prefix: 'tsc-files-test-',
        unsafeCleanup: true,
      });

      await use(tempDir.name);

      // Cleanup
      try {
        rmSync(tempDir.name, { recursive: true, force: true });
      } catch {
        // Ignore cleanup errors
      }
    },
    { auto: true }, // Always create temp directory
  ],
});

// ================================
// GLOBAL TEST UTILITIES
// ================================

// Enhanced temp directory utilities
export const createTestProject = (tempDir: string, customTsconfig?: object) => {
  const tsconfigContent = customTsconfig
    ? JSON.stringify(customTsconfig, null, 2)
    : JSON.stringify(
        {
          compilerOptions: {
            target: 'ES2022',
            module: 'ESNext',
            moduleResolution: 'bundler',
            strict: true,
            noEmit: true,
          },
        },
        null,
        2,
      );

  writeFileSync(path.join(tempDir, 'tsconfig.json'), tsconfigContent);

  const srcDir = path.join(tempDir, 'src');
  mkdirSync(srcDir, { recursive: true });

  return { srcDir, tsconfig: customTsconfig };
};

// Enhanced file creation utilities
export const writeTestFile = (
  dir: string,
  filename: string,
  content: string,
): string => {
  const filePath = path.join(dir, filename);
  mkdirSync(path.dirname(filePath), { recursive: true });
  writeFileSync(filePath, content);
  return filePath;
};

export const writeTestFiles = (
  dir: string,
  files: Record<string, string>,
): string[] => {
  return Object.entries(files).map(([filename, content]) =>
    writeTestFile(dir, filename, content),
  );
};

// ================================
// TEST CONFIGURATION UTILITIES
// ================================

// ================================
// CLI TESTING UTILITIES
// ================================

const CliOptionsSchema = z.object({
  project: z.string().optional(),
  noEmit: z.boolean().default(true),
  skipLibCheck: z.boolean().default(false),
  verbose: z.boolean().default(false),
  cache: z.boolean().default(true),
  json: z.boolean().default(false),
});

export async function runCliDirect(
  args: string[],
  cwd: string,
): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  const program = new Command();

  let stdout = '';
  let stderr = '';
  const originalConsoleLog = console.log;
  const originalConsoleError = console.error;

  console.log = (...args: unknown[]) => {
    stdout += args.join(' ') + '\n';
  };

  console.error = (...args: unknown[]) => {
    stderr += args.join(' ') + '\n';
  };

  try {
    program
      .name('tsc-files')
      .description(
        'Run TypeScript compiler on specific files while respecting tsconfig.json',
      )
      .argument('<files...>', 'TypeScript files to check')
      .option('-p, --project <path>', 'path to tsconfig.json')
      .option('--verbose', 'enable detailed output')
      .option('--json', 'output results as JSON')
      .option('--no-cache', 'disable temporary file caching')
      .option('--skip-lib-check', 'skip type checking of declaration files')
      .configureOutput({
        writeOut: (str) => {
          stdout += str;
        },
        writeErr: (str) => {
          stderr += str;
        },
      })
      .exitOverride();

    const parsedArgs = program.parse(args, { from: 'user' });
    const files = parsedArgs.args;
    const rawOptions = parsedArgs.opts();

    if (rawOptions.help || rawOptions.version) {
      return { stdout, stderr, exitCode: 0 };
    }

    const validatedOptions = CliOptionsSchema.parse(rawOptions);

    const checkOptions: CheckOptions = {
      project: validatedOptions.project,
      noEmit: validatedOptions.noEmit,
      skipLibCheck: validatedOptions.skipLibCheck,
      verbose: validatedOptions.verbose,
      cache: validatedOptions.cache,
      cwd,
    };

    // Import dynamically to ensure mocks are applied
    const { checkFiles } = await import('@/core/checker');
    const result = await checkFiles(files, checkOptions);

    if (validatedOptions.json) {
      stdout += JSON.stringify(result, null, 2) + '\n';
    } else {
      if (result.errors.length > 0) {
        stderr += '\n';
        for (const error of result.errors) {
          const fileLocation = kleur.cyan(
            `${error.file}:${error.line}:${error.column}`,
          );
          const errorMessage = kleur.red(error.message);
          stderr += `${fileLocation} - ${errorMessage}\n`;
        }
      }

      if (validatedOptions.verbose) {
        const duration = kleur.dim(`${result.duration}ms`);
        const fileCount = kleur.bold(result.checkedFiles.length.toString());
        stdout += `\nChecked ${fileCount} files in ${duration}\n`;
      }

      if (result.success) {
        stdout += kleur.green('✓ Type check passed') + '\n';
      }
    }

    return {
      stdout,
      stderr,
      exitCode: result.success ? 0 : 1,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    stderr += kleur.red('Error: ') + kleur.dim(message) + '\n';
    return { stdout, stderr, exitCode: 99 };
  } finally {
    console.log = originalConsoleLog;
    console.error = originalConsoleError;
  }
}

// ================================
// GLOBAL SETUP AND CLEANUP
// ================================

// Global cleanup after each test
afterEach(() => {
  // Clean up any test artifacts
});

// Environment variable utilities
export const stubEnv = (key: string, value: string) => {
  vi.stubEnv(key, value);
};

export const unstubAllEnvs = () => {
  vi.unstubAllEnvs();
};

// ================================
// LEGACY GLOBAL UTILITIES FOR COMPATIBILITY
// ================================

// Global test utilities for backward compatibility
declare global {
  var createTempDir: () => string;
  var cleanupTempDir: (tempDir: string) => void;
  var createTestProject: (
    tempDir: string,
    customTsconfig?: object,
  ) => {
    tsconfig: object;
    srcDir: string;
  };
  var runCli: (
    args: string[],
    cwd: string,
  ) => Promise<{ stdout: string; stderr: string; exitCode: number }>;
  var writeTestFile: (dir: string, filename: string, content: string) => string;
  var writeTestFiles: (dir: string, files: Record<string, string>) => string[];
}

// Temp directory utilities - using secure tmp library
globalThis.createTempDir = () => {
  const tempDir = tmp.dirSync({
    prefix: 'tsc-files-test-',
    unsafeCleanup: true,
  });
  return tempDir.name;
};

globalThis.cleanupTempDir = (tempDir: string) => {
  try {
    rmSync(tempDir, { recursive: true, force: true });
  } catch {
    // Ignore cleanup errors
  }
};

globalThis.createTestProject = (tempDir: string, customTsconfig?: object) => {
  const result = createTestProject(tempDir, customTsconfig);
  return {
    tsconfig: customTsconfig ?? {
      compilerOptions: {
        target: 'ES2022',
        module: 'ESNext',
        moduleResolution: 'bundler',
        strict: true,
        noEmit: true,
      },
    },
    srcDir: result.srcDir,
  };
};

globalThis.runCli = runCliDirect;
globalThis.writeTestFile = writeTestFile;
globalThis.writeTestFiles = writeTestFiles;

// ================================
// CUSTOM MATCHERS
// ================================

type CustomMatchers<R = unknown> = {
  toHaveExitCode(expected: number): R;
  toContainInStdout(expected: string): R;
  toContainInStderr(expected: string): R;
  toHaveSuccessfulExit(): R;
  toHaveTypeError(): R;
  toHaveValidJson(): R;
  toBeFasterThan(maxMs: number): R;
};

declare module 'vitest' {
  // eslint-disable-next-line @typescript-eslint/consistent-type-definitions, @typescript-eslint/no-empty-object-type, @typescript-eslint/no-explicit-any
  interface Assertion<T = any> extends CustomMatchers<T> {}
  // eslint-disable-next-line @typescript-eslint/consistent-type-definitions, @typescript-eslint/no-empty-object-type
  interface AsymmetricMatchersContaining extends CustomMatchers {}
}

expect.extend({
  toHaveExitCode(received: { exitCode: number }, expected: number) {
    const { isNot, utils } = this;
    return {
      pass: received.exitCode === expected,
      message: () => {
        const expectedStr = utils.printExpected(expected);
        const receivedStr = utils.printReceived(received.exitCode);
        return `Expected CLI to ${isNot ? 'not ' : ''}exit with code ${expectedStr}, but got ${receivedStr}`;
      },
    };
  },

  toContainInStdout(received: { stdout: string }, expected: string) {
    const { isNot } = this;
    return {
      pass: received.stdout.includes(expected),
      message: () => {
        return `Expected stdout to ${isNot ? 'not ' : ''}contain "${expected}"\n\nReceived stdout: ${received.stdout}`;
      },
    };
  },

  toContainInStderr(received: { stderr: string }, expected: string) {
    const { isNot } = this;
    return {
      pass: received.stderr.includes(expected),
      message: () => {
        return `Expected stderr to ${isNot ? 'not ' : ''}contain "${expected}"\n\nReceived stderr: ${received.stderr}`;
      },
    };
  },

  toHaveSuccessfulExit(received: { exitCode: number; stdout: string }) {
    const { isNot } = this;
    const isSuccess = received.exitCode === 0;
    return {
      pass: isSuccess,
      message: () => {
        if (isSuccess && isNot) {
          return 'Expected CLI to fail, but it succeeded';
        }
        return `Expected CLI to succeed (exit code 0), but got ${received.exitCode}\n\nStdout: ${received.stdout}`;
      },
    };
  },

  toHaveTypeError(received: { exitCode: number; stderr: string }) {
    const { isNot } = this;
    const hasTypeError = received.exitCode === 1 && received.stderr.length > 0;
    return {
      pass: hasTypeError,
      message: () => {
        if (hasTypeError && isNot) {
          return `Expected CLI to not have type errors, but got:\n${received.stderr}`;
        }
        return `Expected CLI to have type errors (exit code 1 with stderr), but got exit code ${received.exitCode}\n\nStderr: ${received.stderr}`;
      },
    };
  },

  toHaveValidJson(received: { stdout: string }) {
    const { isNot } = this;
    let isValidJson = false;
    let parsedJson: unknown;

    try {
      parsedJson = JSON.parse(received.stdout);
      isValidJson = true;
    } catch {
      isValidJson = false;
    }

    return {
      pass: isValidJson,
      message: () => {
        if (isValidJson && isNot) {
          return `Expected output to not be valid JSON, but got:\n${JSON.stringify(parsedJson, null, 2)}`;
        }
        return `Expected output to be valid JSON, but parsing failed.\n\nReceived: ${received.stdout}`;
      },
    };
  },

  toBeFasterThan(received: { duration?: number }, maxMs: number) {
    const { isNot } = this;
    const duration = received.duration ?? 0;
    const isFast = duration < maxMs;

    return {
      pass: isFast,
      message: () => {
        return `Expected CLI to ${isNot ? 'not ' : ''}be faster than ${maxMs}ms, but took ${duration}ms`;
      },
    };
  },
});

// ================================
// GLOBAL FUNCTION IMPLEMENTATIONS
// ================================

// Shared base directory for better performance
let sharedTestDir: string | null = null;

// Default TypeScript configuration for tests
const DEFAULT_TSCONFIG_JSON = JSON.stringify(
  {
    compilerOptions: {
      target: 'ES2020',
      module: 'ESNext',
      moduleResolution: 'node',
      strict: true,
      esModuleInterop: true,
      skipLibCheck: true,
      forceConsistentCasingInFileNames: true,
      outDir: './dist',
      declaration: true,
      isolatedModules: true,
    },
    include: ['src/**/*'],
    exclude: ['node_modules', 'dist'],
  },
  null,
  2,
);

// Temp directory utilities - using secure tmp library with optimization
globalThis.createTempDir = () => {
  // In CI, reuse a shared base directory for better performance
  if (process.env.CI && sharedTestDir && existsSync(sharedTestDir)) {
    // Create unique subdirectory within shared base
    const uniqueDir = path.join(
      sharedTestDir,
      `test-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    );
    mkdirSync(uniqueDir, { recursive: true });
    return uniqueDir;
  }

  // For local development or when shared directory doesn't exist
  const tempDir = tmp.dirSync({
    prefix: 'tsc-files-test-',
    unsafeCleanup: true,
  });

  // Store first temp directory as shared base in CI
  if (process.env.CI && !sharedTestDir) {
    sharedTestDir = tempDir.name;
  }

  return tempDir.name;
};

globalThis.cleanupTempDir = (tempDir: string) => {
  try {
    rmSync(tempDir, { recursive: true, force: true });
  } catch {
    // Ignore cleanup errors
  }
};

globalThis.createTestProject = (tempDir: string, customTsconfig?: object) => {
  // Use pre-computed JSON or custom config
  const tsconfigContent = customTsconfig
    ? JSON.stringify(customTsconfig, null, 2)
    : DEFAULT_TSCONFIG_JSON;

  const tsconfig = JSON.parse(tsconfigContent) as object;
  const tsconfigPath = path.join(tempDir, 'tsconfig.json');
  const srcDir = path.join(tempDir, 'src');

  // Write configuration and create source directory
  writeFileSync(tsconfigPath, tsconfigContent);
  mkdirSync(srcDir, { recursive: true });

  return { tsconfig, srcDir };
};

globalThis.runCli = async (
  args: string[],
  cwd: string,
): Promise<{ stdout: string; stderr: string; exitCode: number }> => {
  try {
    const { stdout, stderr } = await execFileAsync(
      process.execPath,
      [CLI_PATH, ...args],
      { cwd, encoding: 'utf8' },
    );
    return { stdout, stderr, exitCode: 0 };
  } catch (error: unknown) {
    const execError = error as {
      stdout?: string;
      stderr?: string;
      message?: string;
      code?: number;
    };
    return {
      stdout: execError.stdout ?? '',
      stderr: execError.stderr ?? execError.message ?? '',
      exitCode: execError.code ?? 1,
    };
  }
};

globalThis.writeTestFile = (
  dir: string,
  filename: string,
  content: string,
): string => {
  const filePath = path.join(dir, filename);
  writeFileSync(filePath, content);
  return filePath;
};

globalThis.writeTestFiles = (
  dir: string,
  files: Record<string, string>,
): string[] => {
  const filePaths: string[] = [];
  for (const [filename, content] of Object.entries(files)) {
    filePaths.push(globalThis.writeTestFile(dir, filename, content));
  }
  return filePaths;
};

// ================================
// TEST TEMPLATES AND CONSTANTS
// ================================

export const TEST_FILES = {
  VALID_TS: 'export const message: string = "Hello, world!";',
  INVALID_TS: 'const message: string = 42;',
  TYPE_ERROR_TS: 'const x: number = "string";',
  UNUSED_VAR_TS: `
    const unusedVariable = 'this might generate a warning';
    export const message: string = 'test';
  `,
  COMPLEX_TS: `
    interface User {
      id: number;
      name: string;
      email?: string;
    }

    export function createUser(name: string): User {
      return {
        id: Date.now(),
        name,
      };
    }
  `,
} as const;

export const TEST_CONFIGS = {
  STRICT: {
    compilerOptions: {
      target: 'ES2022',
      module: 'ESNext',
      moduleResolution: 'bundler',
      strict: true,
      noEmit: true,
      noUnusedLocals: true,
      noUnusedParameters: true,
    },
  },
  LOOSE: {
    compilerOptions: {
      target: 'ES2022',
      module: 'ESNext',
      moduleResolution: 'bundler',
      strict: false,
      noEmit: true,
    },
  },
} as const;

export const PERFORMANCE_BENCHMARKS = {
  SINGLE_FILE: 2000,
  SMALL_PROJECT: 5000,
  MEDIUM_PROJECT: 15_000,
} as const;
