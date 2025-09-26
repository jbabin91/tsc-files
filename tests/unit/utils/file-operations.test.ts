/**
 * Tests for utils/file-operations.ts
 */

import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it, vi } from 'vitest';

import {
  fileExists,
  getBasename,
  getDirectory,
  getExtension,
  joinSafely,
  readJsonFile,
  readTextFile,
  resolveFromCwd,
} from '@/utils/file-operations';

// Mock fs functions
vi.mock('node:fs', () => ({
  existsSync: vi.fn(),
  readFileSync: vi.fn(),
}));

describe('utils/file-operations', () => {
  describe('fileExists', () => {
    it('should return true when file exists', () => {
      vi.mocked(existsSync).mockReturnValueOnce(true);

      expect(fileExists('/path/to/file.ts')).toBe(true);
      expect(existsSync).toHaveBeenCalledWith('/path/to/file.ts');
    });

    it('should return false when file does not exist', () => {
      vi.mocked(existsSync).mockReturnValueOnce(false);

      expect(fileExists('/path/to/missing.ts')).toBe(false);
      expect(existsSync).toHaveBeenCalledWith('/path/to/missing.ts');
    });
  });

  describe('readJsonFile', () => {
    it('should read and parse JSON file successfully', () => {
      const mockJson = { name: 'test', version: '1.0.0' };
      vi.mocked(existsSync).mockReturnValueOnce(true);
      vi.mocked(readFileSync).mockReturnValueOnce(JSON.stringify(mockJson));

      const result = readJsonFile('/path/to/package.json');

      expect(result).toEqual(mockJson);
      expect(readFileSync).toHaveBeenCalledWith(
        '/path/to/package.json',
        'utf8',
      );
    });

    it('should throw error when file does not exist', () => {
      vi.mocked(existsSync).mockReturnValueOnce(false);

      expect(() => readJsonFile('/path/to/missing.json')).toThrow(
        'File not found: /path/to/missing.json',
      );
    });

    it('should throw error when JSON parsing fails', () => {
      vi.mocked(existsSync).mockReturnValueOnce(true);
      vi.mocked(readFileSync).mockReturnValueOnce('invalid json');

      expect(() => readJsonFile('/path/to/invalid.json')).toThrow(
        /Failed to parse JSON file \/path\/to\/invalid\.json:/,
      );
    });

    it('should handle read file errors', () => {
      vi.mocked(existsSync).mockReturnValueOnce(true);
      vi.mocked(readFileSync).mockImplementationOnce(() => {
        throw new Error('Permission denied');
      });

      expect(() => readJsonFile('/path/to/protected.json')).toThrow(
        'Failed to parse JSON file /path/to/protected.json: Permission denied',
      );
    });
  });

  describe('readTextFile', () => {
    it('should read text file successfully', () => {
      const mockContent = 'Hello, world!';
      vi.mocked(existsSync).mockReturnValueOnce(true);
      vi.mocked(readFileSync).mockReturnValueOnce(mockContent);

      const result = readTextFile('/path/to/file.txt');

      expect(result).toBe(mockContent);
      expect(readFileSync).toHaveBeenCalledWith('/path/to/file.txt', 'utf8');
    });

    it('should throw error when file does not exist', () => {
      vi.mocked(existsSync).mockReturnValueOnce(false);

      expect(() => readTextFile('/path/to/missing.txt')).toThrow(
        'File not found: /path/to/missing.txt',
      );
    });

    it('should handle read file errors', () => {
      vi.mocked(existsSync).mockReturnValueOnce(true);
      vi.mocked(readFileSync).mockImplementationOnce(() => {
        throw new Error('Permission denied');
      });

      expect(() => readTextFile('/path/to/protected.txt')).toThrow(
        'Failed to read file /path/to/protected.txt: Permission denied',
      );
    });
  });

  describe('resolveFromCwd', () => {
    it('should resolve path from current working directory', () => {
      const result = resolveFromCwd('src/index.ts');
      const expected = path.resolve(process.cwd(), 'src/index.ts');

      expect(result).toBe(expected);
    });

    it('should resolve path from custom working directory', () => {
      const customCwd = '/custom/path';
      const result = resolveFromCwd('src/index.ts', customCwd);
      const expected = path.resolve(customCwd, 'src/index.ts');

      expect(result).toBe(expected);
    });
  });

  describe('joinSafely', () => {
    it('should join path segments safely', () => {
      const result = joinSafely('src', 'components', 'Button.tsx');
      const expected = path.join('src', 'components', 'Button.tsx');

      expect(result).toBe(expected);
    });

    it('should handle empty segments', () => {
      const result = joinSafely('src', '', 'index.ts');
      const expected = path.join('src', '', 'index.ts');

      expect(result).toBe(expected);
    });
  });

  describe('getDirectory', () => {
    it('should return directory name from file path', () => {
      const result = getDirectory('/path/to/file.ts');

      expect(result).toBe('/path/to');
    });

    it('should handle relative paths', () => {
      const result = getDirectory('src/components/Button.tsx');

      expect(result).toBe('src/components');
    });
  });

  describe('getExtension', () => {
    it('should return file extension with dot', () => {
      expect(getExtension('file.ts')).toBe('.ts');
      expect(getExtension('component.tsx')).toBe('.tsx');
      expect(getExtension('package.json')).toBe('.json');
    });

    it('should handle files without extension', () => {
      expect(getExtension('README')).toBe('');
    });

    it('should handle multiple dots', () => {
      expect(getExtension('file.test.ts')).toBe('.ts');
      expect(getExtension('package.config.json')).toBe('.json');
    });
  });

  describe('getBasename', () => {
    it('should return filename without extension', () => {
      expect(getBasename('file.ts')).toBe('file');
      expect(getBasename('component.tsx')).toBe('component');
      expect(getBasename('/path/to/file.js')).toBe('file');
    });

    it('should handle files without extension', () => {
      expect(getBasename('README')).toBe('README');
      expect(getBasename('/path/to/LICENSE')).toBe('LICENSE');
    });

    it('should handle multiple dots correctly', () => {
      expect(getBasename('file.test.ts')).toBe('file.test');
      expect(getBasename('package.config.json')).toBe('package.config');
    });
  });
});
