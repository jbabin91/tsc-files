import path from 'node:path';

import { getTsconfig, parseTsconfig } from 'get-tsconfig';

/**
 * TypeScript compiler options interface
 */
export type TypeScriptCompilerOptions = {
  allowJs?: boolean;
  checkJs?: boolean;
  skipLibCheck?: boolean;
  noEmit?: boolean;
  [key: string]: unknown;
};

/**
 * TypeScript configuration interface
 */
export type TypeScriptConfig = {
  compilerOptions?: TypeScriptCompilerOptions;
  files?: string[];
  include?: string[];
  exclude?: string[];
  extends?: string;
  [key: string]: unknown;
};

/**
 * Find tsconfig.json file with context detection up directory tree
 *
 * @param cwd - Current working directory to start search from
 * @param projectPath - Optional explicit path to tsconfig.json
 * @returns Absolute path to tsconfig.json file
 * @throws Error if no tsconfig.json is found
 */
export function findTsConfig(cwd: string, projectPath?: string): string {
  if (projectPath) {
    const resolvedPath = path.resolve(cwd, projectPath);
    // parseTsconfig returns config directly, not an object with path
    // We validate it exists by catching the error, then return the path
    try {
      parseTsconfig(resolvedPath);
      return resolvedPath;
    } catch {
      throw new Error(`TypeScript config not found: ${resolvedPath}`);
    }
  }

  const result = getTsconfig(cwd);
  if (!result) {
    throw new Error(
      'No tsconfig.json found in current directory or any parent directories. Use --project to specify path.',
    );
  }
  return result.path;
}

/**
 * Find tsconfig.json for a specific file path
 *
 * @param filePath - File path to find config for
 * @param projectPath - Optional explicit path to tsconfig.json
 * @returns Absolute path to tsconfig.json file
 * @throws Error if no tsconfig.json is found
 */
export function findTsConfigForFile(
  filePath: string,
  projectPath?: string,
): string {
  if (projectPath) {
    return findTsConfig(path.dirname(filePath), projectPath);
  }

  const result = getTsconfig(path.dirname(filePath));
  if (!result) {
    throw new Error(
      `No tsconfig.json found for file: ${filePath}. Use --project to specify path.`,
    );
  }
  return result.path;
}

/**
 * Parse TypeScript configuration file with automatic extends resolution
 *
 * @param configPath - Path to tsconfig.json file
 * @returns Parsed TypeScript configuration with extends chain fully resolved
 * @throws Error if file cannot be read or parsed
 */
export function parseTypeScriptConfig(configPath: string): TypeScriptConfig {
  // parseTsconfig returns config directly, throws on error
  try {
    const config = parseTsconfig(configPath);
    // get-tsconfig returns fully resolved config with extends chain merged
    return config as TypeScriptConfig;
  } catch {
    throw new Error(`TypeScript config not found: ${configPath}`);
  }
}

/**
 * Check if JavaScript files should be included based on TypeScript configuration
 *
 * @param config - TypeScript configuration object
 * @returns True if JavaScript files should be included in type checking
 */
export function shouldIncludeJavaScript(config: TypeScriptConfig): boolean {
  const compilerOptions = config.compilerOptions;
  if (!compilerOptions) {
    return false;
  }

  return Boolean(
    (compilerOptions.allowJs ?? false) || (compilerOptions.checkJs ?? false),
  );
}

/**
 * Check if JavaScript files should be included based on TypeScript configuration file
 *
 * @param tsconfigPath - Path to tsconfig.json file
 * @returns True if JavaScript files should be included in type checking
 */
export function shouldIncludeJavaScriptFiles(tsconfigPath?: string): boolean {
  if (!tsconfigPath) {
    return false;
  }

  try {
    const config = parseTypeScriptConfig(tsconfigPath);
    return shouldIncludeJavaScript(config);
  } catch {
    return false;
  }
}
