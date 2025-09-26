/* eslint-disable no-console */
export type LogLevel = 'info' | 'warn' | 'error' | 'debug';

export type Logger = {
  info(message: string): void;
  warn(message: string): void;
  error(message: string): void;
  debug(message: string): void;
};

class ConsoleLogger implements Logger {
  info(message: string): void {
    console.log(message);
  }

  warn(message: string): void {
    console.warn(message);
  }

  error(message: string): void {
    console.error(message);
  }

  debug(message: string): void {
    console.log(`[DEBUG] ${message}`);
  }
}

// Default logger instance
export const logger: Logger = new ConsoleLogger();

// For testing - allows replacing the logger
export function setLogger(newLogger: Logger): void {
  // Replace each method individually to ensure proper binding
  if (newLogger.info)
    logger.info = (message: string) => newLogger.info(message);
  if (newLogger.warn)
    logger.warn = (message: string) => newLogger.warn(message);
  if (newLogger.error)
    logger.error = (message: string) => newLogger.error(message);
  if (newLogger.debug)
    logger.debug = (message: string) => newLogger.debug(message);
}

// For testing - allows resetting to default
export function resetLogger(): void {
  const defaultLogger = new ConsoleLogger();
  logger.info = (message: string) => defaultLogger.info(message);
  logger.warn = (message: string) => defaultLogger.warn(message);
  logger.error = (message: string) => defaultLogger.error(message);
  logger.debug = (message: string) => defaultLogger.debug(message);
}
