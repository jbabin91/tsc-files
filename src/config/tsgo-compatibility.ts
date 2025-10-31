import type { TypeScriptConfig } from '@/config/tsconfig-resolver';
import { detectTsgo } from '@/detectors/typescript';

/**
 * Result of tsgo compatibility analysis
 */
export type TsgoCompatibilityResult = {
  /** Whether the configuration is compatible with tsgo */
  compatible: boolean;
  /** List of incompatible features that would prevent tsgo usage */
  incompatibleFeatures: string[];
  /** Recommendation for the user */
  recommendation: string;
};

/**
 * Known tsgo incompatibilities based on TypeScript native preview limitations
 */
const TSGO_INCOMPATIBLE_FEATURES = {
  baseUrl: {
    name: 'baseUrl',
    description: 'baseUrl is not supported by tsgo (TypeScript native preview)',
    recommendation: 'Use tsc for projects requiring baseUrl with path mapping',
  },
  // Add more known incompatibilities as they are discovered
} as const;

/**
 * Check if a TypeScript configuration is compatible with tsgo
 *
 * tsgo (TypeScript native preview) has limitations compared to full tsc.
 * This function proactively detects configurations that would cause tsgo to fail.
 *
 * @param config - Original TypeScript configuration to analyze
 * @returns Compatibility analysis with recommendations
 */
export function analyzeTsgoCompatibility(
  config: TypeScriptConfig,
): TsgoCompatibilityResult {
  const incompatibleFeatures: string[] = [];

  // Check if baseUrl is present
  // baseUrl is not supported by tsgo (even without paths)
  // TypeScript uses baseUrl for module resolution, but tsgo doesn't support it
  if (
    config.compilerOptions?.baseUrl &&
    config.compilerOptions?.moduleResolution !== 'bundler'
  ) {
    incompatibleFeatures.push(TSGO_INCOMPATIBLE_FEATURES.baseUrl.name);
  }

  // Future: Add other known tsgo limitations here
  // Examples that might be added:
  // - Certain advanced TypeScript features
  // - Complex project references
  // - Specific compiler options

  const compatible = incompatibleFeatures.length === 0;

  return {
    compatible,
    incompatibleFeatures,
    recommendation: compatible
      ? 'Configuration is compatible with tsgo for optimal performance'
      : `Using tsc due to: ${incompatibleFeatures.join(', ')}. Consider using bundler moduleResolution for tsgo compatibility.`,
  };
}

/**
 * Determine if tsgo should be used based on configuration compatibility
 *
 * @param config - TypeScript configuration to analyze
 * @param userPreference - User's explicit compiler preference
 * @param cwd - Current working directory to check for tsgo availability
 * @returns Whether tsgo should be used and why
 */
export function shouldUseTsgo(
  config: TypeScriptConfig,
  userPreference?: {
    useTsc?: boolean;
    useTsgo?: boolean;
  },
  cwd: string = process.cwd(),
): {
  useTsgo: boolean;
  reason: string;
  compatibilityResult?: TsgoCompatibilityResult;
} {
  // Respect explicit user preferences
  if (userPreference?.useTsgo) {
    return {
      useTsgo: true,
      reason: 'User explicitly requested tsgo with --use-tsgo flag',
    };
  }

  if (userPreference?.useTsc) {
    return {
      useTsgo: false,
      reason: 'User explicitly requested tsc with --use-tsc flag',
    };
  }

  // Check if tsgo is actually available
  const tsgoAvailable = detectTsgo(cwd);
  if (!tsgoAvailable.available) {
    return {
      useTsgo: false,
      reason: 'tsgo not available (not installed)',
    };
  }

  // Analyze compatibility for automatic selection
  const compatibilityResult = analyzeTsgoCompatibility(config);

  if (!compatibilityResult.compatible) {
    return {
      useTsgo: false,
      reason: `Configuration incompatible with tsgo: ${compatibilityResult.incompatibleFeatures.join(', ')}`,
      compatibilityResult,
    };
  }

  return {
    useTsgo: true,
    reason: 'Configuration is compatible with tsgo for optimal performance',
    compatibilityResult,
  };
}
