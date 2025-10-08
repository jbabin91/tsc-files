import { writeFileSync } from 'node:fs';
import path from 'node:path';

import tmp from 'tmp';

import type { TypeScriptConfig } from '@/config/parser';
import type { CheckOptions } from '@/types/core';

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
};

/**
 * Generate secure temp config path using tmp library
 * @param cacheDir - Optional cache directory path (must be absolute or undefined)
 * @returns Temporary config file handle
 */
export function createTempConfigPath(cacheDir?: string): TempConfigHandle {
  // When cacheDir is an absolute path, tmp library requires it to be relative to OS temp dir
  // So we only use tmp.fileSync when cacheDir is undefined or already in a temp location
  // For project directories, we use tmp's default behavior (no dir option)
  const isAbsolutePath = cacheDir && path.isAbsolute(cacheDir);
  const shouldUseDefaultTmpDir = !cacheDir || isAbsolutePath;

  const tmpFile = tmp.fileSync({
    prefix: 'tsconfig.',
    postfix: '.json',
    mode: 0o600,
    dir: shouldUseDefaultTmpDir ? undefined : cacheDir,
    tmpdir: isAbsolutePath ? cacheDir : undefined,
    discardDescriptor: false,
    keep: false,
  });

  return {
    path: tmpFile.name,
    cleanup: tmpFile.removeCallback,
  };
}

/**
 * Create temporary TypeScript config with file list
 * @param originalConfig - Parsed original TypeScript configuration
 * @param files - List of files to include in temporary config
 * @param options - Check options for compiler option overrides
 * @param originalConfigDir - Directory containing the original tsconfig.json
 * @returns Temporary config file handle
 */
export function createTempConfig(
  originalConfig: TypeScriptConfig,
  files: string[],
  options: CheckOptions,
  originalConfigDir: string,
): TempConfigHandle {
  const tempHandle = createTempConfigPath(options.cacheDir);

  // Preserve ALL user compiler options (including types, typeRoots)
  // This ensures type checking matches user's environment exactly
  const sanitizedCompilerOptions = originalConfig.compilerOptions ?? {};

  // Convert relative paths to absolute paths to fix path alias resolution
  let adjustedCompilerOptions = { ...sanitizedCompilerOptions };

  // TypeScript type resolution strategy:
  // - tsgo does NOT support custom typeRoots (relies on default resolution)
  // - tsc works better with temp configs in project dir (not /tmp) for default resolution
  // - Solution: Create temp configs in project dir using options.cache Dir
  // - This allows both compilers to use default type resolution successfully
  //
  // We only add explicit typeRoots if:
  // 1. User explicitly set useTsc (forcing tsc usage), AND
  // 2. User hasn't already defined typeRoots, AND
  // 3. Temp config is in a different directory (cache not in project)
  const isCacheInProjectDir = options.cacheDir === originalConfigDir;
  const shouldAddTypeRoots =
    options.useTsc &&
    !sanitizedCompilerOptions.typeRoots &&
    !isCacheInProjectDir;

  if (shouldAddTypeRoots) {
    // When using tsc with temp config in /tmp, add explicit typeRoots
    // to find both @types/* packages and package-provided types (like vitest/globals)
    adjustedCompilerOptions.typeRoots = [
      path.resolve(originalConfigDir, 'node_modules/@types'),
      path.resolve(originalConfigDir, 'node_modules'),
    ];
  }
  // Otherwise: rely on default TypeScript type resolution (works for both tsc and tsgo)

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

  // Convert original include patterns to .d.ts-only patterns
  // This ensures ambient declarations are available without checking all .ts files
  const originalInclude = originalConfig.include ?? [];
  const dtsIncludePatterns = originalInclude
    .map((pattern) => {
      if (typeof pattern === 'string') {
        // Replace .ts/.tsx extensions with .d.ts
        return pattern
          .replace(/\.tsx?$/, '.d.ts')
          .replace(/\*\.ts$/, '*.d.ts')
          .replace(/\*\.tsx$/, '*.d.ts');
      }
      return pattern;
    })
    .filter((pattern) => pattern.includes('.d.ts'));

  const tempConfig = {
    // Copy base config structure but exclude dependency-related fields
    ...baseConfig,
    // Override with isolated settings
    extends: undefined,
    files,
    // Include only .d.ts files matching original include patterns
    // This ensures ambient type declarations are available without checking all files
    include: dtsIncludePatterns.length > 0 ? dtsIncludePatterns : ['**/*.d.ts'],
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
