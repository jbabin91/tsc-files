/**
 * TypeScript checker configuration options
 */
export type CheckOptions = {
  /** Path to tsconfig.json file */
  project?: string;
  /** Don't emit files (default: true) */
  noEmit?: boolean;
  /** Skip type checking of declaration files */
  skipLibCheck?: boolean;
  /** Use cache directory for temp files */
  cache?: boolean;
  /** Custom cache directory path */
  cacheDir?: string;
  /** Enable verbose output */
  verbose?: boolean;
  /** Working directory */
  cwd?: string;
  /** Throw error instead of returning result */
  throwOnError?: boolean;
  /** Force use of tsc compiler even if tsgo is available */
  useTsc?: boolean;
  /** Force use of tsgo compiler (fail if not available) */
  useTsgo?: boolean;
  /** Show which compiler is being used */
  showCompiler?: boolean;
  /** Run benchmark comparison between available compilers */
  benchmark?: boolean;
  /** Enable automatic fallback from tsgo to tsc (default: true) */
  fallback?: boolean;
  /** Additional files to include in type checking */
  include?: string[];
};

/**
 * TypeScript error/warning information
 */
export type TypeScriptError = {
  /** File path where error occurred */
  file: string;
  /** Line number (1-based) */
  line: number;
  /** Column number (1-based) */
  column: number;
  /** Error message */
  message: string;
  /** TypeScript error code (e.g., "TS2322") */
  code: string;
  /** Error severity */
  severity: 'error' | 'warning';
};

/**
 * Result of type checking operation
 */
export type CheckResult = {
  /** Whether type checking passed */
  success: boolean;
  /** Number of errors found */
  errorCount: number;
  /** Number of warnings found */
  warningCount: number;
  /** List of errors */
  errors: TypeScriptError[];
  /** List of warnings */
  warnings: TypeScriptError[];
  /** Duration in milliseconds */
  duration: number;
  /** List of files that were checked */
  checkedFiles: string[];
  /** Setup files that were automatically included */
  includedSetupFiles?: string[];
};

/**
 * Package manager types
 */
export type PackageManager = 'npm' | 'yarn' | 'pnpm' | 'bun' | 'unknown';

/**
 * Error source for error formatting
 */
export enum ErrorSource {
  /** TypeScript compiler errors */
  TSC = 'tsc',
  /** Our tool errors */
  TSC_FILES = 'tsc-files',
}
