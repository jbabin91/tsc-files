import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { checkFiles } from '@/core/checker';

/**
 * Integration tests for TypeScript type resolution from files not in temp config
 *
 * These tests verify that TypeScript can resolve types from .ts files that aren't
 * explicitly included in the temporary config's `files` or `include` arrays.
 *
 * Context: Our temp configs have:
 * - files: [only the files being checked]
 * - include: [all .d.ts files] (for ambient declarations)
 * - exclude: ['node_modules', 'dist']
 *
 * Question: Can TypeScript follow imports to resolve types from excluded .ts files?
 * Answer: These tests will tell us!
 */
describe('Type Resolution from Non-Included Files', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = createTempDir();
  });

  afterEach(() => {
    cleanupTempDir(tempDir);
  });

  it('should resolve types from .ts files not in files array', async () => {
    // Setup: Create a project with tsconfig
    const { srcDir } = createTestProject(tempDir);

    // Create a types.ts file with type definitions
    writeTestFile(
      srcDir,
      'types.ts',
      `
      export type User = {
        id: number;
        name: string;
      };

      export interface Config {
        apiUrl: string;
        timeout: number;
      }
    `,
    );

    // Create a usage.ts file that imports from types.ts
    const usageFile = writeTestFile(
      srcDir,
      'usage.ts',
      `
      import { User, Config } from './types';

      const user: User = {
        id: 1,
        name: 'Alice',
      };

      const config: Config = {
        apiUrl: 'https://api.example.com',
        timeout: 5000,
      };

      export { user, config };
    `,
    );

    // Check ONLY usage.ts (types.ts is NOT in the files array)
    // The temp config will have:
    // - files: [usage.ts]
    // - include: ['**/*.d.ts']
    // - exclude: ['node_modules', 'dist']
    const result = await checkFiles([usageFile], {
      cwd: tempDir,
      verbose: false,
    });

    // If TypeScript can follow imports to resolve types, this should succeed
    expect(result.success).toBe(true);
    expect(result.errorCount).toBe(0);
    expect(result.errors).toEqual([]);
  });

  it('should catch type errors in checked file even when importing from non-included file', async () => {
    const { srcDir } = createTestProject(tempDir);

    // Create types.ts with a User type
    writeTestFile(
      srcDir,
      'types.ts',
      `
      export type User = {
        id: number;
        name: string;
      };
    `,
    );

    // Create usage.ts with a type error (wrong type for id)
    const usageFile = writeTestFile(
      srcDir,
      'usage.ts',
      `
      import { User } from './types';

      const user: User = {
        id: 'not-a-number', // Type error: string is not assignable to number
        name: 'Alice',
      };

      export { user };
    `,
    );

    // Check ONLY usage.ts
    const result = await checkFiles([usageFile], {
      cwd: tempDir,
      verbose: false,
    });

    // Should catch the type error in usage.ts
    expect(result.success).toBe(false);
    expect(result.errorCount).toBeGreaterThan(0);
    expect(result.errors[0].message).toContain('not assignable');
  });

  it('should resolve types through multiple import levels', async () => {
    const { srcDir } = createTestProject(tempDir);

    // Create base-types.ts with primitive types
    writeTestFile(
      srcDir,
      'base-types.ts',
      `
      export type ID = number;
      export type Name = string;
    `,
    );

    // Create user-types.ts that imports from base-types.ts
    writeTestFile(
      srcDir,
      'user-types.ts',
      `
      import { ID, Name } from './base-types';

      export type User = {
        id: ID;
        name: Name;
      };
    `,
    );

    // Create usage.ts that imports from user-types.ts (2 levels deep)
    const usageFile = writeTestFile(
      srcDir,
      'usage.ts',
      `
      import { User } from './user-types';

      const user: User = {
        id: 1,
        name: 'Alice',
      };

      export { user };
    `,
    );

    // Check ONLY usage.ts (base-types.ts and user-types.ts are NOT in files array)
    const result = await checkFiles([usageFile], {
      cwd: tempDir,
      verbose: false,
    });

    // Should resolve types through the import chain
    expect(result.success).toBe(true);
    expect(result.errorCount).toBe(0);
  });

  it('should work with path aliases in imports', async () => {
    const { srcDir } = createTestProject(tempDir, {
      compilerOptions: {
        target: 'ES2022',
        module: 'ESNext',
        moduleResolution: 'bundler',
        strict: true,
        noEmit: true,
        baseUrl: '.',
        paths: {
          '@models/*': ['src/models/*'],
        },
      },
    });

    // Create models directory with type definitions (use nested path creation)
    writeTestFile(
      tempDir,
      'src/models/product.ts',
      `
      export type Product = {
        id: number;
        name: string;
        price: number;
      };
    `,
    );

    // Create usage.ts that imports using path alias
    const usageFile = writeTestFile(
      srcDir,
      'usage.ts',
      `
      import { Product } from '@models/product';

      const product: Product = {
        id: 1,
        name: 'Widget',
        price: 19.99,
      };

      export { product };
    `,
    );

    // Check ONLY usage.ts with path alias resolution
    const result = await checkFiles([usageFile], {
      cwd: tempDir,
      verbose: false,
    });

    // Should resolve path aliases and find types
    expect(result.success).toBe(true);
    expect(result.errorCount).toBe(0);
  });

  it('should not report syntax errors in imported files not in files array', async () => {
    const { srcDir } = createTestProject(tempDir);

    // Create types.ts with a syntax issue (but valid enough to parse types)
    writeTestFile(
      srcDir,
      'types.ts',
      `
      export type User = {
        id: number
        name: string // Missing semicolon/comma - but TypeScript can still parse the type
      }
    `,
    );

    // Create usage.ts that imports from types.ts
    const usageFile = writeTestFile(
      srcDir,
      'usage.ts',
      `
      import { User } from './types';

      const user: User = {
        id: 1,
        name: 'Alice',
      };

      export { user };
    `,
    );

    // Check ONLY usage.ts
    const result = await checkFiles([usageFile], {
      cwd: tempDir,
      verbose: false,
    });

    // TypeScript DOES NOT report syntax errors in imported files that aren't in the files array
    // It only checks them enough to extract type information
    // This is expected behavior - only files explicitly checked get full syntax validation
    expect(result.success).toBe(true);
    expect(result.errorCount).toBe(0);
  });

  it('should handle missing type definition file gracefully', async () => {
    const { srcDir } = createTestProject(tempDir);

    // Create usage.ts that imports from non-existent types.ts
    const usageFile = writeTestFile(
      srcDir,
      'usage.ts',
      `
      import { User } from './types'; // types.ts doesn't exist

      const user: User = {
        id: 1,
        name: 'Alice',
      };

      export { user };
    `,
    );

    // Check usage.ts
    const result = await checkFiles([usageFile], {
      cwd: tempDir,
      verbose: false,
    });

    // Should report error about missing module
    expect(result.success).toBe(false);
    expect(result.errorCount).toBeGreaterThan(0);
    expect(result.errors[0].message).toMatch(
      /Cannot find module|Could not find/i,
    );
  });
});
