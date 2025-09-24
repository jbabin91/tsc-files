#!/usr/bin/env node
/**
 * Generate changeset from conventional commits since last version tag
 */
/* eslint-disable no-console */

import { execSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { writeFileSync } from 'node:fs';

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

// Get commits since last version
function getCommitsSinceVersion(lastTag) {
  const commits = execSync(`git log ${lastTag}..HEAD --oneline`, {
    encoding: 'utf8',
  })
    .split('\n')
    .filter((line) => line.trim())
    .map((line) => line.slice(8)); // Remove commit hash

  return commits;
}

// Parse conventional commit
function parseCommit(commitMessage) {
  const conventionalRegex =
    /^(feat|fix|docs|style|refactor|perf|test|chore|ci|revert)(\([^)]+\))?: (.+)/;
  const match = commitMessage.match(conventionalRegex);

  if (!match) return null;

  const [, type, scope, description] = match;
  return {
    type,
    scope: scope ? scope.slice(1, -1) : null, // Remove parentheses
    description,
    breaking: commitMessage.includes('BREAKING CHANGE'),
    raw: commitMessage,
  };
}

// Determine version bump
function getVersionBump(commits) {
  const hasBreaking = commits.some((c) => c.breaking);
  const hasFeat = commits.some((c) => c.type === 'feat');
  const hasFix = commits.some((c) => c.type === 'fix');

  if (hasBreaking) return 'major';
  if (hasFeat) return 'minor';
  if (hasFix) return 'patch';
  return null; // No version bump needed
}

// Generate changeset content
function generateChangesetContent(commits, versionBump) {
  const packageName = '@jbabin91/tsc-files';
  const changesetId = randomUUID().slice(0, 8);

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
        content += `- ${scope}${commit.description}\n`;
      }
      content += '\n';
    }
  }

  return { content, changesetId };
}

// Main function
function main() {
  console.log('🔍 Analyzing commits for changeset generation...');

  const lastTag = getLastVersionTag();
  console.log(`📋 Last version tag: ${lastTag}`);

  const commitMessages = getCommitsSinceVersion(lastTag);
  console.log(`📝 Found ${commitMessages.length} commits since ${lastTag}`);

  if (commitMessages.length === 0) {
    console.log('✨ No new commits found - no changeset needed');
    return;
  }

  // Parse conventional commits
  const parsedCommits = commitMessages
    .map((message) => parseCommit(message))
    .filter(Boolean); // Remove non-conventional commits

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

  // Generate changeset
  const { content, changesetId } = generateChangesetContent(
    parsedCommits,
    versionBump,
  );
  const filename = `.changeset/${changesetId}-auto-generated.md`;

  writeFileSync(filename, content);
  console.log(`🎉 Generated changeset: ${filename}`);
  console.log(`📦 Version bump: ${versionBump}`);
  console.log(`📋 Commits included: ${parsedCommits.length}`);
}

main();
