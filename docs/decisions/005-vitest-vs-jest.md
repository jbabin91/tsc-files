# ADR 005: Vitest Testing Framework

**Status**: Accepted

## Context

We needed a testing framework that works well with TypeScript, ESM, and modern tooling while providing good developer experience.

## Decision

We chose Vitest over Jest and other testing frameworks.

## Reasoning

- **Native ESM Support**: Works seamlessly with modern JavaScript modules
- **TypeScript Integration**: Excellent TypeScript support out of the box
- **Modern Tooling**: Built on Vite with fast Hot Module Replacement
- **Jest Compatibility**: Familiar API for developers coming from Jest
- **Coverage Integration**: Built-in coverage with v8 provider
- **GitHub Actions**: Native support for CI reporting and annotations
- **Performance**: Significantly faster than Jest for our use case

## Consequences

- **Positive**: Fast test execution and excellent developer experience
- **Positive**: Perfect integration with our modern TypeScript/ESM setup
- **Positive**: Built-in coverage reporting with multiple formats
- **Negative**: Newer ecosystem with potentially fewer plugins than Jest
- **Negative**: Some team members may need to learn Vitest-specific features

## Alternatives Considered

- **Jest**: Industry standard but ESM support is complex and slower
- **Node Test Runner**: Built-in but limited features and tooling
- **Mocha + Chai**: Flexible but requires more configuration
- **AVA**: Good TypeScript support but less ecosystem
