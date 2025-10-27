import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import tmp from 'tmp';
import * as ts from 'typescript';

import { provideDependencyDiscoveryEducation } from '@/cli/education';
import { discoverDependencyClosure } from '@/config/dependency-discovery';
import type { TypeScriptConfig } from '@/config/tsconfig-resolver';
import type { CheckOptions } from '@/types/core';
import { logger } from '@/utils/logger';

// Ensure graceful cleanup of temp files
tmp.setGracefulCleanup();

/**
 * Temporary configuration file handle
 */
export type TempConfigHandle = {
  /** Absolute path to temporary config file */
  path: string;
  /** Cleanup function to remove temporary file */
  cleanup: () => void;
  /** Setup files that were automatically included */
  includedSetupFiles: string[];
};

/**
 * Generate secure temp config path using tmp library
 * @param cacheDir - Optional cache directory path (must be absolute or undefined)
 * @returns Temporary config file handle
 */
export function createTempConfigPath(cacheDir?: string): TempConfigHandle {
  // Ensure cache directory exists before creating temp file
  // This is needed when using node_modules/.cache/tsc-files/ as the default cache location
  if (cacheDir && path.isAbsolute(cacheDir)) {
    try {
      mkdirSync(cacheDir, { recursive: true });
    } catch (error) {
      // If we can't create the cache directory, fall back to system temp directory
      // This can happen if node_modules doesn't exist or isn't writable
      const message = error instanceof Error ? error.message : String(error);
      logger.warn(
        `⚠ Failed to create cache directory (${cacheDir}): ${message}`,
      );
      logger.warn('  Falling back to system temp directory');
      // Reset cacheDir to undefined to use system temp
      cacheDir = undefined;
    }
  }

  // When cacheDir is provided and is absolute, use it as tmpdir
  // Otherwise use the system default temp directory
  const tmpFile = tmp.fileSync({
    prefix: 'tsconfig.',
    postfix: '.json',
    mode: 0o600,
    tmpdir: cacheDir,
    discardDescriptor: false,
    keep: false,
  });

  return {
    path: tmpFile.name,
    cleanup: tmpFile.removeCallback,
    includedSetupFiles: [],
  };
}

/**
 * Create temporary TypeScript config with file list
 * @param originalConfig - Parsed original TypeScript configuration
 * @param files - List of files to include in temporary config
 * @param options - Check options for compiler option overrides
 * @param originalConfigDir - Directory containing the original tsconfig.json
 * @returns Promise resolving to temporary config file handle
 */
