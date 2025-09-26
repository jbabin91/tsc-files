import { z } from 'zod';

import type { CheckOptions } from '@/types/core';

/**
 * Raw CLI options as parsed by commander.js
 */
export type RawCliOptions = {
  project?: string;
  verbose?: boolean;
  json?: boolean;
  cache?: boolean;
  skipLibCheck?: boolean;
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
  skipLibCheck: z.boolean().default(false),
  verbose: z.boolean().default(false),
  cache: z.boolean().default(true),
  json: z.boolean().default(false),
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
    cwd,
  };
}

/**
 * Validate raw CLI options
 */
export function validateCliOptions(rawOptions: unknown): ValidatedCliOptions {
  return CliOptionsSchema.parse(
    typeof rawOptions === 'object' && rawOptions !== null ? rawOptions : {},
  );
}
