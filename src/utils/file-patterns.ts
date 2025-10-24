/**
 * TypeScript file extensions (including modern module formats)
 */
export const TS_EXTENSIONS = [
  'ts',
  'tsx',
  'mts', // ES module TypeScript (TS 4.7+)
  'cts', // CommonJS TypeScript (TS 4.7+)
] as const;

/**
 * TypeScript declaration file extensions
 */
export const TS_DECLARATION_EXTENSIONS = [
  'd.ts',
  'd.mts', // ES module declarations (TS 4.7+)
  'd.cts', // CommonJS declarations (TS 4.7+)
] as const;

/**
 * JavaScript file extensions (including modern module formats)
 */
export const JS_EXTENSIONS = [
  'js',
  'jsx',
  'mjs', // ES module JavaScript
  'cjs', // CommonJS JavaScript
] as const;

/**
 * All supported file extensions
 */
export const ALL_EXTENSIONS = [...TS_EXTENSIONS, ...JS_EXTENSIONS] as const;

/**
 * All extensions including declaration files
 */
export const ALL_EXTENSIONS_WITH_DECLARATIONS = [
  ...TS_EXTENSIONS,
  ...TS_DECLARATION_EXTENSIONS,
  ...JS_EXTENSIONS,
] as const;

/**
 * Get file extensions to include based on TypeScript configuration
 * @param includeJs - Whether to include JavaScript files
 * @returns Object containing extensions, glob pattern, and regex pattern
 */
export function getFileExtensions(includeJs: boolean): {
  extensions: string[];
  globPattern: string;
  regexPattern: RegExp;
} {
  const extensions = includeJs
    ? [...TS_EXTENSIONS, ...JS_EXTENSIONS]
    : [...TS_EXTENSIONS];

  const globPattern = `{${extensions.join(',')}}`;
  const regexPattern = new RegExp(`\\.(${extensions.join('|')})$`);

  return { extensions, globPattern, regexPattern };
}

/**
 * Check if a pattern includes any of the specified extensions
 * @param pattern - File pattern to check
 * @param extensions - Extensions to look for
 * @returns True if pattern includes any extension
 */
function patternIncludesExtensions(
  pattern: string,
  extensions: readonly string[],
): boolean {
  // Check direct extension matches
  for (const ext of extensions) {
    if (pattern.includes(`.${ext}`)) {
      return true;
    }
  }

  // Extract brace pattern if present
  const braceRegex = /\{([^}]+)\}/;
  const braceMatch = braceRegex.exec(pattern);
  if (!braceMatch) {
    return false;
  }

  // Get extensions from the brace pattern
  const patternExtensions = braceMatch[1].split(',');

  // Check if all pattern extensions are in the allowed extensions
  return patternExtensions.every((ext) => extensions.includes(ext));
}

/**
 * Check if a file pattern has valid TypeScript/JavaScript extensions
 * @param pattern - File pattern to validate
 * @param includeJs - Whether to include JavaScript files
 * @returns True if pattern has valid extensions
 */
export function hasValidExtension(
  pattern: string,
  includeJs: boolean,
): boolean {
  const extensions = includeJs ? ALL_EXTENSIONS : TS_EXTENSIONS;

  // If pattern doesn't include a dot, assume it's a directory pattern
  if (!pattern.includes('.')) {
    return true;
  }

  return patternIncludesExtensions(pattern, extensions);
}

/**
 * Create a regex pattern for matching supported file extensions
 * @param includeJs - Whether to include JavaScript files
 * @returns Regex pattern for file matching
 */
export function createFileExtensionRegex(includeJs: boolean): RegExp {
  const extensions = includeJs ? ALL_EXTENSIONS : TS_EXTENSIONS;
  return new RegExp(`\\.(${extensions.join('|')})$`);
}

/**
 * Build glob pattern for file extensions
 * @param includeJs - Whether to include JavaScript files
 * @returns Glob pattern string
 */
export function buildGlobPattern(includeJs: boolean): string {
  const extensions = includeJs ? ALL_EXTENSIONS : TS_EXTENSIONS;
  return `{${extensions.join(',')}}`;
}

/**
 * Check if a file path is a TypeScript declaration file
 * @param filePath - File path to check
 * @returns True if file is a .d.ts, .d.mts, or .d.cts file
 */
export function isDeclarationFile(filePath: string): boolean {
  return TS_DECLARATION_EXTENSIONS.some((ext) => filePath.endsWith(`.${ext}`));
}

/**
 * Check if a file has a valid TypeScript or JavaScript extension
 * @param filePath - File path to check
 * @param includeJs - Whether to include JavaScript extensions
 * @param includeDeclarations - Whether to include declaration file extensions
 * @returns True if file has a valid extension
 */
export function hasValidFileExtension(
  filePath: string,
  includeJs: boolean,
  includeDeclarations = false,
): boolean {
  const extensionsToCheck = includeDeclarations
    ? includeJs
      ? ALL_EXTENSIONS_WITH_DECLARATIONS
      : [...TS_EXTENSIONS, ...TS_DECLARATION_EXTENSIONS]
    : includeJs
      ? ALL_EXTENSIONS
      : TS_EXTENSIONS;

  return extensionsToCheck.some((ext) => filePath.endsWith(`.${ext}`));
}
