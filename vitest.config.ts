import tsconfigPaths from 'vite-tsconfig-paths';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    coverage: {
      exclude: [
        'node_modules/',
        'dist/',
        'coverage/',
        '**/*.d.ts',
        '**/*.config.*',
        'tests/fixtures/**',
        '.commitlintrc.js',
        '.prettierrc.js',
        '.markdownlint-cli2.mjs',
        'eslint.config.js',
        'tsdown.config.ts',
        'src/cli.ts',
        'scripts/**',
        'bin/**',
      ],
      provider: 'v8',
      reporter: process.env.CI
        ? ['text', 'lcov']
        : ['text', 'json', 'html', 'lcov'],
      thresholds: {
        global: {
          branches: 80,
          functions: 95,
          lines: 85,
          statements: 85,
        },
        // Core business logic should have higher coverage
        'src/core/**': {
          branches: 80,
          functions: 100,
          lines: 90,
          statements: 90,
        },
        // Detectors have lower initial thresholds - can increase over time
        'src/detectors/**': {
          branches: 29,
          functions: 62,
          lines: 35,
          statements: 35,
        },
      },
    },
    // Enable dependency optimization for better performance
    deps: {
      optimizer: {
        ssr: {
          enabled: true,
          include: ['tmp', 'commander', 'execa', 'fast-glob', 'ora', 'kleur'],
        },
      },
    },
    environment: 'node',
    fileParallelism: true,
    globals: true,
    outputFile: {
      junit: 'reports/test-report.junit.xml',
    },
    // Enable threading for better performance
    pool: 'threads',
    poolOptions: {
      threads: {
        maxThreads: process.env.CI ? 4 : undefined,
        minThreads: process.env.CI ? 2 : 1,
        // useAtomics: true, // Temporarily disabled - might cause worker termination issues
        ...(process.env.VITEST_PROFILE
          ? {
              // Enable profiling if VITEST_PROFILE env var is set
              execArgv: [
                '--cpu-prof',
                '--cpu-prof-dir=test-profiles',
                '--heap-prof',
                '--heap-prof-dir=test-profiles',
              ],
              singleThread: true, // Single thread for clearer profiling
            }
          : {}),
      },
    },
    reporters: process.env.CI
      ? ['github-actions']
      : ['default', 'github-actions', 'junit'],
    setupFiles: ['./tests/setup.ts'],
    testTimeout: process.env.CI ? 10_000 : 5000, // 10s in CI, 5s locally
    // Disable isolation for better performance (safe for our filesystem-based tests)
    // isolate: false, // Causes worker thread termination issues - keeping isolation enabled
  },
});
