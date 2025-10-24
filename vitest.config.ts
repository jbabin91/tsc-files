import tsconfigPaths from 'vite-tsconfig-paths';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    // Coverage configuration (applies to unit tests only via include pattern)
    coverage: {
      exclude: [
        'node_modules/',
        'dist/',
        'coverage/',
        '**/*.d.ts',
        '**/*.config.*',
        'tests/fixtures/**',
        'tests/integration/**', // Exclude integration tests from coverage
        '.commitlintrc.js',
        '.prettierrc.js',
        '.markdownlint-cli2.mjs',
        'eslint.config.js',
        'tsdown.config.ts',
        'src/cli.ts', // CLI entry point with process.exit() calls
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
          lines: 84,
          statements: 84,
        },
        // CLI modules - user-facing interface (main.ts excluded from coverage)
        'src/cli/**': {
          branches: 89,
          functions: 94,
          lines: 94,
          statements: 94,
        },
        // Configuration modules - solid coverage for setup logic
        'src/config/**': {
          branches: 87,
          functions: 85,
          lines: 87,
          statements: 87,
        },
        // Core business logic should have higher coverage
        'src/core/**': {
          branches: 70,
          functions: 100,
          lines: 75,
          statements: 75,
        },
        // Detectors have comprehensive coverage for platform detection
        'src/detectors/**': {
          branches: 75,
          functions: 100,
          lines: 65,
          statements: 65,
        },
        // Execution modules - high standards for new refactored components
        'src/execution/**': {
          branches: 85,
          functions: 100,
          lines: 95,
          statements: 95,
        },
        // Type definitions - ensure all types are covered
        'src/types/**': {
          branches: 100,
          functions: 100,
          lines: 100,
          statements: 100,
        },
        // Utility modules - highest standards for pure functions
        'src/utils/**': {
          branches: 96,
          functions: 100,
          lines: 95,
          statements: 95,
        },
      },
    },
    // Shared configuration for all tests
    environment: 'node',
    globals: true,
    outputFile: {
      junit: 'reports/test-report.junit.xml',
    },
    // Use projects to separate unit and integration tests
    projects: [
      // Unit tests project with coverage
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
      // Integration tests project without coverage
      {
        plugins: [tsconfigPaths()],
        test: {
          environment: 'node',
          globals: true,
          include: ['tests/integration/**/*.test.ts'],
          name: 'integration',
          restoreMocks: true,
          setupFiles: ['./tests/setup.ts'],
          testTimeout: 120_000, // 2 minutes for integration tests
          unstubEnvs: true,
        },
      },
    ],
    reporters: process.env.CI
      ? ['github-actions']
      : ['default', 'github-actions', 'junit'],
    restoreMocks: true,
    setupFiles: ['./tests/setup.ts'],
    unstubEnvs: true,
  },
});
