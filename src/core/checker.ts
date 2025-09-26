/**
 * Core type checking functionality
 */

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import { execa } from 'execa';
import fastGlob from 'fast-glob';
import tmp from 'tmp';

import { findTypeScriptCompiler } from '@/detectors/typescript';
import type { CheckOptions, CheckResult, TypeScriptError } from '@/types';

// Set up graceful cleanup for all temp files
tmp.setGracefulCleanup();

/**
 * Check if JavaScript files should be included based on TypeScript configuration
 */
function shouldIncludeJavaScriptFiles(tsconfigPath?: string): boolean {
  if (!tsconfigPath || !existsSync(tsconfigPath)) {
    return false;
  }

  try {
    const configContent = readFileSync(tsconfigPath, 'utf8');
    const config = JSON.parse(configContent) as {
      compilerOptions?: {
        allowJs?: boolean;
        checkJs?: boolean;
      };
    };

    // Include JS files if allowJs or checkJs is enabled
    return Boolean(
      (config.compilerOptions?.allowJs ?? false) ||
        (config.compilerOptions?.checkJs ?? false),
    );
  } catch {
    // If we can't read the config, don't include JS files
    return false;
  }
}

/**
 * Get file extensions to include based on TypeScript configuration
 */
function getFileExtensions(includeJs: boolean): {
  extensions: string[];
  globPattern: string;
  regexPattern: RegExp;
} {
  const tsExtensions = ['ts', 'tsx'];
  const jsExtensions = ['js', 'jsx'];

  const extensions = includeJs
    ? [...tsExtensions, ...jsExtensions]
    : tsExtensions;

  const globPattern = `{${extensions.join(',')}}`;
  const regexPattern = new RegExp(`\\.(${extensions.join('|')})$`);

  return { extensions, globPattern, regexPattern };
}

/**
 * Resolve files using fast-glob with TypeScript and optionally JavaScript patterns
 */
async function resolveFiles(
  patterns: string[],
  cwd: string,
  tsconfigPath?: string,
): Promise<string[]> {
  // Check if JavaScript files should be included based on tsconfig
  const includeJs = shouldIncludeJavaScriptFiles(tsconfigPath);
  const { globPattern, regexPattern } = getFileExtensions(includeJs);

  // Convert single files and patterns to glob patterns
  const globPatterns: string[] = [];

  for (const pattern of patterns) {
    // Check if it's a direct file reference (no wildcards)
    const isDirectFile =
      !pattern.includes('*') &&
      !pattern.includes('{') &&
      !pattern.includes('[');

    if (isDirectFile) {
      const absolutePath = path.resolve(cwd, pattern);

      // Check if it's a valid TypeScript/JavaScript file
      if (existsSync(absolutePath) && regexPattern.test(pattern)) {
        globPatterns.push(pattern);
      }
      // Check if it's a directory - if so, convert to glob pattern
      else if (existsSync(absolutePath)) {
        try {
          const fs = await import('node:fs/promises');
          const stat = await fs.stat(absolutePath);
          if (stat.isDirectory()) {
            globPatterns.push(`${pattern}/**/*.${globPattern}`);
          }
        } catch {
          // If stat fails, treat as glob pattern
          globPatterns.push(`${pattern}/**/*.${globPattern}`);
        }
      }
    } else {
      // It's a glob pattern, use as-is but ensure it targets the right file types
      const hasValidExtension = includeJs
        ? pattern.includes('.ts') ||
          pattern.includes('.tsx') ||
          pattern.includes('.js') ||
          pattern.includes('.jsx') ||
          pattern.includes('{ts,tsx}') ||
          pattern.includes('{tsx,ts}') ||
          pattern.includes('{js,jsx}') ||
          pattern.includes('{jsx,js}') ||
          pattern.includes('{ts,js}') ||
          pattern.includes('{js,ts}') ||
          pattern.includes('{ts,tsx,js,jsx}') ||
          pattern.includes('{tsx,ts,jsx,js}') ||
          !pattern.includes('.')
        : pattern.includes('.ts') ||
          pattern.includes('.tsx') ||
          pattern.includes('{ts,tsx}') ||
          pattern.includes('{tsx,ts}') ||
          !pattern.includes('.');

      if (hasValidExtension) {
        // If no extension specified, add appropriate extensions
        if (pattern.includes('.')) {
          globPatterns.push(pattern);
        } else {
          globPatterns.push(`${pattern}/**/*.${globPattern}`);
        }
      }
    }
  }

  if (globPatterns.length === 0) {
    return [];
  }

  try {
    const files = await fastGlob(globPatterns, {
      cwd,
      absolute: true,
      onlyFiles: true,
      ignore: ['**/node_modules/**', '**/dist/**', '**/*.d.ts'],
    });

    // Filter to only valid TypeScript/JavaScript files as a safety measure
    return files.filter((file) => regexPattern.test(file));
  } catch {
    // Fallback to simple pattern matching if glob fails
    return patterns
      .filter((pattern) => regexPattern.test(pattern))
      .map((file) => path.resolve(cwd, file))
      .filter((file) => existsSync(file));
  }
}

