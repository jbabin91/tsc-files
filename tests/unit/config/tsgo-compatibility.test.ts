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

  it('detects baseUrl incompatibility when paths require non-bundler resolution', () => {
    const result = analyzeTsgoCompatibility({
      compilerOptions: {
        paths: {
          '@/*': ['src/*'],
        },
        moduleResolution: 'node',
      },
    });

    expect(result.compatible).toBe(false);
    expect(result.incompatibleFeatures).toEqual(['baseUrl']);
    expect(result.recommendation).toContain('Using tsc due to: baseUrl');
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

  it('disables tsgo when compatibility analysis fails', () => {
    mockDetectTsgo.mockReturnValueOnce({ available: true });

    const result = shouldUseTsgo(
      {
        compilerOptions: {
          paths: {
            '@/*': ['src/*'],
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
