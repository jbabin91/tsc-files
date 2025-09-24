import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    coverage: {
      exclude: [
        'node_modules/',
        'dist/',
        'coverage/',
        '**/*.d.ts',
        '**/*.config.*',
        'tests/fixtures/**',
      ],
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
    },
    environment: 'node',
    globals: true,
    outputFile: {
      junit: 'test-report.junit.xml',
    },
    reporters: ['default', 'github-actions', 'junit'],
  },
});
