import { describe, expect, it, vi } from 'vitest';

import {
  formatBold,
  formatConfigError,
  formatDim,
  formatError,
  formatFileLocation,
  formatGeneralError,
  formatInfo,
  formatSuccess,
  formatSystemError,
  formatTip,
  formatWarning,
} from '@/utils/error-formatter';

// Mock kleur
vi.mock('kleur', () => ({
  default: {
    red: vi.fn((str: string) => `[RED]${str}[/RED]`),
    yellow: vi.fn((str: string) => `[YELLOW]${str}[/YELLOW]`),
    green: vi.fn((str: string) => `[GREEN]${str}[/GREEN]`),
    cyan: vi.fn((str: string) => `[CYAN]${str}[/CYAN]`),
    dim: vi.fn((str: string) => `[DIM]${str}[/DIM]`),
    bold: vi.fn((str: string) => `[BOLD]${str}[/BOLD]`),
  },
}));

describe('utils/error-formatter', () => {
  describe('formatError', () => {
    it('should format error message with red color', () => {
      const result = formatError('Something went wrong');
      expect(result).toBe('[RED]Something went wrong[/RED]');
    });
  });

  describe('formatWarning', () => {
    it('should format warning message with yellow color', () => {
      const result = formatWarning('This is a warning');
      expect(result).toBe('[YELLOW]This is a warning[/YELLOW]');
    });
  });

  describe('formatSuccess', () => {
    it('should format success message with green color', () => {
      const result = formatSuccess('Operation completed');
      expect(result).toBe('[GREEN]Operation completed[/GREEN]');
    });
  });

  describe('formatInfo', () => {
    it('should format info message with cyan color', () => {
      const result = formatInfo('Additional information');
      expect(result).toBe('[CYAN]Additional information[/CYAN]');
    });
  });

  describe('formatTip', () => {
    it('should format tip message with yellow prefix', () => {
      const result = formatTip('Use --verbose for more details');
      expect(result).toBe(
        '[YELLOW]Tip:[/YELLOW] Use --verbose for more details',
      );
    });
  });

  describe('formatFileLocation', () => {
    it('should format file location with cyan color', () => {
      const result = formatFileLocation('src/index.ts', 10, 5);
      expect(result).toBe('[CYAN]src/index.ts:10:5[/CYAN]');
    });

    it('should handle zero line and column numbers', () => {
      const result = formatFileLocation('test.ts', 0, 0);
      expect(result).toBe('[CYAN]test.ts:0:0[/CYAN]');
    });
  });

  describe('formatDim', () => {
    it('should format message with dim styling', () => {
      const result = formatDim('Secondary information');
      expect(result).toBe('[DIM]Secondary information[/DIM]');
    });
  });

  describe('formatBold', () => {
    it('should format message with bold styling', () => {
      const result = formatBold('Important message');
      expect(result).toBe('[BOLD]Important message[/BOLD]');
    });
  });

  describe('formatConfigError', () => {
    it('should format configuration error with context', () => {
      const result = formatConfigError('Invalid tsconfig.json');
      expect(result).toBe(
        '[RED]Configuration Error:[/RED] [DIM]Invalid tsconfig.json[/DIM]',
      );
    });
  });

  describe('formatSystemError', () => {
    it('should format system error with context', () => {
      const result = formatSystemError('TypeScript not found');
      expect(result).toBe(
        '[RED]System Error:[/RED] [DIM]TypeScript not found[/DIM]',
      );
    });
  });

  describe('formatGeneralError', () => {
    it('should format general error with context', () => {
      const result = formatGeneralError('Unknown error occurred');
      expect(result).toBe(
        '[RED]Error:[/RED] [DIM]Unknown error occurred[/DIM]',
      );
    });
  });

  describe('color formatting combinations', () => {
    it('should handle multiple formatting calls', () => {
      const error = formatError('Error');
      const warning = formatWarning('Warning');
      const combined = `${error} ${warning}`;

      expect(combined).toBe('[RED]Error[/RED] [YELLOW]Warning[/YELLOW]');
    });

    it('should handle nested formatting concepts', () => {
      const boldError = formatBold(formatError('Critical'));
      // Note: This would result in nested formatting in real usage
      expect(boldError).toBe('[BOLD][RED]Critical[/RED][/BOLD]');
    });
  });

  describe('edge cases', () => {
    it('should handle empty strings', () => {
      expect(formatError('')).toBe('[RED][/RED]');
      expect(formatWarning('')).toBe('[YELLOW][/YELLOW]');
      expect(formatSuccess('')).toBe('[GREEN][/GREEN]');
    });

    it('should handle strings with special characters', () => {
      const specialMessage = 'Error: "file.ts" not found!';
      expect(formatError(specialMessage)).toBe(
        '[RED]Error: "file.ts" not found![/RED]',
      );
    });

    it('should handle very long messages', () => {
      const longMessage = 'A'.repeat(1000);
      const result = formatError(longMessage);
      expect(result).toBe(`[RED]${longMessage}[/RED]`);
    });
  });
});
