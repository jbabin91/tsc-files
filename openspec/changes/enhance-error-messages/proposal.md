# Enhanced Error Messages Proposal

## Why

Git hook failures due to TypeScript errors currently lack clear context and actionable guidance. Users see raw TypeScript compiler output without understanding:

- Why their commit failed
- Which specific changes caused the errors
- How to quickly fix the issues
- Whether to fix now or bypass (and consequences)

This creates friction in the development workflow and leads to frustration with the tool.

## What Changes

- Add git hook context detection to identify when running in pre-commit/lint-staged environment
- Enhance error formatting with clear file locations, line numbers, and error descriptions
- Provide actionable suggestions for common TypeScript errors
- Add summary statistics (files checked, errors found, time taken)
- Improve error grouping to show errors by file for easier navigation
- Add helpful tips for git hook workflows (--skip-lib-check, tsconfig tuning)

## Impact

- Affected specs: `cli-interface`, `execution-and-output`
- Affected code: `src/cli/output.ts`, `src/execution/output-parser.ts`, `src/cli/education.ts`
- Breaking changes: None (output format enhancement only)
- User experience: Significantly improved error clarity and developer productivity
