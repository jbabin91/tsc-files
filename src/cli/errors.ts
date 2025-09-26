import kleur from 'kleur';

import type { ErrorCategory } from '@/types/cli';
import type { CheckResult } from '@/types/core';

/**
 * Exit codes used by the CLI
 */
export const EXIT_CODES = {
  SUCCESS: 0,
  TYPE_ERROR: 1,
  CONFIG_ERROR: 2,
  SYSTEM_ERROR: 3,
  UNKNOWN_ERROR: 99,
} as const;

/**
 * Categorize an error based on its message
 */
export function categorizeError(message: string): ErrorCategory {
  // Configuration errors
  if (
    message.includes('tsconfig.json not found') ||
    message.includes('Failed to read tsconfig.json') ||
    message.includes('TypeScript config not found') ||
    message.includes('No tsconfig.json found') ||
    message.includes('Configuration Error')
  ) {
    return 'CONFIG_ERROR';
  }

  // System errors
  if (
    message.includes('TypeScript compiler failed') ||
    message.includes('TypeScript not found') ||
    message.includes('tsc') ||
    message.includes('System Error')
  ) {
    return 'SYSTEM_ERROR';
  }

  // Type errors are handled separately via CheckResult
  return 'UNKNOWN_ERROR';
}

/**
 * Get exit code for error category
 */
export function getExitCode(category: ErrorCategory): number {
  switch (category) {
    case 'CONFIG_ERROR': {
      return EXIT_CODES.CONFIG_ERROR;
    }
    case 'SYSTEM_ERROR': {
      return EXIT_CODES.SYSTEM_ERROR;
    }
    case 'TYPE_ERROR': {
      return EXIT_CODES.TYPE_ERROR;
    }
    case 'UNKNOWN_ERROR': {
      return EXIT_CODES.UNKNOWN_ERROR;
    }
  }
}

/**
 * Determine exit code from CheckResult
 */
export function getExitCodeFromResult(result: CheckResult): number {
  if (result.success) {
    return EXIT_CODES.SUCCESS;
  }

  // Check if any errors are configuration errors
  const hasConfigError = result.errors.some(
    (error) =>
      error.code === 'CONFIG_ERROR' ||
      error.message.includes('tsconfig.json') ||
      error.message.includes('TypeScript config not found') ||
      error.message.includes('No tsconfig.json found'),
  );

  if (hasConfigError) {
    return EXIT_CODES.CONFIG_ERROR;
  }

  return EXIT_CODES.TYPE_ERROR;
}

/**
 * Format error message with appropriate styling and tips
 */
export function formatError(
  category: ErrorCategory,
  message: string,
): { message: string; tip?: string } {
  switch (category) {
    case 'CONFIG_ERROR': {
      return {
        message: `${kleur.red('Configuration Error:')} ${kleur.dim(message)}`,
        tip: `${kleur.yellow('Tip:')} Use --project flag to specify a different tsconfig.json path`,
      };
    }
    case 'SYSTEM_ERROR': {
      return {
        message: `${kleur.red('System Error:')} ${kleur.dim(message)}`,
        tip: `${kleur.yellow('Tip:')} Ensure TypeScript is installed: npm install -D typescript`,
      };
    }
    case 'TYPE_ERROR': {
      return {
        message: `${kleur.red('Type Error:')} ${kleur.dim(message)}`,
      };
    }
    case 'UNKNOWN_ERROR': {
      return {
        message: `${kleur.red('Error:')} ${kleur.dim(message)}`,
      };
    }
  }
}

/**
 * Format configuration error from CheckResult
 */
export function formatConfigError(result: CheckResult): {
  message: string;
  tip: string;
} | null {
  const configError = result.errors.find(
    (error) =>
      error.code === 'CONFIG_ERROR' ||
      error.message.includes('tsconfig.json') ||
      error.message.includes('TypeScript config not found') ||
      error.message.includes('No tsconfig.json found'),
  );

  if (!configError) {
    return null;
  }

  return {
    message: `${kleur.red('Configuration Error:')} ${kleur.dim(configError.message)}`,
    tip: `${kleur.yellow('Tip:')} Use --project flag to specify a different tsconfig.json path`,
  };
}
