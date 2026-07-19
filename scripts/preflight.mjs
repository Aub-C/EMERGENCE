// Preflight: tell a contributor what the gate will decide, before they open a
// pull request.
//
// The gate is deliberately strict and some paths can never be changed by a
// contributor at all. Discovering that from a failed check wastes a round trip
// and, worse, invites working around the symptom rather than the cause. This
// prints the same verdict the gate will reach, from the same classifier, plus
// the one thing the gate never says out loud: who is permitted to fix each
// blocker.
//
//   npm run preflight              compare against origin/master
//   npm run preflight -- <ref>     compare against another ref
//
// Exit code is 0 when the mutation would merge on its own, 1 when something
// stands in the way. The detail is always on stdout either way.

import { execFileSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { classifyMutation } from '../control-plane/risk-classifier.mjs';

const policy = JSON.parse(await readFile(new URL('../control-plane/policy.json', import.meta.url), 'utf8'));

const base = process.argv[2] ?? firstExistingRef(['origin/master', 'public/master', 'master']);
if (!base) {
  console.error('preflight: no base ref found. Pass one explicitly, e.g. npm run preflight -- main');
  process.exit(1);
}

const changed = [
  ...gitLines(['diff', '--name-only', `${base}...HEAD`]),
  ...gitLines(['diff', '--name-only', 'HEAD']),
  ...gitLines(['ls-files', '--others', '--exclude-standard'])
];
const files = [...new Set(changed)].filter(Boolean).sort();

if (files.length === 0) {
  console.log(`preflight: no changes against ${base}. Nothing to evaluate.`);
  process.exit(0);
}

const risk = classifyMutation(files, policy);
const ownerOnly = new Set([...risk.ownerOnlyFiles, ...risk.redZoneFiles]);

console.log(`Preflight against ${base} — ${files.length} changed file(s)\n`);
console.log(`  risk level        ${risk.level}`);
console.log(`  merges on its own ${risk.autoMergeAllowed && !risk.codexRequired ? 'yes' : 'no'}`);
console.log(`  needs review      ${risk.codexRequired ? 'yes — adversarial review required' : 'no'}\n`);

if (ownerOnly.size > 0) {
  console.log('  You cannot change these. They are project law, owner-only by policy:');
  for (const file of ownerOnly) console.log(`    ${file}`);
  console.log('    Remove them from your mutation. Raise a rule suggestion for the owner instead.\n');
}

const needsReview = [
  ...risk.executableFiles.map((f) => [f, 'executable code — runs in CI, so it earns adversarial review']),
  ...risk.dependencyFiles.map((f) => [f, 'dependency manifest — supply-chain surface']),
  ...risk.workflowFiles.map((f) => [f, 'workflow — can change what the gate itself does']),
  ...risk.unknownFiles.map((f) => [f, 'unrecognised file type — the classifier cannot judge it as a static asset'])
].filter(([file]) => !ownerOnly.has(file));

if (needsReview.length > 0) {
  console.log('  These raise the risk level. You may change them, but they will wait for review:');
  for (const [file, why] of needsReview) console.log(`    ${file}\n      ${why}`);
  console.log('    Splitting them into a separate pull request lets the rest merge on its own.\n');
}

if (ownerOnly.size === 0 && needsReview.length === 0) {
  console.log('  Nothing is blocking. This mutation is eligible to merge once every required check passes.\n');
}

console.log(`  Authoritative path lists live in control-plane/policy.json:`);
console.log(`    red_zone_paths, rule_authority.owner_only_paths`);

process.exit(risk.autoMergeAllowed && !risk.codexRequired ? 0 : 1);

function gitLines(args) {
  try {
    return execFileSync('git', args, { encoding: 'utf8' }).trim().split('\n');
  } catch {
    return [];
  }
}

function firstExistingRef(candidates) {
  for (const ref of candidates) {
    try {
      execFileSync('git', ['rev-parse', '--verify', '--quiet', ref], { stdio: 'ignore' });
      return ref;
    } catch {
      /* try the next one */
    }
  }
  return null;
}
