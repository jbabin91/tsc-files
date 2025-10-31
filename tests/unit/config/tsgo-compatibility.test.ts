import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  analyzeTsgoCompatibility,
  shouldUseTsgo,
  type TsgoCompatibilityResult,
} from '@/config/tsgo-compatibility';
import { detectTsgo } from '@/detectors/typescript';

vi.mock('@/detectors/typescript', () => ({
  detectTsgo: vi.fn(() => ({
    available: true,
    executable: '/usr/bin/tsgo',
  })),
}));

const mockDetectTsgo = vi.mocked(detectTsgo);

describe('analyzeTsgoCompatibility', () => {
  it('returns compatible result when no incompatible features are detected', () => {
    const result = analyzeTsgoCompatibility({
      compilerOptions: {
        moduleResolution: 'bundler',
      },
    });

    expect(result).toEqual<TsgoCompatibilityResult>({
      compatible: true,
      incompatibleFeatures: [],
      recommendation:
        'Configuration is compatible with tsgo for optimal performance',
    });
  });

  it('detects baseUrl incompatibility when baseUrl is present (without paths)', () => {
    const result = analyzeTsgoCompatibility({
      compilerOptions: {
        baseUrl: './src',
        moduleResolution: 'node',
      },
    });

    expect(result.compatible).toBe(false);
    expect(result.incompatibleFeatures).toEqual(['baseUrl']);
    expect(result.recommendation).toContain('Using tsc due to: baseUrl');
  });

  it('detects baseUrl incompatibility when baseUrl is present with paths', () => {
    const result = analyzeTsgoCompatibility({
      compilerOptions: {
        baseUrl: './src',
        paths: {
          '@/*': ['components/*'],
        },
        moduleResolution: 'node',
      },
    });

    expect(result.compatible).toBe(false);
    expect(result.incompatibleFeatures).toEqual(['baseUrl']);
    expect(result.recommendation).toContain('Using tsc due to: baseUrl');
  });

  it('allows baseUrl with bundler moduleResolution', () => {
    const result = analyzeTsgoCompatibility({
      compilerOptions: {
        baseUrl: './src',
        moduleResolution: 'bundler',
      },
    });

    expect(result.compatible).toBe(true);
    expect(result.incompatibleFeatures).toEqual([]);
  });

  it('allows projects without baseUrl (tsgo compatible)', () => {
    const result = analyzeTsgoCompatibility({
      compilerOptions: {
        moduleResolution: 'node',
        target: 'ES2020',
        // No baseUrl - tsgo should work fine
      },
    });

    expect(result.compatible).toBe(true);
    expect(result.incompatibleFeatures).toEqual([]);
    expect(result.recommendation).toBe(
      'Configuration is compatible with tsgo for optimal performance',
    );
  });

  it('allows projects with paths but no baseUrl (uncommon but valid)', () => {
    const result = analyzeTsgoCompatibility({
      compilerOptions: {
        moduleResolution: 'node',
        // paths without baseUrl is unusual but TypeScript allows it
        // baseUrl defaults to tsconfig directory when paths is present
        paths: {
          '@/*': ['src/*'],
        },
      },
    });

    // Without explicit baseUrl, tsgo should work
    expect(result.compatible).toBe(true);
    expect(result.incompatibleFeatures).toEqual([]);
  });
});

describe('shouldUseTsgo', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('honours explicit useTsgo preference', () => {
    const result = shouldUseTsgo(
      { compilerOptions: {} },
      { useTsgo: true },
      '/project',
    );

    expect(result).toEqual({
      useTsgo: true,
      reason: 'User explicitly requested tsgo with --use-tsgo flag',
    });
  });

  it('honours explicit useTsc preference', () => {
    const result = shouldUseTsgo(
      { compilerOptions: {} },
      { useTsc: true },
      '/project',
    );

    expect(result).toEqual({
      useTsgo: false,
      reason: 'User explicitly requested tsc with --use-tsc flag',
    });
  });

  it('disables tsgo when it is not available', () => {
    mockDetectTsgo.mockReturnValueOnce({ available: false });

    const result = shouldUseTsgo(
      { compilerOptions: {} },
      undefined,
      '/project',
    );

    expect(result).toEqual({
      useTsgo: false,
      reason: 'tsgo not available (not installed)',
    });
  });

  it('disables tsgo when compatibility analysis fails (baseUrl present)', () => {
    mockDetectTsgo.mockReturnValueOnce({ available: true });

    const result = shouldUseTsgo(
      {
        compilerOptions: {
          baseUrl: './src',
          paths: {
            '@/*': ['components/*'],
          },
          moduleResolution: 'node',
        },
      },
      undefined,
      '/project',
    );

    expect(result.useTsgo).toBe(false);
    expect(result.reason).toContain(
      'Configuration incompatible with tsgo: baseUrl',
    );
    expect(result.compatibilityResult?.compatible).toBe(false);
  });

  it('enables tsgo when available and configuration is compatible', () => {
    mockDetectTsgo.mockReturnValueOnce({ available: true });

    const result = shouldUseTsgo(
      {
        compilerOptions: {
          moduleResolution: 'bundler',
        },
      },
      undefined,
      '/project',
    );

    expect(result).toEqual({
      useTsgo: true,
      reason: 'Configuration is compatible with tsgo for optimal performance',
      compatibilityResult: {
        compatible: true,
        incompatibleFeatures: [],
        recommendation:
          'Configuration is compatible with tsgo for optimal performance',
      },
    });
  });
});
