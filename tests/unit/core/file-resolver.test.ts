import { existsSync, type Stats } from 'node:fs';
import { stat } from 'node:fs/promises';
import path from 'node:path';

import { glob } from 'tinyglobby';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { shouldIncludeJavaScriptFiles } from '@/config/tsconfig-resolver';
import {
  isGlobPattern,
  preExpandGlobsForGrouping,
  resolveFiles,
} from '@/core/file-resolver';
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

describe('isGlobPattern', () => {
  it('detects asterisk as glob pattern', () => {
    expect(isGlobPattern('src/*.ts')).toBe(true);
    expect(isGlobPattern('src/**/*.ts')).toBe(true);
    expect(isGlobPattern('packages/*/src/index.ts')).toBe(true);
  });

  it('detects curly braces as glob pattern', () => {
    expect(isGlobPattern('src/*.{ts,tsx}')).toBe(true);
    expect(isGlobPattern('{apps,packages}/**/index.ts')).toBe(true);
  });

  it('detects square brackets as glob pattern', () => {
    expect(isGlobPattern('src/[abc].ts')).toBe(true);
    expect(isGlobPattern('src/file[0-9].ts')).toBe(true);
  });

  it('detects question mark as glob pattern', () => {
    expect(isGlobPattern('src/file?.ts')).toBe(true);
    expect(isGlobPattern('src/test?.spec.ts')).toBe(true);
  });

  it('returns false for direct file paths', () => {
    expect(isGlobPattern('src/index.ts')).toBe(false);
    expect(isGlobPattern('packages/core/src/index.ts')).toBe(false);
    expect(isGlobPattern('/absolute/path/file.ts')).toBe(false);
  });

  it('handles paths with special characters that are not glob patterns', () => {
    expect(isGlobPattern('src/file.(test).ts')).toBe(false);
    expect(isGlobPattern('src/file.$test.ts')).toBe(false);
    expect(isGlobPattern('src/my-file_v2.ts')).toBe(false);
  });
});

describe('preExpandGlobsForGrouping', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns direct files unchanged when no globs present', async () => {
    const result = await preExpandGlobsForGrouping(
      ['src/index.ts', 'src/utils.ts'],
      '/workspace',
    );

    expect(result).toEqual(['src/index.ts', 'src/utils.ts']);
    expect(glob).not.toHaveBeenCalled();
  });

  it('expands glob patterns to concrete files', async () => {
    vi.mocked(hasValidExtension).mockReturnValue(true);
    vi.mocked(glob).mockResolvedValue([
      '/workspace/packages/core/index.ts',
      '/workspace/packages/utils/index.ts',
    ]);

    const result = await preExpandGlobsForGrouping(
      ['packages/*/index.ts'],
      '/workspace',
    );

    expect(glob).toHaveBeenCalledWith(
      ['packages/*/index.ts'],
      expect.objectContaining({
        cwd: '/workspace',
        absolute: true,
        onlyFiles: true,
      }),
    );
    expect(result).toEqual([
      '/workspace/packages/core/index.ts',
      '/workspace/packages/utils/index.ts',
    ]);
  });

  it('combines direct files with expanded globs', async () => {
    vi.mocked(hasValidExtension).mockReturnValue(true);
    vi.mocked(glob).mockResolvedValue(['/workspace/packages/core/index.ts']);

    const result = await preExpandGlobsForGrouping(
      ['src/direct.ts', 'packages/*/index.ts'],
      '/workspace',
    );

    expect(result).toContain('/workspace/src/direct.ts');
    expect(result).toContain('/workspace/packages/core/index.ts');
  });

  it('deduplicates when direct file is also matched by glob', async () => {
    vi.mocked(hasValidExtension).mockReturnValue(true);
    vi.mocked(glob).mockResolvedValue([
      '/workspace/src/index.ts',
      '/workspace/src/utils.ts',
    ]);

    const result = await preExpandGlobsForGrouping(
      ['src/index.ts', 'src/*.ts'],
      '/workspace',
    );

    // Direct file 'src/index.ts' becomes '/workspace/src/index.ts'
    // which is also in the glob result - should be deduplicated
    expect(result).toHaveLength(2);
    expect(result).toContain('/workspace/src/index.ts');
    expect(result).toContain('/workspace/src/utils.ts');
  });

  it('filters out invalid glob patterns', async () => {
    vi.mocked(hasValidExtension).mockReturnValue(false);

    const result = await preExpandGlobsForGrouping(
      ['src/*.invalid', 'direct.ts'],
      '/workspace',
    );

    expect(glob).not.toHaveBeenCalled();
    expect(result).toEqual(['direct.ts']);
  });

  it('propagates errors from glob expansion', async () => {
    vi.mocked(hasValidExtension).mockReturnValue(true);
    vi.mocked(glob).mockRejectedValue(new Error('Glob expansion failed'));

    await expect(
      preExpandGlobsForGrouping(['src/*.ts'], '/workspace'),
    ).rejects.toThrow('Glob expansion failed');
  });
});
