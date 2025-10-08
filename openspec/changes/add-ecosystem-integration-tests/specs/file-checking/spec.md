# File Checking Specification Delta

## ADDED Requirements

### Requirement: Monorepo Workspace Protocol Support

The system SHALL resolve cross-package imports using workspace protocol (`workspace:*`, `@workspace/pkg`) in monorepo projects.

#### Scenario: pnpm workspace protocol import

- **WHEN** a monorepo uses pnpm with `workspace:*` protocol in dependencies
- **AND** one package imports types from another using `import { Type } from '@workspace/core'`
- **THEN** TypeScript resolves the import correctly and type checking succeeds

#### Scenario: npm workspaces cross-package import

- **WHEN** a monorepo uses npm workspaces with multiple packages
- **AND** one package imports from another using package name
- **THEN** TypeScript resolves node_modules symlinks and type checking succeeds

#### Scenario: yarn workspaces cross-package import

- **WHEN** a monorepo uses yarn workspaces
- **AND** packages reference each other via workspace: protocol
- **THEN** TypeScript resolves the workspace references correctly

### Requirement: Framework Preset Extends Chain Support

The system SHALL support TypeScript configurations that extend framework-provided presets from node_modules.

#### Scenario: Next.js preset extends

- **WHEN** tsconfig.json extends "next" or "next/tsconfig.json"
- **AND** user checks Next.js project files
- **THEN** framework-specific types and path aliases are available

#### Scenario: Vite preset extends

- **WHEN** tsconfig.json extends "@tsconfig/vite"
- **AND** user checks Vite project files
- **THEN** Vite-specific types (import.meta, etc.) are available

#### Scenario: Custom overrides on framework preset

- **WHEN** tsconfig.json extends framework preset and adds custom paths
- **THEN** both preset settings and custom overrides are applied correctly

### Requirement: TypeScript Project References Support

The system SHALL support projects using TypeScript project references with composite configurations.

#### Scenario: Composite project with references

- **WHEN** tsconfig.json has `composite: true` and `references: [...]`
- **AND** user checks files that import from referenced projects
- **THEN** types from referenced projects are resolved correctly

#### Scenario: Cross-project type imports

- **WHEN** project A references project B
- **AND** project A imports types from project B
- **THEN** type checking succeeds with correct type resolution

#### Scenario: Reference path resolution

- **WHEN** project references use relative paths `{ "path": "../shared" }`
- **THEN** TypeScript resolves the reference paths from project directory

### Requirement: Large File List Performance

The system SHALL handle large numbers of files efficiently without exceeding platform limits.

#### Scenario: 500 files in single command

- **WHEN** user provides 500+ file paths in a single tsc-files command
- **THEN** the system completes type checking in under 30 seconds
- **AND** memory usage stays under 512MB

#### Scenario: Windows command line length handling

- **WHEN** running on Windows with command line approaching 8191 character limit
- **THEN** the system handles the file list without truncation errors
- **AND** uses alternative argument passing if needed

#### Scenario: Concurrent execution safety

- **WHEN** multiple tsc-files processes run simultaneously (parallel git hooks)
- **THEN** each process uses isolated temp configs without conflicts
- **AND** all processes complete successfully

### Requirement: Generated Type File Support

The system SHALL resolve types from generated files (Prisma, GraphQL, etc.) even when patterns differ from source files.

#### Scenario: Prisma client types

- **WHEN** project uses Prisma with generated `@prisma/client` types
- **AND** source files import from `@prisma/client`
- **THEN** TypeScript finds the generated types in node_modules

#### Scenario: GraphQL codegen types

- **WHEN** project uses GraphQL Code Generator with output to `src/generated/`
- **AND** source files import from generated types
- **THEN** TypeScript resolves generated types correctly

#### Scenario: Types in gitignore

- **WHEN** generated types are in .gitignore (e.g., `dist/`, `generated/`)
- **BUT** are needed for type checking
- **THEN** TypeScript finds and uses them if they exist on disk

#### Scenario: Triple-slash type references

- **WHEN** files use `/// <reference types="node" />` or similar type references
- **THEN** TypeScript resolves the referenced type definitions from node_modules/@types

#### Scenario: Triple-slash path references

- **WHEN** files use `/// <reference path="./custom-types.d.ts" />` to reference local declarations
- **THEN** TypeScript resolves relative path references correctly from the file's directory

### Requirement: Modern File Extension Support

The system SHALL support modern TypeScript file extensions (.mts, .cts, .d.mts, .d.cts) for explicit module types.

#### Scenario: ES module files (.mts)

- **WHEN** project uses .mts files for ES modules
- **THEN** TypeScript treats them as ES modules and type checks correctly

#### Scenario: CommonJS files (.cts)

- **WHEN** project uses .cts files for CommonJS modules
- **THEN** TypeScript treats them as CommonJS and type checks correctly

#### Scenario: Mixed module types

- **WHEN** project uses .ts, .mts, and .cts files together
- **THEN** TypeScript handles each with appropriate module semantics

#### Scenario: Module declaration files

- **WHEN** project uses .d.mts or .d.cts declaration files
- **THEN** TypeScript resolves type-only imports correctly

### Requirement: Test Framework Global Types

The system SHALL provide global test framework types (describe, it, expect, etc.) based on testing library configuration.

#### Scenario: Jest global types

- **WHEN** project uses Jest with @types/jest
- **AND** test files use globals like `describe`, `it`, `expect`
- **THEN** TypeScript recognizes the globals without import statements

#### Scenario: Playwright global types

- **WHEN** project uses Playwright with package-provided types
- **AND** test files use `test`, `expect` globals
- **THEN** TypeScript recognizes Playwright globals correctly

#### Scenario: Cypress chainable types

- **WHEN** project uses Cypress with chainable command types
- **AND** test files use `cy` global with custom commands
- **THEN** TypeScript provides correct types for chained commands

#### Scenario: Vitest globals (regression test)

- **WHEN** project uses Vitest with `vitest/globals`
- **AND** test files use `beforeEach`, `describe`, `it`, `expect`
- **THEN** TypeScript recognizes all Vitest globals (no regression from recent fixes)
