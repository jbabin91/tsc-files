import { defineConfig } from 'cz-git';

export default defineConfig({
  extends: ['@commitlint/config-conventional'],
  // commitlint rules
  rules: {
    // Ensure types match your existing patterns
    'type-enum': [
      2,
      'always',
      [
        'feat', // New features
        'fix', // Bug fixes
        'docs', // Documentation changes
        'style', // Code style changes (formatting, etc.)
        'refactor', // Code changes that neither fix bugs nor add features
        'perf', // Performance improvements
        'test', // Adding or correcting tests
        'chore', // Dependencies, tooling, etc.
        'ci', // CI configuration changes
        'revert', // Revert a previous commit
      ],
    ],
    // Scope format - allow optional scopes
    'scope-case': [2, 'always', 'lower-case'],
    // Subject format - imperative mood, no period
    'subject-case': [
      2,
      'never',
      ['sentence-case', 'start-case', 'pascal-case', 'upper-case'],
    ],
    'subject-full-stop': [2, 'never', '.'],
    'subject-empty': [2, 'never'],
    // Header length limit
    'header-max-length': [2, 'always', 200],
    // Body length limit
    'body-max-length': [2, 'always', Infinity],
    'body-max-line-length': [0, 'always'], // Disable line length limit completely
  },
  // cz-git configuration
  prompt: {
    alias: {
      fd: 'docs: fix typos',
      b: 'chore(repo): :hammer: bump dependencies',
    },
    useEmoji: true,
    scopes: [
      // Project-specific scopes
      'cli',
      'core',
      'types',
      'config',
      'build',
      'test',
      'docs',
      'deps',
    ],
    customScopesAlias: 'custom',
    emptyScopesAlias: 'empty',
    upperCaseSubject: false,
    skipQuestions: [],
    customIssuePrefixAlign: 'top',
    emptyIssuePrefixAlias: 'skip',
    customIssuePrefixAlias: 'custom',
    allowCustomIssuePrefix: true,
    allowEmptyIssuePrefix: true,
    confirmColorize: true,
    maxHeaderLength: Infinity,
    maxSubjectLength: Infinity,
    minSubjectLength: 0,
    defaultBody: '',
    defaultIssues: '',
    defaultScope: '',
    defaultSubject: '',
  },
});
