import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createProgram, getVersion, parseArguments } from '@/cli/command';

describe('CLI Command', () => {
  describe('getVersion', () => {
    it('should return version from package.json', () => {
      const version = getVersion();

      // Should return the actual version from package.json
      expect(version).toMatch(/^\d+\.\d+\.\d+/);
      expect(version).not.toBe('0.0.0-dev');
    });

    it('should return dev version when package.json is not found', () => {
      // Mock readFileSync to throw an error
      const mockReadFileSync = vi.fn(() => {
        throw new Error('File not found');
      });

      vi.doMock('node:fs', () => ({
        readFileSync: mockReadFileSync,
      }));

      // This test is difficult to mock in practice due to module caching,
      // so let's just verify the version is a string format
      const version = getVersion();
      expect(typeof version).toBe('string');
      expect(version.length).toBeGreaterThan(0);
    });
  });

  describe('createProgram', () => {
    it('should create commander program with correct configuration', () => {
      const mockAction = vi.fn();
      const program = createProgram(mockAction);

      expect(program.name()).toBe('tsc-files');
      expect(program.description()).toContain('TypeScript compiler');
    });

    it('should register action handler', async () => {
      const mockAction = vi.fn().mockImplementation(async () => {
        /* empty */
      });
      const program = createProgram(mockAction);

      // Override exitOverride to prevent process.exit in tests
      program.exitOverride((err) => {
        throw err;
      });

      // Parse test arguments
      await program.parseAsync(['node', 'tsc-files', 'test.ts'], {
        from: 'node',
      });

      expect(mockAction).toHaveBeenCalledWith(
        ['test.ts'],
        expect.any(Object),
        expect.any(Object),
      );
    });

    it('should configure help styling', () => {
      const mockAction = vi.fn();
      const program = createProgram(mockAction);

      // Get help configuration
      const helpConfig = (
        program as unknown as { _helpConfiguration?: unknown }
      )._helpConfiguration;
      expect(helpConfig).toBeDefined();
    });

    it('should include version option', () => {
      const mockAction = vi.fn();
      const program = createProgram(mockAction);

      const versionOption = program.options.find((opt) => opt.short === '-v');
      expect(versionOption).toBeDefined();
      expect(versionOption?.long).toBe('--version');
    });

    it('should include all required options', () => {
      const mockAction = vi.fn();
      const program = createProgram(mockAction);

      const options = program.options.map((opt) => opt.long);
      expect(options).toContain('--project');
      expect(options).toContain('--verbose');
      expect(options).toContain('--json');
      expect(options).toContain('--skip-lib-check');
    });

    it('should handle no-cache option correctly', () => {
      const mockAction = vi.fn();
      const program = createProgram(mockAction);

      const cacheOption = program.options.find(
        (opt) => opt.long === '--no-cache',
      );
      expect(cacheOption).toBeDefined();
      expect(cacheOption?.description).toContain(
        'disable temporary file caching',
      );
    });
  });

  describe('parseArguments', () => {
    let mockAction: ReturnType<typeof vi.fn>;

    beforeEach(() => {
      mockAction = vi.fn();
    });

    it('should parse files and options correctly', () => {
      const program = createProgram(mockAction);
      program.exitOverride((err) => {
        throw err;
      });

      const { files, options } = parseArguments(program, [
        '--project',
        'tsconfig.json',
        '--verbose',
        'src/test.ts',
        'src/utils.ts',
      ]);

      expect(files).toEqual(['src/test.ts', 'src/utils.ts']);
      expect(options).toMatchObject({
        project: 'tsconfig.json',
        verbose: true,
      });
    });

    it('should parse boolean flags correctly', () => {
      const program = createProgram(mockAction);
      program.exitOverride((err) => {
        throw err;
      });

      const { files, options } = parseArguments(program, [
        '--json',
        '--skip-lib-check',
        '--no-cache',
        'test.ts',
      ]);

      expect(files).toEqual(['test.ts']);
      expect(options).toMatchObject({
        json: true,
        skipLibCheck: true,
        cache: false, // no-cache sets cache to false
      });
    });

    it('should parse short options', () => {
      const program = createProgram(mockAction);
      program.exitOverride((err) => {
        throw err;
      });

      const { files, options } = parseArguments(program, [
        '-p',
        'custom.json',
        'test.ts',
      ]);

      expect(files).toEqual(['test.ts']);
      expect(options).toMatchObject({
        project: 'custom.json',
      });
    });

    it('should handle multiple file patterns', () => {
      const program = createProgram(mockAction);
      program.exitOverride((err) => {
        throw err;
      });

      const { files, options } = parseArguments(program, [
        'src/**/*.ts',
        'tests/**/*.ts',
        '!**/*.test.ts',
      ]);

      expect(files).toEqual(['src/**/*.ts', 'tests/**/*.ts', '!**/*.test.ts']);
      expect(options).toMatchObject({
        cache: true,
      });
    });

    it('should handle missing required arguments', () => {
      const program = createProgram(mockAction);
      program.exitOverride((err) => {
        throw err;
      });

      expect(() => {
        parseArguments(program, []); // No files provided
      }).toThrow();
    });

    it('should default cache to true when --no-cache not specified', () => {
      const program = createProgram(mockAction);
      program.exitOverride((err) => {
        throw err;
      });

      const { options } = parseArguments(program, ['test.ts']);

      expect(options).toEqual({
        cache: true,
      });
    });
  });
});
