/**
 * Error message formatting utilities
 */

import kleur from 'kleur';

/**
 * Format an error message with red color
 * @param message - Error message to format
 * @returns Formatted error message
 */
export function formatError(message: string): string {
  return kleur.red(message);
}

/**
 * Format a warning message with yellow color
 * @param message - Warning message to format
 * @returns Formatted warning message
 */
export function formatWarning(message: string): string {
  return kleur.yellow(message);
}

/**
 * Format a success message with green color
 * @param message - Success message to format
 * @returns Formatted success message
 */
export function formatSuccess(message: string): string {
  return kleur.green(message);
}

/**
 * Format an info message with cyan color
 * @param message - Info message to format
 * @returns Formatted info message
 */
export function formatInfo(message: string): string {
  return kleur.cyan(message);
}

/**
 * Format a tip message with yellow color and "Tip:" prefix
 * @param message - Tip message to format
 * @returns Formatted tip message
 */
export function formatTip(message: string): string {
  return `${kleur.yellow('Tip:')} ${message}`;
}

/**
 * Format a file location (file:line:column) with cyan color
 * @param file - File path
 * @param line - Line number
 * @param column - Column number
 * @returns Formatted file location
 */
export function formatFileLocation(
  file: string,
  line: number,
  column: number,
): string {
  return kleur.cyan(`${file}:${line}:${column}`);
}

/**
 * Format text with dim/gray color
 * @param message - Message to format
 * @returns Formatted dim message
 */
export function formatDim(message: string): string {
  return kleur.dim(message);
}

/**
 * Format text with bold styling
 * @param message - Message to format
 * @returns Formatted bold message
 */
export function formatBold(message: string): string {
  return kleur.bold(message);
}

/**
 * Format configuration error with context
 * @param message - Error message
 * @returns Formatted configuration error
 */
export function formatConfigError(message: string): string {
  return `${formatError('Configuration Error:')} ${formatDim(message)}`;
}

/**
 * Format system error with context
 * @param message - Error message
 * @returns Formatted system error
 */
export function formatSystemError(message: string): string {
  return `${formatError('System Error:')} ${formatDim(message)}`;
}

/**
 * Format general error with context
 * @param message - Error message
 * @returns Formatted general error
 */
export function formatGeneralError(message: string): string {
  return `${formatError('Error:')} ${formatDim(message)}`;
}
