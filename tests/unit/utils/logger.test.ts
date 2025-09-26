import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import { type Logger, logger, resetLogger, setLogger } from '@/utils/logger';

describe('Logger', () => {
  let originalConsoleLog: typeof console.log;
  let originalConsoleWarn: typeof console.warn;
  let originalConsoleError: typeof console.error;

  beforeEach(() => {
    // Store original console methods
    originalConsoleLog = console.log;
    originalConsoleWarn = console.warn;
    originalConsoleError = console.error;

    // Mock console methods
    console.log = vi.fn();
    console.warn = vi.fn();
    console.error = vi.fn();
  });

  afterEach(() => {
    // Restore original console methods
    console.log = originalConsoleLog;
    console.warn = originalConsoleWarn;
    console.error = originalConsoleError;

    // Reset logger to default
    resetLogger();
  });

  describe('default logger', () => {
    test('should log info messages', () => {
      const message = 'Test info message';
      logger.info(message);

      expect(console.log).toHaveBeenCalledWith(message);
    });

    test('should log warn messages', () => {
      const message = 'Test warning message';
      logger.warn(message);

      expect(console.warn).toHaveBeenCalledWith(message);
    });

    test('should log error messages', () => {
      const message = 'Test error message';
      logger.error(message);

      expect(console.error).toHaveBeenCalledWith(message);
    });

    test('should log debug messages with prefix', () => {
      const message = 'Test debug message';
      logger.debug(message);

      expect(console.log).toHaveBeenCalledWith(`[DEBUG] ${message}`);
    });
  });

  describe('setLogger', () => {
    test('should replace logger with custom implementation', () => {
      const customInfo = vi.fn();
      const customWarn = vi.fn();
      const customError = vi.fn();
      const customDebug = vi.fn();

      const customLogger: Logger = {
        info: customInfo,
        warn: customWarn,
        error: customError,
        debug: customDebug,
      };

      setLogger(customLogger);

      const message = 'Test message';
      logger.info(message);
      logger.warn(message);
      logger.error(message);
      logger.debug(message);

      expect(customInfo).toHaveBeenCalledWith(message);
      expect(customWarn).toHaveBeenCalledWith(message);
      expect(customError).toHaveBeenCalledWith(message);
      expect(customDebug).toHaveBeenCalledWith(message);

      // Original console methods should not be called
      expect(console.log).not.toHaveBeenCalled();
      expect(console.warn).not.toHaveBeenCalled();
      expect(console.error).not.toHaveBeenCalled();
    });

    test('should allow partial logger replacement', () => {
      const customInfo = vi.fn();
      const customLogger: Partial<Logger> = {
        info: customInfo,
      };

      setLogger(customLogger as Logger);

      logger.info('Test info');
      logger.warn('Test warn'); // Should still use original

      expect(customInfo).toHaveBeenCalledWith('Test info');
      expect(console.warn).toHaveBeenCalledWith('Test warn');
    });
  });

  describe('resetLogger', () => {
    test('should reset logger to default implementation', () => {
      const customInfo = vi.fn();
      const customLogger: Logger = {
        info: customInfo,
        warn: vi.fn(),
        error: vi.fn(),
        debug: vi.fn(),
      };

      // Set custom logger
      setLogger(customLogger);
      logger.info('Custom message');
      expect(customInfo).toHaveBeenCalledWith('Custom message');

      // Reset to default
      resetLogger();
      logger.info('Default message');

      // Should now use console.log
      expect(console.log).toHaveBeenCalledWith('Default message');
    });

    test('should restore all logger methods to default', () => {
      const customLogger: Logger = {
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
        debug: vi.fn(),
      };

      setLogger(customLogger);
      resetLogger();

      logger.info('Info');
      logger.warn('Warn');
      logger.error('Error');
      logger.debug('Debug');

      expect(console.log).toHaveBeenCalledWith('Info');
      expect(console.warn).toHaveBeenCalledWith('Warn');
      expect(console.error).toHaveBeenCalledWith('Error');
      expect(console.log).toHaveBeenCalledWith('[DEBUG] Debug');
    });
  });

  describe('logger interface', () => {
    test('should implement Logger interface correctly', () => {
      expect(typeof logger.info).toBe('function');
      expect(typeof logger.warn).toBe('function');
      expect(typeof logger.error).toBe('function');
      expect(typeof logger.debug).toBe('function');
    });

    test('should handle empty messages', () => {
      logger.info('');
      logger.warn('');
      logger.error('');
      logger.debug('');

      expect(console.log).toHaveBeenCalledWith('');
      expect(console.warn).toHaveBeenCalledWith('');
      expect(console.error).toHaveBeenCalledWith('');
      expect(console.log).toHaveBeenCalledWith('[DEBUG] ');
    });

    test('should handle special characters in messages', () => {
      const specialMessage =
        'Test with special chars: !@#$%^&*()_+-=[]{}|;:,.<>?';

      logger.info(specialMessage);
      logger.warn(specialMessage);
      logger.error(specialMessage);
      logger.debug(specialMessage);

      expect(console.log).toHaveBeenCalledWith(specialMessage);
      expect(console.warn).toHaveBeenCalledWith(specialMessage);
      expect(console.error).toHaveBeenCalledWith(specialMessage);
      expect(console.log).toHaveBeenCalledWith(`[DEBUG] ${specialMessage}`);
    });
  });
});
