/**
 * @jbabin91/tsc-files - Run TypeScript compiler on specific files
 *
 * A modern, reliable TypeScript file checker that enables running TypeScript
 * compiler against specific files instead of the entire project.
 */

export { checkFiles } from './core/checker.js';
export type { CheckOptions, CheckResult, TypeScriptError } from './types.js';
