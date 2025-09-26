/**
 * File pattern utilities for TypeScript and JavaScript file detection
 */

/**
 * TypeScript file extensions
 */
export const TS_EXTENSIONS = ['ts', 'tsx'] as const;

/**
 * JavaScript file extensions
 */
export const JS_EXTENSIONS = ['js', 'jsx'] as const;

/**
 * All supported file extensions
 */
export const ALL_EXTENSIONS = [...TS_EXTENSIONS, ...JS_EXTENSIONS] as const;

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

  // Check brace patterns - generate common combinations
  const braceCombinations = [
    `{${extensions.join(',')}}`,
    `{${[...extensions].toReversed().join(',')}}`,
  ];

  // Add pairwise combinations for smaller sets
  if (extensions.length === 2) {
    braceCombinations.push(
      `{${extensions[0]},${extensions[1]}}`,
      `{${extensions[1]},${extensions[0]}}`,
    );
  }

  // Add JavaScript-only combinations when included
  if (extensions.length === 4) {
    braceCombinations.push(
      `{${extensions[2]},${extensions[3]}}`, // {js,jsx}
      `{${extensions[3]},${extensions[2]}}`, // {jsx,js}
    );
  }

  // Add common 4-extension combinations
  if (extensions.length === 4) {
    const [ts, tsx, js, jsx] = extensions;
    braceCombinations.push(
      `{${ts},${tsx},${js},${jsx}}`,
      `{${tsx},${ts},${jsx},${js}}`,
      `{${ts},${js}}`,
      `{${js},${ts}}`,
    );
  }

  return braceCombinations.some((combo) => pattern.includes(combo));
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
