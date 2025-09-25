/**
 * Core type checking functionality
 */

import { execFile } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import {
  existsSync,
  mkdirSync,
  readFileSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs';
import path from 'node:path';
import { promisify } from 'node:util';

import type { CheckOptions, CheckResult, TypeScriptError } from '../types.js';

const execFileAsync = promisify(execFile);

/**
 * Find tsconfig.json file starting from cwd
 */
function findTsConfig(cwd: string, projectPath?: string): string {
  if (projectPath) {
    const resolvedPath = path.resolve(cwd, projectPath);
    if (!existsSync(resolvedPath)) {
      throw new Error(`TypeScript config not found: ${resolvedPath}`);
    }
    return resolvedPath;
  }

  // Look for tsconfig.json in current directory
  const defaultPath = path.join(cwd, 'tsconfig.json');
  if (existsSync(defaultPath)) {
    return defaultPath;
  }

  throw new Error('No tsconfig.json found. Use --project to specify path.');
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

  // Filter TypeScript files
  const tsFiles = files.filter((file) => /\.(ts|tsx)$/.test(file));

  if (tsFiles.length === 0) {
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

  // Find tsconfig.json
  const tsconfigPath = findTsConfig(cwd, options.project);

  // Convert files to absolute paths
  const absoluteFiles = tsFiles.map((file) => path.resolve(cwd, file));

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
      const { stdout, stderr } = await execFileAsync(tscPath, args, {
        cwd,
        encoding: 'utf8',
      });

      // TypeScript returns 0 for success, non-zero for errors
      const allOutput = `${stdout}\n${stderr}`.trim();
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
      const error = execError as {
        stdout?: string;
        stderr?: string;
        code?: number;
        message?: string;
      };
      const allOutput = `${error.stdout ?? ''}\n${error.stderr ?? ''}`.trim();
      const errors = parseTypeScriptOutput(allOutput);

      // If no parseable errors found but execution failed, it's a system error
      if (errors.length === 0 && error.code !== 0) {
        throw new Error(
          `TypeScript compiler failed: ${allOutput || error.message}`,
        );
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
