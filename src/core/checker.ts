import path from 'node:path';

import { createTempConfig } from '@/config/temp-config';
import {
  findTsConfig,
  parseTypeScriptConfig,
} from '@/config/tsconfig-resolver';
import { shouldUseTsgo } from '@/config/tsgo-compatibility';
import { resolveFiles } from '@/core/file-resolver';
import { executeAndParseTypeScript } from '@/execution/executor';
import type { CheckOptions, CheckResult } from '@/types/core';
import { logger } from '@/utils/logger';

/**
 * Group raw file patterns by their associated tsconfig.json path
 * This works with unresolved file patterns/globs
 */
function groupRawFilesByTsConfig(
  files: string[],
  options: CheckOptions,
): Map<string, string[]> {
  const groups = new Map<string, string[]>();
  const cwd = options.cwd ?? process.cwd();

  for (const file of files) {
    try {
      // For absolute file paths, start searching from the file's directory
      // This ensures we find the correct tsconfig for files in different projects
      const searchDir = path.isAbsolute(file) ? path.dirname(file) : cwd;
      const tsconfigPath = findTsConfig(searchDir, options.project);

      if (!groups.has(tsconfigPath)) {
        groups.set(tsconfigPath, []);
      }
      groups.get(tsconfigPath)!.push(file);
    } catch {
      // If we can't find a tsconfig for this file, group it with the default
      const defaultKey = 'default';
      if (!groups.has(defaultKey)) {
        groups.set(defaultKey, []);
      }
      groups.get(defaultKey)!.push(file);
    }
  }

  return groups;
}

/**
 * Process a group of files with a specific tsconfig
 */
async function processFileGroup(
  rawFiles: string[],
  tsconfigPath: string,
  options: CheckOptions,
  startTime: number,
): Promise<CheckResult> {
  const cwd = options.cwd ?? process.cwd();

  // Parse original config first to validate it exists
  // This ensures we catch invalid tsconfig paths early, before file resolution
  const originalConfig = parseTypeScriptConfig(tsconfigPath);

  // Resolve files using the file resolver
  const resolvedFiles = await resolveFiles(rawFiles, cwd, tsconfigPath);

  if (resolvedFiles.length === 0) {
    if (options.verbose) {
      logger.info('No TypeScript/JavaScript files to check');
    }
    return {
      success: true,
      errorCount: 0,
      warningCount: 0,
      errors: [],
      warnings: [],
      duration: Math.round(performance.now() - startTime),
      checkedFiles: [],
    };
  }

  // Analyze tsgo compatibility and determine optimal compiler
  const tsgoDecision = shouldUseTsgo(
    originalConfig,
    {
      useTsc: options.useTsc,
      useTsgo: options.useTsgo,
    },
    cwd,
  );

  // Provide user feedback about compiler selection
  if (options.verbose && tsgoDecision.compatibilityResult) {
    if (tsgoDecision.useTsgo) {
      logger.info('Using tsgo for optimal performance');
    } else {
      logger.info(`Using tsc: ${tsgoDecision.reason}`);
      if (tsgoDecision.compatibilityResult.recommendation) {
        logger.info(`💡 ${tsgoDecision.compatibilityResult.recommendation}`);
      }
    }
  }

  // Create temporary config
  const originalConfigDir = path.dirname(tsconfigPath);

  // Set default cacheDir to node_modules/.cache/tsc-files/ following industry conventions:
  // - ESLint: node_modules/.cache/eslint/
  // - Babel: node_modules/.cache/babel/
  // - Webpack: node_modules/.cache/webpack/
  //
  // Benefits:
  // - All temp files (tsconfig.-random-.json, tsconfig.tsbuildinfo) in one clean location
  // - Already gitignored via node_modules/
  // - Automatic cleanup when node_modules is removed
  // - Consistent with other build tools
  const defaultCacheDir = path.join(
    originalConfigDir,
    'node_modules/.cache/tsc-files',
  );

  const effectiveOptions = {
    ...options,
    cacheDir: options.cacheDir ?? defaultCacheDir,
  };

  const tempHandle = await createTempConfig(
    originalConfig,
    resolvedFiles,
    effectiveOptions,
    originalConfigDir,
  );

  if (effectiveOptions.verbose) {
    logger.info(
      `Processing group with ${resolvedFiles.length} files using ${tsconfigPath}`,
    );
    logger.info(`Created temp config: ${tempHandle.path}`);
    logger.info(`Checking ${resolvedFiles.length} files...`);
  }

  try {
    // Execute TypeScript compiler and parse results
    // Use original config directory as working directory for proper type resolution
    const result = await executeAndParseTypeScript(
      tempHandle.path,
      resolvedFiles,
      originalConfigDir,
      effectiveOptions,
      startTime,
      {
        useTsgo: tsgoDecision.useTsgo,
        reason: tsgoDecision.reason,
      },
    );

    // Include setup files information in the result
    return {
      ...result,
      includedSetupFiles: tempHandle.includedSetupFiles,
    };
  } catch (error) {
    if (effectiveOptions.throwOnError) {
      throw error;
    }

    // Determine error code based on error message
    const errorMessage = error instanceof Error ? error.message : String(error);
    const isConfigError =
      errorMessage.includes('tsconfig.json') ||
      errorMessage.includes('TypeScript config') ||
      errorMessage.includes('Failed to read tsconfig');

    return {
      success: false,
      errorCount: 1,
      warningCount: 0,
      errors: [
        {
          file: 'tsc-files',
          line: 1,
          column: 1,
          message: errorMessage,
          code: isConfigError ? 'CONFIG_ERROR' : 'TSC_FILES_ERROR',
          severity: 'error' as const,
        },
      ],
      warnings: [],
      duration: Math.round(performance.now() - startTime),
      checkedFiles: resolvedFiles,
    };
  } finally {
    try {
      tempHandle.cleanup();
      if (effectiveOptions.verbose) {
        logger.info(`Cleaned up temp config: ${tempHandle.path}`);
      }
    } catch (cleanupError) {
      if (effectiveOptions.verbose) {
        logger.warn(`Failed to cleanup temp config: ${cleanupError}`);
      }
    }
  }
}

