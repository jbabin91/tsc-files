import type * as fs from 'node:fs';
import { existsSync } from 'node:fs';
import type * as nodeModule from 'node:module';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('node:fs', async () => {
  const actual = await vi.importActual<typeof fs>('node:fs');
  return {
    ...actual,
    existsSync: vi.fn(),
  };
});

vi.mock('node:module', async () => {
  const actual = await vi.importActual<typeof nodeModule>('node:module');
  return {
    ...actual,
    createRequire: vi.fn(() => actual.createRequire(import.meta.url)),
  };
});

vi.mock('@/detectors/package-manager', () => ({
  detectPackageManagerAdvanced: vi.fn(() => ({
    manager: 'npm',
    lockFile: 'package-lock.json',
    command: 'npm',
    tscPath: '',
  })),
}));

const loadTypescriptModuleOnWindows = async () => {
  const platformSpy = vi
    .spyOn(process, 'platform', 'get')
    .mockReturnValue('win32');
  vi.resetModules();
  try {
    return await import('@/detectors/typescript');
  } finally {
    platformSpy.mockRestore();
  }
};

describe('TypeScript Detection on Windows', () => {
  const mockExistsSync = vi.mocked(existsSync);

  beforeEach(() => {
    vi.clearAllMocks();
    mockExistsSync.mockReset();
  });

  afterEach(() => {
    mockExistsSync.mockReset();
    vi.resetModules();
  });

  it('should quote executables with spaces on Windows', async () => {
    const tsModule = await loadTypescriptModuleOnWindows();
    vi.spyOn(tsModule._internal, 'buildGlobalPaths').mockReturnValue([]);

    const { detectPackageManagerAdvanced } =
      await import('@/detectors/package-manager');
    const mockedDetect = vi.mocked(detectPackageManagerAdvanced);

    mockedDetect.mockReturnValue({
      manager: 'npm',
      lockFile: 'package-lock.json',
      command: 'npm',
      tscPath: '',
    });

    mockExistsSync.mockImplementation((filePath) => {
      const pathStr = filePath.toString().replaceAll('\\', '/');
      return pathStr.endsWith('/node_modules/.bin/tsc');
    });

    const result = tsModule.findTypeScriptCompiler('C:/project path');

    expect(result.executable.replaceAll('\\', '/')).toContain(
      '/node_modules/.bin/tsc',
    );
    expect(result.quotedExecutable).toMatch(/^".+"$/);
    expect(result.useShell).toBe(false);
  });

  it('should use package manager executables with cmd extension', async () => {
    const tsModule = await loadTypescriptModuleOnWindows();
    vi.spyOn(tsModule._internal, 'buildGlobalPaths').mockReturnValue([]);

    const { detectPackageManagerAdvanced } =
      await import('@/detectors/package-manager');
    const mockedDetect = vi.mocked(detectPackageManagerAdvanced);

    mockedDetect.mockReturnValue({
      manager: 'pnpm',
      lockFile: 'pnpm-lock.yaml',
      command: 'pnpm',
      tscPath: '',
    });

    mockExistsSync.mockReturnValue(false);

    const result = tsModule.findTypeScriptCompiler(String.raw`C:\repo`);

    expect(result.executable.toLowerCase()).toBe('pnpm.cmd');
    expect(result.useShell).toBe(true);
  });
});
