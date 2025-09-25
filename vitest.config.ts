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
      ],
      provider: 'v8',
      reporter: ['text', 'json'],
    },
    environment: 'node',
    globals: true,
    outputFile: {
      junit: 'reports/test-report.junit.xml',
    },
    reporters: ['default', 'github-actions', 'junit'],
  },
});
