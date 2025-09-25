/**
 * Core type checking functionality
 */

import { randomBytes } from 'node:crypto';
import {
  existsSync,
  mkdirSync,
  readFileSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs';
import path from 'node:path';

import { execa } from 'execa';
import fastGlob from 'fast-glob';

import type { CheckOptions, CheckResult, TypeScriptError } from '@/types';

/**
 * Resolve files using fast-glob with TypeScript patterns
 */
async function resolveFiles(
  patterns: string[],
  cwd: string,
): Promise<string[]> {
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

      // Check if it's a TypeScript file
      if (existsSync(absolutePath) && /\.(ts|tsx)$/.test(pattern)) {
        globPatterns.push(pattern);
      }
      // Check if it's a directory - if so, convert to glob pattern
      else if (existsSync(absolutePath)) {
        try {
          const fs = await import('node:fs/promises');
          const stat = await fs.stat(absolutePath);
          if (stat.isDirectory()) {
            globPatterns.push(`${pattern}/**/*.{ts,tsx}`);
          }
        } catch {
          // If stat fails, treat as glob pattern
          globPatterns.push(`${pattern}/**/*.{ts,tsx}`);
        }
      }
    } else {
      // It's a glob pattern, use as-is but ensure it targets TypeScript files
      if (
        pattern.includes('.ts') ||
        pattern.includes('.tsx') ||
        pattern.includes('{ts,tsx}') ||
        pattern.includes('{tsx,ts}') ||
        !pattern.includes('.')
      ) {
        // If no extension specified, add TypeScript extensions
        if (pattern.includes('.')) {
          globPatterns.push(pattern);
        } else {
          globPatterns.push(`${pattern}/**/*.{ts,tsx}`);
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

    // Filter to only TypeScript files as a safety measure
    return files.filter((file) => /\.(ts|tsx)$/.test(file));
  } catch {
    // Fallback to simple pattern matching if glob fails
    return patterns
      .filter((pattern) => /\.(ts|tsx)$/.test(pattern))
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
 * Find TypeScript compiler executable
 */
function findTscPath(): string {
  // First try to find tsc in node_modules/.bin
  const localTsc = path.join(process.cwd(), 'node_modules', '.bin', 'tsc');
  if (existsSync(localTsc)) {
    return localTsc;
  }

  // Try to resolve from typescript package
  try {
    // eslint-disable-next-line unicorn/prefer-module
    const typescriptPkg = require.resolve('typescript/package.json');
    const typescriptDir = path.dirname(typescriptPkg);
    const tscPath = path.join(typescriptDir, 'bin', 'tsc');
    if (existsSync(tscPath)) {
      return tscPath;
    }
  } catch {
    // Fallback to global tsc
  }

  return 'tsc';
}

/**
 * Generate secure temp config path
 */
function getTempConfigPath(
  cwd: string,
  cacheDir?: string,
): { path: string; dir: string } {
  // Use provided cache dir or default to node_modules/.cache/tsc-files
  const baseDir =
    cacheDir ?? path.join(cwd, 'node_modules', '.cache', 'tsc-files');

  // Create cache directory if it doesn't exist
  if (!existsSync(baseDir)) {
    mkdirSync(baseDir, { recursive: true });
  }

  // Generate secure filename using crypto
  const randomSuffix = randomBytes(8).toString('hex');
  const filename = `tsconfig.${randomSuffix}.json`;

  return {
    path: path.join(baseDir, filename),
    dir: baseDir,
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

  // Find tsconfig.json first - this will throw if not found
  const tsconfigPath = findTsConfig(cwd, options.project);

  // Resolve files using fast-glob (supports patterns and individual files)
  const resolvedFiles = await resolveFiles(files, cwd);

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
  const { path: tempConfigPath } = getTempConfigPath(cwd, options.cacheDir);

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
    // Write temp config
    writeFileSync(tempConfigPath, JSON.stringify(tempConfig, null, 2));
    tempConfigCreated = true;

    if (options.verbose) {
      // eslint-disable-next-line no-console
      console.log(`Created temp config: ${tempConfigPath}`);
      // eslint-disable-next-line no-console
      console.log(`Checking ${absoluteFiles.length} files...`);
    }

    // Find TypeScript compiler
    const tscPath = findTscPath();

    // Run TypeScript compiler
    const args = ['--project', tempConfigPath];

    try {
      const result = await execa(tscPath, args, {
        cwd,
        timeout: 30_000, // 30 second timeout
        cleanup: true, // Kill process tree on abort
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
    // Clean up temp config file
    if (tempConfigCreated) {
      try {
        unlinkSync(tempConfigPath);
        if (options.verbose) {
          // eslint-disable-next-line no-console
          console.log(`Cleaned up temp config: ${tempConfigPath}`);
        }
      } catch {
        // Ignore cleanup errors
      }
    }
  }
}
