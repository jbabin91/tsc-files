import { existsSync, readFileSync } from 'node:fs';

import stripJsonComments from 'strip-json-comments';

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
 * Parse TypeScript configuration file (supports JSONC format with comments and trailing commas)
 * @param configPath - Path to tsconfig.json file
 * @returns Parsed TypeScript configuration
 * @throws Error if file cannot be read or parsed
 */
export function parseTypeScriptConfig(configPath: string): TypeScriptConfig {
  if (!existsSync(configPath)) {
    throw new Error(`TypeScript config not found: ${configPath}`);
  }

  try {
    const configContent = readFileSync(configPath, 'utf8');
    // Strip comments and trailing commas to support JSONC format (JSON with Comments)
    const strippedContent = stripJsonComments(configContent, {
      trailingCommas: true,
    });
    const config = JSON.parse(strippedContent) as TypeScriptConfig;
    return config;
  } catch (error) {
    throw new Error(
      `Failed to read tsconfig.json: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

/**
 * Check if JavaScript files should be included based on TypeScript configuration
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
 * @param tsconfigPath - Path to tsconfig.json file
 * @returns True if JavaScript files should be included in type checking
 */
export function shouldIncludeJavaScriptFiles(tsconfigPath?: string): boolean {
  if (!tsconfigPath || !existsSync(tsconfigPath)) {
    return false;
  }

  try {
    const config = parseTypeScriptConfig(tsconfigPath);
    return shouldIncludeJavaScript(config);
  } catch {
    return false;
  }
}
