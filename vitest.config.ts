import tsconfigPaths from 'vite-tsconfig-paths';
import { defineConfig } from 'vitest/config';

const coverageExclude = [
  'node_modules/**',
  'dist/**',
  'coverage/**',
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
  '**/bin/**',
  'tests/setup.ts',
];

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    coverage: {
      enabled: false,
      exclude: coverageExclude,
      include: ['src/**/*.ts', 'src/**/*.tsx'],
      provider: 'v8',
      reporter: process.env.CI
        ? ['text', 'lcov']
        : ['text', 'json', 'html', 'lcov'],
      reportsDirectory: './coverage',
      thresholds: {
        global: {
          branches: 80,
          functions: 95,
          lines: 84,
          statements: 84,
        },
        'src/cli/**': {
          branches: 89,
          functions: 94,
          lines: 94,
          statements: 94,
        },
        'src/config/**': {
          branches: 87,
          functions: 85,
          lines: 87,
          statements: 87,
        },
        'src/core/**': {
          branches: 70,
          functions: 100,
          lines: 75,
          statements: 75,
        },
        'src/detectors/**': {
          branches: 75,
          functions: 100,
          lines: 65,
          statements: 65,
        },
        'src/execution/**': {
          branches: 85,
          functions: 100,
          lines: 95,
          statements: 95,
        },
        'src/types/**': {
          branches: 100,
          functions: 100,
          lines: 100,
          statements: 100,
        },
        'src/utils/**': {
          branches: 96,
          functions: 100,
          lines: 95,
          statements: 95,
        },
      },
    },
    environment: 'node',
    fileParallelism: true,
    globals: true,
    outputFile: {
      junit: 'reports/test-report.junit.xml',
    },
    pool: 'threads',
    projects: [
      {
        plugins: [tsconfigPaths()],
        test: {
          environment: 'node',
          exclude: ['tests/integration/**'],
          globals: true,
          include: ['tests/unit/**/*.test.ts'],
          name: 'unit',
          restoreMocks: true,
          setupFiles: ['./tests/setup.ts'],
          testTimeout: process.env.CI ? 10_000 : 5000,
          unstubEnvs: true,
        },
      },
      {
        plugins: [tsconfigPaths()],
        test: {
          environment: 'node',
          globals: true,
          include: ['tests/integration/**/*.test.ts'],
          name: 'integration',
          restoreMocks: true,
          setupFiles: ['./tests/setup.ts'],
          testTimeout: 120_000,
          unstubEnvs: true,
        },
      },
    ],
    reporters: process.env.CI
      ? ['default', 'github-actions']
      : ['default', 'github-actions', 'junit'],
    restoreMocks: true,
    setupFiles: ['./tests/setup.ts'],
    testTimeout: process.env.CI ? 10_000 : 5000,
    unstubEnvs: true,
  },
});
