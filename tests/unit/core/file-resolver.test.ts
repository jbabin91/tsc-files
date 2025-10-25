import { existsSync, type Stats } from 'node:fs';
import { stat } from 'node:fs/promises';

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
    vi.restoreAllMocks();
  });

  it('resolves direct file patterns via glob', async () => {
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
    vi.mocked(glob).mockResolvedValue(['/workspace/src/file.ts']);

    const files = await resolveFiles(['src/file.ts'], '/workspace');

    expect(files).toEqual(['/workspace/src/file.ts']);
    expect(glob).toHaveBeenCalledWith(
      ['src/file.ts'],
      expect.objectContaining({ cwd: '/workspace' }),
    );
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
});
