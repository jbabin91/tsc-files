import { existsSync } from 'node:fs';
import path from 'node:path';

import fastGlob from 'fast-glob';

import { shouldIncludeJavaScriptFiles } from '@/config/parser';
import { getFileExtensions, hasValidExtension } from '@/utils/file-patterns';

/**
 * Check if a pattern represents a direct file (not a glob pattern)
 * @param pattern - File pattern to check
 * @returns True if pattern is a direct file path
 */
function isDirectFile(pattern: string): boolean {
  return (
    !pattern.includes('*') && !pattern.includes('{') && !pattern.includes('[')
  );
}

/**
 * Handle direct file resolution
 * @param pattern - Direct file pattern
 * @param cwd - Current working directory
 * @param regexPattern - File extension regex pattern
 * @returns Array of resolved file patterns for globbing
 */
async function handleDirectFile(
  pattern: string,
  cwd: string,
  regexPattern: RegExp,
): Promise<string[]> {
  const absolutePath = path.resolve(cwd, pattern);

  if (existsSync(absolutePath) && regexPattern.test(pattern)) {
    return [pattern];
  }

  if (existsSync(absolutePath)) {
    try {
      const fs = await import('node:fs/promises');
      const stat = await fs.stat(absolutePath);
      if (stat.isDirectory()) {
        const { globPattern } = getFileExtensions(
          shouldIncludeJavaScriptFiles(),
        );
        return [`${pattern}/**/*.${globPattern}`];
      }
    } catch {
      // If stat fails, treat as directory pattern
      const { globPattern } = getFileExtensions(shouldIncludeJavaScriptFiles());
      return [`${pattern}/**/*.${globPattern}`];
    }
  }

  return [];
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
 * Resolve files using fast-glob with TypeScript and optionally JavaScript patterns
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

  const globPatterns: string[] = [];

  for (const pattern of patterns) {
    if (isDirectFile(pattern)) {
      const directFilePatterns = await handleDirectFile(
        pattern,
        cwd,
        regexPattern,
      );
      globPatterns.push(...directFilePatterns);
    } else {
      const globFilePatterns = handleGlobPattern(pattern, includeJs);
      globPatterns.push(...globFilePatterns);
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
      unique: true, // Prevent duplicate results from overlapping patterns
      baseNameMatch: true, // Allow *.ts to match src/file.ts efficiently
      caseSensitiveMatch: false, // Better cross-platform compatibility
      ignore: ['**/node_modules/**', '**/dist/**', '**/*.d.ts'],
    });

    return files.filter((file) => regexPattern.test(file));
  } catch {
    // Fallback: filter patterns that match our regex and resolve them
    return patterns
      .filter((pattern) => regexPattern.test(pattern))
      .map((file) => path.resolve(cwd, file))
      .filter((file) => existsSync(file));
  }
}
