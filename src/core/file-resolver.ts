import { existsSync } from 'node:fs';
import path from 'node:path';

import { glob } from 'tinyglobby';

import { shouldIncludeJavaScriptFiles } from '@/config/tsconfig-resolver';
import { getFileExtensions, hasValidExtension } from '@/utils/file-patterns';

/**
 * Check if a pattern contains glob metacharacters
 * @param pattern - File pattern to check
 * @returns True if pattern is a glob pattern
 */
export function isGlobPattern(pattern: string): boolean {
  return (
    pattern.includes('*') || pattern.includes('{') || pattern.includes('[')
  );
}

/**
 * Check if a pattern represents a direct file (not a glob pattern)
 * @param pattern - File pattern to check
 * @returns True if pattern is a direct file path
 */
function isDirectFile(pattern: string): boolean {
  return !isGlobPattern(pattern);
}

/**
 * Handle direct file resolution
 * Returns either a validated absolute path or a glob pattern for directories
 * @param pattern - Direct file pattern
 * @param cwd - Current working directory
 * @param regexPattern - File extension regex pattern
 * @param tsconfigPath - Optional path to tsconfig.json for JavaScript inclusion
 * @returns Object with optional absolutePath or globPattern
 */
async function handleDirectFile(
  pattern: string,
  cwd: string,
  regexPattern: RegExp,
  tsconfigPath?: string,
): Promise<{ absolutePath?: string; globPattern?: string }> {
  const absolutePath = path.resolve(cwd, pattern);

  if (existsSync(absolutePath) && regexPattern.test(pattern)) {
    return { absolutePath };
  }

  if (existsSync(absolutePath)) {
    // Generate directory glob pattern (used in both try and catch)
    const { globPattern: extPattern } = getFileExtensions(
      shouldIncludeJavaScriptFiles(tsconfigPath),
    );
    const directoryGlobPattern = `${pattern}/**/*.${extPattern}`;

    try {
      const fs = await import('node:fs/promises');
      const stat = await fs.stat(absolutePath);
      if (stat.isDirectory()) {
        return { globPattern: directoryGlobPattern };
      }
    } catch {
      // If stat fails, treat as directory pattern
      return { globPattern: directoryGlobPattern };
    }
  }

  return {};
}

/**
 * Handle glob pattern resolution
 * @param pattern - Glob pattern
 * @param includeJs - Whether to include JavaScript files
 * @returns Array of resolved patterns for globbing
 */
function handleGlobPattern(pattern: string, includeJs: boolean): string[] {
  if (!hasValidExtension(pattern, includeJs)) {
    return [];
  }

  if (pattern.includes('.')) {
    return [pattern];
  }

  // Directory pattern without extension
  const { globPattern } = getFileExtensions(includeJs);
  return [`${pattern}/**/*.${globPattern}`];
}

/**
 * Pre-expand glob patterns to concrete file paths for tsconfig grouping
 * This ensures cross-package globs (e.g., `packages/*`) are expanded
 * before being grouped by their per-package tsconfig files.
 *
 * @param patterns - Array of file patterns (may include globs)
 * @param cwd - Current working directory
 * @returns Promise resolving to array of concrete file paths (no globs)
 */
export async function preExpandGlobsForGrouping(
  patterns: string[],
  cwd: string,
): Promise<string[]> {
  const directFiles: string[] = [];
  const globPatterns: string[] = [];

  for (const pattern of patterns) {
    if (isGlobPattern(pattern)) {
      // Check if it has valid TypeScript/JavaScript extension patterns
      if (hasValidExtension(pattern, true)) {
        globPatterns.push(pattern);
      }
    } else {
      directFiles.push(pattern);
    }
  }

  if (globPatterns.length === 0) {
    return directFiles;
  }

  // Expand glob patterns to concrete files
  const expandedFiles = await glob(globPatterns, {
    cwd,
    absolute: true,
    onlyFiles: true,
    ignore: ['**/node_modules/**', '**/dist/**', '**/*.d.ts'],
  });

  // Combine direct files with expanded glob results
  // Convert direct files to absolute paths for consistency
  const absoluteDirectFiles = directFiles.map((file) =>
    path.isAbsolute(file) ? file : path.resolve(cwd, file),
  );

  // Deduplicate in case a direct file was also matched by a glob
  return [...new Set([...absoluteDirectFiles, ...expandedFiles])];
}

/**
 * Resolve files using tinyglobby with TypeScript and optionally JavaScript patterns
 * Handles files with special characters by bypassing glob for validated direct files
 * @param patterns - Array of file patterns to resolve
 * @param cwd - Current working directory
 * @param tsconfigPath - Optional path to tsconfig.json for JavaScript inclusion
 * @returns Promise resolving to array of absolute file paths
 */
export async function resolveFiles(
  patterns: string[],
  cwd: string,
  tsconfigPath?: string,
): Promise<string[]> {
  const includeJs = shouldIncludeJavaScriptFiles(tsconfigPath);
  const { regexPattern } = getFileExtensions(includeJs);

  const directFiles: string[] = [];
  const globPatterns: string[] = [];
  const processedDirectPatterns = new Set<string>();

  for (const pattern of patterns) {
    if (isDirectFile(pattern)) {
      const result = await handleDirectFile(
        pattern,
        cwd,
        regexPattern,
        tsconfigPath,
      );

      if (result.absolutePath) {
        directFiles.push(result.absolutePath);
        processedDirectPatterns.add(pattern);
      } else if (result.globPattern) {
        globPatterns.push(result.globPattern);
      }
    } else {
      const globFilePatterns = handleGlobPattern(pattern, includeJs);
      globPatterns.push(...globFilePatterns);
    }
  }

  const results = [...directFiles];

  if (globPatterns.length > 0) {
    try {
      const files = await glob(globPatterns, {
        cwd,
        absolute: true,
        onlyFiles: true,
        ignore: ['**/node_modules/**', '**/dist/**', '**/*.d.ts'],
      });

      results.push(...files.filter((file) => regexPattern.test(file)));
    } catch {
      // Fallback: only process patterns that weren't already handled as direct files
      const fallbackFiles = patterns
        .filter((pattern) => !processedDirectPatterns.has(pattern))
        .filter((pattern) => regexPattern.test(pattern))
        .map((file) => path.resolve(cwd, file))
        .filter((file) => existsSync(file));

      results.push(...fallbackFiles);
    }
  }

  return results;
}
