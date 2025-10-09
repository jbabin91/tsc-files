import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { findTsConfig, findTsConfigForFile } from '@/config/discovery';

describe('Config Discovery', () => {
  describe('findTsConfig', () => {
    it('should find tsconfig.json in current directory', () => {
      const tempDir = createTempDir();
      const tsconfigPath = path.join(tempDir, 'tsconfig.json');

      writeFileSync(tsconfigPath, '{"compilerOptions": {}}');

      const result = findTsConfig(tempDir);
      expect(result).toBe(tsconfigPath);

      cleanupTempDir(tempDir);
    });

    it('should find tsconfig.json in parent directory', () => {
      const tempDir = createTempDir();
      const subDir = path.join(tempDir, 'subdir');
      mkdirSync(subDir, { recursive: true });
      const tsconfigPath = path.join(tempDir, 'tsconfig.json');

      writeFileSync(tsconfigPath, '{"compilerOptions": {}}');

      const result = findTsConfig(subDir);
      expect(result).toBe(tsconfigPath);

      cleanupTempDir(tempDir);
    });

    it('should use explicit project path when provided', () => {
      const tempDir = createTempDir();
      const tsconfigPath = path.join(tempDir, 'custom-config.json');

      writeFileSync(tsconfigPath, '{"compilerOptions": {}}');

      const result = findTsConfig(tempDir, 'custom-config.json');
      expect(result).toBe(tsconfigPath);

      cleanupTempDir(tempDir);
    });

    it('should throw error when explicit project path does not exist', () => {
      const tempDir = createTempDir();

      expect(() => {
        findTsConfig(tempDir, 'nonexistent.json');
      }).toThrow('TypeScript config not found');

      cleanupTempDir(tempDir);
    });

    it('should throw error when no tsconfig.json is found', () => {
      const tempDir = createTempDir();

      expect(() => {
        findTsConfig(tempDir);
      }).toThrow(
        'No tsconfig.json found in current directory or any parent directories',
      );

      cleanupTempDir(tempDir);
    });

    it('should prioritize closer tsconfig.json files', () => {
      const tempDir = createTempDir();
      const subDir = path.join(tempDir, 'subdir');
      mkdirSync(subDir, { recursive: true });

      const parentTsconfig = path.join(tempDir, 'tsconfig.json');
      const childTsconfig = path.join(subDir, 'tsconfig.json');

      writeFileSync(parentTsconfig, '{"compilerOptions": {}}');
      writeFileSync(childTsconfig, '{"compilerOptions": {}}');

      const result = findTsConfig(subDir);
      expect(result).toBe(childTsconfig); // Should find the closer one

      cleanupTempDir(tempDir);
    });
  });

  describe('findTsConfigForFile', () => {
    it('should find tsconfig.json for a file in current directory', () => {
      const tempDir = createTempDir();
      const tsconfigPath = path.join(tempDir, 'tsconfig.json');
      const filePath = path.join(tempDir, 'test.ts');

      writeFileSync(tsconfigPath, '{"compilerOptions": {}}');

      const result = findTsConfigForFile(filePath);
      expect(result).toBe(tsconfigPath);

      cleanupTempDir(tempDir);
    });

    it('should find tsconfig.json for a file in subdirectory', () => {
      const tempDir = createTempDir();
      const subDir = path.join(tempDir, 'src');
      mkdirSync(subDir, { recursive: true });
      const tsconfigPath = path.join(tempDir, 'tsconfig.json');
      const filePath = path.join(subDir, 'index.ts');

      writeFileSync(tsconfigPath, '{"compilerOptions": {}}');

      const result = findTsConfigForFile(filePath);
      expect(result).toBe(tsconfigPath);

      cleanupTempDir(tempDir);
    });

    it('should use explicit project path for file', () => {
      const tempDir = createTempDir();
      const tsconfigPath = path.join(tempDir, 'custom-config.json');
      const filePath = path.join(tempDir, 'test.ts');

      writeFileSync(tsconfigPath, '{"compilerOptions": {}}');

      const result = findTsConfigForFile(filePath, 'custom-config.json');
      expect(result).toBe(tsconfigPath);

      cleanupTempDir(tempDir);
    });
  });
});
