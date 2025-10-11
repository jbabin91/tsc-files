import path from 'node:path';

import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  findTsConfig,
  findTsConfigForFile,
  parseTypeScriptConfig,
  shouldIncludeJavaScript,
  shouldIncludeJavaScriptFiles,
  type TypeScriptConfig,
} from '@/config/tsconfig-resolver';

// Hoisted mock functions (must be defined before vi.mock)
const { mockGetTsconfig, mockParseTsconfig } = vi.hoisted(() => ({
  mockGetTsconfig: vi.fn(),
  mockParseTsconfig: vi.fn(),
}));

// Mock get-tsconfig module
vi.mock('get-tsconfig', () => ({
  getTsconfig: mockGetTsconfig,
  parseTsconfig: mockParseTsconfig,
}));

describe('tsconfig-resolver', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('findTsConfig', () => {
    const testCwd = '/test/project';
    const testConfigPath = '/test/project/tsconfig.json';

    it('should return resolved project path when projectPath is provided and valid', () => {
      const projectPath = 'tsconfig.build.json';
      const resolvedPath = path.resolve(testCwd, projectPath);

      mockParseTsconfig.mockReturnValue({ compilerOptions: {} });

      const result = findTsConfig(testCwd, projectPath);

      expect(result).toBe(resolvedPath);
      expect(mockParseTsconfig).toHaveBeenCalledWith(resolvedPath);
    });

    it('should throw error when projectPath is provided but file does not exist', () => {
      const projectPath = 'nonexistent.json';

      mockParseTsconfig.mockImplementation(() => {
        throw new Error('File not found');
      });

      expect(() => findTsConfig(testCwd, projectPath)).toThrow(
        /TypeScript config not found:/,
      );
    });

    it('should find tsconfig in current directory when no projectPath provided', () => {
      mockGetTsconfig.mockReturnValue({
        path: testConfigPath,
        config: { compilerOptions: {} },
      });

      const result = findTsConfig(testCwd);

      expect(result).toBe(testConfigPath);
      expect(mockGetTsconfig).toHaveBeenCalledWith(testCwd);
    });

    it('should throw error when no tsconfig found in directory tree', () => {
      mockGetTsconfig.mockReturnValue(null);

      expect(() => findTsConfig(testCwd)).toThrow(
        /No tsconfig\.json found in current directory or any parent directories/,
      );
    });

    it('should traverse up directory tree to find tsconfig', () => {
      const parentConfigPath = '/test/tsconfig.json';

      mockGetTsconfig.mockReturnValue({
        path: parentConfigPath,
        config: { compilerOptions: {} },
      });

      const result = findTsConfig(testCwd);

      expect(result).toBe(parentConfigPath);
    });
  });

  describe('findTsConfigForFile', () => {
    const testFilePath = '/test/project/src/index.ts';
    const testFileDir = '/test/project/src';
    const testConfigPath = '/test/project/tsconfig.json';

    it('should use findTsConfig with file directory when projectPath provided', () => {
      const projectPath = 'tsconfig.build.json';
      const resolvedPath = path.resolve(testFileDir, projectPath);

      mockParseTsconfig.mockReturnValue({ compilerOptions: {} });

      const result = findTsConfigForFile(testFilePath, projectPath);

      expect(result).toBe(resolvedPath);
      expect(mockParseTsconfig).toHaveBeenCalledWith(resolvedPath);
    });

    it('should find tsconfig for file directory when no projectPath provided', () => {
      mockGetTsconfig.mockReturnValue({
        path: testConfigPath,
        config: { compilerOptions: {} },
      });

      const result = findTsConfigForFile(testFilePath);

      expect(result).toBe(testConfigPath);
      expect(mockGetTsconfig).toHaveBeenCalledWith(testFileDir);
    });

    it('should throw error when no tsconfig found for file', () => {
      mockGetTsconfig.mockReturnValue(null);

      expect(() => findTsConfigForFile(testFilePath)).toThrow(
        /No tsconfig\.json found for file:/,
      );
    });

    it('should handle deeply nested file paths', () => {
      const deepFilePath = '/test/project/src/components/ui/Button.tsx';
      const deepFileDir = '/test/project/src/components/ui';

      mockGetTsconfig.mockReturnValue({
        path: testConfigPath,
        config: { compilerOptions: {} },
      });

      const result = findTsConfigForFile(deepFilePath);

      expect(result).toBe(testConfigPath);
      expect(mockGetTsconfig).toHaveBeenCalledWith(deepFileDir);
    });
  });

  describe('parseTypeScriptConfig', () => {
    const testConfigPath = '/test/project/tsconfig.json';

    it('should parse valid tsconfig file', () => {
      const mockConfig: TypeScriptConfig = {
        compilerOptions: {
          strict: true,
          noEmit: true,
        },
        include: ['src/**/*'],
      };

      mockParseTsconfig.mockReturnValue(mockConfig);

      const result = parseTypeScriptConfig(testConfigPath);

      expect(result).toEqual(mockConfig);
      expect(mockParseTsconfig).toHaveBeenCalledWith(testConfigPath);
    });

    it('should handle config with extends chain', () => {
      const mockConfig: TypeScriptConfig = {
        extends: '../tsconfig.base.json',
        compilerOptions: {
          strict: true,
        },
      };

      mockParseTsconfig.mockReturnValue(mockConfig);

      const result = parseTypeScriptConfig(testConfigPath);

      expect(result).toEqual(mockConfig);
    });

    it('should throw error when config file cannot be read', () => {
      mockParseTsconfig.mockImplementation(() => {
        throw new Error('ENOENT: no such file or directory');
      });

      expect(() => parseTypeScriptConfig(testConfigPath)).toThrow(
        /TypeScript config not found:/,
      );
    });

    it('should handle empty compilerOptions', () => {
      const mockConfig: TypeScriptConfig = {
        compilerOptions: {},
      };

      mockParseTsconfig.mockReturnValue(mockConfig);

      const result = parseTypeScriptConfig(testConfigPath);

      expect(result).toEqual(mockConfig);
    });

    it('should handle config without compilerOptions', () => {
      const mockConfig: TypeScriptConfig = {
        include: ['src/**/*'],
      };

      mockParseTsconfig.mockReturnValue(mockConfig);

      const result = parseTypeScriptConfig(testConfigPath);

      expect(result).toEqual(mockConfig);
    });
  });

  describe('shouldIncludeJavaScript', () => {
    it('should return true when allowJs is enabled', () => {
      const config: TypeScriptConfig = {
        compilerOptions: {
          allowJs: true,
        },
      };

      expect(shouldIncludeJavaScript(config)).toBe(true);
    });

    it('should return true when checkJs is enabled', () => {
      const config: TypeScriptConfig = {
        compilerOptions: {
          checkJs: true,
        },
      };

      expect(shouldIncludeJavaScript(config)).toBe(true);
    });

    it('should return true when both allowJs and checkJs are enabled', () => {
      const config: TypeScriptConfig = {
        compilerOptions: {
          allowJs: true,
          checkJs: true,
        },
      };

      expect(shouldIncludeJavaScript(config)).toBe(true);
    });

    it('should return false when neither allowJs nor checkJs are enabled', () => {
      const config: TypeScriptConfig = {
        compilerOptions: {
          strict: true,
        },
      };

      expect(shouldIncludeJavaScript(config)).toBe(false);
    });

    it('should return false when compilerOptions is undefined', () => {
      const config: TypeScriptConfig = {};

      expect(shouldIncludeJavaScript(config)).toBe(false);
    });

    it('should return false when allowJs is explicitly false', () => {
      const config: TypeScriptConfig = {
        compilerOptions: {
          allowJs: false,
        },
      };

      expect(shouldIncludeJavaScript(config)).toBe(false);
    });

    it('should return false when checkJs is explicitly false', () => {
      const config: TypeScriptConfig = {
        compilerOptions: {
          checkJs: false,
        },
      };

      expect(shouldIncludeJavaScript(config)).toBe(false);
    });

    it('should handle config with empty compilerOptions', () => {
      const config: TypeScriptConfig = {
        compilerOptions: {},
      };

      expect(shouldIncludeJavaScript(config)).toBe(false);
    });
  });

  describe('shouldIncludeJavaScriptFiles', () => {
    const testConfigPath = '/test/project/tsconfig.json';

    it('should return true when config has allowJs enabled', () => {
      mockParseTsconfig.mockReturnValue({
        compilerOptions: {
          allowJs: true,
        },
      });

      const result = shouldIncludeJavaScriptFiles(testConfigPath);

      expect(result).toBe(true);
    });

    it('should return true when config has checkJs enabled', () => {
      mockParseTsconfig.mockReturnValue({
        compilerOptions: {
          checkJs: true,
        },
      });

      const result = shouldIncludeJavaScriptFiles(testConfigPath);

      expect(result).toBe(true);
    });

    it('should return false when config has neither allowJs nor checkJs', () => {
      mockParseTsconfig.mockReturnValue({
        compilerOptions: {
          strict: true,
        },
      });

      const result = shouldIncludeJavaScriptFiles(testConfigPath);

      expect(result).toBe(false);
    });

    it('should return false when tsconfigPath is undefined', () => {
      const result = shouldIncludeJavaScriptFiles();

      expect(result).toBe(false);
    });

    it('should return false when config file cannot be read', () => {
      mockParseTsconfig.mockImplementation(() => {
        throw new Error('File not found');
      });

      const result = shouldIncludeJavaScriptFiles(testConfigPath);

      expect(result).toBe(false);
    });

    it('should handle config with no compilerOptions', () => {
      mockParseTsconfig.mockReturnValue({
        include: ['src/**/*'],
      });

      const result = shouldIncludeJavaScriptFiles(testConfigPath);

      expect(result).toBe(false);
    });
  });
});
