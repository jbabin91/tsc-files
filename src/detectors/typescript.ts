import { existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';

import {
  detectPackageManagerAdvanced,
  type PackageManagerInfo,
} from '@/detectors/package-manager';

export type TypeScriptInfo = {
  executable: string;
  args: string[];
  useShell: boolean;
  packageManager: PackageManagerInfo;
  isWindows: boolean;
  quotedExecutable?: string; // For Windows paths with spaces
};

const isWindows = process.platform === 'win32';

/**
 * Quote executable path for Windows if it contains spaces
 */
function quoteWindowsPath(executablePath: string): string {
  if (isWindows) {
    if (executablePath.includes(' ') && executablePath.startsWith('"')) {
      return executablePath;
    }

    if (executablePath.includes(' ')) {
      return `"${executablePath}"`;
    }
  }

  return executablePath;
}

/**
 * Get Windows-compatible executable name (.cmd extension for package managers)
 */
function getWindowsExecutable(executable: string): string {
  if (isWindows) {
    const packageManagers = ['npm', 'npx', 'yarn', 'pnpm', 'bun'];
    if (packageManagers.includes(executable)) {
      return `${executable}.cmd`;
    }
  }

  return executable;
}

/**
 * Find TypeScript compiler executable with enhanced detection
 * Integrates with package manager detection for optimal execution
 * @param cwd - Current working directory to search for TypeScript compiler
 * @returns Complete TypeScript execution information including executable path, args, and package manager info
 * @example
 * ```typescript
 * const tsInfo = findTypeScriptCompiler('./my-project');
 * console.log(tsInfo.executable); // '/path/to/tsc' or 'pnpm'
 * console.log(tsInfo.args); // [] or ['exec', 'tsc']
 * console.log(tsInfo.packageManager.manager); // 'pnpm' | 'bun' | 'npm' | 'yarn'
 * ```
 */
export function findTypeScriptCompiler(
  cwd: string = process.cwd(),
): TypeScriptInfo {
  const packageManagerInfo = detectPackageManagerAdvanced(cwd);

  if (packageManagerInfo.tscPath && existsSync(packageManagerInfo.tscPath)) {
    const executablePath = packageManagerInfo.tscPath;
    const quotedPath = quoteWindowsPath(executablePath);

    return {
      executable: executablePath,
      args: [],
      useShell: false,
      packageManager: packageManagerInfo,
      isWindows,
      quotedExecutable: quotedPath === executablePath ? undefined : quotedPath,
    };
  }

  const localTsc = path.join(cwd, 'node_modules', '.bin', 'tsc');
  if (existsSync(localTsc)) {
    const quotedPath = quoteWindowsPath(localTsc);

    return {
      executable: localTsc,
      args: [],
      useShell: false,
      packageManager: packageManagerInfo,
      isWindows,
      quotedExecutable: quotedPath === localTsc ? undefined : quotedPath,
    };
  }

  // Try global TypeScript installation paths for test environments
  const globalPaths = [
    path.join(process.cwd(), 'node_modules', '.bin', 'tsc'), // Current project's tsc
    'tsc', // Global tsc as final fallback
  ];

  for (const tscPath of globalPaths) {
    if (tscPath === 'tsc' || existsSync(tscPath)) {
      const windowsExecutable = getWindowsExecutable(tscPath);
      const quotedPath = quoteWindowsPath(tscPath);

      return {
        executable: windowsExecutable,
        args: [],
        useShell: tscPath === 'tsc' || isWindows, // Use shell for global tsc or Windows
        packageManager: packageManagerInfo,
        isWindows,
        quotedExecutable: quotedPath === tscPath ? undefined : quotedPath,
      };
    }
  }

  // Try to resolve from typescript package
  try {
    const require = createRequire(path.join(cwd, 'package.json'));
    const typescriptPkg = require.resolve('typescript/package.json');
    const typescriptDir = path.dirname(typescriptPkg);
    const tscPath = path.join(typescriptDir, 'bin', 'tsc');

    if (existsSync(tscPath)) {
      const quotedPath = quoteWindowsPath(tscPath);

      return {
        executable: tscPath,
        args: [],
        useShell: false,
        packageManager: packageManagerInfo,
        isWindows,
        quotedExecutable: quotedPath === tscPath ? undefined : quotedPath,
      };
    }
  } catch {
    // TypeScript package not found locally
  }

  // Fallback to package manager execution patterns
  switch (packageManagerInfo.manager) {
    case 'pnpm': {
      const executable = getWindowsExecutable('pnpm');
      const quotedPath = quoteWindowsPath(executable);

      return {
        executable,
        args: ['exec', 'tsc'],
        useShell: true,
        packageManager: packageManagerInfo,
        isWindows,
        quotedExecutable: quotedPath === executable ? undefined : quotedPath,
      };
    }

    case 'yarn': {
      const executable = getWindowsExecutable('yarn');
      const quotedPath = quoteWindowsPath(executable);

      return {
        executable,
        args: ['tsc'],
        useShell: true,
        packageManager: packageManagerInfo,
        isWindows,
        quotedExecutable: quotedPath === executable ? undefined : quotedPath,
      };
    }

    case 'bun': {
      const executable = getWindowsExecutable('bun');
      const quotedPath = quoteWindowsPath(executable);

      return {
        executable,
        args: ['x', 'tsc'],
        useShell: true,
        packageManager: packageManagerInfo,
        isWindows,
        quotedExecutable: quotedPath === executable ? undefined : quotedPath,
      };
    }

    default: {
      const executable = getWindowsExecutable('npx');
      const quotedPath = quoteWindowsPath(executable);

      return {
        executable,
        args: ['tsc'],
        useShell: true,
        packageManager: packageManagerInfo,
        isWindows,
        quotedExecutable: quotedPath === executable ? undefined : quotedPath,
      };
    }
  }
}
