import { outputPerformanceInsight, outputTip } from '@/cli/output';
import { detectTsgo, type TypeScriptInfo } from '@/detectors/typescript';
import { logger } from '@/utils/logger';

/**
 * Provide educational messaging about compiler performance
 */
export function provideCompilerEducation(
  tsInfo: TypeScriptInfo,
  cwd: string,
  isFirstRun?: boolean,
): void {
  // If using tsgo, inform about performance benefits
  if (tsInfo.compilerType === 'tsgo' && isFirstRun) {
    outputPerformanceInsight(
      'Using tsgo (TypeScript native compiler) - up to 10x faster than tsc!',
    );
    outputTip(
      'Try --benchmark to compare performance between tsgo and tsc compilers',
    );
  }

  // If using tsc but tsgo is available, suggest trying it
  if (tsInfo.compilerType === 'tsc') {
    const tsgoInfo = detectTsgo(cwd);
    if (tsgoInfo.available) {
      outputPerformanceInsight(
        'tsgo (native TypeScript compiler) detected - use --use-tsgo for up to 10x faster compilation',
      );
    } else {
      outputTip(
        'For faster git hooks, install tsgo: npm install -D @typescript/native-preview',
      );
    }
  }
}

/**
 * Provide educational messaging about setup file auto-detection
 */
export function provideSetupFileEducation(
  detectedFiles: string[],
  tipsEnabled: boolean,
): void {
  if (detectedFiles.length === 0) {
    return; // No setup files detected, no education needed
  }

  if (tipsEnabled) {
    outputTip(
      `Automatically included ${detectedFiles.length} setup file${detectedFiles.length > 1 ? 's' : ''}: ${detectedFiles.join(', ')}`,
    );
    outputTip(
      'Setup files provide global test utilities and configurations. Use --include to override auto-detection.',
    );
  }
}

/**
 * Provide educational messaging about fallback scenarios
 */
export function provideFallbackEducation(
  fromCompiler: 'tsgo' | 'tsc',
  toCompiler: 'tsgo' | 'tsc',
  reason?: string,
): void {
  logger.warn(
    `⚠️  ${fromCompiler} compilation failed, falling back to ${toCompiler}`,
  );

  if (reason) {
    logger.info(`Reason: ${reason}`);
  }

  if (fromCompiler === 'tsgo' && toCompiler === 'tsc') {
    outputTip(
      'If tsgo continues to fail, consider reporting issues at https://github.com/microsoft/TypeScript/issues',
    );
    outputTip(
      'Use --use-tsc to skip tsgo entirely, or --no-fallback to disable automatic fallback',
    );
  }
}

/**
 * Provide educational messaging about CLI usage optimization
 */
export function provideUsageOptimization(fileCount: number): void {
  if (fileCount > 50) {
    outputTip(
      'Type checking many files? Consider using tsgo for better performance: --use-tsgo',
    );
  }
}

/**
 * Provide installation guidance for missing compilers
 */
export function provideInstallationGuidance(
  compilerType: 'tsgo' | 'tsc',
): void {
  if (compilerType === 'tsgo') {
    outputTip('Install tsgo: npm install -D @typescript/native-preview');
    outputTip(
      'Learn more: https://devblogs.microsoft.com/typescript/announcing-typescript-5-6-rc/',
    );
  } else {
    outputTip('Install TypeScript: npm install -D typescript');
    outputTip('Or use with npx: npx tsc-files [files...]');
  }
}

/**
 * Provide educational messaging about dependency discovery
 */
export function provideDependencyDiscoveryEducation(
  discoveredCount: number,
  totalFiles: number,
): void {
  if (discoveredCount > totalFiles) {
    outputPerformanceInsight(
      `✓ Dependency discovery found ${discoveredCount} files (including dependencies)`,
    );
    outputTip(
      'Dependency discovery automatically includes imported files, generated types (.gen.ts), and path-mapped modules',
    );
  }
}

/**
 * Provide educational messaging about git hook optimization
 */
export function provideGitHookOptimization(): void {
  outputTip('Git hook optimization tips:');
  logger.info('  • Use with lint-staged for changed files only');
  logger.info(
    '  • Keep caching enabled for repeat runs (use --no-cache only when debugging)',
  );
  logger.info('  • Try --use-tsgo for 10x performance improvement');
  logger.info('  • Use --skip-lib-check to speed up checking');
}

/**
 * Check if this might be a first run with tsgo
 */
export function isLikelyFirstTsgoRun(cwd: string): boolean {
  const tsgoInfo = detectTsgo(cwd);
  // Simple heuristic: if tsgo is available but we're in a fresh environment
  // In a real implementation, we might check for a preference file or cache
  return tsgoInfo.available && !process.env.TSC_FILES_SEEN_TSGO;
}
