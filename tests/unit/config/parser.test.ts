import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  parseTypeScriptConfig,
  shouldIncludeJavaScript,
  shouldIncludeJavaScriptFiles,
} from '@/config/parser';

describe('Config Parser', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = mkdtempSync(path.join(tmpdir(), 'tsc-files-test-'));
  });

  afterEach(() => {
    rmSync(tempDir, { force: true, recursive: true });
  });

  describe('parseTypeScriptConfig', () => {
    it('should parse valid tsconfig.json', () => {
      const configPath = path.join(tempDir, 'tsconfig.json');
      const config = {
        compilerOptions: {
          strict: true,
          target: 'ES2020',
        },
      };
      writeFileSync(configPath, JSON.stringify(config));

      const result = parseTypeScriptConfig(configPath);

      expect(result).toEqual(config);
    });

    it('should parse tsconfig.json with single-line comments', () => {
      const configPath = path.join(tempDir, 'tsconfig.json');
      const configWithComments = `{
  // This is a comment
  "compilerOptions": {
    "strict": true, // Enable strict mode
    "target": "ES2020"
  }
}`;
      writeFileSync(configPath, configWithComments);

      const result = parseTypeScriptConfig(configPath);

      expect(result.compilerOptions).toEqual({
        strict: true,
        target: 'ES2020',
      });
    });

    it('should parse tsconfig.json with block comments', () => {
      const configPath = path.join(tempDir, 'tsconfig.json');
      const configWithComments = `{
  /* Block comment */
  "compilerOptions": {
    "strict": true,
    /* Another block comment */
    "target": "ES2020"
  }
}`;
      writeFileSync(configPath, configWithComments);

      const result = parseTypeScriptConfig(configPath);

      expect(result.compilerOptions).toEqual({
        strict: true,
        target: 'ES2020',
      });
    });

    it('should parse tsconfig.json with trailing commas', () => {
      const configPath = path.join(tempDir, 'tsconfig.json');
      const configWithTrailingCommas = `{
  "compilerOptions": {
    "strict": true,
    "target": "ES2020",
  },
}`;
      writeFileSync(configPath, configWithTrailingCommas);

      const result = parseTypeScriptConfig(configPath);

      expect(result.compilerOptions).toEqual({
        strict: true,
        target: 'ES2020',
      });
    });

    it('should throw error for non-existent config', () => {
      const configPath = path.join(tempDir, 'missing.json');

      expect(() => parseTypeScriptConfig(configPath)).toThrow(
        'TypeScript config not found',
      );
    });

    it('should throw error for invalid JSON', () => {
      const configPath = path.join(tempDir, 'tsconfig.json');
      writeFileSync(configPath, 'invalid json {}}');

      expect(() => parseTypeScriptConfig(configPath)).toThrow(
        'Failed to read tsconfig.json',
      );
    });
  });

  describe('shouldIncludeJavaScript', () => {
    it('should return true when allowJs is enabled', () => {
      const config = {
        compilerOptions: {
          allowJs: true,
        },
      };

      expect(shouldIncludeJavaScript(config)).toBe(true);
    });

    it('should return true when checkJs is enabled', () => {
      const config = {
        compilerOptions: {
          checkJs: true,
        },
      };

      expect(shouldIncludeJavaScript(config)).toBe(true);
    });

    it('should return true when both allowJs and checkJs are enabled', () => {
      const config = {
        compilerOptions: {
          allowJs: true,
          checkJs: true,
        },
      };

      expect(shouldIncludeJavaScript(config)).toBe(true);
    });

    it('should return false when neither allowJs nor checkJs are enabled', () => {
      const config = {
        compilerOptions: {
          strict: true,
        },
      };

      expect(shouldIncludeJavaScript(config)).toBe(false);
    });

    it('should return false when compilerOptions is missing', () => {
      const config = {};

      expect(shouldIncludeJavaScript(config)).toBe(false);
    });
  });

  describe('shouldIncludeJavaScriptFiles', () => {
    it('should return true when config has allowJs', () => {
      const configPath = path.join(tempDir, 'tsconfig.json');
      writeFileSync(
        configPath,
        JSON.stringify({ compilerOptions: { allowJs: true } }),
      );

      expect(shouldIncludeJavaScriptFiles(configPath)).toBe(true);
    });

    it('should return false for non-existent config', () => {
      const configPath = path.join(tempDir, 'missing.json');

      expect(shouldIncludeJavaScriptFiles(configPath)).toBe(false);
    });

    it('should return false when config path is undefined', () => {
      expect(shouldIncludeJavaScriptFiles()).toBe(false);
    });

    it('should return false for invalid JSON', () => {
      const configPath = path.join(tempDir, 'tsconfig.json');
      writeFileSync(configPath, 'invalid json');

      expect(shouldIncludeJavaScriptFiles(configPath)).toBe(false);
    });
  });
});
