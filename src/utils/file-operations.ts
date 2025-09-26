import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

/**
 * Check if a file exists at the given path
 * @param filePath - Path to check
 * @returns True if file exists
 */
export function fileExists(filePath: string): boolean {
  return existsSync(filePath);
}

/**
 * Read and parse a JSON file
 * @param filePath - Path to JSON file
 * @returns Parsed JSON object
 * @throws Error if file cannot be read or parsed
 */
export function readJsonFile<T = unknown>(filePath: string): T {
  if (!existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`);
  }

  try {
    const content = readFileSync(filePath, 'utf8');
    return JSON.parse(content) as T;
  } catch (error) {
    throw new Error(
      `Failed to parse JSON file ${filePath}: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

/**
 * Read a text file safely
 * @param filePath - Path to text file
 * @returns File content as string
 * @throws Error if file cannot be read
 */
export function readTextFile(filePath: string): string {
  if (!existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`);
  }

  try {
    return readFileSync(filePath, 'utf8');
  } catch (error) {
    throw new Error(
      `Failed to read file ${filePath}: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

/**
 * Resolve a file path relative to current working directory
 * @param filePath - File path to resolve
 * @param cwd - Current working directory (defaults to process.cwd())
 * @returns Absolute path
 */
export function resolveFromCwd(filePath: string, cwd?: string): string {
  return path.resolve(cwd ?? process.cwd(), filePath);
}

/**
 * Safely join path segments
 * @param segments - Path segments to join
 * @returns Joined path
 */
export function joinSafely(...segments: string[]): string {
  return path.join(...segments);
}

/**
 * Get directory name from file path
 * @param filePath - File path
 * @returns Directory name
 */
export function getDirectory(filePath: string): string {
  return path.dirname(filePath);
}

/**
 * Get file extension from file path
 * @param filePath - File path
 * @returns File extension (with dot)
 */
export function getExtension(filePath: string): string {
  return path.extname(filePath);
}

/**
 * Get filename without extension from file path
 * @param filePath - File path
 * @returns Filename without extension
 */
export function getBasename(filePath: string): string {
  return path.basename(filePath, path.extname(filePath));
}
