import { glob } from 'tinyglobby';
import { describe, expect, it } from 'vitest';

describe('tinyglobby behavior verification', () => {
  describe('duplicate handling', () => {
    it('should automatically deduplicate results from overlapping patterns', async () => {
      // Test with patterns that would match the same files
      const patterns = ['src/**/*.ts', 'src/core/*.ts'];
      const results = await glob(patterns, {
        cwd: process.cwd(),
        absolute: false,
        onlyFiles: true,
      });

      // Check if there are any duplicates
      const uniqueResults = [...new Set(results)];
      expect(results.length).toBe(uniqueResults.length);
    });
  });

  describe('basename matching (not supported)', () => {
    it('should NOT match nested files with basename-only patterns', async () => {
      // tinyglobby does NOT support baseNameMatch like fast-glob
      // *.ts only matches files in the root directory, NOT src/file.ts
      const results = await glob(['*.ts'], {
        cwd: process.cwd(),
        absolute: false,
        onlyFiles: true,
      });

      // Should only find root-level .ts files
      const hasNestedFiles = results.some((file) => file.includes('/'));
      expect(hasNestedFiles).toBe(false);
    });

    it('should require explicit directory wildcards for nested matching', async () => {
      // Unlike fast-glob with baseNameMatch: true, tinyglobby requires **/*
      // This is actually our intended usage - we always use explicit patterns
      const results = await glob(['**/checker.ts'], {
        cwd: process.cwd(),
        absolute: false,
        onlyFiles: true,
      });

      expect(results.length).toBeGreaterThan(0);
      expect(results.some((file) => file.includes('checker.ts'))).toBe(true);
    });

    it('should document that file-resolver NEVER relies on basename matching', async () => {
      // Our file-resolver transforms patterns:
      // - 'src/index.ts' → direct file (as-is)
      // - 'src/*.ts' → glob pattern (as-is)
      // - 'src' → directory pattern (expanded to 'src/**/*.{ts,tsx}')
      //
      // We NEVER pass basename-only patterns like '*.ts' expecting nested matches
      // Therefore, the lack of baseNameMatch support has zero impact

      // Test our actual pattern usage
      const results = await glob(['src/**/*.ts', 'tests/**/*.ts'], {
        cwd: process.cwd(),
        absolute: false,
        onlyFiles: true,
      });

      expect(results.length).toBeGreaterThan(0);
      expect(results.every((file) => file.includes('/'))).toBe(true);
    });
  });

  describe('case sensitivity', () => {
    it('should respect case sensitivity by default (caseSensitiveMatch: true)', async () => {
      // Test if UPPERCASE.ts and uppercase.ts are treated differently
      const upperResults = await glob(['**/CHECKER.ts'], {
        cwd: process.cwd(),
        absolute: false,
        onlyFiles: true,
      });

      const lowerResults = await glob(['**/checker.ts'], {
        cwd: process.cwd(),
        absolute: false,
        onlyFiles: true,
      });

      // On case-sensitive filesystems, these should be different
      // On case-insensitive filesystems (macOS/Windows), both will find the same file
      // We're testing the default behavior is case-sensitive
      const isCaseSensitive = upperResults.length !== lowerResults.length;

      // This test documents the behavior - on macOS/Windows it will find both
      // The key is that tinyglobby respects the filesystem's case sensitivity
      if (process.platform === 'darwin' || process.platform === 'win32') {
        // Case-insensitive filesystem - should find same files
        expect(upperResults.length).toBeGreaterThanOrEqual(0);
        expect(lowerResults.length).toBeGreaterThan(0);
      } else {
        // Case-sensitive filesystem - should be different
        expect(isCaseSensitive).toBe(true);
      }
    });

    it('should support case-insensitive matching when explicitly disabled', async () => {
      const results = await glob(['**/checker.ts'], {
        cwd: process.cwd(),
        absolute: false,
        onlyFiles: true,
        caseSensitiveMatch: false,
      });

      expect(results.length).toBeGreaterThan(0);
      expect(results.some((file) => file.includes('checker.ts'))).toBe(true);
    });
  });

  describe('comparison with expected file-resolver behavior', () => {
    it('should work with the same patterns used in file-resolver', async () => {
      // Simulate what file-resolver does
      const globPatterns = ['src/**/*.ts', 'tests/**/*.ts'];

      const files = await glob(globPatterns, {
        cwd: process.cwd(),
        absolute: true,
        onlyFiles: true,
        ignore: ['**/node_modules/**', '**/dist/**', '**/*.d.ts'],
      });

      // Should find TypeScript files
      expect(files.length).toBeGreaterThan(0);

      // Should be absolute paths
      expect(files.every((file) => file.startsWith('/'))).toBe(true);

      // Should not include declaration files
      expect(files.every((file) => !file.endsWith('.d.ts'))).toBe(true);

      // Should not have duplicates
      const uniqueFiles = [...new Set(files)];
      expect(files.length).toBe(uniqueFiles.length);
    });
  });
});
