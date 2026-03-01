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
          branches: 87,
          functions: 97,
          lines: 95,
          statements: 95,
        },
        'src/cli/**': {
          branches: 89,
          functions: 98,
          lines: 96,
          statements: 96,
        },
        'src/config/**': {
          branches: 89,
          functions: 93,
          lines: 94,
          statements: 94,
        },
        'src/core/**': {
          branches: 84,
          functions: 100,
          lines: 96,
          statements: 96,
        },
        'src/detectors/**': {
          branches: 77,
          functions: 100,
          lines: 91,
          statements: 91,
        },
        'src/execution/**': {
          branches: 85,
          functions: 100,
          lines: 98,
          statements: 98,
        },
        'src/types/**': {
          branches: 100,
          functions: 100,
          lines: 100,
          statements: 100,
        },
        'src/utils/**': {
          branches: 98,
          functions: 100,
          lines: 98,
          statements: 98,
        },
      },
    },
    outputFile: {
      junit: 'reports/test-report.junit.xml',
    },
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
    reporters: ['default', 'github-actions', 'junit'],
  },
});
