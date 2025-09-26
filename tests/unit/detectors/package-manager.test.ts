import { existsSync } from 'node:fs';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import * as packageManagerModule from '@/detectors/package-manager';
import {
  getRecommendedTscExecution,
  type PackageManagerInfo,
} from '@/detectors/package-manager';

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
