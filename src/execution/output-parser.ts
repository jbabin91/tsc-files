/**
 * TypeScript compiler output parsing utilities
 */

import type { TypeScriptError } from '@/types';

/**
 * Parse TypeScript compiler output for errors and warnings
 * @param output - Raw output from TypeScript compiler
 * @returns Array of parsed TypeScript errors and warnings
 */
export function parseTypeScriptOutput(output: string): TypeScriptError[] {
  const errors: TypeScriptError[] = [];
  const lines = output.split('\n');

  for (const line of lines) {
    const match =
      /^(.+?)\((\d+),(\d+)\):\s+(error|warning)\s+(TS\d+):\s+(.+)$/.exec(line);
    if (match) {
      const [, file, lineNumber, column, severity, code, message] = match;
      errors.push({
        file: file.trim(),
        line: Number.parseInt(lineNumber, 10),
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
 * Separate errors and warnings from TypeScript compiler output
 * @param output - Raw output from TypeScript compiler
 * @returns Object containing separated errors and warnings
 */
export function parseAndSeparateOutput(output: string): {
  errors: TypeScriptError[];
  warnings: TypeScriptError[];
  allErrors: TypeScriptError[];
} {
  const allErrors = parseTypeScriptOutput(output);
  const errors = allErrors.filter((e) => e.severity === 'error');
  const warnings = allErrors.filter((e) => e.severity === 'warning');

  return { errors, warnings, allErrors };
}
