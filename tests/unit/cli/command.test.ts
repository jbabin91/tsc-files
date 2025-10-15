import kleur from 'kleur';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  convertCleyeFlagsToOptions,
  createHelpExamples,
  createProgram,
  handleVerboseLogging,
  validateProjectPath,
} from '@/cli/command';
import { logger } from '@/utils/logger';

// Mock cleye to avoid process.exit() calls
vi.mock('cleye', () => ({
  cli: vi.fn((_config, _callback) => {
    // Return a mock function that doesn't call process.exit()
    return vi.fn();
  }),
}));

// Test the CLI command logic without cleye's automatic parsing
describe('CLI Command', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('validateProjectPath', () => {
    it('should validate valid project paths', () => {
      expect(validateProjectPath('tsconfig.json')).toBe('tsconfig.json');
      expect(validateProjectPath('tsconfig.build.json')).toBe(
        'tsconfig.build.json',
      );
      expect(validateProjectPath('  tsconfig.json  ')).toBe('tsconfig.json');
    });

    it('should throw error for empty project path', () => {
      expect(() => validateProjectPath('')).toThrow(
        'Project path cannot be empty.',
      );
      expect(() => validateProjectPath('   ')).toThrow(
        'Project path cannot be empty.',
      );
    });

    it('should throw error for non-JSON project path', () => {
      expect(() => validateProjectPath('tsconfig.txt')).toThrow(
        'Project path must point to a JSON file (e.g., tsconfig.json).',
      );
      expect(() => validateProjectPath('config.js')).toThrow(
        'Project path must point to a JSON file (e.g., tsconfig.json).',
      );
    });
  });

  describe('convertCleyeFlagsToOptions', () => {
    it('should convert flags with negated options', () => {
      const flags = {
        verbose: true,
        json: false,
        cache: true,
        fallback: true,
        project: 'tsconfig.json',
      };

      const options = convertCleyeFlagsToOptions(flags);

      expect(options).toEqual({
        verbose: true,
        json: false,
        cache: true,
        fallback: true,
        project: 'tsconfig.json',
        'no-cache': false,
        'no-fallback': false,
      });
    });

    it('should handle negated flags correctly', () => {
      const flags = {
        cache: false,
        fallback: false,
      };

      const options = convertCleyeFlagsToOptions(flags);

      expect(options).toEqual({
        cache: false,
        fallback: false,
        'no-cache': true,
        'no-fallback': true,
      });
    });

    it('should handle mixed flag types', () => {
      const flags = {
        verbose: true,
        json: false,
        cache: true,
        fallback: false,
        project: 'tsconfig.build.json',
        skipLibCheck: true,
        useTsc: false,
        useTsgo: true,
        showCompiler: false,
        benchmark: true,
        tips: false,
        include: 'src/setup.ts',
      };

      const options = convertCleyeFlagsToOptions(flags);

      expect(options).toEqual({
        verbose: true,
        json: false,
        cache: true,
        fallback: false,
        project: 'tsconfig.build.json',
        skipLibCheck: true,
        useTsc: false,
        useTsgo: true,
        showCompiler: false,
        benchmark: true,
        tips: false,
        include: 'src/setup.ts',
        'no-cache': false,
        'no-fallback': true,
      });
    });
  });

  describe('handleVerboseLogging', () => {
    it('should log verbose information when verbose flag is true', () => {
      const mockDebug = vi.spyOn(logger, 'debug').mockImplementation(() => {
        /* empty */
      });

      const parsed = {
        flags: { verbose: true },
        _: ['src/index.ts', 'src/utils.ts'],
      };

      handleVerboseLogging(parsed);

      expect(mockDebug).toHaveBeenCalledWith(
        '🔍 About to execute tsc-files with 2 file argument(s)',
      );
      expect(mockDebug).toHaveBeenCalledWith(
        '📋 Options: {\n  "verbose": true\n}',
      );
      expect(mockDebug).toHaveBeenCalledWith(
        '📁 Arguments: ["src/index.ts","src/utils.ts"]',
      );
    });

    it('should not log when verbose flag is false', () => {
      const mockDebug = vi.spyOn(logger, 'debug').mockImplementation(() => {
        /* empty */
      });

      const parsed = {
        flags: { verbose: false },
        _: ['src/index.ts'],
      };

      handleVerboseLogging(parsed);

      expect(mockDebug).not.toHaveBeenCalled();
    });

    it('should log TSC_PROJECT environment variable when present', () => {
      const mockDebug = vi.spyOn(logger, 'debug').mockImplementation(() => {
        /* empty */
      });
      const originalEnv = process.env.TSC_PROJECT;

      try {
        process.env.TSC_PROJECT = 'tsconfig.build.json';

        const parsed = {
          flags: { verbose: true },
          _: ['src/index.ts'],
        };

        handleVerboseLogging(parsed);

        expect(mockDebug).toHaveBeenCalledWith(
          '🌍 TSC_PROJECT environment variable: tsconfig.build.json',
        );
      } finally {
        if (originalEnv === undefined) {
          delete process.env.TSC_PROJECT;
        } else {
          process.env.TSC_PROJECT = originalEnv;
        }
      }
    });

    it('should not log TSC_PROJECT when not set', () => {
      const mockDebug = vi.spyOn(logger, 'debug').mockImplementation(() => {
        /* empty */
      });
      const originalEnv = process.env.TSC_PROJECT;

      try {
        delete process.env.TSC_PROJECT;

        const parsed = {
          flags: { verbose: true },
          _: ['src/index.ts'],
        };

        handleVerboseLogging(parsed);

        expect(mockDebug).not.toHaveBeenCalledWith(
          expect.stringContaining('TSC_PROJECT environment variable'),
        );
      } finally {
        if (originalEnv !== undefined) {
          process.env.TSC_PROJECT = originalEnv;
        }
      }
    });
  });

  describe('createHelpExamples', () => {
    it('should create help examples with correct content', () => {
      const examples = createHelpExamples();

      expect(examples).toHaveLength(33);
      expect(examples[0]).toBe('# Check specific files');
      expect(examples[1]).toBe('tsc-files src/index.ts src/utils.ts');
      expect(examples[32]).toBe(
        'For more information, visit: https://github.com/jbabin91/tsc-files',
      );
    });

    it('should include all expected sections', () => {
      const examples = createHelpExamples();
      const examplesText = examples.join('\n');

      expect(examplesText).toContain('# Check specific files');
      expect(examplesText).toContain('# Use glob patterns');
      expect(examplesText).toContain('# With custom tsconfig');
      expect(examplesText).toContain('# Using environment variable');
      expect(examplesText).toContain('# Git hook usage');
      expect(examplesText).toContain('# Compiler selection');
      expect(examplesText).toContain('Glob Patterns:');
      expect(examplesText).toContain('Exit Codes:');
    });

    it('should include proper git diff command', () => {
      const examples = createHelpExamples();
      const gitDiffLine = examples.find((line) => line.includes('git diff'));

      expect(gitDiffLine).toContain(
        'git diff --cached --name-only --diff-filter=ACM',
      );
      expect(gitDiffLine).toContain(String.raw`grep -E '\.(ts|tsx)$'`);
    });
  });

  describe('createProgram', () => {
    it('should create cleye program with correct configuration', () => {
      const mockHandler = vi.fn<() => Promise<void>>().mockResolvedValue();
      const program = createProgram(mockHandler);

      expect(typeof program).toBe('function');
    });

    it('should call cli with correct configuration', async () => {
      const cleyeModule = await import('cleye');
      const cli = vi.mocked(cleyeModule.cli);
      const mockHandler = vi.fn<() => Promise<void>>().mockResolvedValue();

      createProgram(mockHandler);

      expect(cli).toHaveBeenCalledTimes(1);
      const [_config, _callback] = cli.mock.calls[0] as [
        Record<string, unknown>,
        () => void,
      ];

      // Test basic configuration
      expect(_config.name).toBe('tsc-files');
      expect(_config.parameters).toEqual(['<files...>']);
      expect(_config.flags).toBeDefined();
      expect(_config.help).toBeDefined();

      // Test that callback is a function
      expect(typeof _callback).toBe('function');
    });

    it('should have all required flags in configuration', async () => {
      const cleyeModule = await import('cleye');
      const cli = vi.mocked(cleyeModule.cli);
      const mockHandler = vi.fn<() => Promise<void>>().mockResolvedValue();

      createProgram(mockHandler);

      const [config] = cli.mock.calls[0] as [
        Record<string, unknown>,
        () => void,
      ];
      const flags = config.flags as Record<string, unknown>;

      // Test that all expected flags are present
      expect(flags.project).toBeDefined();
      expect(flags.verbose).toBeDefined();
      expect(flags.json).toBeDefined();
      expect(flags.cache).toBeDefined();
      expect(flags.skipLibCheck).toBeDefined();
      expect(flags.useTsc).toBeDefined();
      expect(flags.useTsgo).toBeDefined();
      expect(flags.showCompiler).toBeDefined();
      expect(flags.benchmark).toBeDefined();
      expect(flags.fallback).toBeDefined();
      expect(flags.tips).toBeDefined();
      expect(flags.include).toBeDefined();
    });

    it('should have correct help configuration', async () => {
      const cleyeModule = await import('cleye');
      const cli = vi.mocked(cleyeModule.cli);
      const mockHandler = vi.fn<() => Promise<void>>().mockResolvedValue();

      createProgram(mockHandler);

      const [config] = cli.mock.calls[0] as [
        Record<string, unknown>,
        () => void,
      ];
      const help = config.help as Record<string, unknown>;

      expect(help.description).toContain('TypeScript compiler');
      expect(help.examples).toBeDefined();
      expect(Array.isArray(help.examples)).toBe(true);
      expect((help.examples as unknown[]).length).toBeGreaterThan(0);
    });

    it('should handle validation errors in callback', async () => {
      const cleyeModule = await import('cleye');
      const cli = vi.mocked(cleyeModule.cli);
      const mockHandler = vi.fn<() => Promise<void>>().mockResolvedValue();
      const originalExit = process.exit;
      const mockExit = vi.fn() as unknown as typeof process.exit;
      process.exit = mockExit;

      try {
        createProgram(mockHandler);

        const [, callback] = cli.mock.calls[0] as [
          Record<string, unknown>,
          (parsed: unknown) => void,
        ];

        // Test with invalid project path - should throw error
        const parsed = {
          flags: { project: 'invalid.txt' },
          _: ['file.ts'],
        };

        expect(() => callback(parsed)).toThrow(
          'Project path must point to a JSON file (e.g., tsconfig.json).',
        );
        // The process.exit(1) is called in the catch block, but since we're catching the error with expect().toThrow(),
        // the catch block never executes, so process.exit is never called
        // This is the expected behavior - the error is thrown and caught by the test framework
      } finally {
        process.exit = originalExit;
      }
    });

    it('should provide TypeScript installation tip when compiler is missing', async () => {
      const cleyeModule = await import('cleye');
      const cli = vi.mocked(cleyeModule.cli);
      const mockHandler = vi
        .fn<() => Promise<void>>()
        .mockImplementation(() => {
          throw new Error('TypeScript compiler not found');
        });
      const errorSpy = vi.spyOn(logger, 'error').mockImplementation(() => {
        /* empty */
      });
      const originalEnv = process.env.NODE_ENV;

      try {
        process.env.NODE_ENV = 'test';

        createProgram(mockHandler);

        const [, callback] = cli.mock.calls[0] as [
          Record<string, unknown>,
          (parsed: unknown) => void,
        ];

        const parsed = {
          flags: {},
          _: [],
        };

        expect(() => callback(parsed)).toThrow('TypeScript compiler not found');

        expect(errorSpy).toHaveBeenCalledWith(
          kleur.yellow(
            'Tip: Ensure TypeScript is installed: npm install -D typescript',
          ),
        );
      } finally {
        errorSpy.mockRestore();
        process.env.NODE_ENV = originalEnv;
      }
    });

    it('should call process.exit when not running in test environment', async () => {
      const cleyeModule = await import('cleye');
      const cli = vi.mocked(cleyeModule.cli);
      const mockHandler = vi
        .fn<() => Promise<void>>()
        .mockImplementation(() => {
          throw new Error('Compiler not found');
        });
      const errorSpy = vi.spyOn(logger, 'error').mockImplementation(() => {
        /* empty */
      });
      const originalEnv = process.env.NODE_ENV;
      const originalExit = process.exit;
      const mockExit = vi.fn() as unknown as typeof process.exit;
      process.exit = mockExit;

      try {
        process.env.NODE_ENV = 'production';

        createProgram(mockHandler);

        const [, callback] = cli.mock.calls[0] as [
          Record<string, unknown>,
          (parsed: unknown) => void,
        ];

        const parsed = {
          flags: {},
          _: ['file.ts'],
        };

        expect(() => callback(parsed)).toThrow('Compiler not found');
        expect(mockExit).toHaveBeenCalledWith(1);
      } finally {
        errorSpy.mockRestore();
        process.env.NODE_ENV = originalEnv;
        process.exit = originalExit;
      }
    });

    it('should call action handler with correct parameters', async () => {
      const cleyeModule = await import('cleye');
      const cli = vi.mocked(cleyeModule.cli);
      const mockHandler = vi.fn<() => Promise<void>>().mockResolvedValue();
      const originalExit = process.exit;
      const mockExit = vi.fn() as unknown as typeof process.exit;
      process.exit = mockExit;

      try {
        createProgram(mockHandler);

        const [, callback] = cli.mock.calls[0] as [
          Record<string, unknown>,
          (parsed: unknown) => void,
        ];

        // Test with valid parameters
        const parsed = {
          flags: { project: 'tsconfig.json', verbose: true },
          _: ['file1.ts', 'file2.ts'],
        };

        callback(parsed);

        expect(mockHandler).toHaveBeenCalledWith(
          ['file1.ts', 'file2.ts'],
          expect.objectContaining({
            project: 'tsconfig.json',
            verbose: true,
            'no-cache': true, // !undefined = true
            'no-fallback': true, // !undefined = true
          }),
        );
      } finally {
        process.exit = originalExit;
      }
    });
  });
});
