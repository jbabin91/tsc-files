import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createProgram, parseArguments } from '@/cli/command';

import packageJson from '../../../package.json' with { type: 'json' };

describe('CLI Command', () => {
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

    it('should use package.json version', () => {
      const mockAction = vi.fn();
      const program = createProgram(mockAction);

      // Access the internal version property
      const programVersion = (program as unknown as { _version?: string })
        ._version;
      expect(programVersion).toBe(packageJson.version);
      expect(programVersion).toMatch(/^\d+\.\d+\.\d+/);
    });

    it('should include all required options', () => {
      const mockAction = vi.fn();
      const program = createProgram(mockAction);

      const options = program.options.map((opt) => opt.long);
      expect(options).toContain('--project');
      expect(options).toContain('--verbose');
      expect(options).toContain('--json');
      expect(options).toContain('--skip-lib-check');
      expect(options).toContain('--tips');
      expect(options).toContain('--benchmark');
      expect(options).toContain('--show-compiler');
    });

    it('should validate project path - reject empty string', () => {
      const mockAction = vi.fn();
      const program = createProgram(mockAction);
      program.exitOverride((err) => {
        throw err;
      });

      expect(() => {
        parseArguments(program, ['--project', '', 'test.ts']);
      }).toThrow('Project path cannot be empty');
    });

    it('should validate project path - reject non-JSON files', () => {
      const mockAction = vi.fn();
      const program = createProgram(mockAction);
      program.exitOverride((err) => {
        throw err;
      });

      expect(() => {
        parseArguments(program, ['--project', 'tsconfig.xml', 'test.ts']);
      }).toThrow('Project path must point to a JSON file');
    });

    it('should validate project path - accept valid JSON files', () => {
      const mockAction = vi.fn();
      const program = createProgram(mockAction);
      program.exitOverride((err) => {
        throw err;
      });

      const { options } = parseArguments(program, [
        '--project',
        'tsconfig.json',
        'test.ts',
      ]);

      expect(options.project).toBe('tsconfig.json');
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
        fallback: true,
      });
    });

    it('should parse tips flag correctly', () => {
      const program = createProgram(mockAction);
      program.exitOverride((err) => {
        throw err;
      });

      const { files, options } = parseArguments(program, ['--tips', 'test.ts']);

      expect(files).toEqual(['test.ts']);
      expect(options).toMatchObject({
        tips: true,
      });
    });

    it('should parse benchmark flag correctly', () => {
      const program = createProgram(mockAction);
      program.exitOverride((err) => {
        throw err;
      });

      const { files, options } = parseArguments(program, [
        '--benchmark',
        'test.ts',
      ]);

      expect(files).toEqual(['test.ts']);
      expect(options).toMatchObject({
        benchmark: true,
      });
    });

    it('should parse show-compiler flag correctly', () => {
      const program = createProgram(mockAction);
      program.exitOverride((err) => {
        throw err;
      });

      const { files, options } = parseArguments(program, [
        '--show-compiler',
        'test.ts',
      ]);

      expect(files).toEqual(['test.ts']);
      expect(options).toMatchObject({
        showCompiler: true,
      });
    });

    it('should parse multiple new flags together', () => {
      const program = createProgram(mockAction);
      program.exitOverride((err) => {
        throw err;
      });

      const { files, options } = parseArguments(program, [
        '--tips',
        '--benchmark',
        '--show-compiler',
        '--verbose',
        'test.ts',
      ]);

      expect(files).toEqual(['test.ts']);
      expect(options).toMatchObject({
        tips: true,
        benchmark: true,
        showCompiler: true,
        verbose: true,
      });
    });

    it('should parse tsgo compiler flags correctly', () => {
      const program = createProgram(mockAction);
      program.exitOverride((err) => {
        throw err;
      });

      const { files, options } = parseArguments(program, [
        '--use-tsgo',
        '--no-fallback',
        'test.ts',
      ]);

      expect(files).toEqual(['test.ts']);
      expect(options).toMatchObject({
        useTsgo: true,
        fallback: false,
      });
    });
  });
});
