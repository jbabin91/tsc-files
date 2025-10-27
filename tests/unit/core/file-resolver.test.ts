import { existsSync, type Stats } from 'node:fs';
import { stat } from 'node:fs/promises';
import path from 'node:path';

import { glob } from 'tinyglobby';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { shouldIncludeJavaScriptFiles } from '@/config/tsconfig-resolver';
import { resolveFiles } from '@/core/file-resolver';
import { getFileExtensions, hasValidExtension } from '@/utils/file-patterns';

vi.mock('node:fs', () => ({
  existsSync: vi.fn(),
}));

vi.mock('node:fs/promises', () => ({
  stat: vi.fn(),
}));

vi.mock('tinyglobby', () => ({
  glob: vi.fn(),
}));

vi.mock('@/config/tsconfig-resolver', () => ({
  shouldIncludeJavaScriptFiles: vi.fn(),
}));

vi.mock('@/utils/file-patterns', () => ({
  getFileExtensions: vi.fn(),
  hasValidExtension: vi.fn(),
}));

describe('resolveFiles', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  it('resolves direct file patterns without using glob', async () => {
    vi.mocked(shouldIncludeJavaScriptFiles).mockReturnValue(false);
    vi.mocked(getFileExtensions).mockReturnValue({
      extensions: ['ts'],
      regexPattern: /\.ts$/i,
      globPattern: 'ts',
    });
    vi.mocked(hasValidExtension).mockReturnValue(true);

    vi.mocked(existsSync).mockImplementation((filePath) =>
      filePath.toString().includes('src/file.ts'),
    );
    const globSpy = vi.mocked(glob).mockResolvedValue([]);

    const files = await resolveFiles(['src/file.ts'], '/workspace');

    expect(files).toEqual(['/workspace/src/file.ts']);
    // Direct files should NOT go through glob to avoid special character issues
    expect(globSpy).not.toHaveBeenCalled();
  });

  it('expands directory patterns when resolving direct directories', async () => {
    vi.mocked(shouldIncludeJavaScriptFiles).mockReturnValue(false);
    vi.mocked(getFileExtensions).mockReturnValue({
      extensions: ['ts'],
      regexPattern: /\.ts$/i,
      globPattern: 'ts',
    });
    vi.mocked(hasValidExtension).mockReturnValue(true);

    vi.mocked(existsSync).mockImplementation((filePath) =>
      filePath.toString().endsWith('/src'),
    );
    vi.mocked(stat).mockResolvedValue({
      isDirectory: () => true,
    } as unknown as Stats);
    const globSpy = vi.mocked(glob).mockResolvedValue([]);

    await resolveFiles(['src'], '/workspace');

    expect(globSpy).toHaveBeenCalledWith(['src/**/*.ts'], expect.any(Object));
  });

  it('falls back to direct resolution when glob throws', async () => {
    vi.mocked(shouldIncludeJavaScriptFiles).mockReturnValue(false);
    vi.mocked(getFileExtensions).mockReturnValue({
      extensions: ['ts'],
      regexPattern: /\.ts$/i,
      globPattern: 'ts',
    });
    vi.mocked(hasValidExtension).mockReturnValue(true);

    vi.mocked(existsSync).mockImplementation((filePath) =>
      filePath.toString().includes('fallback.ts'),
    );
    vi.mocked(glob).mockRejectedValue(new Error('glob failure'));

    const files = await resolveFiles(['src/fallback.ts'], '/workspace');

    expect(files).toEqual(['/workspace/src/fallback.ts']);
  });

  it('handles files with parentheses in filename', async () => {
    const fileWithParens = 'src/file.(test).ts';
    const absolutePath = '/workspace/src/file.(test).ts';

    vi.mocked(shouldIncludeJavaScriptFiles).mockReturnValue(false);
    vi.mocked(getFileExtensions).mockReturnValue({
      extensions: ['ts'],
      regexPattern: /\.ts$/i,
      globPattern: 'ts',
    });

    vi.mocked(existsSync).mockImplementation(
      (filePath) => filePath.toString() === absolutePath,
    );
    // Glob should NOT be called for direct files with special characters
    const globSpy = vi.mocked(glob).mockResolvedValue([]);

    const files = await resolveFiles([fileWithParens], '/workspace');

    expect(files).toEqual([absolutePath]);
    // Verify glob was not called with the file containing special characters
    expect(globSpy).not.toHaveBeenCalledWith(
      expect.arrayContaining([expect.stringContaining('(')]),
      expect.any(Object),
    );
  });

  it('handles files with dollar signs in filename', async () => {
    const fileWithDollar = 'src/file.($test).ts';
    const absolutePath = '/workspace/src/file.($test).ts';

    vi.mocked(shouldIncludeJavaScriptFiles).mockReturnValue(false);
    vi.mocked(getFileExtensions).mockReturnValue({
      extensions: ['ts'],
      regexPattern: /\.ts$/i,
      globPattern: 'ts',
    });

    vi.mocked(existsSync).mockImplementation(
      (filePath) => filePath.toString() === absolutePath,
    );
    const globSpy = vi.mocked(glob).mockResolvedValue([]);

    const files = await resolveFiles([fileWithDollar], '/workspace');

    expect(files).toEqual([absolutePath]);
    expect(globSpy).not.toHaveBeenCalledWith(
      expect.arrayContaining([expect.stringContaining('$')]),
      expect.any(Object),
    );
  });

  it('handles complex filenames with multiple special characters', async () => {
    const complexFile =
      'app/___whatever/is.(fuoritono).($this).(this).($command).(command).($doing).tsx';
    const absolutePath = `/workspace/${complexFile}`;

    vi.mocked(shouldIncludeJavaScriptFiles).mockReturnValue(false);
    vi.mocked(getFileExtensions).mockReturnValue({
      extensions: ['ts', 'tsx'],
      regexPattern: /\.(ts|tsx)$/i,
      globPattern: '{ts,tsx}',
    });

    vi.mocked(existsSync).mockImplementation((filePath) => {
      const normalized = path.normalize(filePath.toString());
      const expectedNormalized = path.normalize(absolutePath);
      return normalized === expectedNormalized;
    });

    // Important: Mock stat to NOT be called (file should be resolved before stat)
    const statSpy = vi
      .mocked(stat)
      .mockRejectedValue(new Error('Should not call stat for direct files'));
    const globSpy = vi.mocked(glob).mockResolvedValue([]);

    const files = await resolveFiles([complexFile], '/workspace');

    expect(files).toEqual([absolutePath]);
    // Ensure stat was not called (direct file should be resolved immediately)
    expect(statSpy).not.toHaveBeenCalled();
    // Ensure glob was not called for direct files with special characters
    expect(globSpy).not.toHaveBeenCalled();
  });

  it('treats path as directory pattern when stat fails', async () => {
    vi.mocked(shouldIncludeJavaScriptFiles).mockReturnValue(false);
    vi.mocked(getFileExtensions).mockReturnValue({
      extensions: ['ts'],
      regexPattern: /\.ts$/i,
      globPattern: 'ts',
    });

    vi.mocked(existsSync).mockReturnValue(true);
    vi.mocked(stat).mockRejectedValue(new Error('stat failed'));
    const globSpy = vi
      .mocked(glob)
      .mockResolvedValue(['/workspace/src/file1.ts']);

    const files = await resolveFiles(['src'], '/workspace');

    expect(globSpy).toHaveBeenCalledWith(['src/**/*.ts'], expect.any(Object));
    expect(files).toEqual(['/workspace/src/file1.ts']);
  });

  it('returns empty array when glob fails with non-matching patterns', async () => {
    vi.mocked(shouldIncludeJavaScriptFiles).mockReturnValue(false);
    vi.mocked(getFileExtensions).mockReturnValue({
      extensions: ['ts'],
      regexPattern: /\.ts$/i,
      globPattern: 'ts',
    });
    vi.mocked(hasValidExtension).mockReturnValue(true);

    vi.mocked(existsSync).mockReturnValue(true);
    vi.mocked(stat).mockResolvedValue({
      isDirectory: () => true,
    } as unknown as Stats);
    vi.mocked(glob).mockRejectedValue(new Error('glob failure'));

    const files = await resolveFiles(['src'], '/workspace');

    // Directory pattern src/**/*.ts doesn't match /\.ts$/i regex,
    // so fallback returns empty array
    expect(files).toEqual([]);
  });

  it('uses full fallback chain when glob fails with matching pattern', async () => {
    vi.mocked(shouldIncludeJavaScriptFiles).mockReturnValue(false);
    vi.mocked(getFileExtensions).mockReturnValue({
      extensions: ['ts'],
      regexPattern: /\.ts$/i,
      globPattern: 'ts',
    });
    vi.mocked(hasValidExtension).mockReturnValue(true);

    // Pattern with glob character but ending in .ts
    const globPattern = 'src/*.ts';
    vi.mocked(existsSync).mockImplementation(
      (filePath) => filePath.toString() === '/workspace/src/*.ts',
    );
    vi.mocked(glob).mockRejectedValue(new Error('glob failure'));

    const files = await resolveFiles([globPattern], '/workspace');

    // Fallback processes pattern through full chain:
    // filter by processedDirectPatterns → filter by regex → map to absolute → filter by exists
    expect(files).toEqual(['/workspace/src/*.ts']);
  });
});
