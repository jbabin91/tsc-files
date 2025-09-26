import { existsSync } from 'node:fs';
import path from 'node:path';

/**
 * Find tsconfig.json file with context detection up directory tree
 * @param cwd - Current working directory to start search from
 * @param projectPath - Optional explicit path to tsconfig.json
 * @returns Absolute path to tsconfig.json file
 * @throws Error if no tsconfig.json is found
 */
export function findTsConfig(cwd: string, projectPath?: string): string {
  if (projectPath) {
    const resolvedPath = path.resolve(cwd, projectPath);
    if (!existsSync(resolvedPath)) {
      throw new Error(`TypeScript config not found: ${resolvedPath}`);
    }
    return resolvedPath;
  }

  let currentDir = path.resolve(cwd);
  const rootDir = path.parse(currentDir).root;

  while (currentDir !== rootDir) {
    const tsconfigPath = path.join(currentDir, 'tsconfig.json');
    if (existsSync(tsconfigPath)) {
      return tsconfigPath;
    }

    const parentDir = path.dirname(currentDir);
    if (parentDir === currentDir) {
      break;
    }
    currentDir = parentDir;
  }

  throw new Error(
    'No tsconfig.json found in current directory or any parent directories. Use --project to specify path.',
  );
}

/**
 * Find tsconfig.json for a specific file path
 * @param filePath - File path to find config for
 * @param projectPath - Optional explicit path to tsconfig.json
 * @returns Absolute path to tsconfig.json file
 */
export function findTsConfigForFile(
  filePath: string,
  projectPath?: string,
): string {
  const fileDir = path.dirname(path.resolve(filePath));
  return findTsConfig(fileDir, projectPath);
}
