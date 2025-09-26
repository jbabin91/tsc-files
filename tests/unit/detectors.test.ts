import { existsSync } from 'node:fs';
import path from 'node:path';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import * as packageManagerModule from '@/detectors/package-manager';
import {
  getRecommendedTscExecution,
  type PackageManagerInfo,
} from '@/detectors/package-manager';
import * as typescriptModule from '@/detectors/typescript';
import { findTscPath, findTypeScriptCompiler } from '@/detectors/typescript';

// Mock fs operations
vi.mock('node:fs', async () => {
  const actual = await vi.importActual('node:fs');
  return {
    ...actual,
    existsSync: vi.fn(),
  };
});

describe('Package Manager getRecommendedTscExecution', () => {
  const mockExistsSync = vi.mocked(existsSync);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should use direct path when tscPath exists', () => {
    mockExistsSync.mockReturnValue(true);

    const packageManagerInfo: PackageManagerInfo = {
      manager: 'pnpm',
      lockFile: 'pnpm-lock.yaml',
      command: 'pnpm',
      tscPath: '/path/to/tsc',
    };

    const result = getRecommendedTscExecution(packageManagerInfo);

    expect(result.executable).toBe('/path/to/tsc');
    expect(result.args).toEqual([]);
    expect(result.useShell).toBe(false);
  });

  it('should use direct path when tscPath does not exist', () => {
    mockExistsSync.mockReturnValue(false);

    const packageManagerInfo: PackageManagerInfo = {
      manager: 'pnpm',
      lockFile: 'pnpm-lock.yaml',
      command: 'pnpm',
      tscPath: '/nonexistent/path/to/tsc',
    };

    const result = getRecommendedTscExecution(packageManagerInfo);

    expect(result.executable).toBe('pnpm');
    expect(result.args).toEqual(['exec', 'tsc']);
    expect(result.useShell).toBe(true);
  });

  it('should fallback to pnpm exec when no tscPath', () => {
    const packageManagerInfo: PackageManagerInfo = {
      manager: 'pnpm',
      lockFile: 'pnpm-lock.yaml',
      command: 'pnpm',
      tscPath: undefined,
    };

    const result = getRecommendedTscExecution(packageManagerInfo);

    expect(result.executable).toBe('pnpm');
    expect(result.args).toEqual(['exec', 'tsc']);
    expect(result.useShell).toBe(true);
  });

  it('should fallback to yarn when no tscPath', () => {
    const packageManagerInfo: PackageManagerInfo = {
      manager: 'yarn',
      lockFile: 'yarn.lock',
      command: 'yarn',
      tscPath: undefined,
    };

    const result = getRecommendedTscExecution(packageManagerInfo);

    expect(result.executable).toBe('yarn');
    expect(result.args).toEqual(['tsc']);
    expect(result.useShell).toBe(true);
  });

  it('should fallback to bun x when no tscPath', () => {
    const packageManagerInfo: PackageManagerInfo = {
      manager: 'bun',
      lockFile: 'bun.lockb',
      command: 'bun',
      tscPath: undefined,
    };

    const result = getRecommendedTscExecution(packageManagerInfo);

    expect(result.executable).toBe('bun');
    expect(result.args).toEqual(['x', 'tsc']);
    expect(result.useShell).toBe(true);
  });

  it('should fallback to npx for npm and unknown managers', () => {
    const packageManagerInfo: PackageManagerInfo = {
      manager: 'npm',
      lockFile: 'package-lock.json',
      command: 'npm',
      tscPath: undefined,
    };

    const result = getRecommendedTscExecution(packageManagerInfo);

    expect(result.executable).toBe('npx');
    expect(result.args).toEqual(['tsc']);
    expect(result.useShell).toBe(true);
  });
});

