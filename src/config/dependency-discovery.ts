import { createHash } from 'node:crypto';
import { readFileSync, statSync } from 'node:fs';
import path from 'node:path';

import type * as ts from 'typescript';

import type { TypeScriptConfig } from '@/config/tsconfig-resolver';
import {
  hasValidFileExtension,
  isDeclarationFile,
} from '@/utils/file-patterns';
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
 * Check if a file path is in node_modules (cross-platform)
 * @param filePath - File path to check
 * @returns True if path contains node_modules
 */
function isNodeModulesPath(filePath: string): boolean {
  // Normalize to forward slashes for consistent checking across platforms
  const normalized = filePath.split(path.sep).join('/');
  return normalized.includes('/node_modules/');
}

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
  // First, try to get setup files from test framework config
  const foundFiles: string[] = getSetupFilesFromConfig(configDir);

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
  includePatterns?: string[],
  excludePatterns?: string[],
): string {
  const rootFilesHash = computeHash(rootFiles.toSorted().join('|'));

  // Include pattern hashes to invalidate cache when patterns change
  // This ensures new ambient files matching patterns are discovered
  const patternsHash = computeHash(
    JSON.stringify({
      include: includePatterns?.toSorted() ?? [],
      exclude: excludePatterns?.toSorted() ?? [],
    }),
  );

  return `${tsconfigHash}-${rootFilesHash}-${patternsHash}-${configDir}`;
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
export async function discoverDependencyClosure(
  tsInstance: typeof ts,
  originalConfig: TypeScriptConfig,
  rootFiles: string[],
  configDir: string,
  verbose = false,
  includeFiles?: string[],
): Promise<DependencyClosure> {
  // Generate cache key
  const tsconfigContent = JSON.stringify(originalConfig);
  const tsconfigHash = computeHash(tsconfigContent);
  const includePatterns = originalConfig.include;
  const excludePatterns = originalConfig.exclude;
  const cacheKey = generateCacheKey(
    tsconfigHash,
    rootFiles,
    configDir,
    includePatterns,
    excludePatterns,
  );

  // Check cache
  const cached = closureCache.get(cacheKey);
  if (cached) {
    // Verify cache is still valid by checking mtime hash
    const currentMtimeHash = computeMtimeHash(cached.sourceFiles);

    // Also check if new ambient files have been added
    // This handles the case where a new .d.ts file matching existing patterns is created
    const currentAmbientFiles = await findAmbientDeclarations(
      configDir,
      originalConfig,
      false, // Don't verbose log on cache validation
    );

    const cachedAmbientFileCount = cached.sourceFiles.filter((f) =>
      isDeclarationFile(f),
    ).length;

    if (
      currentMtimeHash === cached.mtimeHash &&
      currentAmbientFiles.length === cachedAmbientFileCount
    ) {
      return {
        sourceFiles: cached.sourceFiles,
        cacheKey,
        discovered: cached.discovered,
        includedSetupFiles: cached.includedSetupFiles,
      };
    }

    // Cache invalid (files changed or new ambient files added), remove it
    if (verbose) {
      if (currentMtimeHash === cached.mtimeHash) {
        logger.info(
          `Cache invalidated: ambient file count changed (${cachedAmbientFileCount} → ${currentAmbientFiles.length})`,
        );
      } else {
        logger.info('Cache invalidated: file modifications detected');
      }
    }
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
    const includeJs =
      originalConfig.compilerOptions?.allowJs === true ||
      originalConfig.compilerOptions?.checkJs === true;

    let sourceFiles = program
      .getSourceFiles()
      .map((sf: ts.SourceFile) => sf.fileName)
      // Filter out node_modules files
      .filter((fileName: string) => {
        const relativePath = path.relative(configDir, fileName);
        return (
          !relativePath.startsWith('node_modules') &&
          !isNodeModulesPath(fileName) &&
          // Include all valid TypeScript, JavaScript, and declaration files
          hasValidFileExtension(fileName, includeJs, true)
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

    // Find and include ambient declaration files
    // These files are not imported but provide global types (e.g., vite-plugin-svgr, styled-components)
    const ambientFiles = await findAmbientDeclarations(
      configDir,
      originalConfig,
      verbose,
    );

    for (const ambientFile of ambientFiles) {
      if (!sourceFiles.includes(ambientFile)) {
        sourceFiles.push(ambientFile);
        if (verbose) {
          logger.info(`Including ambient declaration: ${ambientFile}`);
        }
      }
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
 * Find ambient declaration files matching tsconfig include patterns
 * These files are not imported but provide global types
 * @param configDir - Configuration directory
 * @param originalConfig - Parsed TypeScript configuration
 * @param verbose - Enable verbose logging
 * @returns Promise resolving to array of absolute paths to ambient declaration files
 */
async function findAmbientDeclarations(
  configDir: string,
  originalConfig: TypeScriptConfig,
  verbose = false,
): Promise<string[]> {
  const { glob } = await import('tinyglobby');

  // Get include and exclude patterns from tsconfig
  const includePatterns = originalConfig.include ?? ['**/*'];
  const excludePatterns = originalConfig.exclude ?? [];

  // Convert include patterns to declaration file patterns
  const declarationPatterns = includePatterns.flatMap((pattern) => {
    // If pattern already specifies .d.ts, keep it as-is
    if (pattern.includes('.d.ts')) {
      return [pattern];
    }

    // Remove explicit extensions from pattern
    const base = pattern
      .replace(/\.(ts|tsx|js|jsx|mts|cts|mjs|cjs)$/, '')
      .replace(/\*\.(ts|tsx)$/, '*')
      .replace(/\*\.(js|jsx)$/, '*');

    // Generate patterns for all declaration file types
    return [
      `${base}.d.ts`, // Standard declarations
      `${base}/**/*.d.ts`, // Nested declarations
      `${base}.d.mts`, // ES module declarations
      `${base}/**/*.d.mts`,
      `${base}.d.cts`, // CommonJS declarations
      `${base}/**/*.d.cts`,
      `${base}.gen.ts`, // Generated files (TanStack Router, GraphQL)
      `${base}/**/*.gen.ts`,
      `${base}.gen.mts`, // Generated ES modules
      `${base}/**/*.gen.mts`,
      `${base}.gen.cts`, // Generated CommonJS
      `${base}/**/*.gen.cts`,
      `${base}.gen.d.ts`, // Generated declarations
      `${base}/**/*.gen.d.ts`,
    ];
  });

  if (verbose) {
    logger.info(`Searching for ambient declarations with patterns:`);
    for (const p of declarationPatterns) {
      logger.info(`  - ${p}`);
    }
  }

  try {
    // Glob for ambient declaration files
    const ambientFiles = await glob(declarationPatterns, {
      cwd: configDir,
      absolute: true,
      onlyFiles: true,
      ignore: [
        ...excludePatterns,
        '**/node_modules/**',
        'node_modules/**',
        '**/dist/**',
        'dist/**',
        '**/build/**',
        'build/**',
        '**/.next/**',
        '.next/**',
      ],
    });

    // Deduplicate (glob might return same file from multiple patterns)
    const uniqueFiles = [...new Set(ambientFiles)].toSorted();

    if (verbose && uniqueFiles.length > 0) {
      logger.info(
        `✓ Found ${uniqueFiles.length} ambient/generated declaration files`,
      );
      for (const file of uniqueFiles) {
        const relative = path.relative(configDir, file);
        logger.info(`  - ${relative}`);
      }
    } else if (verbose) {
      logger.info('No ambient declaration files found');
    }

    return uniqueFiles;
  } catch (error) {
    if (verbose) {
      logger.warn(
        `Failed to glob for ambient declarations: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
    return [];
  }
}

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
