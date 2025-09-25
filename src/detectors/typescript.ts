/**
 * TypeScript compiler detection and execution
 * Enhanced detection with package manager integration
 */

import { existsSync } from 'node:fs';
import path from 'node:path';

import {
  detectPackageManagerAdvanced,
  type PackageManagerInfo,
} from './package-manager.js';

export type TypeScriptInfo = {
  executable: string;
  args: string[];
  useShell: boolean;
  packageManager: PackageManagerInfo;
};

/**
 * Find TypeScript compiler executable with enhanced detection
 * Integrates with package manager detection for optimal execution
 */
export function findTypeScriptCompiler(
  cwd: string = process.cwd(),
): TypeScriptInfo {
  const packageManagerInfo = detectPackageManagerAdvanced(cwd);

  // Try package manager specific TypeScript path first
  if (packageManagerInfo.tscPath && existsSync(packageManagerInfo.tscPath)) {
    return {
      executable: packageManagerInfo.tscPath,
      args: [],
      useShell: false,
      packageManager: packageManagerInfo,
    };
  }

  // Try local node_modules/.bin/tsc
  const localTsc = path.join(cwd, 'node_modules', '.bin', 'tsc');
  if (existsSync(localTsc)) {
    return {
      executable: localTsc,
      args: [],
      useShell: false,
      packageManager: packageManagerInfo,
    };
  }

  // Try global TypeScript installation paths for test environments
  const globalPaths = [
    path.join(process.cwd(), 'node_modules', '.bin', 'tsc'), // Current project's tsc
    'tsc', // Global tsc as final fallback
  ];

  for (const tscPath of globalPaths) {
    if (tscPath === 'tsc' || existsSync(tscPath)) {
      return {
        executable: tscPath,
        args: [],
        useShell: tscPath === 'tsc', // Use shell only for global tsc
        packageManager: packageManagerInfo,
      };
    }
  }

  // Try to resolve from typescript package
  try {
    // eslint-disable-next-line unicorn/prefer-module
    const typescriptPkg = require.resolve('typescript/package.json', {
      paths: [cwd],
    });
    const typescriptDir = path.dirname(typescriptPkg);
    const tscPath = path.join(typescriptDir, 'bin', 'tsc');

    if (existsSync(tscPath)) {
      return {
        executable: tscPath,
        args: [],
        useShell: false,
        packageManager: packageManagerInfo,
      };
    }
  } catch {
    // TypeScript package not found locally
  }

  // Fallback to package manager execution patterns
  switch (packageManagerInfo.manager) {
    case 'pnpm': {
      return {
        executable: 'pnpm',
        args: ['exec', 'tsc'],
        useShell: true,
        packageManager: packageManagerInfo,
      };
    }

    case 'yarn': {
      return {
        executable: 'yarn',
        args: ['tsc'],
        useShell: true,
        packageManager: packageManagerInfo,
      };
    }

    case 'bun': {
      return {
        executable: 'bun',
        args: ['x', 'tsc'],
        useShell: true,
        packageManager: packageManagerInfo,
      };
    }

    default: {
      return {
        executable: 'npx',
        args: ['tsc'],
        useShell: true,
        packageManager: packageManagerInfo,
      };
    }
  }
}

/**
 * Legacy function for backwards compatibility
 * @deprecated Use findTypeScriptCompiler instead
 */
export function findTscPath(): string {
  const tsInfo = findTypeScriptCompiler();
  return tsInfo.executable;
}