/**
 * Find tsconfig.json file with context detection up directory tree
 */
function findTsConfig(cwd: string, projectPath?: string): string {
  if (projectPath) {
    const resolvedPath = path.resolve(cwd, projectPath);
    if (!existsSync(resolvedPath)) {
      throw new Error(`TypeScript config not found: ${resolvedPath}`);
    }
    return resolvedPath;
  }

  // Context detection: traverse up directory tree looking for tsconfig.json
  let currentDir = path.resolve(cwd);
  const rootDir = path.parse(currentDir).root;

  while (currentDir !== rootDir) {
    const tsconfigPath = path.join(currentDir, 'tsconfig.json');
    if (existsSync(tsconfigPath)) {
      return tsconfigPath;
    }

    // Move up one directory
    const parentDir = path.dirname(currentDir);
    if (parentDir === currentDir) {
      // Reached filesystem root without finding parent
      break;
    }
    currentDir = parentDir;
  }

  throw new Error(
    'No tsconfig.json found in current directory or any parent directories. Use --project to specify path.',
  );
}

/**
 * Generate secure temp config path using tmp library
 */
function getTempConfigPath(cacheDir?: string): {
  path: string;
  cleanup: () => void;
} {
  const tmpFile = tmp.fileSync({
    prefix: 'tsconfig.',
    postfix: '.json',
    mode: 0o600, // Restrictive permissions (owner read/write only)
    dir: cacheDir, // Use custom cache dir if provided
    discardDescriptor: false,
    keep: false, // Auto cleanup on process exit
  });

  return {
    path: tmpFile.name,
    cleanup: tmpFile.removeCallback,
  };
}

/**
 * Parse TypeScript compiler output for errors
 */
function parseTypeScriptOutput(output: string): TypeScriptError[] {
  const errors: TypeScriptError[] = [];
  const lines = output.split('\n');

  for (const line of lines) {
    // Match TypeScript error format: file.ts(line,col): error TSxxxx: message
    const match =
      /^(.+?)\((\d+),(\d+)\):\s+(error|warning)\s+(TS\d+):\s+(.+)$/.exec(line);
    if (match) {
      const [, file, line, column, severity, code, message] = match;
      errors.push({
        file: file.trim(),
        line: Number.parseInt(line, 10),
        column: Number.parseInt(column, 10),
        message: message.trim(),
        code,
        severity: severity as 'error' | 'warning',
      });
    }
  }

  return errors;
}

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
      // For patterns/globs, use the current directory to find tsconfig
      // For actual file paths, use the file's directory
      const isPattern =
        file.includes('*') || file.includes('{') || file.includes('[');
      const searchDir = isPattern ? cwd : path.dirname(path.resolve(cwd, file));

      const tsconfigPath = findTsConfig(searchDir);

      // Group files by their tsconfig path
      const existingFiles = groups.get(tsconfigPath) ?? [];
      existingFiles.push(file);
      groups.set(tsconfigPath, existingFiles);
    } catch (error) {
      // If we can't find tsconfig for a file, group it under a fallback
      const errorKey = `__ERROR__${error instanceof Error ? error.message : String(error)}`;
      const existingFiles = groups.get(errorKey) ?? [];
      existingFiles.push(file);
      groups.set(errorKey, existingFiles);
    }
  }

  return groups;
}

/**
 * Check files for a single tsconfig.json configuration
 */
