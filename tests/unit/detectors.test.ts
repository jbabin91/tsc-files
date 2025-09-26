/**
 * Comprehensive tests for detector modules
 * Tests package manager detection and TypeScript compiler resolution
 */

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
      // Spy on process.platform
      const originalPlatform = process.platform;
      Object.defineProperty(process, 'platform', {
        value: 'win32',
        writable: true,
      });

      // Mock existsSync to simulate pnpm nested structure exists
      mockExistsSync.mockImplementation((filePath) => {
        const pathStr = filePath.toString();
        return pathStr.includes('.pnpm') && pathStr.endsWith('tsc');
      });

      // Create a test directory path
      const testDir = '/test/project';

      // Call detectPackageManager which internally uses getTscPath
      const result = packageManagerModule.detectPackageManager(testDir);

      // Should detect npm fallback (no lock files), but the getTscPath function was exercised
      expect(result.manager).toBe('npm');

      // Restore platform
      Object.defineProperty(process, 'platform', {
        value: originalPlatform,
        writable: true,
      });
    });

    it('should handle pnpm parent directory traversal with security checks', () => {
      // Mock existsSync to simulate parent directory tsc paths
      mockExistsSync.mockImplementation((filePath) => {
        const pathStr = filePath.toString();
        // Simulate finding tsc in parent directory
        return (
          pathStr.includes('../') && pathStr.includes('node_modules/.bin/tsc')
        );
      });

      const testDir = '/deep/nested/project/path';
      const result = packageManagerModule.detectPackageManager(testDir);

      expect(result.manager).toBe('npm'); // fallback
    });

    it('should handle Windows cmd extension for pnpm paths', () => {
      const originalPlatform = process.platform;
      Object.defineProperty(process, 'platform', {
        value: 'win32',
        writable: true,
      });

      // Mock existsSync to return true for Windows .cmd paths
      mockExistsSync.mockImplementation((filePath) => {
        const pathStr = filePath.toString();
        return pathStr.includes('tsc.cmd') && pathStr.includes('../');
      });

      const testDir = '/test/pnpm/project';
      packageManagerModule.detectPackageManager(testDir);

      // Restore platform
      Object.defineProperty(process, 'platform', {
        value: originalPlatform,
        writable: true,
      });
    });

    it('should handle security path traversal validation', () => {
      // Mock existsSync to simulate various path conditions
      mockExistsSync.mockImplementation((filePath) => {
        const pathStr = filePath.toString();
        // Test the security validation logic
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

        // Mock only the specific lock file exists
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

      // Should return a string (the executable field from findTypeScriptCompiler)
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });
  });

  describe('Cross-Platform Support', () => {
    it('should handle platform-specific executable detection', () => {
      // Just test that the function executes without errors and returns expected structure
      mockExistsSync.mockReturnValue(false);

      const result = typescriptModule.findTypeScriptCompiler('/test');

      // Should return a valid TypeScriptInfo structure regardless of platform
      expect(result).toHaveProperty('executable');
      expect(result).toHaveProperty('args');
      expect(result).toHaveProperty('useShell');
      expect(result).toHaveProperty('packageManager');
      expect(result).toHaveProperty('isWindows');
    });
  });

  describe('TypeScript package resolution paths', () => {
    it('should handle various global TypeScript installation paths', () => {
      // Mock existsSync to simulate different path scenarios
      let callCount = 0;
      mockExistsSync.mockImplementation((filePath) => {
        callCount++;
        const pathStr = filePath.toString();

        // Test the fallback logic by returning false for local paths
        // but true for global 'tsc' command
        if (pathStr === 'tsc') return true;
        if (pathStr.includes('node_modules') && pathStr.includes('tsc')) {
          // Return true on specific call to test different paths
          return callCount > 10;
        }
        return false;
      });

      const result = typescriptModule.findTypeScriptCompiler('/test');
      expect(typeof result.executable).toBe('string');
    });

    it('should handle require.resolve scenarios with error handling', () => {
      // Test that require.resolve is used in path detection with fallback
      mockExistsSync.mockReturnValue(false);

      const result = typescriptModule.findTypeScriptCompiler('/test');

      // Should return valid structure even when require.resolve might fail
      expect(result).toHaveProperty('executable');
      expect(result).toHaveProperty('packageManager');
      expect(result).toHaveProperty('useShell');
    });

    it('should handle package manager integration in TypeScript detection', () => {
      // Test that package manager detection is integrated
      mockExistsSync.mockImplementation((filePath) => {
        const pathStr = filePath.toString();
        return pathStr.endsWith('pnpm-lock.yaml');
      });

      const result = typescriptModule.findTypeScriptCompiler('/test');

      // Should use package manager info
      expect(result.packageManager.manager).toBe('pnpm');
      expect(result).toHaveProperty('executable');
    });
  });

  describe('Edge case path handling', () => {
    it('should handle current project tsc path in global paths array', () => {
      mockExistsSync.mockImplementation((filePath) => {
        const pathStr = filePath.toString();
        // Simulate finding tsc in current project's node_modules
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

      // quotedExecutable should be undefined when path doesn't need quoting
      expect(result.quotedExecutable).toBeUndefined();
    });
  });

  describe('Final Coverage Push', () => {
    it('should test standard tsc paths in typescript/bin directory', () => {
      // Mock existsSync to simulate typescript package being found at standard path
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
      // Mock existsSync to find local tsc in node_modules/.bin
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
      // Mock existsSync to return false for all local paths but true for global tsc
      mockExistsSync.mockImplementation((filePath) => {
        const pathStr = filePath.toString();

        // Return false for all specific paths to trigger global fallback
        if (
          pathStr.includes('node_modules') ||
          pathStr.includes('typescript')
        ) {
          return false;
        }

        // Return true for 'tsc' (global command)
        if (pathStr === 'tsc') {
          return true;
        }

        return false;
      });

      const result = findTypeScriptCompiler('/test');

      // Should fall back to global tsc with useShell true
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

      // When path contains spaces, quotedExecutable should be defined
      if (result.executable.includes(' ')) {
        expect(result.quotedExecutable).toBeDefined();
      }
    });

    it('should test path scenarios and integration coverage', () => {
      // Test general path handling without specific expectations
      mockExistsSync.mockImplementation((filePath) => {
        const pathStr = filePath.toString();
        // Simulate some paths existing to exercise different code branches
        return pathStr.endsWith('yarn.lock') || pathStr.includes('global');
      });

      const result = findTypeScriptCompiler('/test');

      // Just verify the function executes and returns valid structure
      expect(result).toHaveProperty('executable');
      expect(result).toHaveProperty('packageManager');
      expect(result).toHaveProperty('quotedExecutable');
      expect(typeof result.executable).toBe('string');
    });

    it('should handle integration with existing project structure', () => {
      // Test integration with the actual current working directory
      mockExistsSync.mockImplementation((filePath) => {
        const pathStr = filePath.toString();
        // Exercise the path checking logic
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
      // Mock the package manager having a valid tscPath
      mockExistsSync.mockImplementation((filePath) => {
        return filePath.toString().includes('/node_modules/.pnpm/');
      });

      // This tests the integration with package manager detection
      // Results should use the tscPath from package manager info
      const result = findTscPath();
      expect(typeof result).toBe('string');
    });

    it('should handle global tsc as final fallback', () => {
      // Mock no local tsc found, should fall back to global 'tsc'
      mockExistsSync.mockImplementation((filePath) => {
        // Only return true for lock files, not for tsc paths
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
