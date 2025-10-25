import { describe, expect, it } from 'vitest';

import {
  ALL_EXTENSIONS,
  ALL_EXTENSIONS_WITH_DECLARATIONS,
  buildGlobPattern,
  createFileExtensionRegex,
  getFileExtensions,
  hasValidExtension,
  hasValidFileExtension,
  isDeclarationFile,
  JS_EXTENSIONS,
  TS_DECLARATION_EXTENSIONS,
  TS_EXTENSIONS,
} from '@/utils/file-patterns';

describe('file-patterns', () => {
  describe('constants', () => {
    it('should have correct TypeScript extensions', () => {
      expect(TS_EXTENSIONS).toEqual(['ts', 'tsx', 'mts', 'cts']);
    });

    it('should have correct JavaScript extensions', () => {
      expect(JS_EXTENSIONS).toEqual(['js', 'jsx', 'mjs', 'cjs']);
    });

    it('should have all extensions combined', () => {
      expect(ALL_EXTENSIONS).toEqual([
        'ts',
        'tsx',
        'mts',
        'cts',
        'js',
        'jsx',
        'mjs',
        'cjs',
      ]);
    });

    it('should include declaration extensions when requested', () => {
      expect(TS_DECLARATION_EXTENSIONS).toEqual(['d.ts', 'd.mts', 'd.cts']);
      expect(ALL_EXTENSIONS_WITH_DECLARATIONS).toEqual([
        'ts',
        'tsx',
        'mts',
        'cts',
        'd.ts',
        'd.mts',
        'd.cts',
        'js',
        'jsx',
        'mjs',
        'cjs',
      ]);
    });
  });

  describe('getFileExtensions', () => {
    it('should return TypeScript extensions when includeJs is false', () => {
      const result = getFileExtensions(false);
      expect(result.extensions).toEqual(['ts', 'tsx', 'mts', 'cts']);
      expect(result.globPattern).toBe('{ts,tsx,mts,cts}');
      expect(result.regexPattern.test('file.ts')).toBe(true);
      expect(result.regexPattern.test('file.mts')).toBe(true);
      expect(result.regexPattern.test('file.cts')).toBe(true);
      expect(result.regexPattern.test('file.js')).toBe(false);
    });

    it('should return all extensions when includeJs is true', () => {
      const result = getFileExtensions(true);
      expect(result.extensions).toEqual([
        'ts',
        'tsx',
        'mts',
        'cts',
        'js',
        'jsx',
        'mjs',
        'cjs',
      ]);
      expect(result.globPattern).toBe('{ts,tsx,mts,cts,js,jsx,mjs,cjs}');
      expect(result.regexPattern.test('file.ts')).toBe(true);
      expect(result.regexPattern.test('file.mts')).toBe(true);
      expect(result.regexPattern.test('file.js')).toBe(true);
      expect(result.regexPattern.test('file.mjs')).toBe(true);
    });
  });

  describe('hasValidExtension', () => {
    describe('TypeScript only (includeJs=false)', () => {
      it('should accept TypeScript file patterns', () => {
        expect(hasValidExtension('file.ts', false)).toBe(true);
        expect(hasValidExtension('file.tsx', false)).toBe(true);
        expect(hasValidExtension('file.mts', false)).toBe(true);
        expect(hasValidExtension('file.cts', false)).toBe(true);
        expect(hasValidExtension('src/**/*.ts', false)).toBe(true);
        expect(hasValidExtension('src/**/*.tsx', false)).toBe(true);
        expect(hasValidExtension('src/**/*.mts', false)).toBe(true);
        expect(hasValidExtension('src/**/*.cts', false)).toBe(true);
      });

      it('should accept TypeScript brace patterns', () => {
        expect(hasValidExtension('src/**/*.{ts,tsx}', false)).toBe(true);
        expect(hasValidExtension('src/**/*.{tsx,ts}', false)).toBe(true);
        expect(hasValidExtension('src/**/*.{ts,tsx,mts,cts}', false)).toBe(
          true,
        );
        expect(hasValidExtension('src/**/*.{mts,cts}', false)).toBe(true);
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
        expect(hasValidExtension('file.mts', true)).toBe(true);
        expect(hasValidExtension('file.cts', true)).toBe(true);
        expect(hasValidExtension('file.js', true)).toBe(true);
        expect(hasValidExtension('file.jsx', true)).toBe(true);
        expect(hasValidExtension('file.mjs', true)).toBe(true);
        expect(hasValidExtension('file.cjs', true)).toBe(true);
      });

      it('should accept mixed brace patterns', () => {
        expect(
          hasValidExtension('src/**/*.{ts,tsx,mts,cts,js,jsx,mjs,cjs}', true),
        ).toBe(true);
        expect(
          hasValidExtension('src/**/*.{tsx,ts,jsx,js,mts,cts,mjs,cjs}', true),
        ).toBe(true);
        expect(hasValidExtension('src/**/*.{ts,js,mts,mjs}', true)).toBe(true);
        expect(hasValidExtension('src/**/*.{js,ts,cjs,cts}', true)).toBe(true);
      });

      it('should accept JavaScript-only patterns', () => {
        expect(hasValidExtension('src/**/*.{js,jsx}', true)).toBe(true);
        expect(hasValidExtension('src/**/*.{jsx,js}', true)).toBe(true);
        expect(hasValidExtension('src/**/*.{js,jsx,mjs,cjs}', true)).toBe(true);
        expect(hasValidExtension('src/**/*.{mjs,cjs}', true)).toBe(true);
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
      expect(regex.test('file.mts')).toBe(true);
      expect(regex.test('file.cts')).toBe(true);
      expect(regex.test('file.js')).toBe(false);
      expect(regex.test('file.jsx')).toBe(false);
      expect(regex.test('file.mjs')).toBe(false);
      expect(regex.test('file.cjs')).toBe(false);
    });

    it('should create regex for all supported files', () => {
      const regex = createFileExtensionRegex(true);
      expect(regex.test('file.ts')).toBe(true);
      expect(regex.test('file.tsx')).toBe(true);
      expect(regex.test('file.mts')).toBe(true);
      expect(regex.test('file.cts')).toBe(true);
      expect(regex.test('file.js')).toBe(true);
      expect(regex.test('file.jsx')).toBe(true);
      expect(regex.test('file.mjs')).toBe(true);
      expect(regex.test('file.cjs')).toBe(true);
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
      expect(buildGlobPattern(false)).toBe('{ts,tsx,mts,cts}');
    });

    it('should build pattern for all supported files', () => {
      expect(buildGlobPattern(true)).toBe('{ts,tsx,mts,cts,js,jsx,mjs,cjs}');
    });
  });

  describe('isDeclarationFile', () => {
    it('identifies TypeScript declaration files', () => {
      expect(isDeclarationFile('index.d.ts')).toBe(true);
      expect(isDeclarationFile('module.d.mts')).toBe(true);
      expect(isDeclarationFile('legacy.d.cts')).toBe(true);
    });

    it('rejects non-declaration files', () => {
      expect(isDeclarationFile('index.ts')).toBe(false);
      expect(isDeclarationFile('index.js')).toBe(false);
      expect(isDeclarationFile('types.d.ts.backup')).toBe(false);
    });
  });

  describe('hasValidFileExtension', () => {
    it('respects includeJs flag', () => {
      expect(hasValidFileExtension('src/file.ts', false)).toBe(true);
      expect(hasValidFileExtension('src/file.js', false)).toBe(false);
      expect(hasValidFileExtension('src/file.js', true)).toBe(true);
    });

    it('handles declaration files when requested', () => {
      expect(hasValidFileExtension('types/index.d.ts', false)).toBe(true);
      expect(hasValidFileExtension('types/index.d.ts', false, true)).toBe(true);
      expect(hasValidFileExtension('types/module.d.mts', true, true)).toBe(
        true,
      );
    });

    it('rejects unsupported extensions even with declarations enabled', () => {
      expect(hasValidFileExtension('README.md', true, true)).toBe(false);
      expect(hasValidFileExtension('styles.css', false, true)).toBe(false);
    });
  });
});
