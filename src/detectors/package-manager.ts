/**
 * Package manager detection for optimized TypeScript execution
 * Based on lock files and environment detection patterns
 */

import { existsSync } from 'node:fs';
import path from 'node:path';

export type PackageManager = 'npm' | 'yarn' | 'pnpm' | 'bun';

export type PackageManagerInfo = {
  manager: PackageManager;
  lockFile: string;
  command: string;
  tscPath?: string;
};

/**
 * Package manager detection patterns based on lock files
 * Priority order: pnpm > yarn > bun > npm (npm as fallback)
 */
const LOCK_FILE_PATTERNS: Record<PackageManager, string[]> = {
  pnpm: ['pnpm-lock.yaml'],
  yarn: ['yarn.lock'],
  bun: ['bun.lockb'],
  npm: ['package-lock.json', 'npm-shrinkwrap.json'],
};

/**
 * Command patterns for different package managers
 */
const COMMAND_PATTERNS: Record<PackageManager, string> = {
  pnpm: 'pnpm',
  yarn: 'yarn',
  bun: 'bun',
  npm: 'npm',
};

/**
 * TypeScript compiler path patterns for different package managers
 * Includes special handling for pnpm nested structure
 */
function getTscPath(manager: PackageManager, cwd: string): string | undefined {
  const nodeModules = path.join(cwd, 'node_modules');

  // Standard paths that work for most package managers
  const standardPaths = [
    path.join(nodeModules, '.bin', 'tsc'),
    path.join(nodeModules, 'typescript', 'bin', 'tsc'),
  ];

  // Special pnpm handling with nested structure
  if (manager === 'pnpm') {
    // pnpm can have nested structure: ../../../node_modules/.pnpm/...
    const pnpmPaths = [
      path.join(
        nodeModules,
        '.pnpm',
        'typescript@*',
        'node_modules',
        'typescript',
        'bin',
        'tsc',
      ),
      // Try current directory and parent directories for pnpm workspaces
      path.join(cwd, '..', 'node_modules', '.bin', 'tsc'),
      path.join(cwd, '..', '..', 'node_modules', '.bin', 'tsc'),
      path.join(cwd, '..', '..', '..', 'node_modules', '.bin', 'tsc'),
    ];

    for (const tscPath of pnpmPaths) {
      if (existsSync(tscPath)) {
        return tscPath;
      }
    }
  }

  // Check standard paths for all package managers
  for (const tscPath of standardPaths) {
    if (existsSync(tscPath)) {
      return tscPath;
    }
  }

  return undefined;
}

/**
 * Detect package manager by scanning for lock files
 * Uses priority order: pnpm > yarn > bun > npm
 */
export function detectPackageManager(
  cwd: string = process.cwd(),
): PackageManagerInfo {
  // Priority detection order (based on community usage and performance)
  const priorities: PackageManager[] = ['pnpm', 'yarn', 'bun', 'npm'];

  for (const manager of priorities) {
    const lockFiles = LOCK_FILE_PATTERNS[manager];

    for (const lockFile of lockFiles) {
      const lockPath = path.join(cwd, lockFile);
      if (existsSync(lockPath)) {
        const tscPath = getTscPath(manager, cwd);

        return {
          manager,
          lockFile,
          command: COMMAND_PATTERNS[manager],
          tscPath,
        };
      }
    }
  }

  // Fallback to npm if no lock files found
  const tscPath = getTscPath('npm', cwd);

  return {
    manager: 'npm',
    lockFile: 'package.json', // Fallback indicator
    command: COMMAND_PATTERNS.npm,
    tscPath,
  };
}

/**
 * Detect package manager by environment variables and lock files
 * Includes npm_config_user_agent parsing for CI environments
 */
export function detectPackageManagerAdvanced(
  cwd: string = process.cwd(),
): PackageManagerInfo {
  // Check environment variables first (more reliable in CI/CD)
  const userAgent = process.env.npm_config_user_agent;

  if (userAgent) {
    if (userAgent.includes('pnpm')) {
      const tscPath = getTscPath('pnpm', cwd);
      return {
        manager: 'pnpm',
        lockFile: 'pnpm-lock.yaml',
        command: 'pnpm',
        tscPath,
      };
    } else if (userAgent.includes('yarn')) {
      const tscPath = getTscPath('yarn', cwd);
      return {
        manager: 'yarn',
        lockFile: 'yarn.lock',
        command: 'yarn',
        tscPath,
      };
    } else if (userAgent.includes('bun')) {
      const tscPath = getTscPath('bun', cwd);
      return {
        manager: 'bun',
        lockFile: 'bun.lockb',
        command: 'bun',
        tscPath,
      };
    }
  }

  // Fallback to lock file detection
  return detectPackageManager(cwd);
}

/**
 * Get recommended TypeScript execution method based on package manager
 */
export function getRecommendedTscExecution(
  packageManagerInfo: PackageManagerInfo,
): {
  executable: string;
  args: string[];
  useShell?: boolean;
} {
  const { manager, tscPath } = packageManagerInfo;

  // If we found a local TypeScript installation, use it directly
  if (tscPath && existsSync(tscPath)) {
    return {
      executable: tscPath,
      args: [],
      useShell: false,
    };
  }

  // Fallback to package manager execution patterns
  switch (manager) {
    case 'pnpm': {
      return {
        executable: 'pnpm',
        args: ['exec', 'tsc'],
        useShell: true,
      };
    }

    case 'yarn': {
      return {
        executable: 'yarn',
        args: ['tsc'],
        useShell: true,
      };
    }

    case 'bun': {
      return {
        executable: 'bun',
        args: ['x', 'tsc'],
        useShell: true,
      };
    }

    default: {
      return {
        executable: 'npx',
        args: ['tsc'],
        useShell: true,
      };
    }
  }
}
