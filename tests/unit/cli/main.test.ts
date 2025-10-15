import { beforeEach, describe, expect, it, vi } from 'vitest';

import * as cliMainModule from '@/cli/main';
import { runTypeCheckWithOutput } from '@/cli/runner';

const { createActionHandler, createCli, createParseAsyncFunction } =
  cliMainModule;

// Mock the runner module
vi.mock('@/cli/runner', () => ({
  runTypeCheckWithOutput: vi.fn(),
}));

// Mock the createProgram function to avoid cleye's process.exit() calls
const createProgramMock = vi.hoisted(() => vi.fn());

vi.mock('@/cli/command', () => ({
  createProgram: createProgramMock,
}));

// Mock process.cwd for tests
vi.stubGlobal('process', {
  ...process,
  cwd: vi.fn(() => '/test/cwd'),
});

describe('CLI Main', () => {
  let registeredHandler:
    | ((files: string[], options: unknown) => Promise<number>)
    | undefined;

  beforeEach(() => {
    vi.clearAllMocks();
    registeredHandler = undefined;
    createProgramMock.mockReset();
    vi.mocked(runTypeCheckWithOutput).mockReset();
  });

  describe('createActionHandler', () => {
    it('should create action handler that calls runTypeCheckWithOutput', async () => {
      const mockRunTypeCheckWithOutput = vi.mocked(runTypeCheckWithOutput);
      mockRunTypeCheckWithOutput.mockResolvedValue(0);

      const actionHandler = createActionHandler();
      const result = await actionHandler(['src/index.ts'], { verbose: true });

      expect(mockRunTypeCheckWithOutput).toHaveBeenCalledWith(
        ['src/index.ts'],
        { verbose: true },
        '/test/cwd',
      );
      expect(result).toBe(0);
    });

    it('should return exit code from runTypeCheckWithOutput', async () => {
      const mockRunTypeCheckWithOutput = vi.mocked(runTypeCheckWithOutput);
      mockRunTypeCheckWithOutput.mockResolvedValue(1);

      const actionHandler = createActionHandler();
      const result = await actionHandler(['src/invalid.ts'], {
        verbose: false,
      });

      expect(result).toBe(1);
    });

    it('should handle multiple files and options', async () => {
      const mockRunTypeCheckWithOutput = vi.mocked(runTypeCheckWithOutput);
      mockRunTypeCheckWithOutput.mockResolvedValue(2);

      const actionHandler = createActionHandler();
      const files = ['src/index.ts', 'src/utils.ts', 'tests/test.ts'];
      const options = {
        verbose: true,
        json: true,
        project: 'tsconfig.build.json',
        'no-cache': true,
      };

      const result = await actionHandler(files, options);

      expect(mockRunTypeCheckWithOutput).toHaveBeenCalledWith(
        files,
        options,
        '/test/cwd',
      );
      expect(result).toBe(2);
    });
  });

  describe('createParseAsyncFunction', () => {
    it('should return function that resolves with exit code', async () => {
      const parseAsync = createParseAsyncFunction(() => 0);
      const result = await parseAsync(['node', 'tsc-files', 'src/index.ts']);

      expect(result).toBe(0);
    });

    it('should return function that resolves with different exit code', async () => {
      const parseAsync = createParseAsyncFunction(() => 1);
      const result = await parseAsync(['node', 'tsc-files', 'src/invalid.ts']);

      expect(result).toBe(1);
    });

    it('should ignore arguments parameter', async () => {
      const parseAsync = createParseAsyncFunction(() => 2);
      const result = await parseAsync();

      expect(result).toBe(2);
    });
  });

  describe('createCli', () => {
    it('should create CLI with parseAsync method', () => {
      createProgramMock.mockImplementation(() => vi.fn());
      const cli = createCli();
      expect(cli).toHaveProperty('parseAsync');
      expect(typeof cli.parseAsync).toBe('function');
    });

    it('should call createProgram with action handler', () => {
      createProgramMock.mockImplementation(() => vi.fn());
      createCli();

      expect(createProgramMock).toHaveBeenCalledTimes(1);
      expect(createProgramMock).toHaveBeenCalledWith(expect.any(Function));
    });

    it('should capture exit code from action handler', async () => {
      vi.mocked(runTypeCheckWithOutput).mockResolvedValueOnce(2);
      createProgramMock.mockImplementationOnce(
        (handler: (files: string[], options: unknown) => Promise<number>) => {
          registeredHandler = handler;
          return vi.fn();
        },
      );

      const cli = createCli();
      await registeredHandler?.(['src/index.ts'], {});
      const exitCode = await cli.parseAsync();

      expect(exitCode).toBe(2);
      expect(runTypeCheckWithOutput).toHaveBeenCalledWith(
        ['src/index.ts'],
        {},
        '/test/cwd',
      );
    });

    it('should return last recorded exit code even if action handlers run multiple times', async () => {
      vi.mocked(runTypeCheckWithOutput)
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(3);

      createProgramMock.mockImplementationOnce(
        (handler: (files: string[], options: unknown) => Promise<number>) => {
          registeredHandler = handler;
          return vi.fn();
        },
      );

      const cli = createCli();
      await registeredHandler?.(['first.ts'], {});
      await registeredHandler?.(['second.ts'], {});

      const exitCode = await cli.parseAsync();
      expect(exitCode).toBe(3);
      expect(runTypeCheckWithOutput).toHaveBeenNthCalledWith(
        1,
        ['first.ts'],
        {},
        '/test/cwd',
      );
      expect(runTypeCheckWithOutput).toHaveBeenNthCalledWith(
        2,
        ['second.ts'],
        {},
        '/test/cwd',
      );
    });

    it('should propagate errors thrown by action handler to parseAsync callers', async () => {
      const testError = new Error('action failure');
      vi.mocked(runTypeCheckWithOutput).mockRejectedValueOnce(testError);
      createProgramMock.mockImplementationOnce(
        (handler: (files: string[], options: unknown) => Promise<number>) => {
          registeredHandler = handler;
          return vi.fn();
        },
      );

      const cli = createCli();

      await expect(async () => {
        await registeredHandler?.(['broken.ts'], {});
      }).rejects.toThrowError(testError);

      await expect(cli.parseAsync()).resolves.toBe(0);
    });
  });

  describe('main', () => {
    it('should return exit code from CLI execution', async () => {
      vi.mocked(runTypeCheckWithOutput).mockResolvedValueOnce(1);
      createProgramMock.mockImplementationOnce(
        (handler: (files: string[], options: unknown) => Promise<number>) => {
          registeredHandler = handler;
          return vi.fn();
        },
      );

      const cli = createCli();
      await registeredHandler?.(['src/error.ts'], {});
      const exitCode = await cli.parseAsync();

      expect(exitCode).toBe(1);
    });
  });

  describe('integration scenarios', () => {
    it('should handle successful type checking', async () => {
      const mockRunTypeCheckWithOutput = vi.mocked(runTypeCheckWithOutput);
      mockRunTypeCheckWithOutput.mockResolvedValue(0);

      const actionHandler = createActionHandler();
      const result = await actionHandler(['src/valid.ts'], { verbose: true });

      expect(result).toBe(0);
    });

    it('should handle type errors', async () => {
      const mockRunTypeCheckWithOutput = vi.mocked(runTypeCheckWithOutput);
      mockRunTypeCheckWithOutput.mockResolvedValue(1);

      const actionHandler = createActionHandler();
      const result = await actionHandler(['src/invalid.ts'], {
        verbose: false,
      });

      expect(result).toBe(1);
    });

    it('should handle configuration errors', async () => {
      const mockRunTypeCheckWithOutput = vi.mocked(runTypeCheckWithOutput);
      mockRunTypeCheckWithOutput.mockResolvedValue(2);

      const actionHandler = createActionHandler();
      const result = await actionHandler(['src/index.ts'], {
        project: 'nonexistent.json',
      });

      expect(result).toBe(2);
    });

    it('should handle system errors', async () => {
      const mockRunTypeCheckWithOutput = vi.mocked(runTypeCheckWithOutput);
      mockRunTypeCheckWithOutput.mockResolvedValue(3);

      const actionHandler = createActionHandler();
      const result = await actionHandler(['src/index.ts'], {});

      expect(result).toBe(3);
    });

    it('should handle complex options', async () => {
      const mockRunTypeCheckWithOutput = vi.mocked(runTypeCheckWithOutput);
      mockRunTypeCheckWithOutput.mockResolvedValue(0);

      const actionHandler = createActionHandler();
      const complexOptions = {
        verbose: true,
        json: true,
        project: 'tsconfig.build.json',
        cache: false,
        fallback: true,
        'no-cache': true,
        'no-fallback': false,
        skipLibCheck: true,
        useTsc: false,
        useTsgo: true,
        showCompiler: true,
        benchmark: false,
        tips: true,
        include: 'src/setup.ts',
      };

      const result = await actionHandler(['src/index.ts'], complexOptions);

      expect(mockRunTypeCheckWithOutput).toHaveBeenCalledWith(
        ['src/index.ts'],
        complexOptions,
        '/test/cwd',
      );
      expect(result).toBe(0);
    });

    it('should handle action handler callback in createProgram', async () => {
      vi.mocked(runTypeCheckWithOutput).mockResolvedValueOnce(2);
      createProgramMock.mockImplementationOnce(
        (handler: (files: string[], options: unknown) => Promise<number>) => {
          registeredHandler = handler;
          return vi.fn();
        },
      );

      const cli = createCli();
      await registeredHandler?.(['file.ts'], {});
      const exitCode = await cli.parseAsync();

      expect(exitCode).toBe(2);
    });
  });
});
