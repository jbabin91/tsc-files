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
  compilerType: 'tsc' | 'tsgo'; // Type of TypeScript compiler being used
  version?: string; // Compiler version for user messaging
  fallbackAvailable?: boolean; // Whether alternative compiler is available as fallback
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
 * Detection result for tsgo compiler
 */
export type TsgoDetectionResult = {
  available: boolean;
  executable?: string;
  version?: string;
  args?: string[];
  useShell?: boolean;
  quotedExecutable?: string;
};

/**
 * Detect tsgo (TypeScript native preview) compiler
 * @param cwd - Current working directory to search for tsgo
 * @returns tsgo detection information
 */
export function detectTsgo(cwd: string): TsgoDetectionResult {
  try {
    // Check for @typescript/native-preview package in node_modules
    const require = createRequire(path.join(cwd, 'package.json'));

    try {
      const tsgoPackagePath = require.resolve(
        '@typescript/native-preview/package.json',
      );
      const tsgoPackageDir = path.dirname(tsgoPackagePath);

      // Look for tsgo executable in the package
      const tsgoPaths = [
        path.join(tsgoPackageDir, 'bin', 'tsgo'),
        path.join(tsgoPackageDir, 'tsgo'),
        path.join(cwd, 'node_modules', '.bin', 'tsgo'),
      ];

      for (const tsgoPath of tsgoPaths) {
        if (existsSync(tsgoPath)) {
          const quotedPath = quoteWindowsPath(tsgoPath);

          // For now, assume it works if the file exists
          // Version check and execution verification can be added later
          return {
            available: true,
            executable: tsgoPath,
            version: undefined, // Version detection can be added later
            args: [],
            useShell: false,
            quotedExecutable: quotedPath === tsgoPath ? undefined : quotedPath,
          };
        }
      }

      // Package exists but executable not found
      return { available: false };
    } catch {
      // @typescript/native-preview package not found
      return { available: false };
    }
  } catch {
    // Error in detection process
    return { available: false };
  }
}

/**
 * Find TypeScript compiler executable with enhanced detection
 * Integrates with package manager detection for optimal execution
 * @param cwd - Current working directory to search for TypeScript compiler
 * @param options - Options to override compiler selection behavior
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
  options?: {
    useTsc?: boolean;
    useTsgo?: boolean;
  },
): TypeScriptInfo {
  const packageManagerInfo = detectPackageManagerAdvanced(cwd);

  // Handle forced compiler selection
  if (options?.useTsgo) {
    // User explicitly wants tsgo - fail if not available
    const tsgoInfo = detectTsgo(cwd);
    if (tsgoInfo.available && tsgoInfo.executable) {
      return {
        executable: tsgoInfo.executable,
        args: tsgoInfo.args ?? [],
        useShell: tsgoInfo.useShell ?? false,
        packageManager: packageManagerInfo,
        isWindows,
        quotedExecutable: tsgoInfo.quotedExecutable,
        compilerType: 'tsgo',
        version: tsgoInfo.version,
        fallbackAvailable: true, // tsc is available as fallback
      };
    } else {
      throw new Error(
        'tsgo compiler not found. Install with: npm install -D @typescript/native-preview\n' +
          'Or remove --use-tsgo flag to use standard tsc compiler.',
      );
    }
  }

  // Try tsgo first unless user explicitly wants tsc
  if (!options?.useTsc) {
    const tsgoInfo = detectTsgo(cwd);
    if (tsgoInfo.available && tsgoInfo.executable) {
      return {
        executable: tsgoInfo.executable,
        args: tsgoInfo.args ?? [],
        useShell: tsgoInfo.useShell ?? false,
        packageManager: packageManagerInfo,
        isWindows,
        quotedExecutable: tsgoInfo.quotedExecutable,
        compilerType: 'tsgo',
        version: tsgoInfo.version,
        fallbackAvailable: true, // tsc is available as fallback
      };
    }
  }

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
      compilerType: 'tsc',
      version: undefined, // Version detection can be added later
      fallbackAvailable: false, // Will be updated when tsgo detection is added
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
      compilerType: 'tsc',
      version: undefined,
      fallbackAvailable: false,
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
        compilerType: 'tsc',
        version: undefined,
        fallbackAvailable: false,
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
        compilerType: 'tsc',
        version: undefined,
        fallbackAvailable: false,
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
        compilerType: 'tsc',
        version: undefined,
        fallbackAvailable: false,
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
        compilerType: 'tsc',
        version: undefined,
        fallbackAvailable: false,
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
        compilerType: 'tsc',
        version: undefined,
        fallbackAvailable: false,
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
        compilerType: 'tsc',
        version: undefined,
        fallbackAvailable: false,
      };
    }
  }
}
