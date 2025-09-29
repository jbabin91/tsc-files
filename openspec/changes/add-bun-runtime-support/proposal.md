# Bun Runtime Support Proposal

## Why

Bun is an emerging JavaScript runtime and package manager gaining adoption in the TypeScript ecosystem. Current package manager detection supports npm, yarn, and pnpm but not Bun. As Bun adoption grows, users running tsc-files in Bun-based projects will lack proper runtime detection and optimized execution.

Supporting Bun ensures tsc-files remains future-proof and provides consistent reliability across all major JavaScript runtimes.

## What Changes

- Extend package manager detection to recognize bun.lockb
- Add Bun runtime detection via `BUN` environment variable and Bun-specific APIs
- Handle Bun-specific executable paths and shell requirements
- Test compiler execution in Bun environment
- Add Bun to documentation and examples

## Impact

- Affected specs: `compiler-detection`
- Affected code: `src/detectors/package-manager.ts`, `src/detectors/typescript.ts`
- Breaking changes: None (additive enhancement)
- Future-proofing: Ready for Bun ecosystem adoption
