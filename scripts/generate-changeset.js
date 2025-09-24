#!/usr/bin/env node
/**
 * Enhanced changeset generator from conventional commits
 * Based on patterns from @bob-obringer/conventional-changesets
 */
/* eslint-disable no-console */

import { execSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

// Pattern to identify breaking changes in commit messages
const BREAKING_PATTERN = 'BREAKING CHANGE';

// Mapping of commit types to corresponding upgrade types
const bumpMap = {
  feat: 'minor',
  fix: 'patch',
  refactor: 'patch',
  perf: 'patch',
  // Non-version-bumping types
  docs: null,
  style: null,
  test: null,
  chore: null,
  ci: null,
  revert: null,
};

// Get the last version tag
function getLastVersionTag() {
  try {
    return execSync('git describe --tags --abbrev=0', {
      encoding: 'utf8',
    }).trim();
  } catch {
    return 'HEAD~10'; // fallback if no tags
  }
}

// Get commits with full SHA and message since last version
function getCommitsSinceVersion(lastTag) {
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
    .filter(({ message }) => message);

  return commits;
}

// Enhanced conventional commit parsing with better breaking change detection
function parseCommit({ sha, message }) {
  // Parse the header line for type, scope, and subject
  const conventionalRegex =
    /^(feat|fix|docs|style|refactor|perf|test|chore|ci|revert)(\([^)]+\))?: (.+)/;
  const lines = message.split('\n');
  const headerMatch = lines[0].match(conventionalRegex);

  if (!headerMatch) return null;

  const [, type, scope, subject] = headerMatch;
  const body = lines.slice(1).join('\n').trim();

  // Enhanced breaking change detection - check both body and footer
  const isBreakingChange = message.includes(BREAKING_PATTERN);

  // Determine upgrade type based on commit type and breaking changes
  const upgradeType = isBreakingChange ? 'major' : bumpMap[type] || null;

  return {
    sha,
    type,
    scope: scope ? scope.slice(1, -1) : null, // Remove parentheses
    subject,
    body,
    message,
    isBreakingChange,
    upgradeType,
  };
}

// Determine overall version bump from parsed commits
function getVersionBump(commits) {
  const hasBreaking = commits.some((c) => c.isBreakingChange);
  const hasFeat = commits.some((c) => c.type === 'feat');
  const hasFix = commits.some(
    (c) => c.type === 'fix' || c.type === 'perf' || c.type === 'refactor',
  );

  if (hasBreaking) return 'major';
  if (hasFeat) return 'minor';
  if (hasFix) return 'patch';
  return null; // No version bump needed
}

// Generate changeset content with enhanced formatting
function generateChangesetContent(commits, versionBump) {
  const packageName = '@jbabin91/tsc-files';

  let content = `---\n"${packageName}": ${versionBump}\n---\n\n`;

  // Group commits by type
  const grouped = {};
  for (const commit of commits) {
    if (!grouped[commit.type]) grouped[commit.type] = [];
    grouped[commit.type].push(commit);
  }

  // Add sections based on conventional commit types
  const typeLabels = {
    feat: '### ✨ Features',
    fix: '### 🐛 Bug Fixes',
    perf: '### ⚡ Performance',
    docs: '### 📝 Documentation',
    style: '### 💄 Styling',
    refactor: '### ♻️ Refactoring',
    test: '### ✅ Tests',
    chore: '### 🔧 Chores',
    ci: '### 👷 CI/CD',
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
function main() {
  console.log('🔍 Analyzing commits for changeset generation...');

  const lastTag = getLastVersionTag();
  console.log(`📋 Last version tag: ${lastTag}`);

  const commits = getCommitsSinceVersion(lastTag);
  console.log(`📝 Found ${commits.length} commits since ${lastTag}`);

  if (commits.length === 0) {
    console.log('✨ No new commits found - no changeset needed');
    return;
  }

  // Parse conventional commits
  const parsedCommits = commits
    .map((commit) => parseCommit(commit))
    .filter((commit) => commit && commit.upgradeType); // Only version-bumping commits

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
      console.log(`  • ${commit.type}${scope}: ${commit.subject}${breaking}`);
    }
  } catch (error) {
    console.error(`❌ Error creating changeset:`, error);
    process.exit(1);
  }
}

main();
