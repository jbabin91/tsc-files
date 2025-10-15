import { z } from 'zod';

import type { CheckOptions } from '@/types/core';

/**
 * Raw CLI options as parsed by cleye
 */
export type RawCliOptions = {
  project?: string;
  verbose?: boolean;
  json?: boolean;
  cache?: boolean;
  skipLibCheck?: boolean;
  useTsc?: boolean;
  useTsgo?: boolean;
  showCompiler?: boolean;
  benchmark?: boolean;
  fallback?: boolean;
  tips?: boolean;
  include?: string;
};

/**
 * Validated and processed CLI options
 */
export type ValidatedCliOptions = {
  project?: string;
  noEmit: boolean;
  skipLibCheck: boolean;
  verbose: boolean;
  cache: boolean;
  json: boolean;
  useTsc: boolean;
  useTsgo: boolean;
  showCompiler: boolean;
  benchmark: boolean;
  fallback: boolean;
  tips: boolean;
  include?: string[];
};

/**
 * CLI execution result with exit code
 */
export type CliResult = {
  exitCode: number;
  stdout: string;
  stderr: string;
};

/**
 * Error categories for exit code determination
 */
export type ErrorCategory =
  | 'CONFIG_ERROR'
  | 'SYSTEM_ERROR'
  | 'TYPE_ERROR'
  | 'UNKNOWN_ERROR';

/**
 * Zod schema for validating CLI options
 */
export const CliOptionsSchema = z.object({
  project: z.string().optional(),
  noEmit: z.boolean().default(true),
  skipLibCheck: z.boolean().default(true),
  verbose: z.boolean().default(false),
  cache: z.boolean().default(true),
  json: z.boolean().default(false),
  useTsc: z.boolean().default(false),
  useTsgo: z.boolean().default(false),
  showCompiler: z.boolean().default(false),
  benchmark: z.boolean().default(false),
  fallback: z.boolean().default(true),
  tips: z.boolean().default(false),
  include: z.string().optional(),
});

/**
 * Convert validated CLI options to CheckOptions
 */
export function toCheckOptions(
  validated: ValidatedCliOptions,
  cwd?: string,
): CheckOptions {
  return {
    project: validated.project,
    noEmit: validated.noEmit,
    skipLibCheck: validated.skipLibCheck,
    verbose: validated.verbose,
    cache: validated.cache,
    useTsc: validated.useTsc,
    useTsgo: validated.useTsgo,
    showCompiler: validated.showCompiler,
    benchmark: validated.benchmark,
    fallback: validated.fallback,
    include: validated.include,
    cwd,
  };
}

/**
 * Validate raw CLI options
 */
export function validateCliOptions(rawOptions: unknown): ValidatedCliOptions {
  const parsed = CliOptionsSchema.parse(
    typeof rawOptions === 'object' && rawOptions !== null ? rawOptions : {},
  );

  // Validate conflicting compiler options
  if (parsed.useTsc && parsed.useTsgo) {
    throw new Error(
      'Cannot specify both --use-tsc and --use-tsgo flags. Choose one compiler.',
    );
  }

  // Parse include option from comma-separated string to array
  const include = parsed.include
    ? parsed.include
        .split(',')
        .map((s) => s.trim())
        .filter((s) => s.length > 0)
    : undefined;

  return {
    ...parsed,
    include,
  };
}
