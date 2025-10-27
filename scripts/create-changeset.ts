#!/usr/bin/env node
/* eslint-disable no-console */

import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

import type { Changeset } from '@changesets/types';
import writeChangeset from '@changesets/write';

/**
 * Non-interactive changeset creation script for AI-friendly workflows
 *
 * Usage:
 *   pnpm changeset:create patch "fix(core): handle missing tsconfig"
 *   pnpm changeset:create minor "feat(cli): add --verbose flag" "Add detailed logging output"
 *   pnpm changeset:create major "feat!: breaking API change" "Complete redesign"
 *
 * Arguments:
 *   1. type: 'major' | 'minor' | 'patch'
 *   2. summary: Brief description (required)
 *   3. details: Additional context (optional, can be multiline)
 */

function getPackageName(): string {
  try {
    const packageJsonPath = path.join(process.cwd(), 'package.json');
    if (!existsSync(packageJsonPath)) {
      throw new Error('package.json not found');
    }
    const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8')) as {
      name: string;
    };
    return packageJson.name;
  } catch (error) {
    console.error('❌ Error reading package.json:', error);
    process.exit(1);
  }
}

function parseArguments(): {
  type: 'major' | 'minor' | 'patch';
  summary: string;
  details?: string;
} {
  const args = process.argv.slice(2);

  if (args.length < 2) {
    console.error(`
❌ Usage: pnpm changeset:create <type> <summary> [details]

Arguments:
  type     Version bump type: major, minor, or patch
  summary  Brief description (required)
  details  Additional context (optional, supports multiline)

Examples:
  pnpm changeset:create patch "fix(core): handle missing tsconfig"
  pnpm changeset:create minor "feat(cli): add --verbose flag" "Add detailed logging output"
  pnpm changeset:create major "feat!: breaking API change" "Complete redesign of API"

For more information, see: https://github.com/changesets/changesets
`);
    process.exit(1);
  }

  const [typeArg, summary, ...detailsArgs] = args;
  const type = typeArg.toLowerCase();

  if (!['major', 'minor', 'patch'].includes(type)) {
    console.error(
      `❌ Invalid version type: ${type}. Must be 'major', 'minor', or 'patch'`,
    );
    process.exit(1);
  }

  if (!summary || summary.trim().length === 0) {
    console.error('❌ Summary is required');
    process.exit(1);
  }

  return {
    type: type as 'major' | 'minor' | 'patch',
    summary: summary.trim(),
    details: detailsArgs.length > 0 ? detailsArgs.join(' ').trim() : undefined,
  };
}

async function main() {
  console.log('📝 Creating changeset...');

  const { type, summary, details } = parseArguments();
  const packageName = getPackageName();

  // Build full summary with details if provided
  const fullSummary = details ? `${summary}\n\n${details}` : summary;

  // Create changeset object using @changesets/types format
  const changeset: Changeset = {
    summary: fullSummary,
    releases: [
      {
        name: packageName,
        type,
      },
    ],
  };

  try {
    // Use official @changesets/write API
    const changesetId = await writeChangeset(changeset, process.cwd());

    console.log(`✅ Changeset created: .changeset/${changesetId}.md`);
    console.log(`📦 Package: ${packageName}`);
    console.log(`📊 Version bump: ${type}`);
    console.log(`📝 Summary: ${summary}`);
    if (details) {
      console.log(
        `📄 Details: ${details.slice(0, 50)}${details.length > 50 ? '...' : ''}`,
      );
    }

    console.log('\n💡 Next steps:');
    console.log('   1. Review the changeset file');
    console.log('   2. Edit if needed for additional context');
    console.log('   3. Commit with your changes');
  } catch (error) {
    console.error('❌ Error creating changeset:', error);
    process.exit(1);
  }
}

void main();
