import { createHash } from 'node:crypto';
import { readFileSync, statSync } from 'node:fs';
import path from 'node:path';

import type * as ts from 'typescript';

import type { TypeScriptConfig } from '@/config/parser';
import { logger } from '@/utils/logger';

/**
 * Result of dependency closure discovery
 */
export type DependencyClosure = {
  /** List of source files required for typechecking */
  sourceFiles: string[];
  /** Cache key for this closure */
  cacheKey: string;
  /** Whether discovery succeeded or fell back to defaults */
  discovered: boolean;
  /** Setup files that were automatically included */
  includedSetupFiles: string[];
};

/**
 * Cache entry for dependency closures
 */
type ClosureCacheEntry = {
  sourceFiles: string[];
  discovered: boolean;
  createdAt: number;
  mtimeHash: string;
  includedSetupFiles: string[];
};

/**
 * In-memory cache for dependency closures
 */
const closureCache = new Map<string, ClosureCacheEntry>();

/**
 * Compute SHA-256 hash of file content or paths
 */
function computeHash(data: string): string {
  return createHash('sha256').update(data).digest('hex');
}

/**
 * Try to detect setup files from test framework configuration
 */
function getSetupFilesFromConfig(configDir: string): string[] {
  const foundFiles: string[] = [];

  // Common config file patterns
  const configFiles = [
    'vitest.config.ts',
    'vitest.config.js',
    'vitest.config.mjs',
    'jest.config.ts',
    'jest.config.js',
    'jest.config.mjs',
    'vite.config.ts',
    'vite.config.js',
    'vite.config.mjs',
  ];

  for (const configFile of configFiles) {
    const configPath = path.join(configDir, configFile);
    try {
      const content = readFileSync(configPath, 'utf8');

      // Look for setupFiles patterns in config (more flexible regex)
      const setupMatches = content.match(
        /setupFiles?(?:AfterEnv)?\s*:\s*\[([^\]]*)\]/g,
      );
      if (setupMatches) {
        for (const match of setupMatches) {
          // Extract file paths from the array
          const fileMatches = match.match(/['"`]([^'"`]+)['"`]/g);
          if (fileMatches) {
            for (const fileMatch of fileMatches) {
              const filePath = fileMatch.slice(1, -1); // Remove quotes
              // Resolve relative paths
              const resolvedPath = path.resolve(configDir, filePath);
              try {
                statSync(resolvedPath);
                foundFiles.push(resolvedPath);
              } catch {
                // File doesn't exist, skip
              }
            }
          }
        }
      }
    } catch {
      // Config file doesn't exist or can't be read, continue
    }
  }

  return foundFiles;
}

/**
 * Get potential setup files by searching common locations and patterns
 */
function getPotentialSetupFiles(configDir: string): string[] {
  const foundFiles: string[] = [];

  // First, try to get setup files from test framework config
  foundFiles.push(...getSetupFilesFromConfig(configDir));

  // Common test directories
  const testDirs = [
    'tests',
    'src/tests',
    '__tests__',
    'test',
    'src/test',
    'spec',
    'src/spec',
  ];

  // Common setup file patterns
  const setupPatterns = [
    'setup.ts',
    'setup.js',
    'setupTests.ts',
    'setupTests.js',
    'setup-tests.ts',
    'setup-tests.js',
    'setup_tests.ts',
    'setup_tests.js',
    'test-setup.ts',
    'test-setup.js',
    'testSetup.ts',
    'testSetup.js',
    'globals.ts',
    'globals.js',
    'test-globals.ts',
    'test-globals.js',
    'testGlobals.ts',
    'testGlobals.js',
  ];

  // Check each test directory
  for (const testDirName of testDirs) {
    const testDir = path.join(configDir, testDirName);

    // Check if test directory exists
    try {
      statSync(testDir);
    } catch {
      continue; // Directory doesn't exist
    }

    // Check for setup files in this directory
    for (const pattern of setupPatterns) {
      const filePath = path.join(testDir, pattern);
      try {
        statSync(filePath);
        foundFiles.push(filePath);
      } catch {
        // File doesn't exist, continue
      }
    }

    // Also check common subdirectories
    const subDirs = ['config', 'helpers', 'utils'];
    for (const subDir of subDirs) {
      const subDirPath = path.join(testDir, subDir);
      try {
        statSync(subDirPath);
      } catch {
        continue;
      }

      for (const pattern of setupPatterns) {
        const filePath = path.join(subDirPath, pattern);
        try {
          statSync(filePath);
          foundFiles.push(filePath);
        } catch {
          // File doesn't exist, continue
        }
      }
    }
  }

  // Remove duplicates and sort
  return [...new Set(foundFiles)].toSorted();
}

/**
 * Compute hash of modification times for a list of files
 */
function computeMtimeHash(filePaths: string[]): string {
  const mtimes = filePaths
    .map((filePath) => {
      try {
        return statSync(filePath).mtime.getTime().toString();
      } catch {
        return '0'; // File doesn't exist, use sentinel value
      }
    })
    .toSorted();

  return computeHash(mtimes.join('|'));
}

/**
 * Generate cache key for dependency closure
 */
function generateCacheKey(
  tsconfigHash: string,
  rootFiles: string[],
  configDir: string,
): string {
  const rootFilesHash = computeHash(rootFiles.toSorted().join('|'));
  return `${tsconfigHash}-${rootFilesHash}-${configDir}`;
}

/**
 * Check if any of the root files are test files that might need setup files
 */
function hasTestFiles(rootFiles: string[]): boolean {
  return rootFiles.some((file) => {
    // Check for common test directory patterns
    return (
      file.includes('/tests/') ||
      file.includes('\\tests\\') ||
      file.includes('/__tests__/') ||
      file.includes('\\__tests__\\') ||
      file.includes('/test/') ||
      file.includes('\\test\\') ||
      file.includes('/spec/') ||
      file.includes('\\spec\\') ||
      file.includes('/src/test') ||
      file.includes(String.raw`\src\test`) ||
      file.includes('/src/spec') ||
      file.includes(String.raw`\src\spec`)
    );
  });
}

/**
 * Discover the complete set of source files required to typecheck the given root files
 */
export function discoverDependencyClosure(
  tsInstance: typeof ts,
  originalConfig: TypeScriptConfig,
  rootFiles: string[],
  configDir: string,
  verbose = false,
  includeFiles?: string[],
): DependencyClosure {
  // Generate cache key
  const tsconfigContent = JSON.stringify(originalConfig);
  const tsconfigHash = computeHash(tsconfigContent);
  const cacheKey = generateCacheKey(tsconfigHash, rootFiles, configDir);

  // Check cache
  const cached = closureCache.get(cacheKey);
  if (cached) {
    // Verify cache is still valid by checking mtime hash
    const currentMtimeHash = computeMtimeHash(cached.sourceFiles);
    if (currentMtimeHash === cached.mtimeHash) {
      return {
        sourceFiles: cached.sourceFiles,
        cacheKey,
        discovered: cached.discovered,
        includedSetupFiles: cached.includedSetupFiles,
      };
    }
    // Cache invalid, remove it
    closureCache.delete(cacheKey);
  }

  // Perform discovery
  try {
    // Load and parse the original config
    const configFileName = path.join(configDir, 'tsconfig.json');
    const configFile = tsInstance.readConfigFile(
      configFileName,
      tsInstance.sys.readFile.bind(tsInstance.sys),
    );
    if (configFile.error) {
      throw new Error(
        `Failed to read tsconfig.json: ${tsInstance.flattenDiagnosticMessageText(configFile.error.messageText, '\n')}`,
      );
    }

    // Parse with extends resolution
    const parsedConfig = tsInstance.parseJsonConfigFileContent(
      configFile.config,
      tsInstance.sys,
      configDir,
      undefined,
      configFileName,
    );

    if (parsedConfig.errors.length > 0) {
      const errorText = tsInstance.formatDiagnostics(parsedConfig.errors, {
        getCurrentDirectory: () => configDir,
        getCanonicalFileName: (f: string) => f,
        getNewLine: () => '\n',
      });
      throw new Error(`Failed to parse tsconfig.json: ${errorText}`);
    }

    // Override files array with our selected roots
    const discoveryConfig = {
      ...parsedConfig.options,
      files: rootFiles,
      // Ensure we don't emit anything during discovery
      noEmit: true,
      // Skip lib check to avoid crawling node_modules
      skipLibCheck: true,
    };

    // Create program for discovery
    const program = tsInstance.createProgram({
      rootNames: rootFiles,
      options: discoveryConfig,
      configFileParsingDiagnostics: parsedConfig.errors,
    });

    // Extract source files from the program
    let sourceFiles = program
      .getSourceFiles()
      .map((sf: ts.SourceFile) => sf.fileName)
      // Filter out node_modules and declaration files we don't want
      .filter((fileName: string) => {
        const relativePath = path.relative(configDir, fileName);
        return (
          !relativePath.startsWith('node_modules') &&
          !fileName.includes('/node_modules/') &&
          // Include TypeScript and JavaScript files based on configuration
          (fileName.endsWith('.ts') ||
            fileName.endsWith('.tsx') ||
            fileName.endsWith('.d.ts') ||
            // Include JavaScript files when allowJs is enabled
            ((originalConfig.compilerOptions?.allowJs === true ||
              originalConfig.compilerOptions?.checkJs === true) &&
              (fileName.endsWith('.js') || fileName.endsWith('.jsx'))))
        );
      });

    // Include user-specified additional files
    if (includeFiles && includeFiles.length > 0) {
      for (const includePath of includeFiles) {
        if (!sourceFiles.includes(includePath)) {
          sourceFiles.push(includePath);
          if (verbose) {
            logger.info(`Including user-specified file: ${includePath}`);
          }
        } else if (verbose) {
          logger.info(`User-specified file already included: ${includePath}`);
        }
      }
    }

    // Include potential setup files for test files (fallback for when include is not specified)
    const includedSetupFiles: string[] = [];
    if (
      hasTestFiles(rootFiles) &&
      (!includeFiles || includeFiles.length === 0)
    ) {
      const setupFiles = getPotentialSetupFiles(configDir);
      let addedCount = 0;

      for (const setupPath of setupFiles) {
        if (!sourceFiles.includes(setupPath)) {
          sourceFiles.push(setupPath);
          includedSetupFiles.push(setupPath);
          addedCount++;
          if (verbose) {
            logger.info(`Including potential setup file: ${setupPath}`);
          }
        }
      }

      if (verbose && addedCount === 0 && setupFiles.length > 0) {
        logger.info(
          `All potential setup files already included: ${setupFiles.join(', ')}`,
        );
      } else if (verbose && setupFiles.length === 0) {
        logger.info(`No potential setup files found in tests directory`);
      }
    } else if (verbose && !hasTestFiles(rootFiles)) {
      logger.info(
        `No test files detected in root files: ${rootFiles.join(', ')}`,
      );
    }

    sourceFiles = sourceFiles.toSorted();

    // Compute mtime hash for cache validation
    const mtimeHash = computeMtimeHash(sourceFiles);

    // Cache the result
    closureCache.set(cacheKey, {
      sourceFiles,
      discovered: true,
      createdAt: Date.now(),
      mtimeHash,
      includedSetupFiles,
    });

    return {
      sourceFiles,
      cacheKey,
      discovered: true,
      includedSetupFiles,
    };
  } catch (error) {
    // Discovery failed, fall back to original behavior
    if (verbose) {
      logger.warn(
        `Dependency discovery failed: ${error instanceof Error ? error.message : String(error)}`,
      );
      logger.warn('Falling back to include patterns for type checking');
    }

    // Return empty closure with discovered: false
    closureCache.set(cacheKey, {
      sourceFiles: [],
      discovered: false,
      createdAt: Date.now(),
      mtimeHash: '',
      includedSetupFiles: [],
    });

    return {
      sourceFiles: [],
      cacheKey,
      discovered: false,
      includedSetupFiles: [],
    };
  }
}

/**
 * Clear the dependency closure cache
 */
export function clearDependencyCache(): void {
  closureCache.clear();
}

/**
 * Try to detect setup files from test framework configuration (exported for testing)
 */
export { getSetupFilesFromConfig };

/**
 * Get potential setup files by searching common locations and patterns (exported for testing)
 */
export { getPotentialSetupFiles };

/**
 * Get cache statistics for debugging
 */
export function getCacheStats(): {
  size: number;
  entries: { key: string; createdAt: number; fileCount: number }[];
} {
  const entries = [...closureCache.entries()].map(([key, entry]) => ({
    key,
    createdAt: entry.createdAt,
    fileCount: entry.sourceFiles.length,
  }));

  return {
    size: closureCache.size,
    entries,
  };
}
