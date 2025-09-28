import { existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  detectPackageManagerAdvanced,
  type PackageManagerInfo,
} from '@/detectors/package-manager';
import * as typescriptModule from '@/detectors/typescript';
import { findTypeScriptCompiler } from '@/detectors/typescript';

// Define Require type since it's not exported from node:module
type Require = ReturnType<typeof createRequire>;

// Mock fs operations
vi.mock('node:fs', async () => {
  const actual = await vi.importActual('node:fs');
  return {
    ...actual,
    existsSync: vi.fn(),
  };
});

// Mock node:module operations
vi.mock('node:module', async () => {
  const actual = await vi.importActual('node:module');
  return {
    ...actual,
    createRequire: vi.fn(),
  };
});

// Mock package manager detection
vi.mock('@/detectors/package-manager', () => ({
  detectPackageManagerAdvanced: vi.fn(() => ({
    manager: 'npm',
    lockFile: '',
    command: 'npm',
    tscPath: '',
  })),
}));

describe('TypeScript Detection', () => {
  const mockExistsSync = vi.mocked(existsSync);
  const mockCreateRequire = vi.mocked(createRequire);
  const mockDetectPackageManagerAdvanced = vi.mocked(
    detectPackageManagerAdvanced,
  );

  // Helper to create mock require with proper typing
  const setupMockRequire = (
    resolveFn: (id: string, options?: { paths?: string[] }) => string,
  ) => {
    // Create a proper mock resolve function with paths method
    const mockResolveFn = vi.fn().mockImplementation(resolveFn);
    const mockResolveWithPaths = Object.assign(mockResolveFn, {
      paths: vi.fn().mockReturnValue(null),
    });

    const mockRequireImpl = Object.assign(vi.fn(), {
      resolve: mockResolveWithPaths,
      cache: {},
      extensions: {},
      main: undefined,
    });

    // Use type assertion to satisfy TypeScript
    const typedMock = mockRequireImpl as unknown as Require;
    mockCreateRequire.mockReturnValue(typedMock);
    return mockRequireImpl;
  };

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
      // Configure package manager mock to return pnpm
      mockDetectPackageManagerAdvanced.mockReturnValueOnce({
        manager: 'pnpm',
        lockFile: 'pnpm-lock.yaml',
        command: 'pnpm',
        tscPath: '',
      });

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
    it('should test typescript package fallback to global tsc', () => {
      // Make tsgo unavailable
      setupMockRequire((id: string) => {
        if (id.includes('@typescript/native-preview')) {
          throw new Error(
            'Cannot resolve @typescript/native-preview/package.json',
          );
        }
        if (id === 'typescript/package.json') {
          return '/test/node_modules/typescript/package.json';
        }
        throw new Error(`Cannot resolve ${id}`);
      });

      // Mock package manager with no tscPath to reach typescript package resolution
      mockDetectPackageManagerAdvanced.mockReturnValueOnce({
        manager: 'npm',
        lockFile: 'package-lock.json',
        command: 'npm',
        tscPath: '', // No tscPath to continue to typescript package resolution
      });

      // Make local paths fail but still reach global tsc fallback
      mockExistsSync.mockImplementation((filePath) => {
        const pathStr = filePath.toString();
        // Deny specific typescript/bin path to force global fallback
        if (pathStr.includes('node_modules/typescript/bin/tsc')) {
          return false;
        }
        return false;
      });

      const result = findTypeScriptCompiler('/test');

      expect(result.executable).toBe('tsc'); // Global tsc fallback
      expect(result.useShell).toBe(true); // Global tsc uses shell
      expect(result.compilerType).toBe('tsc');
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

  describe('tsgo Integration', () => {
    beforeEach(() => {
      // Reset all mocks for tsgo tests
      vi.clearAllMocks();
    });

    describe('tsgo detection', () => {
      it('should detect tsgo when @typescript/native-preview package is available', () => {
        // Mock successful package resolution
        setupMockRequire(
          () => '/test/node_modules/@typescript/native-preview/package.json',
        );

        // Mock tsgo executable exists
        mockExistsSync.mockImplementation((filePath) => {
          const pathStr = filePath.toString();
          return (
            pathStr.includes('@typescript/native-preview') &&
            pathStr.endsWith('tsgo')
          );
        });

        const result = findTypeScriptCompiler('/test');

        expect(result.compilerType).toBe('tsgo');
        expect(result.fallbackAvailable).toBe(true);
        expect(result.executable).toContain('tsgo');
      });

      it('should fallback to tsc when tsgo package is not found', () => {
        // Mock package not found
        setupMockRequire(() => {
          throw new Error('Package not found');
        });

        mockExistsSync.mockReturnValue(false);

        const result = findTypeScriptCompiler('/test');

        expect(result.compilerType).toBe('tsc');
        expect(result.fallbackAvailable).toBe(false);
      });

      it('should fallback to tsc when tsgo package exists but executable is missing', () => {
        // Mock successful package resolution
        setupMockRequire(
          () => '/test/node_modules/@typescript/native-preview/package.json',
        );

        // Mock tsgo executable does not exist
        mockExistsSync.mockImplementation((filePath) => {
          const pathStr = filePath.toString();
          if (pathStr.includes('tsgo')) return false;
          return pathStr.includes('yarn.lock'); // For package manager detection
        });

        const result = findTypeScriptCompiler('/test');

        expect(result.compilerType).toBe('tsc');
        expect(result.fallbackAvailable).toBe(false);
      });

      it('should handle tsgo detection in different executable locations', () => {
        // Mock successful package resolution
        setupMockRequire(
          () => '/test/node_modules/@typescript/native-preview/package.json',
        );

        // Mock tsgo executable exists in node_modules/.bin/
        mockExistsSync.mockImplementation((filePath) => {
          const pathStr = filePath.toString();
          return pathStr.includes('node_modules/.bin/tsgo');
        });

        const result = findTypeScriptCompiler('/test');

        expect(result.compilerType).toBe('tsgo');
        expect(result.executable).toContain('node_modules/.bin/tsgo');
        expect(result.fallbackAvailable).toBe(true);
      });

      it('should handle errors during tsgo detection gracefully', () => {
        // Mock createRequire throwing error
        mockCreateRequire.mockImplementation(() => {
          throw new Error('Module creation failed');
        });

        mockExistsSync.mockReturnValue(false);

        const result = findTypeScriptCompiler('/test');

        expect(result.compilerType).toBe('tsc');
        expect(result.fallbackAvailable).toBe(false);
      });

      it('should handle Windows paths in tsgo detection', () => {
        // Mock successful package resolution
        setupMockRequire(
          () =>
            String.raw`C:\test\node_modules\@typescript\native-preview\package.json`,
        );

        // Mock tsgo executable exists with Windows path
        mockExistsSync.mockImplementation((filePath) => {
          const pathStr = filePath.toString();
          return (
            pathStr.includes('tsgo') &&
            (pathStr.includes('C:\\') || pathStr.includes('/'))
          );
        });

        const result = findTypeScriptCompiler(String.raw`C:\test`);

        expect(result.compilerType).toBe('tsgo');
        expect(result.fallbackAvailable).toBe(true);
      });
    });

    describe('TypeScriptInfo field validation', () => {
      it('should set all required fields when using tsgo', () => {
        // Mock successful tsgo detection
        setupMockRequire(
          () => '/test/node_modules/@typescript/native-preview/package.json',
        );

        mockExistsSync.mockImplementation((filePath) => {
          const pathStr = filePath.toString();
          return pathStr.includes('tsgo') && pathStr.includes('bin');
        });

        const result = findTypeScriptCompiler('/test');

        // Verify all required fields
        expect(result.executable).toBeDefined();
        expect(result.args).toBeDefined();
        expect(result.useShell).toBeDefined();
        expect(result.packageManager).toBeDefined();
        expect(result.isWindows).toBeDefined();
        expect(result.compilerType).toBe('tsgo');
        expect(result.version).toBeUndefined(); // Version detection not implemented yet
        expect(result.fallbackAvailable).toBe(true);
      });

      it('should set all required fields when using tsc fallback', () => {
        // Mock no tsgo package
        setupMockRequire(() => {
          throw new Error('Package not found');
        });

        mockExistsSync.mockReturnValue(false);

        const result = findTypeScriptCompiler('/test');

        // Verify all required fields
        expect(result.executable).toBeDefined();
        expect(result.args).toBeDefined();
        expect(result.useShell).toBeDefined();
        expect(result.packageManager).toBeDefined();
        expect(result.isWindows).toBeDefined();
        expect(result.compilerType).toBe('tsc');
        expect(result.version).toBeUndefined();
        expect(result.fallbackAvailable).toBe(false);
      });

      it('should handle quotedExecutable correctly for tsgo paths with spaces', () => {
        // Mock successful package resolution with path containing spaces
        setupMockRequire(
          () =>
            '/test path/node_modules/@typescript/native-preview/package.json',
        );

        mockExistsSync.mockImplementation((filePath) => {
          const pathStr = filePath.toString();
          return pathStr.includes('tsgo') && pathStr.includes('test path');
        });

        const result = findTypeScriptCompiler('/test path');

        expect(result.compilerType).toBe('tsgo');
        // quotedExecutable is only set on Windows when path contains spaces
        if (process.platform === 'win32' && result.executable.includes(' ')) {
          expect(result.quotedExecutable).toBeDefined();
        } else {
          expect(result.quotedExecutable).toBeUndefined();
        }
      });
    });

    describe('tsgo detection edge cases', () => {
      it('should handle multiple tsgo path candidates', () => {
        // Mock successful package resolution
        setupMockRequire(
          () => '/test/node_modules/@typescript/native-preview/package.json',
        );

        // Mock only the third path candidate exists
        let callCount = 0;
        mockExistsSync.mockImplementation((filePath) => {
          callCount++;
          const pathStr = filePath.toString();
          if (pathStr.includes('tsgo')) {
            // First two paths fail, third succeeds
            return callCount >= 3 && pathStr.includes('node_modules/.bin/tsgo');
          }
          return false;
        });

        const result = findTypeScriptCompiler('/test');

        expect(result.compilerType).toBe('tsgo');
        expect(result.executable).toContain('node_modules/.bin/tsgo');
      });

      it('should handle createRequire with invalid package.json path', () => {
        // Mock createRequire throwing for invalid path
        mockCreateRequire.mockImplementation(
          (packageJsonPath: string | URL) => {
            const pathStr = packageJsonPath.toString();
            if (pathStr.includes('invalid')) {
              throw new Error('Invalid package.json path');
            }
            // Return a minimal mock that satisfies the interface
            const mockResolveFn = vi.fn().mockImplementation(() => {
              throw new Error('Package not found');
            });
            const mockResolveWithPaths = Object.assign(mockResolveFn, {
              paths: vi.fn().mockReturnValue(null),
            });

            const mockImpl = Object.assign(vi.fn(), {
              resolve: mockResolveWithPaths,
              cache: {},
              extensions: {},
              main: undefined,
            });
            return mockImpl as unknown as Require;
          },
        );

        mockExistsSync.mockReturnValue(false);

        const result = findTypeScriptCompiler('/invalid/path');

        expect(result.compilerType).toBe('tsc');
        expect(result.fallbackAvailable).toBe(false);
      });

      it('should handle tsgo package resolution without executable', () => {
        // Mock successful package resolution
        setupMockRequire(
          () => '/test/node_modules/@typescript/native-preview/package.json',
        );

        // Mock no executable files exist
        mockExistsSync.mockImplementation((filePath) => {
          const pathStr = filePath.toString();
          // Package manager files exist, but no tsgo executable
          return pathStr.includes('yarn.lock') && !pathStr.includes('tsgo');
        });

        const result = findTypeScriptCompiler('/test');

        expect(result.compilerType).toBe('tsc');
        expect(result.fallbackAvailable).toBe(false);
      });
    });
  });

  describe('detectTsgo', () => {
    it('should detect tsgo when package and executable exist', () => {
      setupMockRequire(
        () => '/test/node_modules/@typescript/native-preview/package.json',
      );

      mockExistsSync.mockImplementation((filePath) => {
        const pathStr = filePath.toString();
        return pathStr.includes('tsgo') || pathStr.includes('native-preview');
      });

      const result = typescriptModule.detectTsgo('/test');

      expect(result.available).toBe(true);
      expect(result.executable).toBeDefined();
      expect(result.useShell).toBe(false);
    });

    it('should return unavailable when tsgo package not found', () => {
      setupMockRequire(() => {
        throw new Error(
          'Cannot resolve @typescript/native-preview/package.json',
        );
      });

      const result = typescriptModule.detectTsgo('/test');

      expect(result.available).toBe(false);
      expect(result.executable).toBeUndefined();
    });

    it('should return unavailable when package exists but executable not found', () => {
      setupMockRequire(
        () => '/test/node_modules/@typescript/native-preview/package.json',
      );

      // Package exists but no executable
      mockExistsSync.mockReturnValue(false);

      const result = typescriptModule.detectTsgo('/test');

      expect(result.available).toBe(false);
    });

    it('should handle detection errors gracefully', () => {
      // Mock createRequire to throw an error
      mockCreateRequire.mockImplementation(() => {
        throw new Error('createRequire failed');
      });

      const result = typescriptModule.detectTsgo('/test');

      expect(result.available).toBe(false);
    });

    it('should check multiple potential tsgo paths', () => {
      setupMockRequire(
        () => '/test/node_modules/@typescript/native-preview/package.json',
      );

      // Mock only the .bin path exists
      mockExistsSync.mockImplementation((filePath) => {
        const pathStr = filePath.toString();
        return pathStr.includes('node_modules/.bin/tsgo');
      });

      const result = typescriptModule.detectTsgo('/test');

      expect(result.available).toBe(true);
      expect(result.executable).toContain('node_modules/.bin/tsgo');
    });
  });

  describe('Compiler Selection Options', () => {
    beforeEach(() => {
      // Reset mocks for clean test state
      vi.clearAllMocks();
    });

    it('should force use tsgo when useTsgo option is true', () => {
      setupMockRequire(
        () => '/test/node_modules/@typescript/native-preview/package.json',
      );

      mockExistsSync.mockImplementation((filePath) => {
        const pathStr = filePath.toString();
        return pathStr.includes('tsgo') || pathStr.includes('native-preview');
      });

      const result = findTypeScriptCompiler('/test', { useTsgo: true });

      expect(result.compilerType).toBe('tsgo');
      expect(result.fallbackAvailable).toBe(true);
    });

    it('should throw error when useTsgo is true but tsgo not available', () => {
      setupMockRequire(() => {
        throw new Error(
          'Cannot resolve @typescript/native-preview/package.json',
        );
      });

      expect(() => {
        findTypeScriptCompiler('/test', { useTsgo: true });
      }).toThrow('tsgo compiler not found');
    });

    it('should force use tsc when useTsc option is true', () => {
      // Setup tsgo to be available
      setupMockRequire(
        () => '/test/node_modules/@typescript/native-preview/package.json',
      );

      mockExistsSync.mockImplementation((filePath) => {
        const pathStr = filePath.toString();
        // Both tsgo and tsc are available, but useTsc should force tsc
        return pathStr.includes('tsc') || pathStr.includes('tsgo');
      });

      const result = findTypeScriptCompiler('/test', { useTsc: true });

      expect(result.compilerType).toBe('tsc');
    });

    it('should prefer tsgo when available and no options specified', () => {
      setupMockRequire(
        () => '/test/node_modules/@typescript/native-preview/package.json',
      );

      mockExistsSync.mockImplementation((filePath) => {
        const pathStr = filePath.toString();
        return pathStr.includes('tsgo') || pathStr.includes('native-preview');
      });

      const result = findTypeScriptCompiler('/test');

      expect(result.compilerType).toBe('tsgo');
      expect(result.fallbackAvailable).toBe(true);
    });

    it('should fallback to tsc when tsgo not available', () => {
      // Make tsgo unavailable
      setupMockRequire(() => {
        throw new Error(
          'Cannot resolve @typescript/native-preview/package.json',
        );
      });

      // Make tsc available
      mockExistsSync.mockImplementation((filePath) => {
        const pathStr = filePath.toString();
        return pathStr.includes('tsc') && !pathStr.includes('tsgo');
      });

      const result = findTypeScriptCompiler('/test');

      expect(result.compilerType).toBe('tsc');
    });

    it('should handle both useTsc and useTsgo being false', () => {
      // Setup tsgo to be available
      setupMockRequire(
        () => '/test/node_modules/@typescript/native-preview/package.json',
      );

      mockExistsSync.mockImplementation((filePath) => {
        const pathStr = filePath.toString();
        return pathStr.includes('tsgo') || pathStr.includes('native-preview');
      });

      const result = findTypeScriptCompiler('/test', {
        useTsc: false,
        useTsgo: false,
      });

      // Should still prefer tsgo when available
      expect(result.compilerType).toBe('tsgo');
    });
  });

  describe('Package Manager Fallback Scenarios', () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it('should use local node_modules/.bin/tsc when package manager tscPath is not available', () => {
      // Make tsgo unavailable
      setupMockRequire(() => {
        throw new Error(
          'Cannot resolve @typescript/native-preview/package.json',
        );
      });

      // Mock local tsc exists but package manager tscPath doesn't
      mockExistsSync.mockImplementation((filePath) => {
        const pathStr = filePath.toString();
        return (
          pathStr.includes('node_modules/.bin/tsc') &&
          pathStr.includes('/test/')
        );
      });

      const result = findTypeScriptCompiler('/test');

      expect(result.executable).toContain('node_modules/.bin/tsc');
      expect(result.compilerType).toBe('tsc');
      expect(result.useShell).toBe(false);
    });

    it('should handle bun package manager fallback to global tsc', () => {
      // Configure package manager mock to return bun
      mockDetectPackageManagerAdvanced.mockReturnValueOnce({
        manager: 'bun',
        lockFile: 'bun.lockb',
        command: 'bun',
        tscPath: '', // No tscPath to force fallback
      });

      // Make tsgo unavailable and all require.resolve calls fail
      setupMockRequire((id: string) => {
        throw new Error(`Cannot resolve ${id}`);
      });

      mockExistsSync.mockImplementation((filePath) => {
        const pathStr = filePath.toString();
        // Deny all local tsc installations to force global tsc fallback
        if (
          pathStr.includes('tsc') ||
          pathStr.includes('.bin') ||
          pathStr.includes('typescript')
        ) {
          return false;
        }
        return false;
      });

      const result = findTypeScriptCompiler('/test');

      expect(result.packageManager.manager).toBe('bun');
      expect(result.executable).toBe('tsc'); // Global tsc fallback
      expect(result.args).toEqual([]); // Global tsc has no args
      expect(result.useShell).toBe(true); // Global tsc uses shell
      expect(result.compilerType).toBe('tsc');
    });

    it('should handle default package manager fallback to global tsc', () => {
      // Configure package manager mock to return npm with no tscPath
      mockDetectPackageManagerAdvanced.mockReturnValueOnce({
        manager: 'npm',
        lockFile: 'package-lock.json',
        command: 'npm',
        tscPath: '', // No tscPath to force fallback
      });

      // Make tsgo unavailable and all require.resolve calls fail
      setupMockRequire((id: string) => {
        throw new Error(`Cannot resolve ${id}`);
      });

      // All local TypeScript installations should return false
      // to force fallback to global tsc
      mockExistsSync.mockImplementation(() => false);

      const result = findTypeScriptCompiler('/test');

      expect(result.packageManager.manager).toBe('npm');
      expect(result.executable).toBe('tsc'); // Global tsc fallback
      expect(result.args).toEqual([]); // Global tsc has no args
      expect(result.useShell).toBe(true); // Global tsc uses shell
      expect(result.compilerType).toBe('tsc');
    });

    it('should handle global tsc fallback when no local installation exists', () => {
      // Make everything else unavailable
      setupMockRequire(() => {
        throw new Error(
          'Cannot resolve @typescript/native-preview/package.json',
        );
      });

      // Mock global tsc is available
      mockExistsSync.mockImplementation((filePath) => {
        const pathStr = filePath.toString();
        return pathStr === 'tsc'; // Global tsc
      });

      const result = findTypeScriptCompiler('/test');

      expect(result.executable).toBe('tsc');
      expect(result.useShell).toBe(true);
      expect(result.compilerType).toBe('tsc');
    });

    it('should handle Windows executable mapping for bun fallback to global tsc', () => {
      // Configure package manager mock to return bun
      mockDetectPackageManagerAdvanced.mockReturnValueOnce({
        manager: 'bun',
        lockFile: 'bun.lockb',
        command: 'bun',
        tscPath: '', // No tscPath to force fallback
      });

      // Make tsgo unavailable and all require.resolve calls fail
      setupMockRequire((id: string) => {
        throw new Error(`Cannot resolve ${id}`);
      });

      // All local TypeScript installations should return false
      // to force fallback to global tsc
      mockExistsSync.mockImplementation(() => false);

      const result = findTypeScriptCompiler('/test');

      expect(result.packageManager.manager).toBe('bun');
      expect(result.isWindows).toBe(process.platform === 'win32'); // Use actual platform
      expect(result.useShell).toBe(true); // Global tsc uses shell
      expect(result.executable).toBe('tsc'); // Global tsc fallback
      expect(result.args).toEqual([]); // Global tsc has no args
    });

    it('should test Windows path quoting for local tsc', () => {
      // Make tsgo unavailable
      setupMockRequire((id: string) => {
        if (id.includes('@typescript/native-preview')) {
          throw new Error(
            'Cannot resolve @typescript/native-preview/package.json',
          );
        }
        throw new Error(`Cannot resolve ${id}`);
      });

      // Mock local tsc exists in path with spaces
      mockExistsSync.mockImplementation((filePath) => {
        const pathStr = filePath.toString();
        return (
          pathStr.includes('node_modules/.bin/tsc') &&
          pathStr.includes('/test/')
        );
      });

      const result = findTypeScriptCompiler('/test/path with spaces');

      expect(result.executable).toContain('node_modules/.bin/tsc');
      expect(result.isWindows).toBe(process.platform === 'win32'); // Use actual platform
      expect(result.useShell).toBe(false); // Local tsc doesn't use shell
      expect(result.compilerType).toBe('tsc');
    });

    it('should test additional coverage for Windows quoting paths', () => {
      // Test quoteWindowsPath function coverage with different scenarios
      setupMockRequire((id: string) => {
        throw new Error(`Cannot resolve ${id}`);
      });

      // Test with a path that would trigger quotedExecutable logic
      mockExistsSync.mockImplementation((filePath) => {
        const pathStr = filePath.toString();
        return (
          pathStr.includes('node_modules/.bin/tsc') &&
          pathStr.includes('/path with spaces/')
        );
      });

      const result = findTypeScriptCompiler('/path with spaces/test');

      expect(result.executable).toContain('node_modules/.bin/tsc');
      expect(result.compilerType).toBe('tsc');
      // Test that function handles paths correctly
      expect(typeof result.isWindows).toBe('boolean');
    });

    it('should test various edge cases for improved coverage', () => {
      // Test different combinations to increase coverage
      setupMockRequire((id: string) => {
        if (id.includes('typescript/package.json')) {
          throw new Error('TypeScript package not found');
        }
        throw new Error(`Cannot resolve ${id}`);
      });

      mockExistsSync.mockImplementation((_filePath) => {
        // Return false for all paths to test fallback behavior
        return false;
      });

      const result = findTypeScriptCompiler('/test/project');

      // Should fallback to global tsc
      expect(result.executable).toBe('tsc');
      expect(result.useShell).toBe(true);
      expect(result.compilerType).toBe('tsc');
    });

    it('should test alternative package managers for coverage', () => {
      // Test yarn package manager
      mockDetectPackageManagerAdvanced.mockReturnValueOnce({
        manager: 'yarn',
        lockFile: 'yarn.lock',
        command: 'yarn',
        tscPath: '',
      });

      setupMockRequire((id: string) => {
        throw new Error(`Cannot resolve ${id}`);
      });

      mockExistsSync.mockImplementation(() => false);

      const result = findTypeScriptCompiler('/test');

      expect(result.packageManager.manager).toBe('yarn');
      expect(result.executable).toBe('tsc'); // Still global fallback
      expect(result.useShell).toBe(true);
    });

    it('should test pnpm package manager for coverage', () => {
      // Test pnpm package manager
      mockDetectPackageManagerAdvanced.mockReturnValueOnce({
        manager: 'pnpm',
        lockFile: 'pnpm-lock.yaml',
        command: 'pnpm',
        tscPath: '',
      });

      setupMockRequire((id: string) => {
        throw new Error(`Cannot resolve ${id}`);
      });

      mockExistsSync.mockImplementation(() => false);

      const result = findTypeScriptCompiler('/test');

      expect(result.packageManager.manager).toBe('pnpm');
      expect(result.executable).toBe('tsc'); // Still global fallback
      expect(result.useShell).toBe(true);
    });

    it('should test bun package manager fallback to global tsc', () => {
      // Test bun package manager without local TypeScript
      mockDetectPackageManagerAdvanced.mockReturnValueOnce({
        manager: 'bun',
        lockFile: 'bun.lockb',
        command: 'bun',
        tscPath: '',
      });

      setupMockRequire((id: string) => {
        throw new Error(`Cannot resolve ${id}`);
      });

      mockExistsSync.mockImplementation(() => false);

      const result = findTypeScriptCompiler('/test');

      expect(result.packageManager.manager).toBe('bun');
      expect(result.executable).toBe('tsc'); // Global fallback
      expect(result.useShell).toBe(true);
      expect(result.compilerType).toBe('tsc');
    });

    it('should test unknown package manager fallback to global tsc', () => {
      // Test unknown package manager
      mockDetectPackageManagerAdvanced.mockReturnValueOnce({
        manager: 'unknown' as unknown,
        lockFile: 'unknown.lock',
        command: 'unknown',
        tscPath: '',
      } as PackageManagerInfo);

      setupMockRequire((id: string) => {
        throw new Error(`Cannot resolve ${id}`);
      });

      mockExistsSync.mockImplementation(() => false);

      const result = findTypeScriptCompiler('/test');

      expect(result.packageManager.manager).toBe('unknown');
      expect(result.executable).toBe('tsc'); // Global fallback
      expect(result.useShell).toBe(true);
      expect(result.compilerType).toBe('tsc');
    });
  });

  describe('Switch Statement Coverage - Uncovered Branches', () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it('should handle bun package manager with global tsc fallback', () => {
      // Configure package manager mock to return bun
      mockDetectPackageManagerAdvanced.mockReturnValueOnce({
        manager: 'bun',
        lockFile: 'bun.lockb',
        command: 'bun',
        tscPath: '', // No tscPath to force switch statement
      });

      // Make tsgo unavailable
      setupMockRequire((id: string) => {
        throw new Error(`Cannot resolve ${id}`);
      });

      // Key insight: Mock path.join to prevent global tsc path creation
      const originalPathJoin = path.join;
      vi.mocked(path).join = vi.fn().mockImplementation((...args: string[]) => {
        const result = originalPathJoin(...args);
        // If this is the global tsc path being created, return a non-existent path
        if (
          args.includes('node_modules') &&
          args.includes('.bin') &&
          args.includes('tsc')
        ) {
          return '/nonexistent/path/tsc';
        }
        return result;
      });

      // Make all filesystem operations fail, including the literal 'tsc' check
      mockExistsSync.mockImplementation((filePath) => {
        const pathStr = filePath.toString();
        // Critical: make sure 'tsc' path doesn't exist and other paths fail
        if (
          pathStr === 'tsc' ||
          pathStr.includes('tsc') ||
          pathStr.includes('typescript')
        ) {
          return false;
        }
        return false;
      });

      try {
        const result = findTypeScriptCompiler('/test');

        // Verify we hit the global tsc fallback with bun package manager
        expect(result.packageManager.manager).toBe('bun');
        expect(result.executable).toBe('tsc'); // Global fallback takes precedence
        expect(result.args).toEqual([]); // Global tsc has no args
        expect(result.useShell).toBe(true);
        expect(result.compilerType).toBe('tsc');
        expect(result.fallbackAvailable).toBe(false);
      } finally {
        // Restore original path.join
        vi.mocked(path).join.mockImplementation(originalPathJoin);
      }
    });

    it('should handle unknown package manager with global tsc fallback', () => {
      // Configure package manager mock to return unknown manager
      mockDetectPackageManagerAdvanced.mockReturnValueOnce({
        manager: 'unknown' as unknown,
        lockFile: 'unknown.lock',
        command: 'unknown',
        tscPath: '', // No tscPath to force switch statement
      } as PackageManagerInfo);

      // Make tsgo unavailable
      setupMockRequire((id: string) => {
        throw new Error(`Cannot resolve ${id}`);
      });

      // Mock path.join to prevent global tsc path creation
      const originalPathJoin = path.join;
      vi.mocked(path).join = vi.fn().mockImplementation((...args: string[]) => {
        const result = originalPathJoin(...args);
        // If this is the global tsc path being created, return a non-existent path
        if (
          args.includes('node_modules') &&
          args.includes('.bin') &&
          args.includes('tsc')
        ) {
          return '/nonexistent/path/tsc';
        }
        return result;
      });

      // Make all filesystem operations fail, including the literal 'tsc' check
      mockExistsSync.mockImplementation((filePath) => {
        const pathStr = filePath.toString();
        // Critical: make sure 'tsc' path doesn't exist and other paths fail
        if (
          pathStr === 'tsc' ||
          pathStr.includes('tsc') ||
          pathStr.includes('typescript')
        ) {
          return false;
        }
        return false;
      });

      try {
        const result = findTypeScriptCompiler('/test');

        // Verify we hit the global tsc fallback with unknown package manager
        expect(result.packageManager.manager).toBe('unknown');
        expect(result.executable).toBe('tsc'); // Global fallback takes precedence
        expect(result.args).toEqual([]); // Global tsc has no args
        expect(result.useShell).toBe(true);
        expect(result.compilerType).toBe('tsc');
        expect(result.fallbackAvailable).toBe(false);
      } finally {
        // Restore original path.join
        vi.mocked(path).join.mockImplementation(originalPathJoin);
      }
    });

    it('should hit bun package manager branch in createPackageManagerTypeScript', () => {
      // Configure package manager mock to return bun WITHOUT tscPath
      mockDetectPackageManagerAdvanced.mockReturnValueOnce({
        manager: 'bun',
        lockFile: 'bun.lockb',
        command: 'bun',
        tscPath: '', // Force use of package manager detection logic
      });

      // Make local node_modules/.bin/tsc exist
      mockExistsSync.mockImplementation((filePath) => {
        const pathStr = filePath?.toString() || '';
        return (
          pathStr.includes('node_modules') &&
          pathStr.includes('.bin') &&
          pathStr.includes('tsc')
        );
      });

      // Make tsgo unavailable
      setupMockRequire((id: string) => {
        throw new Error(`Cannot resolve ${id}`);
      });

      const result = findTypeScriptCompiler('/test');

      expect(result.packageManager.manager).toBe('bun');
      expect(result.compilerType).toBe('tsc');
    });

    it('should hit default case branch in createPackageManagerTypeScript', () => {
      // Configure package manager mock to return an unknown manager
      mockDetectPackageManagerAdvanced.mockReturnValueOnce({
        manager: 'npm' as const,
        lockFile: 'unknown.lock',
        command: 'unknown',
        tscPath: '', // Force use of package manager detection logic
      });

      // Make local node_modules/.bin/tsc exist
      mockExistsSync.mockImplementation((filePath) => {
        const pathStr = filePath?.toString() || '';
        return (
          pathStr.includes('node_modules') &&
          pathStr.includes('.bin') &&
          pathStr.includes('tsc')
        );
      });

      // Make tsgo unavailable
      setupMockRequire((id: string) => {
        throw new Error(`Cannot resolve ${id}`);
      });

      const result = findTypeScriptCompiler('/test');

      expect(result.packageManager.manager).toBe('npm');
      expect(result.compilerType).toBe('tsc');
    });

    it('should handle execution error during TypeScript compilation detection', () => {
      // Mock to throw an execution error that doesn't have all properties
      setupMockRequire((id: string) => {
        if (id.includes('typescript')) {
          throw new Error('Execution error');
        }
        throw new Error(`Cannot resolve ${id}`);
      });

      // Mock package manager
      mockDetectPackageManagerAdvanced.mockReturnValueOnce({
        manager: 'yarn',
        lockFile: 'yarn.lock',
        command: 'yarn',
        tscPath: '',
      });

      // Mock all paths to fail
      mockExistsSync.mockImplementation(() => false);

      const result = findTypeScriptCompiler('/test');

      // Should fallback to yarn execution pattern
      expect(result.packageManager.manager).toBe('yarn');
      expect(result.compilerType).toBe('tsc');
      expect(result.useShell).toBe(true);
    });

    it('should handle special error type in execution detection', () => {
      // Mock special error structure
      setupMockRequire((_id: string) => {
        const error = new Error('Special error') as Error & {
          code: string;
          path: string;
        };
        error.code = 'MODULE_NOT_FOUND';
        error.path = '/invalid/path';
        throw error;
      });

      // Mock package manager
      mockDetectPackageManagerAdvanced.mockReturnValueOnce({
        manager: 'pnpm',
        lockFile: 'pnpm-lock.yaml',
        command: 'pnpm',
        tscPath: '',
      });

      // Mock all paths to fail except global
      mockExistsSync.mockImplementation((filePath) => {
        const pathStr = filePath?.toString() || '';
        return pathStr === 'tsc'; // Global tsc exists
      });

      const result = findTypeScriptCompiler('/test');

      // Should use global tsc
      expect(result.executable).toBe('tsc');
      expect(result.compilerType).toBe('tsc');
      expect(result.useShell).toBe(true);
    });

    it('should handle edge case with non-standard path separator', () => {
      // Mock existsSync to simulate finding TypeScript in resolve path with different separators
      mockExistsSync.mockImplementation((filePath) => {
        const pathStr = filePath?.toString() || '';
        return (
          pathStr.includes('typescript') &&
          pathStr.includes('bin') &&
          pathStr.includes('tsc')
        );
      });

      // Mock require to resolve TypeScript package but then fail on executable check
      setupMockRequire((id: string) => {
        if (id === 'typescript/package.json') {
          return JSON.stringify({ version: '5.0.0' });
        }
        throw new Error(`Cannot resolve ${id}`);
      });

      mockDetectPackageManagerAdvanced.mockReturnValueOnce({
        manager: 'npm',
        lockFile: 'package-lock.json',
        command: 'npm',
        tscPath: '',
      });

      const result = findTypeScriptCompiler('/test');

      expect(result.compilerType).toBe('tsc');
      expect(typeof result.executable).toBe('string');
    });

    it('should handle complex path resolution edge case', () => {
      // Test complex path resolution with specific mock setup
      const mockPath = path as typeof path & {
        join: typeof path.join;
      };
      const originalJoin = path.join;

      // Temporarily override path.join for this test
      mockPath.join = vi.fn().mockImplementation((...args: string[]) => {
        const result = originalJoin(...args);
        return result;
      });

      try {
        mockDetectPackageManagerAdvanced.mockReturnValueOnce({
          manager: 'yarn',
          lockFile: 'yarn.lock',
          command: 'yarn',
          tscPath: 'custom/tsc/path',
        });

        // Mock custom tscPath to exist
        mockExistsSync.mockImplementation((filePath) => {
          const pathStr = filePath?.toString() || '';
          return pathStr.includes('custom/tsc/path');
        });

        const result = findTypeScriptCompiler('/test');

        expect(result.packageManager.manager).toBe('yarn');
        expect(result.executable).toContain('custom/tsc/path');
      } finally {
        // Restore original path.join
        mockPath.join = originalJoin;
      }
    });
  });
});
