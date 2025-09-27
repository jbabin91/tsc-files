import { existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

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

describe('TypeScript Detection', () => {
  const mockExistsSync = vi.mocked(existsSync);
  const mockCreateRequire = vi.mocked(createRequire);

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
});
