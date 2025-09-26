/**
 * Tests for execution/output-parser.ts
 */

import { describe, expect, it } from 'vitest';

import {
  parseAndSeparateOutput,
  parseTypeScriptOutput,
} from '@/execution/output-parser';

describe('execution/output-parser', () => {
  describe('parseTypeScriptOutput', () => {
    it('should parse TypeScript error output correctly', () => {
      const output = `src/index.ts(10,5): error TS2322: Type 'string' is not assignable to type 'number'.`;

      const result = parseTypeScriptOutput(output);

      expect(result).toEqual([
        {
          file: 'src/index.ts',
          line: 10,
          column: 5,
          message: "Type 'string' is not assignable to type 'number'.",
          code: 'TS2322',
          severity: 'error',
        },
      ]);
    });

    it('should parse TypeScript warning output correctly', () => {
      const output = `src/utils.ts(15,3): warning TS2531: Object is possibly 'null'.`;

      const result = parseTypeScriptOutput(output);

      expect(result).toEqual([
        {
          file: 'src/utils.ts',
          line: 15,
          column: 3,
          message: "Object is possibly 'null'.",
          code: 'TS2531',
          severity: 'warning',
        },
      ]);
    });

    it('should parse multiple errors and warnings', () => {
      const output = `
src/index.ts(10,5): error TS2322: Type 'string' is not assignable to type 'number'.
src/utils.ts(15,3): warning TS2531: Object is possibly 'null'.
src/components/Button.tsx(25,10): error TS2304: Cannot find name 'React'.
      `.trim();

      const result = parseTypeScriptOutput(output);

      expect(result).toHaveLength(3);
      expect(result[0]).toMatchObject({
        file: 'src/index.ts',
        severity: 'error',
        code: 'TS2322',
      });
      expect(result[1]).toMatchObject({
        file: 'src/utils.ts',
        severity: 'warning',
        code: 'TS2531',
      });
      expect(result[2]).toMatchObject({
        file: 'src/components/Button.tsx',
        severity: 'error',
        code: 'TS2304',
      });
    });

    it('should handle file paths with spaces', () => {
      const output = `src/my folder/file.ts(1,1): error TS2322: Type error.`;

      const result = parseTypeScriptOutput(output);

      expect(result[0]).toMatchObject({
        file: 'src/my folder/file.ts',
        line: 1,
        column: 1,
      });
    });

    it('should handle Windows-style file paths', () => {
      const output = `C:\\Users\\test\\project\\src\\index.ts(10,5): error TS2322: Type error.`;

      const result = parseTypeScriptOutput(output);

      expect(result[0]).toMatchObject({
        file: String.raw`C:\Users\test\project\src\index.ts`,
        line: 10,
        column: 5,
      });
    });

    it('should handle empty output', () => {
      const result = parseTypeScriptOutput('');

      expect(result).toEqual([]);
    });

    it('should handle output with no errors', () => {
      const output = `
      Found 0 errors. Watching for file changes.
      Compilation complete. Watching for file changes.
      `;

      const result = parseTypeScriptOutput(output);

      expect(result).toEqual([]);
    });

    it('should ignore non-error/warning lines', () => {
      const output = `
      Compiling TypeScript files...
      src/index.ts(10,5): error TS2322: Type 'string' is not assignable to type 'number'.
      Found 1 error. Watching for file changes.
      `;

      const result = parseTypeScriptOutput(output);

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        file: 'src/index.ts',
        severity: 'error',
      });
    });

    it('should handle different error code formats', () => {
      const output = `
src/index.ts(10,5): error TS2322: Type error.
src/utils.ts(15,3): error TS18003: No inputs were found in config file.
src/test.ts(5,1): warning TS6385: Symbol has already been declared.
      `.trim();

      const result = parseTypeScriptOutput(output);

      expect(result).toHaveLength(3);
      expect(result[0].code).toBe('TS2322');
      expect(result[1].code).toBe('TS18003');
      expect(result[2].code).toBe('TS6385');
    });

    it('should trim whitespace from file paths and messages', () => {
      const output = `  src/index.ts  (10,5): error TS2322:   Type error with spaces.  `;

      const result = parseTypeScriptOutput(output);

      expect(result[0]).toMatchObject({
        file: 'src/index.ts',
        message: 'Type error with spaces.',
      });
    });

    it('should handle complex error messages with special characters', () => {
      const output = `src/index.ts(10,5): error TS2322: Type '"hello"' is not assignable to type 'number | undefined'.`;

      const result = parseTypeScriptOutput(output);

      expect(result[0]).toMatchObject({
        message: `Type '"hello"' is not assignable to type 'number | undefined'.`,
      });
    });

    it('should handle messages with colons and parentheses', () => {
      const output = `src/api.ts(20,15): error TS2345: Argument of type '{ name: string; }' is not assignable to parameter of type 'User'.`;

      const result = parseTypeScriptOutput(output);

      expect(result[0]).toMatchObject({
        message: `Argument of type '{ name: string; }' is not assignable to parameter of type 'User'.`,
      });
    });
  });

  describe('parseAndSeparateOutput', () => {
    it('should separate errors and warnings correctly', () => {
      const output = `
src/index.ts(10,5): error TS2322: Type 'string' is not assignable to type 'number'.
src/utils.ts(15,3): warning TS2531: Object is possibly 'null'.
src/types.ts(5,10): error TS2304: Cannot find name 'Unknown'.
src/helpers.ts(8,2): warning TS6133: 'unused' is declared but never read.
      `.trim();

      const result = parseAndSeparateOutput(output);

      expect(result.errors).toHaveLength(2);
      expect(result.warnings).toHaveLength(2);
      expect(result.allErrors).toHaveLength(4);

      expect(result.errors[0]).toMatchObject({
        file: 'src/index.ts',
        severity: 'error',
      });
      expect(result.errors[1]).toMatchObject({
        file: 'src/types.ts',
        severity: 'error',
      });

      expect(result.warnings[0]).toMatchObject({
        file: 'src/utils.ts',
        severity: 'warning',
      });
      expect(result.warnings[1]).toMatchObject({
        file: 'src/helpers.ts',
        severity: 'warning',
      });
    });

    it('should handle output with only errors', () => {
      const output = `
src/index.ts(10,5): error TS2322: Type error.
src/utils.ts(15,3): error TS2304: Cannot find name.
      `.trim();

      const result = parseAndSeparateOutput(output);

      expect(result.errors).toHaveLength(2);
      expect(result.warnings).toHaveLength(0);
      expect(result.allErrors).toHaveLength(2);
    });

    it('should handle output with only warnings', () => {
      const output = `
src/index.ts(10,5): warning TS2531: Object is possibly 'null'.
src/utils.ts(15,3): warning TS6133: Variable is declared but never read.
      `.trim();

      const result = parseAndSeparateOutput(output);

      expect(result.errors).toHaveLength(0);
      expect(result.warnings).toHaveLength(2);
      expect(result.allErrors).toHaveLength(2);
    });

    it('should handle empty output', () => {
      const result = parseAndSeparateOutput('');

      expect(result).toEqual({
        errors: [],
        warnings: [],
        allErrors: [],
      });
    });

    it('should maintain order of errors and warnings', () => {
      const output = `
src/a.ts(1,1): warning TS1: Warning A.
src/b.ts(2,2): error TS2: Error B.
src/c.ts(3,3): warning TS3: Warning C.
src/d.ts(4,4): error TS4: Error D.
      `.trim();

      const result = parseAndSeparateOutput(output);

      expect(result.errors[0].file).toBe('src/b.ts');
      expect(result.errors[1].file).toBe('src/d.ts');
      expect(result.warnings[0].file).toBe('src/a.ts');
      expect(result.warnings[1].file).toBe('src/c.ts');

      expect(result.allErrors[0].file).toBe('src/a.ts');
      expect(result.allErrors[1].file).toBe('src/b.ts');
      expect(result.allErrors[2].file).toBe('src/c.ts');
      expect(result.allErrors[3].file).toBe('src/d.ts');
    });
  });

  describe('edge cases and robustness', () => {
    it('should handle malformed lines gracefully', () => {
      const output = `
This is not a valid error line
src/index.ts(10,5): error TS2322: Valid error.
Another malformed line
      `.trim();

      const result = parseTypeScriptOutput(output);

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        file: 'src/index.ts',
        message: 'Valid error.',
      });
    });

    it('should handle very large output efficiently', () => {
      const validError = `src/index.ts(10,5): error TS2322: Type error.`;
      const largeOutput = Array.from({ length: 1000 }, () => validError).join(
        '\n',
      );

      const result = parseTypeScriptOutput(largeOutput);

      expect(result).toHaveLength(1000);
      expect(result[0]).toMatchObject({
        file: 'src/index.ts',
        severity: 'error',
      });
    });

    it('should handle unusual line and column numbers', () => {
      const output = `src/index.ts(0,0): error TS2322: Zero position error.`;

      const result = parseTypeScriptOutput(output);

      expect(result[0]).toMatchObject({
        line: 0,
        column: 0,
      });
    });

    it('should handle very high line and column numbers', () => {
      const output = `src/index.ts(999999,888888): error TS2322: High position error.`;

      const result = parseTypeScriptOutput(output);

      expect(result[0]).toMatchObject({
        line: 999_999,
        column: 888_888,
      });
    });
  });
});
