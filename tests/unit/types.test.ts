import { describe, expect, it } from 'vitest';

import { ErrorSource } from '../../src/types.js';

describe('Types', () => {
  describe('ErrorSource', () => {
    it('should have correct enum values', () => {
      expect(ErrorSource.TSC).toBe('tsc');
      expect(ErrorSource.TSC_FILES).toBe('tsc-files');
    });
  });
});
