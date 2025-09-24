#!/usr/bin/env node
/**
 * Enhanced changeset generator from conventional commits
 * Based on patterns from @bob-obringer/conventional-changesets and changeset-conventional-commits
 */
/* eslint-disable no-console */

import { execSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

// TypeScript types for type safety
type Commit = {
  sha: string;
  message: string;
};

type ConventionalCommitGroup = {
  changelogMessage: string;
  commitHashes: string[];
};

type ParsedCommit = {
  sha: string;
  type: string;
  scope: string | null;
  subject: string;
  body: string;
  message: string;
  isBreakingChange: boolean;
  upgradeType: 'major' | 'minor' | 'patch' | null;
  section?: string;
  associatedHashes?: string[];
  associatedCount?: number;
};

type CommitTypeConfig = {
  type: string;
  section: string;
  bump: 'major' | 'minor' | 'patch' | null;
};

// Comprehensive conventional commit types from changeset-conventional-commits
const defaultCommitTypes: CommitTypeConfig[] = [
  { type: 'feat', section: 'Features', bump: 'minor' },
  { type: 'feature', section: 'Features', bump: 'minor' },
  { type: 'fix', section: 'Bug Fixes', bump: 'patch' },
  { type: 'perf', section: 'Performance Improvements', bump: 'patch' },
  { type: 'revert', section: 'Reverts', bump: 'patch' },
  { type: 'docs', section: 'Documentation', bump: null },
  { type: 'style', section: 'Styles', bump: null },
  { type: 'chore', section: 'Miscellaneous Chores', bump: null },
  { type: 'refactor', section: 'Code Refactoring', bump: 'patch' },
  { type: 'test', section: 'Tests', bump: null },
  { type: 'build', section: 'Build System', bump: null },
  { type: 'ci', section: 'Continuous Integration', bump: null },
];

// Advanced breaking change detection from changeset-conventional-commits
function isBreakingChange(commit: string): boolean {
  return (
    commit.includes('BREAKING CHANGE:') ||
    // Detect ! suffix in commit type (e.g., feat!: or fix(scope)!:)
    defaultCommitTypes.some((commitType) =>
      new RegExp(`^${commitType.type}(?:\\(.*\\))?!:`).exec(commit),
    )
  );
}

// Professional conventional commit validation
function isConventionalCommit(commit: string): boolean {
  return defaultCommitTypes.some((commitType) =>
    new RegExp(`^${commitType.type}(?:\\(.*\\))?!?:`).exec(commit),
  );
}

// Smart commit association from changeset-conventional-commits
// Associates non-conventional commits to the nearest conventional commit
// Rewritten to avoid Array#reduce() for unicorn compliance
function associateCommitsToConventionalCommitMessages(
  commits: Commit[],
): ConventionalCommitGroup[] {
  const groups: ConventionalCommitGroup[] = [];

  for (const commit of commits) {
    if (groups.length === 0) {
      groups.push({
        changelogMessage: commit.message,
        commitHashes: [commit.sha],
      });
      continue;
    }

    const lastGroup = groups.at(-1)!;

    if (isConventionalCommit(commit.message)) {
      if (isConventionalCommit(lastGroup.changelogMessage)) {
        // Both are conventional - start new group
        groups.push({
          changelogMessage: commit.message,
          commitHashes: [commit.sha],
        });
      } else {
        // Replace non-conventional with conventional message
        lastGroup.changelogMessage = commit.message;
        lastGroup.commitHashes.push(commit.sha);
      }
    } else {
      // Non-conventional - add to current group
      lastGroup.commitHashes.push(commit.sha);
    }
  }

  return groups;
}

// Get the last version tag
function getLastVersionTag(): string {
  try {
    return execSync('git describe --tags --abbrev=0', {
      encoding: 'utf8',
    }).trim();
  } catch {
    return 'HEAD~10'; // fallback if no tags
  }
}

// Get commits with full SHA and message since last version
function getCommitsSinceVersion(lastTag: string): Commit[] {
  const delimiter = '<!--|COMMIT|-->';
  const commits = execSync(
    `git log --format="%H %s%n%b${delimiter}" ${lastTag}..HEAD`,
    {
      encoding: 'utf8',
    },
  )
    .toString()
    .trim()
    .split(delimiter)
    .slice(0, -1)
    .map((commitText) => {
      const commit = commitText.trim();
      const sha = commit.slice(0, 40);
      const message = commit.slice(40).trim();
      return { sha, message };
    })
    .filter(({ message }) => message.length > 0);

  return commits;
}

// Professional conventional commit parsing with comprehensive type support
function parseCommit({ sha, message }: Commit): ParsedCommit | null {
  // Build dynamic regex from all supported commit types
  const typePattern = defaultCommitTypes.map((ct) => ct.type).join('|');
  const conventionalRegex = new RegExp(
    `^(${typePattern})(\\([^)]+\\))?(!?)?: (.+)`,
  );

  const lines = message.split('\n');
  const headerMatch = lines[0].match(conventionalRegex);

  if (!headerMatch) return null;

  const [, type, scope, exclamation, subject] = headerMatch;
  const body = lines.slice(1).join('\n').trim();

  // Advanced breaking change detection - check for ! suffix AND body/footer
  const hasBreakingChange = exclamation === '!' || isBreakingChange(message);

  // Get bump type from commit type mapping
  const commitTypeConfig = defaultCommitTypes.find((ct) => ct.type === type);
  const upgradeType = hasBreakingChange
    ? ('major' as const)
    : (commitTypeConfig?.bump ?? null);

  return {
    sha,
    type,
    scope: scope ? scope.slice(1, -1) : null, // Remove parentheses
    subject,
    body,
    message,
    isBreakingChange: hasBreakingChange,
    upgradeType,
    section: commitTypeConfig?.section,
  };
}

// Determine overall version bump from parsed commits
function getVersionBump(
  commits: ParsedCommit[],
): 'major' | 'minor' | 'patch' | null {
  const hasBreaking = commits.some((c) => c.isBreakingChange);
  const hasFeat = commits.some((c) => c.type === 'feat');
  const hasFix = commits.some(
    (c) => c.type === 'fix' || c.type === 'perf' || c.type === 'refactor',
  );

  return hasBreaking ? 'major' : hasFeat ? 'minor' : hasFix ? 'patch' : null;
}

// Generate changeset content with enhanced formatting
function generateChangesetContent(
  commits: ParsedCommit[],
  versionBump: 'major' | 'minor' | 'patch',
): { content: string } {
  const packageName = '@jbabin91/tsc-files';

  let content = `---\n"${packageName}": ${versionBump}\n---\n\n`;

  // Group commits by type
  const grouped: Record<string, ParsedCommit[]> = {};
  for (const commit of commits) {
    if (!grouped[commit.type]) grouped[commit.type] = [];
    grouped[commit.type].push(commit);
  }

  // Dynamic section labels based on conventional commit configuration
  const typeLabels: Record<string, string> = {
    feat: '### ✨ Features',
    feature: '### ✨ Features',
    fix: '### 🐛 Bug Fixes',
    perf: '### ⚡ Performance Improvements',
    revert: '### 🔄 Reverts',
    docs: '### 📝 Documentation',
    style: '### 💄 Styles',
    chore: '### 🔧 Miscellaneous Chores',
    refactor: '### ♻️ Code Refactoring',
    test: '### ✅ Tests',
    build: '### 🏗️ Build System',
    ci: '### 👷 Continuous Integration',
  };

  for (const [type, typeCommits] of Object.entries(grouped)) {
    if (typeLabels[type]) {
      content += `${typeLabels[type]}\n\n`;
      for (const commit of typeCommits) {
        const scope = commit.scope ? `**${commit.scope}**: ` : '';
        const breakingIndicator = commit.isBreakingChange ? ' ⚠️ BREAKING' : '';
        content += `- ${scope}${commit.subject}${breakingIndicator}\n`;
      }
      content += '\n';
    }
  }

  return { content };
}

// Main function
function main(): void {
  console.log('🔍 Analyzing commits for changeset generation...');

  const lastTag = getLastVersionTag();
  console.log(`📋 Last version tag: ${lastTag}`);

  const commits = getCommitsSinceVersion(lastTag);
  console.log(`📝 Found ${commits.length} commits since ${lastTag}`);

  if (commits.length === 0) {
    console.log('✨ No new commits found - no changeset needed');
    return;
  }

  // First, associate commits to group non-conventional with conventional ones
  const associatedCommits =
    associateCommitsToConventionalCommitMessages(commits);
  console.log(`🔗 Associated commits into ${associatedCommits.length} groups`);

  // Parse only the conventional commit messages and filter for version-bumping
  const parsedCommits = associatedCommits
    .map((group) => {
      const parsedCommit = parseCommit({
        sha: group.commitHashes[0],
        message: group.changelogMessage,
      });
      if (parsedCommit) {
        // Add associated commit info
        parsedCommit.associatedHashes = group.commitHashes;
        parsedCommit.associatedCount = group.commitHashes.length;
      }
      return parsedCommit;
    })
    .filter((commit): commit is ParsedCommit => {
      if (!commit) return false;
      if (!isConventionalCommit(commit.message)) {
        console.log(
          `⚠️  Skipping non-conventional commit: ${commit.sha.slice(0, 7)} - ${commit.message.split('\n')[0]}`,
        );
        return false;
      }
      return commit.upgradeType !== null; // Only version-bumping commits
    });

  console.log(`✅ Parsed ${parsedCommits.length} conventional commits`);

  if (parsedCommits.length === 0) {
    console.log('⚠️  No conventional commits found - no changeset needed');
    return;
  }

  // Determine version bump
  const versionBump = getVersionBump(parsedCommits);
  if (!versionBump) {
    console.log('ℹ️  No version-bumping commits found - no changeset needed');
    return;
  }

  // Generate changeset with unique identifier
  const { content } = generateChangesetContent(parsedCommits, versionBump);
  const changesetId = randomUUID().slice(0, 8);
  const filename = `.changeset/${changesetId}-auto-generated.md`;

  // Ensure .changeset directory exists
  const changesetDir = path.dirname(filename);
  mkdirSync(changesetDir, { recursive: true });

  try {
    writeFileSync(filename, content);
    console.log(`🎉 Generated changeset: ${filename}`);
    console.log(`📦 Version bump: ${versionBump}`);
    console.log(`📋 Commits included: ${parsedCommits.length}`);

    // Log commit details for verification
    console.log('\n📋 Included commits:');
    for (const commit of parsedCommits) {
      const scope = commit.scope ? `(${commit.scope})` : '';
      const breaking = commit.isBreakingChange ? ' ⚠️' : '';
      const associated =
        commit.associatedCount && commit.associatedCount > 1
          ? ` +${commit.associatedCount - 1} related`
          : '';
      console.log(
        `  • ${commit.type}${scope}: ${commit.subject}${breaking}${associated}`,
      );
    }
  } catch (error) {
    console.error(`❌ Error creating changeset:`, error);
    process.exit(1);
  }
}

main();