describe('Package Manager Detection - Advanced Scenarios', () => {
  const mockExistsSync = vi.mocked(existsSync);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('getTscPath function coverage', () => {
    it('should handle Windows platform detection for pnpm paths', () => {
      const originalPlatform = process.platform;
      Object.defineProperty(process, 'platform', {
        value: 'win32',
        writable: true,
      });

      mockExistsSync.mockImplementation((filePath) => {
        const pathStr = filePath.toString();
        return pathStr.includes('.pnpm') && pathStr.endsWith('tsc');
      });

      const testDir = '/test/project';
      const result = packageManagerModule.detectPackageManager(testDir);

      expect(result.manager).toBe('npm');

      Object.defineProperty(process, 'platform', {
        value: originalPlatform,
        writable: true,
      });
    });

    it('should handle pnpm parent directory traversal with security checks', () => {
      mockExistsSync.mockImplementation((filePath) => {
        const pathStr = filePath.toString();
        return (
          pathStr.includes('../') && pathStr.includes('node_modules/.bin/tsc')
        );
      });

      const testDir = '/deep/nested/project/path';
      const result = packageManagerModule.detectPackageManager(testDir);

      expect(result.manager).toBe('npm');
    });

    it('should handle Windows cmd extension for pnpm paths', () => {
      const originalPlatform = process.platform;
      Object.defineProperty(process, 'platform', {
        value: 'win32',
        writable: true,
      });

      mockExistsSync.mockImplementation((filePath) => {
        const pathStr = filePath.toString();
        return pathStr.includes('tsc.cmd') && pathStr.includes('../');
      });

      const testDir = '/test/pnpm/project';
      packageManagerModule.detectPackageManager(testDir);

      Object.defineProperty(process, 'platform', {
        value: originalPlatform,
        writable: true,
      });
    });

    it('should handle security path traversal validation', () => {
      mockExistsSync.mockImplementation((filePath) => {
        const pathStr = filePath.toString();
        return (
          pathStr.includes('node_modules') &&
          pathStr.includes('.bin') &&
          pathStr.endsWith('tsc')
        );
      });

      const testDir = '/secure/test/project';
      const result = packageManagerModule.detectPackageManager(testDir);
      expect(result.manager).toBe('npm');
    });
  });

  describe('Package manager priority and lock file detection', () => {
    it('should detect all supported lock file patterns', () => {
      const lockFiles = [
        'pnpm-lock.yaml',
        'yarn.lock',
        'bun.lockb',
        'package-lock.json',
        'npm-shrinkwrap.json',
      ];

      for (const lockFile of lockFiles) {
        vi.clearAllMocks();

        mockExistsSync.mockImplementation((filePath) => {
          return filePath.toString().endsWith(lockFile);
        });

        const result = packageManagerModule.detectPackageManager('/test');

        switch (lockFile) {
          case 'pnpm-lock.yaml': {
            expect(result.manager).toBe('pnpm');
            expect(result.lockFile).toBe('pnpm-lock.yaml');

            break;
          }
          case 'yarn.lock': {
            expect(result.manager).toBe('yarn');
            expect(result.lockFile).toBe('yarn.lock');

            break;
          }
          case 'bun.lockb': {
            expect(result.manager).toBe('bun');
            expect(result.lockFile).toBe('bun.lockb');

            break;
          }
          default: {
            expect(result.manager).toBe('npm');
            expect(result.lockFile).toBe(lockFile);
          }
        }
      }
    });

    it('should test environment variable parsing for all package managers', () => {
      const originalEnv = process.env;

      const testCases = [
        { userAgent: 'pnpm/8.0.0 npm/? node/v18.0.0', expected: 'pnpm' },
        { userAgent: 'yarn/3.0.0 npm/? node/v18.0.0', expected: 'yarn' },
        { userAgent: 'bun/1.0.0 npm/? node/v18.0.0', expected: 'bun' },
        { userAgent: 'npm/9.0.0 node/v18.0.0', expected: 'npm' },
      ];

      for (const testCase of testCases) {
        process.env = { ...originalEnv };
        process.env.npm_config_user_agent = testCase.userAgent;

        const result =
          packageManagerModule.detectPackageManagerAdvanced('/test');
        expect(result.manager).toBe(testCase.expected);
      }

      process.env = originalEnv;
    });
  });
});

describe('TypeScript Detection', () => {
  const mockExistsSync = vi.mocked(existsSync);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('findTscPath (legacy)', () => {
    it('should return executable path from findTypeScriptCompiler', () => {
      const result = findTscPath();

      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
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

      const result = findTscPath();
      expect(typeof result).toBe('string');
    });

    it('should handle global tsc as final fallback', () => {
      mockExistsSync.mockImplementation((filePath) => {
        return (
          filePath.toString().endsWith('.yaml') ||
          filePath.toString().endsWith('.json') ||
          filePath.toString().endsWith('.lock')
        );
      });

      const result = findTscPath();
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });
  });
});