/**
 * Combine results from multiple file groups
 */
function combineResults(results: CheckResult[]): CheckResult {
  if (results.length === 0) {
    return {
      success: true,
      errorCount: 0,
      warningCount: 0,
      errors: [],
      warnings: [],
      duration: 0,
      checkedFiles: [],
    };
  }

  if (results.length === 1) {
    return results[0];
  }

  const combinedErrors = results.flatMap((r) => r.errors);
  const combinedWarnings = results.flatMap((r) => r.warnings);
  const combinedCheckedFiles = results.flatMap((r) => r.checkedFiles);
  const combinedSetupFiles = results.flatMap((r) => r.includedSetupFiles ?? []);
  const maxDuration = Math.max(...results.map((r) => r.duration));

  return {
    success: combinedErrors.length === 0,
    errorCount: combinedErrors.length,
    warningCount: combinedWarnings.length,
    errors: combinedErrors,
    warnings: combinedWarnings,
    duration: maxDuration,
    checkedFiles: combinedCheckedFiles,
    includedSetupFiles: combinedSetupFiles,
  };
}

/**
 * Check TypeScript files for type errors
 * @param files - Array of file patterns to check
 * @param options - Configuration options
 * @returns Promise resolving to check results
 */
export async function checkFiles(
  files: string[],
  options: CheckOptions = {},
): Promise<CheckResult> {
  const startTime = performance.now();
  const cwd = options.cwd ?? process.cwd();

  if (files.length === 0) {
    return {
      success: true,
      errorCount: 0,
      warningCount: 0,
      errors: [],
      warnings: [],
      duration: Math.round(performance.now() - startTime),
      checkedFiles: [],
    };
  }

  try {
    // Group files by their tsconfig
    const fileGroups = groupRawFilesByTsConfig(files, options);

    if (fileGroups.size > 1 && options.verbose) {
      logger.info(
        `Monorepo detected: processing ${fileGroups.size} different tsconfig groups`,
      );
    }

    // Process each group
    const results: CheckResult[] = [];
    for (const [tsconfigPath, groupFiles] of fileGroups) {
      if (tsconfigPath === 'default') {
        // Handle default case where no tsconfig was found
        try {
          const defaultTsconfig = findTsConfig(cwd, options.project);
          const result = await processFileGroup(
            groupFiles,
            defaultTsconfig,
            options,
            startTime,
          );
          results.push(result);
        } catch (error) {
          if (options.throwOnError) {
            throw error;
          }

          // Determine error code based on error message
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          const isConfigError =
            errorMessage.includes('tsconfig.json') ||
            errorMessage.includes('TypeScript config') ||
            errorMessage.includes('Failed to read tsconfig');

          results.push({
            success: false,
            errorCount: 1,
            warningCount: 0,
            errors: [
              {
                file: 'tsc-files',
                line: 1,
                column: 1,
                message: errorMessage,
                code: isConfigError ? 'CONFIG_ERROR' : 'TSC_FILES_ERROR',
                severity: 'error' as const,
              },
            ],
            warnings: [],
            duration: Math.round(performance.now() - startTime),
            checkedFiles: [],
          });
        }
      } else {
        const result = await processFileGroup(
          groupFiles,
          tsconfigPath,
          options,
          startTime,
        );
        results.push(result);
      }
    }

    return combineResults(results);
  } catch (error) {
    if (options.throwOnError) {
      throw error;
    }

    // Determine error code based on error message
    const errorMessage = error instanceof Error ? error.message : String(error);
    const isConfigError =
      errorMessage.includes('tsconfig.json') ||
      errorMessage.includes('TypeScript config') ||
      errorMessage.includes('Failed to read tsconfig');

    return {
      success: false,
      errorCount: 1,
      warningCount: 0,
      errors: [
        {
          file: 'tsc-files',
          line: 1,
          column: 1,
          message: errorMessage,
          code: isConfigError ? 'CONFIG_ERROR' : 'TSC_FILES_ERROR',
          severity: 'error' as const,
        },
      ],
      warnings: [],
      duration: Math.round(performance.now() - startTime),
      checkedFiles: [],
    };
  }
}
