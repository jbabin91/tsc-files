import { writeFileSync } from 'node:fs';

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
 * @param originalConfigPath - Path to original tsconfig.json
 * @param originalConfig - Parsed original TypeScript configuration
 * @param files - List of files to include in temporary config
 * @param options - Check options for compiler option overrides
 * @returns Temporary config file handle
 */
export function createTempConfig(
  originalConfigPath: string,
  originalConfig: TypeScriptConfig,
  files: string[],
  options: CheckOptions,
): TempConfigHandle {
  const tempHandle = createTempConfigPath(options.cacheDir);

  const tempConfig = {
    extends: originalConfigPath,
    include: files,
    compilerOptions: {
      ...originalConfig.compilerOptions,
      noEmit: options.noEmit !== false,
      skipLibCheck:
        options.skipLibCheck ?? originalConfig.compilerOptions?.skipLibCheck,
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
