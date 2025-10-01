import js from '@eslint/js';
import { defineConfig, globalIgnores } from 'eslint/config';
import configPrettier from 'eslint-config-prettier';
import importX from 'eslint-plugin-import-x';
import simpleImportSort from 'eslint-plugin-simple-import-sort';
import sortKeysPlus from 'eslint-plugin-sort-keys-plus';
import unicorn from 'eslint-plugin-unicorn';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default defineConfig(
  globalIgnores(['node_modules', 'dist', 'coverage', '.cache']),
  {
    languageOptions: {
      ecmaVersion: 'latest',
      globals: globals.node,
    },
  },
  {
    extends: [js.configs.recommended, unicorn.configs.recommended],
    plugins: {
      'import-x': importX,
      'simple-import-sort': simpleImportSort,
    },
    rules: {
      eqeqeq: 'error',
      'import-x/first': 'error',
      'import-x/newline-after-import': 'error',
      'import-x/no-duplicates': ['error', { 'prefer-inline': true }],
      'no-console': 'warn',
      'simple-import-sort/exports': 'error',
      'simple-import-sort/imports': 'error',
      'unicorn/filename-case': [
        'error',
        {
          cases: {
            camelCase: false,
            kebabCase: true,
            pascalCase: false,
          },
        },
      ],
      'unicorn/no-null': 'off',
      'unicorn/no-process-exit': 'off',
      'unicorn/prefer-class-fields': 'error',
      'unicorn/prefer-top-level-await': 'off',
      'unicorn/prevent-abbreviations': 'off',
    },
  },
  {
    extends: [
      ...tseslint.configs.recommendedTypeChecked,
      ...tseslint.configs.stylisticTypeChecked,
    ],
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      '@typescript-eslint/consistent-type-definitions': ['error', 'type'],
      '@typescript-eslint/consistent-type-exports': 'error',
      '@typescript-eslint/consistent-type-imports': [
        'error',
        { fixStyle: 'inline-type-imports' },
      ],
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/prefer-return-this-type': 'error',
      '@typescript-eslint/restrict-template-expressions': 'off',
    },
  },
  {
    files: ['eslint.config.js', '*.config.ts'],
    plugins: {
      'sort-keys-plus': sortKeysPlus,
    },
    rules: {
      'sort-keys-plus/sort-keys': [
        'error',
        'asc',
        {
          caseSensitive: false,
          minKeys: 3,
        },
      ],
    },
  },
  {
    files: ['tests/**/*', '**/*.test.*', '**/*.spec.*'],
    rules: {
      '@typescript-eslint/unbound-method': 'off',
      'no-console': 'off',
      'no-empty-pattern': 'off',
    },
  },
  configPrettier,
);
