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
 * @param cacheDir - Optional cache directory path
 * @returns Temporary config file handle
 */
export function createTempConfigPath(cacheDir?: string): TempConfigHandle {
  const tmpFile = tmp.fileSync({
    prefix: 'tsconfig.',
    postfix: '.json',
    mode: 0o600,
    dir: cacheDir,
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

  // Ensure TypeScript can find type definitions from user's node_modules
  adjustedCompilerOptions.typeRoots ??= [
    path.resolve(originalConfigDir, 'node_modules/@types'),
  ];

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

  const tempConfig = {
    // Copy base config structure but exclude dependency-related fields
    ...baseConfig,
    // Override with isolated settings
    extends: undefined,
    files,
    include: [],
    exclude: [],
    compilerOptions: {
      ...adjustedCompilerOptions,
      // Apply user overrides
      noEmit: options.noEmit !== false,
      skipLibCheck:
        options.skipLibCheck ??
        originalConfig.compilerOptions?.skipLibCheck ??
        true,
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
