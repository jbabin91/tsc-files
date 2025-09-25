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
      reporter: ['text', 'json', 'html', 'lcov'],
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
    environment: 'node',
    globals: true,
    outputFile: {
      junit: 'reports/test-report.junit.xml',
    },
    reporters: ['default', 'github-actions', 'junit'],
    setupFiles: ['./tests/setup.ts'],
  },
});
