import { describe, expect, it } from 'vitest';

import {
  checkFiles,
  type CheckOptions,
  type CheckResult,
  type TypeScriptError,
} from '@/index';

describe('index', () => {
  it('should export checkFiles function', () => {
    expect(typeof checkFiles).toBe('function');
  });

  it('should export TypeScript types', () => {
    const options: CheckOptions = {
      verbose: true,
    };
    expect(options.verbose).toBe(true);

    const mockError: TypeScriptError = {
      file: 'test.ts',
      line: 1,
      column: 1,
      message: 'test error',
      code: 'TS2345',
      severity: 'error',
    };
    expect(mockError.severity).toBe('error');

    const mockResult: CheckResult = {
      success: true,
      errorCount: 0,
      warningCount: 0,
      errors: [],
      warnings: [],
      duration: 100,
      checkedFiles: ['test.ts'],
    };
    expect(mockResult.success).toBe(true);
  });
});
