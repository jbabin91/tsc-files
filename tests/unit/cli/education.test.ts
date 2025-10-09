import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  isLikelyFirstTsgoRun,
  provideCompilerEducation,
  provideDependencyDiscoveryEducation,
  provideFallbackEducation,
  provideGitHookOptimization,
  provideInstallationGuidance,
  provideSetupFileEducation,
  provideUsageOptimization,
} from '@/cli/education';
import { outputPerformanceInsight, outputTip } from '@/cli/output';
import { detectTsgo, type TypeScriptInfo } from '@/detectors/typescript';
import { logger } from '@/utils/logger';

// Mock the output functions
vi.mock('@/cli/output', () => ({
  outputPerformanceInsight: vi.fn(),
  outputTip: vi.fn(),
}));

// Mock the detectTsgo function
vi.mock('@/detectors/typescript', () => ({
  detectTsgo: vi.fn(),
}));

// Mock the logger
vi.mock('@/utils/logger', () => ({
  logger: {
    warn: vi.fn(),
    info: vi.fn(),
  },
}));

const mockLoggerWarn = vi.mocked(logger.warn);
const mockLoggerInfo = vi.mocked(logger.info);

describe('CLI Education', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset environment variables
    delete process.env.TSC_FILES_SEEN_TSGO;
  });

  describe('provideCompilerEducation', () => {
    it('should provide tsgo education on first run', () => {
      const tsInfo: TypeScriptInfo = {
        executable: '/usr/bin/tsgo',
        args: ['--noEmit'],
        useShell: false,
        packageManager: {
          manager: 'npm',
          lockFile: '',
          command: '',
          tscPath: '',
        },
        isWindows: false,
        compilerType: 'tsgo',
        fallbackAvailable: true,
      };

      provideCompilerEducation(tsInfo, '/test/cwd', true);

      expect(outputPerformanceInsight).toHaveBeenCalledWith(
        'Using tsgo (TypeScript native compiler) - up to 10x faster than tsc!',
      );
      expect(outputTip).toHaveBeenCalledWith(
        'Try --benchmark to compare performance between tsgo and tsc compilers',
      );
    });

    it('should not provide tsgo education on subsequent runs', () => {
      const tsInfo: TypeScriptInfo = {
        executable: '/usr/bin/tsgo',
        args: ['--noEmit'],
        useShell: false,
        packageManager: {
          manager: 'npm',
          lockFile: '',
          command: '',
          tscPath: '',
        },
        isWindows: false,
        compilerType: 'tsgo',
        fallbackAvailable: true,
      };

      provideCompilerEducation(tsInfo, '/test/cwd', false);

      expect(outputPerformanceInsight).not.toHaveBeenCalled();
      expect(outputTip).not.toHaveBeenCalled();
    });

    it('should suggest tsgo when using tsc and tsgo is available', () => {
      const tsInfo: TypeScriptInfo = {
        executable: '/usr/bin/tsc',
        args: ['--noEmit'],
        useShell: false,
        packageManager: {
          manager: 'npm',
          lockFile: '',
          command: '',
          tscPath: '',
        },
        isWindows: false,
        compilerType: 'tsc',
        fallbackAvailable: false,
      };

      vi.mocked(detectTsgo).mockReturnValue({
        available: true,
        executable: '/usr/bin/tsgo',
      });

      provideCompilerEducation(tsInfo, '/test/cwd');

      expect(detectTsgo).toHaveBeenCalledWith('/test/cwd');
      expect(outputPerformanceInsight).toHaveBeenCalledWith(
        'tsgo (native TypeScript compiler) detected - use --use-tsgo for up to 10x faster compilation',
      );
    });

    it('should suggest installing tsgo when using tsc and tsgo is not available', () => {
      const tsInfo: TypeScriptInfo = {
        executable: '/usr/bin/tsc',
        args: ['--noEmit'],
        useShell: false,
        packageManager: {
          manager: 'npm',
          lockFile: '',
          command: '',
          tscPath: '',
        },
        isWindows: false,
        compilerType: 'tsc',
        fallbackAvailable: false,
      };

      vi.mocked(detectTsgo).mockReturnValue({
        available: false,
        executable: '',
      });

      provideCompilerEducation(tsInfo, '/test/cwd');

      expect(detectTsgo).toHaveBeenCalledWith('/test/cwd');
      expect(outputTip).toHaveBeenCalledWith(
        'For faster git hooks, install tsgo: npm install -D @typescript/native-preview',
      );
    });
  });

  describe('provideFallbackEducation', () => {
    it('should warn about tsgo to tsc fallback with reason', () => {
      provideFallbackEducation('tsgo', 'tsc', 'Permission denied');

      expect(mockLoggerWarn).toHaveBeenCalledWith(
        '⚠️  tsgo compilation failed, falling back to tsc',
      );
      expect(mockLoggerInfo).toHaveBeenCalledWith('Reason: Permission denied');
      expect(outputTip).toHaveBeenCalledWith(
        'If tsgo continues to fail, consider reporting issues at https://github.com/microsoft/TypeScript/issues',
      );
      expect(outputTip).toHaveBeenCalledWith(
        'Use --use-tsc to skip tsgo entirely, or --no-fallback to disable automatic fallback',
      );
    });

    it('should warn about tsgo to tsc fallback without reason', () => {
      provideFallbackEducation('tsgo', 'tsc');

      expect(mockLoggerWarn).toHaveBeenCalledWith(
        '⚠️  tsgo compilation failed, falling back to tsc',
      );
      expect(mockLoggerInfo).not.toHaveBeenCalled();
      expect(outputTip).toHaveBeenCalledWith(
        'If tsgo continues to fail, consider reporting issues at https://github.com/microsoft/TypeScript/issues',
      );
      expect(outputTip).toHaveBeenCalledWith(
        'Use --use-tsc to skip tsgo entirely, or --no-fallback to disable automatic fallback',
      );
    });

    it('should warn about tsc to tsgo fallback without additional tips', () => {
      provideFallbackEducation('tsc', 'tsgo', 'Version mismatch');

      expect(mockLoggerWarn).toHaveBeenCalledWith(
        '⚠️  tsc compilation failed, falling back to tsgo',
      );
      expect(mockLoggerInfo).toHaveBeenCalledWith('Reason: Version mismatch');
      expect(outputTip).not.toHaveBeenCalled();
    });
  });

  describe('provideUsageOptimization', () => {
    it('should suggest tsgo for many files', () => {
      provideUsageOptimization(51);

      expect(outputTip).toHaveBeenCalledWith(
        'Type checking many files? Consider using tsgo for better performance: --use-tsgo',
      );
    });

    it('should not provide tips for single file', () => {
      provideUsageOptimization(1);

      expect(outputTip).not.toHaveBeenCalled();
    });

    it('should not provide tips for moderate file counts', () => {
      provideUsageOptimization(25);

      expect(outputTip).not.toHaveBeenCalled();
    });

    it('should handle edge case of exactly 50 files', () => {
      provideUsageOptimization(50);

      expect(outputTip).not.toHaveBeenCalled();
    });

    it('should handle zero files', () => {
      provideUsageOptimization(0);

      expect(outputTip).not.toHaveBeenCalled();
    });
  });

  describe('provideInstallationGuidance', () => {
    it('should provide tsgo installation guidance', () => {
      provideInstallationGuidance('tsgo');

      expect(outputTip).toHaveBeenCalledWith(
        'Install tsgo: npm install -D @typescript/native-preview',
      );
      expect(outputTip).toHaveBeenCalledWith(
        'Learn more: https://devblogs.microsoft.com/typescript/announcing-typescript-5-6-rc/',
      );
    });

    it('should provide tsc installation guidance', () => {
      provideInstallationGuidance('tsc');

      expect(outputTip).toHaveBeenCalledWith(
        'Install TypeScript: npm install -D typescript',
      );
      expect(outputTip).toHaveBeenCalledWith(
        'Or use with npx: npx tsc-files [files...]',
      );
    });
  });

  describe('provideGitHookOptimization', () => {
    it('should provide git hook optimization tips', () => {
      provideGitHookOptimization();

      expect(outputTip).toHaveBeenCalledWith('Git hook optimization tips:');
    });
  });

  describe('isLikelyFirstTsgoRun', () => {
    it('should return true when tsgo is available and env var is not set', () => {
      vi.mocked(detectTsgo).mockReturnValue({
        available: true,
        executable: '/usr/bin/tsgo',
      });

      const result = isLikelyFirstTsgoRun('/test/cwd');

      expect(detectTsgo).toHaveBeenCalledWith('/test/cwd');
      expect(result).toBe(true);
    });

    it('should return false when tsgo is available but env var is set', () => {
      process.env.TSC_FILES_SEEN_TSGO = 'true';
      vi.mocked(detectTsgo).mockReturnValue({
        available: true,
        executable: '/usr/bin/tsgo',
      });

      const result = isLikelyFirstTsgoRun('/test/cwd');

      expect(detectTsgo).toHaveBeenCalledWith('/test/cwd');
      expect(result).toBe(false);
    });

    it('should return false when tsgo is not available', () => {
      vi.mocked(detectTsgo).mockReturnValue({
        available: false,
        executable: '',
      });

      const result = isLikelyFirstTsgoRun('/test/cwd');

      expect(detectTsgo).toHaveBeenCalledWith('/test/cwd');
      expect(result).toBe(false);
    });
  });

  describe('provideSetupFileEducation', () => {
    it('should provide education for detected setup files when tips enabled', () => {
      const detectedFiles = ['tests/setup.ts', 'tests/globals.js'];

      provideSetupFileEducation(detectedFiles, true);

      expect(outputTip).toHaveBeenCalledWith(
        'Automatically included 2 setup files: tests/setup.ts, tests/globals.js',
      );
      expect(outputTip).toHaveBeenCalledWith(
        'Setup files provide global test utilities and configurations. Use --include to override auto-detection.',
      );
    });

    it('should not provide education when no setup files detected', () => {
      provideSetupFileEducation([], true);

      expect(outputTip).not.toHaveBeenCalled();
    });

    it('should not provide education when tips disabled', () => {
      const detectedFiles = ['tests/setup.ts'];

      provideSetupFileEducation(detectedFiles, false);

      expect(outputTip).not.toHaveBeenCalled();
    });

    it('should handle single setup file', () => {
      const detectedFiles = ['tests/setup.ts'];

      provideSetupFileEducation(detectedFiles, true);

      expect(outputTip).toHaveBeenCalledWith(
        'Automatically included 1 setup file: tests/setup.ts',
      );
    });
  });

  describe('provideDependencyDiscoveryEducation', () => {
    it('should provide education when more files discovered than provided', () => {
      provideDependencyDiscoveryEducation(5, 2);

      expect(outputPerformanceInsight).toHaveBeenCalledWith(
        '✓ Dependency discovery found 5 files (including dependencies)',
      );
      expect(outputTip).toHaveBeenCalledWith(
        'Dependency discovery automatically includes imported files, generated types (.gen.ts), and path-mapped modules',
      );
    });

    it('should not provide education when fewer or equal files discovered', () => {
      provideDependencyDiscoveryEducation(2, 2);
      provideDependencyDiscoveryEducation(1, 2);

      expect(outputPerformanceInsight).not.toHaveBeenCalled();
      expect(outputTip).not.toHaveBeenCalled();
    });
  });
});
