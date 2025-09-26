/**
 * Vitest Setup File for CLI Testing
 * Extends vitest with CLI-specific utilities and matchers
 */

import { execFile } from 'node:child_process';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { promisify } from 'node:util';

import tmp from 'tmp';
import { expect } from 'vitest';

const execFileAsync = promisify(execFile);

// Build the CLI path relative to the current working directory
const CLI_PATH = path.resolve(process.cwd(), 'dist/cli.js');

// Global test utilities
declare global {
  var createTempDir: () => string;
  var cleanupTempDir: (tempDir: string) => void;
  var createTestProject: (tempDir: string) => {
    tsconfig: object;
    srcDir: string;
  };
  var runCli: (
    args: string[],
    cwd: string,
  ) => Promise<{ stdout: string; stderr: string; exitCode: number }>;
  var writeTestFile: (dir: string, filename: string, content: string) => string;
}

// Temp directory utilities - using secure tmp library
globalThis.createTempDir = () => {
  // Use tmp library for secure temporary directory creation
  // This ensures proper permissions (0700) and unique directory names
  const tempDir = tmp.dirSync({
    prefix: 'tsc-files-test-',
    unsafeCleanup: true // Allow cleanup of non-empty directories
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

globalThis.createTestProject = (tempDir: string) => {
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

globalThis.runCli = async (
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
    const execError = error as {
      stdout?: string;
      stderr?: string;
      code?: number;
    };
    return {
      stdout: execError.stdout ?? '',
      stderr: execError.stderr ?? '',
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

// Custom CLI-specific matchers
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
  // eslint-disable-next-line @typescript-eslint/consistent-type-definitions, @typescript-eslint/no-empty-object-type
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

// Test file templates
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

// Common test configurations
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

// Performance benchmarks for CLI operations
export const PERFORMANCE_BENCHMARKS = {
  SINGLE_FILE: 2000, // 2s max for single file
  SMALL_PROJECT: 5000, // 5s max for < 10 files
  MEDIUM_PROJECT: 15_000, // 15s max for < 100 files
} as const;
