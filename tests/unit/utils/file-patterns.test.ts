import { describe, expect, it } from 'vitest';

import {
  ALL_EXTENSIONS,
  buildGlobPattern,
  createFileExtensionRegex,
  getFileExtensions,
  hasValidExtension,
  JS_EXTENSIONS,
  TS_EXTENSIONS,
} from '@/utils/file-patterns';

describe('file-patterns', () => {
  describe('constants', () => {
    it('should have correct TypeScript extensions', () => {
      expect(TS_EXTENSIONS).toEqual(['ts', 'tsx']);
    });

    it('should have correct JavaScript extensions', () => {
      expect(JS_EXTENSIONS).toEqual(['js', 'jsx']);
    });

    it('should have all extensions combined', () => {
      expect(ALL_EXTENSIONS).toEqual(['ts', 'tsx', 'js', 'jsx']);
    });
  });

  describe('getFileExtensions', () => {
    it('should return TypeScript extensions when includeJs is false', () => {
      const result = getFileExtensions(false);
      expect(result.extensions).toEqual(['ts', 'tsx']);
      expect(result.globPattern).toBe('{ts,tsx}');
      expect(result.regexPattern.test('file.ts')).toBe(true);
      expect(result.regexPattern.test('file.js')).toBe(false);
    });

    it('should return all extensions when includeJs is true', () => {
      const result = getFileExtensions(true);
      expect(result.extensions).toEqual(['ts', 'tsx', 'js', 'jsx']);
      expect(result.globPattern).toBe('{ts,tsx,js,jsx}');
      expect(result.regexPattern.test('file.ts')).toBe(true);
      expect(result.regexPattern.test('file.js')).toBe(true);
    });
  });

  describe('hasValidExtension', () => {
    describe('TypeScript only (includeJs=false)', () => {
      it('should accept TypeScript file patterns', () => {
        expect(hasValidExtension('file.ts', false)).toBe(true);
        expect(hasValidExtension('file.tsx', false)).toBe(true);
        expect(hasValidExtension('src/**/*.ts', false)).toBe(true);
        expect(hasValidExtension('src/**/*.tsx', false)).toBe(true);
      });

      it('should accept TypeScript brace patterns', () => {
        expect(hasValidExtension('src/**/*.{ts,tsx}', false)).toBe(true);
        expect(hasValidExtension('src/**/*.{tsx,ts}', false)).toBe(true);
      });

      it('should reject JavaScript patterns', () => {
        expect(hasValidExtension('file.js', false)).toBe(false);
        expect(hasValidExtension('file.jsx', false)).toBe(false);
        expect(hasValidExtension('src/**/*.js', false)).toBe(false);
      });

      it('should accept directory patterns without extensions', () => {
        expect(hasValidExtension('src', false)).toBe(true);
        expect(hasValidExtension('src/components', false)).toBe(true);
        expect(hasValidExtension('src/**/*', false)).toBe(true);
      });
    });

    describe('TypeScript and JavaScript (includeJs=true)', () => {
      it('should accept all file patterns', () => {
        expect(hasValidExtension('file.ts', true)).toBe(true);
        expect(hasValidExtension('file.tsx', true)).toBe(true);
        expect(hasValidExtension('file.js', true)).toBe(true);
        expect(hasValidExtension('file.jsx', true)).toBe(true);
      });

      it('should accept mixed brace patterns', () => {
        expect(hasValidExtension('src/**/*.{ts,tsx,js,jsx}', true)).toBe(true);
        expect(hasValidExtension('src/**/*.{tsx,ts,jsx,js}', true)).toBe(true);
        expect(hasValidExtension('src/**/*.{ts,js}', true)).toBe(true);
        expect(hasValidExtension('src/**/*.{js,ts}', true)).toBe(true);
      });

      it('should accept JavaScript-only patterns', () => {
        expect(hasValidExtension('src/**/*.{js,jsx}', true)).toBe(true);
        expect(hasValidExtension('src/**/*.{jsx,js}', true)).toBe(true);
      });

      it('should reject unsupported extensions', () => {
        expect(hasValidExtension('file.py', true)).toBe(false);
        expect(hasValidExtension('file.css', true)).toBe(false);
        expect(hasValidExtension('src/**/*.{py,css}', true)).toBe(false);
      });
    });

    describe('edge cases', () => {
      it('should handle patterns with dots in directory names', () => {
        expect(hasValidExtension('src/v1.0/file.ts', false)).toBe(true);
        expect(hasValidExtension('src/v1.0/file.py', false)).toBe(false);
      });

      it('should handle complex glob patterns', () => {
        expect(hasValidExtension('src/**/!(*.test).ts', false)).toBe(true);
        expect(hasValidExtension('src/**/!(*.test).py', false)).toBe(false);
      });
    });
  });

  describe('createFileExtensionRegex', () => {
    it('should create regex for TypeScript files only', () => {
      const regex = createFileExtensionRegex(false);
      expect(regex.test('file.ts')).toBe(true);
      expect(regex.test('file.tsx')).toBe(true);
      expect(regex.test('file.js')).toBe(false);
      expect(regex.test('file.jsx')).toBe(false);
    });

    it('should create regex for all supported files', () => {
      const regex = createFileExtensionRegex(true);
      expect(regex.test('file.ts')).toBe(true);
      expect(regex.test('file.tsx')).toBe(true);
      expect(regex.test('file.js')).toBe(true);
      expect(regex.test('file.jsx')).toBe(true);
    });

    it('should not match unsupported extensions', () => {
      const regex = createFileExtensionRegex(true);
      expect(regex.test('file.py')).toBe(false);
      expect(regex.test('file.css')).toBe(false);
      expect(regex.test('file.json')).toBe(false);
    });
  });

  describe('buildGlobPattern', () => {
    it('should build pattern for TypeScript files only', () => {
      expect(buildGlobPattern(false)).toBe('{ts,tsx}');
    });

    it('should build pattern for all supported files', () => {
      expect(buildGlobPattern(true)).toBe('{ts,tsx,js,jsx}');
    });
  });
});
