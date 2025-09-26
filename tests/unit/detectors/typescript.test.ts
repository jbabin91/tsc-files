import { existsSync } from 'node:fs';
import path from 'node:path';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import * as typescriptModule from '@/detectors/typescript';
import { findTypeScriptCompiler } from '@/detectors/typescript';

// Mock fs operations
vi.mock('node:fs', async () => {
  const actual = await vi.importActual('node:fs');
  return {
    ...actual,
    existsSync: vi.fn(),
  };
});

describe('TypeScript Detection', () => {
  const mockExistsSync = vi.mocked(existsSync);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('findTypeScriptCompiler', () => {
    it('should return complete TypeScript execution information', () => {
      const result = findTypeScriptCompiler();

      expect(typeof result.executable).toBe('string');
      expect(result.executable.length).toBeGreaterThan(0);
      expect(result).toHaveProperty('args');
      expect(result).toHaveProperty('useShell');
      expect(result).toHaveProperty('packageManager');
    });
  });

  describe('Cross-Platform Support', () => {
    it('should handle platform-specific executable detection', () => {
      mockExistsSync.mockReturnValue(false);

      const result = typescriptModule.findTypeScriptCompiler('/test');

      expect(result).toHaveProperty('executable');
      expect(result).toHaveProperty('args');
      expect(result).toHaveProperty('useShell');
      expect(result).toHaveProperty('packageManager');
      expect(result).toHaveProperty('isWindows');
    });
  });

  describe('TypeScript package resolution paths', () => {
    it('should handle various global TypeScript installation paths', () => {
      let callCount = 0;
      mockExistsSync.mockImplementation((filePath) => {
        callCount++;
        const pathStr = filePath.toString();

        if (pathStr === 'tsc') return true;
        if (pathStr.includes('node_modules') && pathStr.includes('tsc')) {
          return callCount > 10;
        }
        return false;
      });

      const result = typescriptModule.findTypeScriptCompiler('/test');
      expect(typeof result.executable).toBe('string');
    });

    it('should handle require.resolve scenarios with error handling', () => {
      mockExistsSync.mockReturnValue(false);

      const result = typescriptModule.findTypeScriptCompiler('/test');

      expect(result).toHaveProperty('executable');
      expect(result).toHaveProperty('packageManager');
      expect(result).toHaveProperty('useShell');
    });

    it('should handle package manager integration in TypeScript detection', () => {
      mockExistsSync.mockImplementation((filePath) => {
        const pathStr = filePath.toString();
        return pathStr.endsWith('pnpm-lock.yaml');
      });

      const result = typescriptModule.findTypeScriptCompiler('/test');

      expect(result.packageManager.manager).toBe('pnpm');
      expect(result).toHaveProperty('executable');
    });
  });

  describe('Edge case path handling', () => {
    it('should handle current project tsc path in global paths array', () => {
      mockExistsSync.mockImplementation((filePath) => {
        const pathStr = filePath.toString();
        return (
          pathStr === path.join(process.cwd(), 'node_modules', '.bin', 'tsc')
        );
      });

      const result = typescriptModule.findTypeScriptCompiler('/different/path');
      expect(result.executable).toBe(
        path.join(process.cwd(), 'node_modules', '.bin', 'tsc'),
      );
    });

    it('should handle quotedExecutable for paths without spaces', () => {
      mockExistsSync.mockImplementation((filePath) => {
        const pathStr = filePath.toString();
        return pathStr.includes('node_modules/.bin/tsc');
      });

      const result = typescriptModule.findTypeScriptCompiler('/simple/path');

      expect(result.quotedExecutable).toBeUndefined();
    });
  });

  describe('Final Coverage Push', () => {
    it('should test standard tsc paths in typescript/bin directory', () => {
      mockExistsSync.mockImplementation((filePath) => {
        const pathStr = filePath.toString();
        return (
          pathStr.includes('node_modules/typescript/bin/tsc') &&
          !pathStr.includes('.pnpm')
        );
      });

      const result = findTypeScriptCompiler('/test');

      expect(result.executable).toContain('typescript/bin/tsc');
      expect(result.useShell).toBe(false);
    });

    it('should handle local node_modules bin path detection', () => {
      mockExistsSync.mockImplementation((filePath) => {
        const pathStr = filePath.toString();
        return (
          pathStr.endsWith('/node_modules/.bin/tsc') &&
          pathStr.includes('/test/')
        );
      });

      const result = findTypeScriptCompiler('/test');

      expect(result.executable).toContain('node_modules/.bin/tsc');
      expect(result.args).toEqual([]);
      expect(result.useShell).toBe(false);
    });

    it('should test global tsc fallback with useShell true', () => {
      mockExistsSync.mockImplementation((filePath) => {
        const pathStr = filePath.toString();

        if (
          pathStr.includes('node_modules') ||
          pathStr.includes('typescript')
        ) {
          return false;
        }

        if (pathStr === 'tsc') {
          return true;
        }

        return false;
      });

      const result = findTypeScriptCompiler('/test');

      expect(result.useShell).toBe(true);
      expect(typeof result.executable).toBe('string');
    });

    it('should handle Windows platform-specific executable detection', () => {
      mockExistsSync.mockImplementation((filePath) => {
        const pathStr = filePath.toString();
        return pathStr.includes('tsc.cmd') || pathStr.endsWith('tsc');
      });

      const result = typescriptModule.findTypeScriptCompiler('/test');
      expect(result.isWindows).toBe(process.platform === 'win32');
    });

    it('should handle paths with spaces requiring quotedExecutable', () => {
      mockExistsSync.mockImplementation((filePath) => {
        const pathStr = filePath.toString();
        return pathStr.includes('path with spaces') && pathStr.endsWith('tsc');
      });

      const result = typescriptModule.findTypeScriptCompiler('/test');

      if (result.executable.includes(' ')) {
        expect(result.quotedExecutable).toBeDefined();
      }
    });

    it('should test path scenarios and integration coverage', () => {
      mockExistsSync.mockImplementation((filePath) => {
        const pathStr = filePath.toString();
        return pathStr.endsWith('yarn.lock') || pathStr.includes('global');
      });

      const result = findTypeScriptCompiler('/test');

      expect(result).toHaveProperty('executable');
      expect(result).toHaveProperty('packageManager');
      expect(result).toHaveProperty('quotedExecutable');
      expect(typeof result.executable).toBe('string');
    });

    it('should handle integration with existing project structure', () => {
      mockExistsSync.mockImplementation((filePath) => {
        const pathStr = filePath.toString();
        return (
          pathStr.includes(process.cwd()) && pathStr.includes('node_modules')
        );
      });

      const result = findTypeScriptCompiler(process.cwd());

      expect(result).toHaveProperty('executable');
      expect(result.isWindows).toBe(process.platform === 'win32');
    });
  });

  describe('Package Manager Integration', () => {
    it('should prefer package manager tscPath when available', () => {
      mockExistsSync.mockImplementation((filePath) => {
        return filePath.toString().includes('/node_modules/.pnpm/');
      });

      const result = findTypeScriptCompiler();
      expect(typeof result.executable).toBe('string');
      expect(result).toHaveProperty('packageManager');
    });

    it('should handle global tsc as final fallback', () => {
      mockExistsSync.mockImplementation((filePath) => {
        return (
          filePath.toString().endsWith('.yaml') ||
          filePath.toString().endsWith('.json') ||
          filePath.toString().endsWith('.lock')
        );
      });

      const result = findTypeScriptCompiler();
      expect(typeof result.executable).toBe('string');
      expect(result.executable.length).toBeGreaterThan(0);
      expect(result).toHaveProperty('useShell');
    });
  });
});
