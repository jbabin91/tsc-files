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
        // Exclude CLI entry point (tested via subprocess)
        'src/cli.ts',
        // Exclude scripts directory
        'scripts/**',
        // Exclude build outputs and tooling
        'bin/**',
      ],
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      thresholds: {
        global: {
          branches: 70,
          functions: 95,
          lines: 80,
          statements: 80,
        },
        // Core business logic should have higher coverage
        'src/core/**': {
          branches: 70,
          functions: 100,
          lines: 85,
          statements: 85,
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