async function checkFilesWithSingleConfig(
  files: string[],
  tsconfigPath: string,
  options: CheckOptions,
  startTime: number,
): Promise<CheckResult> {
  const cwd = options.cwd ?? process.cwd();

  // Resolve files using fast-glob (supports patterns and individual files)
  const resolvedFiles = await resolveFiles(files, cwd, tsconfigPath);

  if (resolvedFiles.length === 0) {
    if (options.verbose) {
      // eslint-disable-next-line no-console
      console.log('No TypeScript files to check');
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

  // Files are already absolute from resolveFiles
  const absoluteFiles = resolvedFiles;

  // Read existing tsconfig
  let existingConfig: { compilerOptions?: Record<string, unknown> };
  try {
    const configContent = readFileSync(tsconfigPath, 'utf8');
    existingConfig = JSON.parse(configContent) as {
      compilerOptions?: Record<string, unknown>;
    };
  } catch (error) {
    throw new Error(
      `Failed to read tsconfig.json: ${error instanceof Error ? error.message : String(error)}`,
    );
  }

  // Generate temp config
  const { path: tempConfigPath, cleanup: cleanupTempConfig } =
    getTempConfigPath(options.cacheDir);

  const tempConfig = {
    extends: tsconfigPath,
    include: absoluteFiles,
    compilerOptions: {
      ...existingConfig.compilerOptions,
      noEmit: options.noEmit !== false,
      skipLibCheck:
        options.skipLibCheck ??
        (existingConfig.compilerOptions?.skipLibCheck as boolean | undefined),
    },
  };

  let tempConfigCreated = false;

  try {
    // Find TypeScript compiler with package manager integration
    const tsInfo = findTypeScriptCompiler(cwd);

    // Write temp config
    writeFileSync(tempConfigPath, JSON.stringify(tempConfig, null, 2));
    tempConfigCreated = true;

    if (options.verbose) {
      // eslint-disable-next-line no-console
      console.log(`Created temp config: ${tempConfigPath}`);
      // eslint-disable-next-line no-console
      console.log(`Checking ${absoluteFiles.length} files...`);
      // eslint-disable-next-line no-console
      console.log(`Using ${tsInfo.packageManager.manager} package manager`);
    }

    // Run TypeScript compiler
    const args = [...tsInfo.args, '--project', tempConfigPath];

    try {
      const result = await execa(tsInfo.executable, args, {
        cwd,
        timeout: 30_000, // 30 second timeout
        cleanup: true, // Kill process tree on abort
        shell: tsInfo.useShell,
      });

      // TypeScript returns 0 for success, non-zero for errors
      const allOutput = `${result.stdout}\n${result.stderr}`.trim();
      const errors = parseTypeScriptOutput(allOutput);

      const errorList = errors.filter((e) => e.severity === 'error');
      const warningList = errors.filter((e) => e.severity === 'warning');

      return {
        success: errorList.length === 0,
        errorCount: errorList.length,
        warningCount: warningList.length,
        errors: errorList,
        warnings: warningList,
        duration: Math.round(performance.now() - startTime),
        checkedFiles: absoluteFiles,
      };
    } catch (execError: unknown) {
      // TypeScript exits with non-zero on type errors, which is expected
      // Type-safe error property access
      const stdout =
        typeof execError === 'object' &&
        execError !== null &&
        'stdout' in execError &&
        typeof execError.stdout === 'string'
          ? execError.stdout
          : '';

      const stderr =
        typeof execError === 'object' &&
        execError !== null &&
        'stderr' in execError &&
        typeof execError.stderr === 'string'
          ? execError.stderr
          : '';

      const exitCode =
        typeof execError === 'object' &&
        execError !== null &&
        'exitCode' in execError &&
        typeof execError.exitCode === 'number'
          ? execError.exitCode
          : 1;

      const message =
        typeof execError === 'object' &&
        execError !== null &&
        'message' in execError &&
        typeof execError.message === 'string'
          ? execError.message
          : String(execError);

      const allOutput = `${stdout}\n${stderr}`.trim();
      const errors = parseTypeScriptOutput(allOutput);

      // If no parseable errors found but execution failed, it's a system error
      if (errors.length === 0 && exitCode !== 0) {
        throw new Error(`TypeScript compiler failed: ${allOutput || message}`);
      }

      const errorList = errors.filter((e) => e.severity === 'error');
      const warningList = errors.filter((e) => e.severity === 'warning');

      return {
        success: errorList.length === 0,
        errorCount: errorList.length,
        warningCount: warningList.length,
        errors: errorList,
        warnings: warningList,
        duration: Math.round(performance.now() - startTime),
        checkedFiles: absoluteFiles,
      };
    }
  } catch (error) {
    if (options.throwOnError) {
      throw error;
    }

    throw new Error(
      `Type checking failed: ${error instanceof Error ? error.message : String(error)}`,
    );
  } finally {
    // Clean up temp config file using tmp library cleanup
    if (tempConfigCreated) {
      try {
        cleanupTempConfig();
        if (options.verbose) {
          // eslint-disable-next-line no-console
          console.log(`Cleaned up temp config: ${tempConfigPath}`);
        }
      } catch {
        // Ignore cleanup errors - tmp library handles this gracefully
      }
    }
  }
}

/**
 * Check TypeScript files for type errors
 *
 * @param files - Array of file paths to check
 * @param options - Configuration options
 * @returns Promise resolving to check results
 */
export async function checkFiles(
  files: string[],
  options: CheckOptions = {},
): Promise<CheckResult> {
  const startTime = performance.now();
  const cwd = options.cwd ?? process.cwd();

  // Early validation: if explicit project is specified, validate it exists
  if (options.project) {
    try {
      findTsConfig(cwd, options.project);
    } catch (error) {
      // Default is to throw, only return result if throwOnError is explicitly false
      if (options.throwOnError === false) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        return {
          success: false,
          errorCount: 1,
          warningCount: 0,
          errors: [
            {
              file: 'config',
              line: 1,
              column: 1,
              message: errorMessage,
              code: 'CONFIG_ERROR',
              severity: 'error' as const,
            },
          ],
          warnings: [],
          duration: Math.round(performance.now() - startTime),
          checkedFiles: [],
        };
      }

      // Throw by default or when throwOnError is true
      throw error;
    }
  }

  // If explicit project is specified, we can resolve files immediately with proper JS support
  if (options.project) {
    const tsconfigPath = findTsConfig(cwd, options.project);
    const resolvedFiles = await resolveFiles(files, cwd, tsconfigPath);

    if (resolvedFiles.length === 0) {
      if (options.verbose) {
        // eslint-disable-next-line no-console
        console.log('No TypeScript/JavaScript files to check');
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

    return await checkFilesWithSingleConfig(
      resolvedFiles,
      tsconfigPath,
      options,
      startTime,
    );
  }

  // For multi-tsconfig scenarios, we need to group files by tsconfig first,
  // then resolve files with the appropriate JavaScript support for each group
  const rawFileGroups = groupRawFilesByTsConfig(files, options);

  // Handle error cases where files couldn't be grouped
  const errorGroups = [...rawFileGroups.keys()].filter((key) =>
    key.startsWith('__ERROR__'),
  );
  if (errorGroups.length > 0) {
    const errorMessage = errorGroups[0].replace('__ERROR__', '');

    // Default is to throw, only return result if throwOnError is explicitly false
    if (options.throwOnError === false) {
      return {
        success: false,
        errorCount: 1,
        warningCount: 0,
        errors: [
          {
            file: 'config',
            line: 1,
            column: 1,
            message: errorMessage,
            code: 'CONFIG_ERROR',
            severity: 'error' as const,
          },
        ],
        warnings: [],
        duration: Math.round(performance.now() - startTime),
        checkedFiles: [],
      };
    }

    // Throw by default or when throwOnError is true
    throw new Error(errorMessage);
  }

  if (rawFileGroups.size === 0) {
    if (options.verbose) {
      // eslint-disable-next-line no-console
      console.log('No TypeScript/JavaScript files to check');
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

  // Process each group and resolve files with proper JavaScript support
  const allResults: CheckResult[] = [];
  const allCheckedFiles: string[] = [];
  const allErrors: TypeScriptError[] = [];
  const allWarnings: TypeScriptError[] = [];

  if (rawFileGroups.size > 1 && options.verbose) {
    // eslint-disable-next-line no-console
    console.log(
      `Monorepo detected: processing ${rawFileGroups.size} different tsconfig groups`,
    );
  }

  // Process each group in parallel for better performance
  const groupPromises = [...rawFileGroups.entries()].map(
    async ([tsconfigPath, groupFiles]) => {
      // Resolve files with proper JavaScript support for this tsconfig
      const resolvedFiles = await resolveFiles(groupFiles, cwd, tsconfigPath);

      if (resolvedFiles.length === 0) {
        // Return empty successful result for groups with no matching files
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

      if (options.verbose) {
        // eslint-disable-next-line no-console
        console.log(
          `Processing group with ${resolvedFiles.length} files using ${tsconfigPath}`,
        );
      }

      return await checkFilesWithSingleConfig(
        resolvedFiles,
        tsconfigPath,
        options,
        startTime,
      );
    },
  );

  const groupResults = await Promise.all(groupPromises);

  // Aggregate results from all groups
  for (const result of groupResults) {
    allResults.push(result);
    allCheckedFiles.push(...result.checkedFiles);
    allErrors.push(...result.errors);
    allWarnings.push(...result.warnings);
  }

  // Calculate overall success (all groups must succeed)
  const overallSuccess = allResults.every((result) => result.success);

  return {
    success: overallSuccess,
    errorCount: allErrors.length,
    warningCount: allWarnings.length,
    errors: allErrors,
    warnings: allWarnings,
    duration: Math.round(performance.now() - startTime),
    checkedFiles: allCheckedFiles,
  };
}