export async function createTempConfig(
  originalConfig: TypeScriptConfig,
  files: string[],
  options: CheckOptions,
  originalConfigDir: string,
): Promise<TempConfigHandle> {
  // Discover dependency closure for the selected files
  const closure = await discoverDependencyClosure(
    ts,
    originalConfig,
    files,
    originalConfigDir,
    options.verbose,
    options.include,
  );

  // Use discovered files if available, otherwise fall back to original files
  const resolvedFiles = closure.discovered ? closure.sourceFiles : files;

  // Log discovery results in verbose mode
  if (options.verbose) {
    if (closure.discovered) {
      logger.info(
        `✓ Discovered ${resolvedFiles.length} source files for type checking (cache key: ${closure.cacheKey})`,
      );
      if (resolvedFiles.length !== files.length) {
        logger.info(
          `  Original files: ${files.length}, Discovered: ${resolvedFiles.length}`,
        );
        provideDependencyDiscoveryEducation(resolvedFiles.length, files.length);
      }
    } else {
      logger.warn(
        '⚠ Dependency discovery failed, using fallback include patterns',
      );
    }
  }

  const tempHandle = createTempConfigPath(options.cacheDir);

  // Set the included setup files on the handle
  tempHandle.includedSetupFiles = closure.includedSetupFiles;

  // Preserve ALL user compiler options (including types, typeRoots)
  // This ensures type checking matches user's environment exactly
  const sanitizedCompilerOptions = originalConfig.compilerOptions ?? {};

  // Convert relative paths to absolute paths to fix path alias resolution
  let adjustedCompilerOptions = { ...sanitizedCompilerOptions };

  // TypeScript type resolution strategy:
  // - Default cache location: node_modules/.cache/tsc-files/ (within project)
  // - TypeScript walks up from cache dir and finds project's node_modules automatically
  // - This allows both tsc and tsgo to use default type resolution (no explicit typeRoots needed)
  //
  // We only add explicit typeRoots when:
  // 1. User forces tsc (--use-tsc), AND
  // 2. User hasn't defined typeRoots, AND
  // 3. Cache is disabled (--no-cache, forcing system temp outside project)
  const shouldAddTypeRoots =
    options.useTsc &&
    !sanitizedCompilerOptions.typeRoots &&
    options.cache === false;

  if (shouldAddTypeRoots) {
    // System temp (/tmp): add explicit typeRoots to find @types packages in project
    // Only include node_modules/@types to avoid scanning scoped packages as type libraries
    adjustedCompilerOptions.typeRoots = [
      path.resolve(originalConfigDir, 'node_modules/@types'),
    ];
  }
  // Otherwise: rely on default TypeScript type resolution from cache directory

  if (sanitizedCompilerOptions.paths) {
    const absolutePaths: Record<string, string[]> = {};
    for (const [alias, pathList] of Object.entries(
      sanitizedCompilerOptions.paths,
    )) {
      // Ensure pathList is an array of strings
      if (Array.isArray(pathList)) {
        absolutePaths[alias] = (pathList as string[]).map((pathItem) => {
          // Convert relative paths to absolute paths
          if (pathItem.startsWith('./') || pathItem.startsWith('../')) {
            // Explicit relative paths
            return path.resolve(originalConfigDir, pathItem);
          } else if (
            !path.isAbsolute(pathItem) &&
            !pathItem.startsWith('node_modules')
          ) {
            // Implicit relative paths (no leading ./ but not absolute or node_modules)
            return path.resolve(originalConfigDir, pathItem);
          }
          // Keep absolute paths and node_modules paths as-is
          return pathItem;
        });
      }
    }
    adjustedCompilerOptions = {
      ...adjustedCompilerOptions,
      paths: absolutePaths,
      // Only set baseUrl if moduleResolution is not bundler (baseUrl is deprecated with bundler)
      ...(sanitizedCompilerOptions.moduleResolution !== 'bundler' && {
        baseUrl: originalConfigDir,
      }),
    };
  }

  // Handle tsBuildInfoFile for composite projects
  // When composite: true, TypeScript creates .tsbuildinfo files for incremental compilation
  // Without explicit tsBuildInfoFile, TypeScript uses the config filename with .tsbuildinfo extension
  // Since we use temp configs with random suffixes (tsconfig.-random-.json),
  // this creates random-suffixed .tsbuildinfo files in the project root (tsconfig.-random-.tsbuildinfo)
  //
  // Solution: Automatically set tsBuildInfoFile to a clean cache location when:
  // 1. composite is enabled, AND
  // 2. User hasn't explicitly set tsBuildInfoFile
  if (
    adjustedCompilerOptions.composite === true &&
    !adjustedCompilerOptions.tsBuildInfoFile
  ) {
    // Use node_modules/.cache/tsc-files/ following industry conventions:
    // - ESLint: node_modules/.cache/eslint/
    // - Babel: node_modules/.cache/babel/
    // - Webpack: node_modules/.cache/webpack/
    const cacheDir = path.resolve(
      originalConfigDir,
      'node_modules/.cache/tsc-files',
    );

    // Ensure cache directory exists
    try {
      mkdirSync(cacheDir, { recursive: true });
    } catch (error) {
      // Log warning but continue - TypeScript will fall back to default behavior
      if (options.verbose) {
        logger.warn(
          `⚠ Failed to create cache directory for tsBuildInfoFile: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }

    // Set tsBuildInfoFile to cache location
    // This ensures:
    // - Build info files are in a clean, gitignored location (node_modules)
    // - No random suffixes cluttering the project root
    // - Automatic cleanup when node_modules is removed
    // - Persistence for incremental compilation benefits
    adjustedCompilerOptions = {
      ...adjustedCompilerOptions,
      tsBuildInfoFile: path.join(cacheDir, 'tsconfig.tsbuildinfo'),
    };

    if (options.verbose) {
      logger.info(
        `✓ Configured tsBuildInfoFile for composite project: ${adjustedCompilerOptions.tsBuildInfoFile}`,
      );
    }
  }

  // Extract base config without dependency-related fields
  const { extends: _, compilerOptions: __, ...baseConfig } = originalConfig;

  // Preserve user's exclude patterns, but ensure node_modules is always excluded
  const userExclude = originalConfig.exclude ?? [];
  const excludePatterns = [
    ...new Set([
      ...userExclude,
      '**/node_modules/**',
      'node_modules/**',
      '**/dist/**',
      'dist/**',
    ]),
  ];

  // Convert original include patterns to .d.ts and .gen.ts patterns
  // - .d.ts files: ambient declarations
  // - .gen.ts files: generated files with module augmentations (e.g., TanStack Router's routeTree.gen.ts)
  const originalInclude = originalConfig.include ?? [];
  const typeIncludePatterns = originalInclude
    .flatMap((pattern) => {
      if (typeof pattern === 'string') {
        const dtsPattern = pattern
          .replace(/\.tsx?$/, '.d.ts')
          .replace(/\*\.ts$/, '*.d.ts')
          .replace(/\*\.tsx$/, '*.d.ts');
        const genPattern = pattern
          .replace(/\.tsx?$/, '.gen.ts')
          .replace(/\*\.ts$/, '*.gen.ts')
          .replace(/\*\.tsx$/, '*.gen.ts');
        return [dtsPattern, genPattern];
      }
      return [pattern];
    })
    .filter(
      (pattern) => pattern.includes('.d.ts') || pattern.includes('.gen.ts'),
    );

  const tempConfig = {
    // Copy base config structure but exclude dependency-related fields
    ...baseConfig,
    // Override with isolated settings
    extends: undefined,
    files: resolvedFiles,
    // Include .d.ts and .gen.ts files for type definitions and module augmentations
    // This ensures ambient type declarations and generated types (like TanStack Router) are available
    // Only use fallback patterns if discovery failed
    include: closure.discovered
      ? typeIncludePatterns.length > 0
        ? typeIncludePatterns
        : ['**/*.d.ts']
      : typeIncludePatterns.length > 0
        ? typeIncludePatterns
        : ['**/*.d.ts', '**/*.gen.ts'],
    exclude: excludePatterns,
    compilerOptions: {
      ...adjustedCompilerOptions,
      // Apply user overrides
      noEmit: options.noEmit !== false,
      // Default skipLibCheck to true to avoid checking node_modules declaration files
      // User can explicitly override with --skip-lib-check=false if needed
      skipLibCheck: options.skipLibCheck ?? true,
    },
  };

  try {
    writeFileSync(tempHandle.path, JSON.stringify(tempConfig, null, 2));
    return tempHandle;
  } catch (error) {
    // Clean up on failure
    tempHandle.cleanup();
    throw new Error(
      `Failed to create temporary config: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}
