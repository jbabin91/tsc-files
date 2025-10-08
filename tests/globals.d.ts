// Global test utilities available in all test files
// These are defined in tests/setup.ts and loaded by Vitest

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

// This export is needed to make this file a module
// Without it, the declare global above won't work properly
// eslint-disable-next-line unicorn/require-module-specifiers
export {};
