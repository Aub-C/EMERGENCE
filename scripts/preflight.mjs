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
// The authority and risk-reason prose comes from explainRejection() — the
// same function the gate uses to explain a rejected pull request — so this
// tool cannot drift from the real verdict by restating its own copy of the
// reasoning. Preflight is local, so it only ever has file paths, never
// scanner findings; it always calls explainRejection() with findings: []
// and reads what's left: which files are owner-only, and which merely raise
// the risk level.
//
//   npm run preflight              compare against origin/master
//   npm run preflight -- <ref>     compare against another ref
//
// Exit code is 0 when the mutation would merge on its own, 1 when something
// stands in the way. The detail is always on stdout either way.

import { execFileSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { classifyMutation } from '../control-plane/risk-classifier.mjs';
import { explainRejection } from '../control-plane/remediation.mjs';

const policy = JSON.parse(await readFile(new URL('../control-plane/policy.json', import.meta.url), 'utf8'));

// `upstream/master` comes first because the fork flow the README documents
// (`gh repo fork --clone`) points `origin` at YOUR fork and `upstream` at the
// canonical repository. Resolving `origin/master` there compares your work
// against your own fork, which may be months stale, and preflight would print a
// confident verdict derived from the wrong base. Silently classifying against
// the wrong tree is the worst failure this tool has, so the resolved base is
// always shown with its date — a stale base is then visible rather than
// invisible.
const base = process.argv[2] ?? firstExistingRef(['upstream/master', 'public/master', 'origin/master', 'master']);
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

// findings: [] always — preflight is local and never sees scanner output.
// Everything below comes from the report, not from re-deriving it here.
const report = explainRejection({ findings: [], risk, policy });

const baseStamp = gitLines(['log', '-1', '--format=%h %cs', base])[0] ?? 'unknown';
console.log(`Preflight against ${base} (${baseStamp}) — ${files.length} changed file(s)`);
// Preflight never fetches, so the base is only as fresh as the last fetch. A
// stale base inflates the file list with commits already upstream, and the
// verdict that follows can accuse you of touching project law you never
// touched. The printed SHA is not proof of freshness — same-day commits look
// identical — so say plainly that refreshing is the reader's job.
console.log('  Preflight does not fetch. If that ref is behind the real project, this');
console.log('  verdict is computed against the wrong tree and may name files you never');
console.log(`  touched. Refresh first:  git fetch ${base.includes('/') ? base.split('/')[0] : 'origin'}`);
console.log('  Or pass a base explicitly:  npm run preflight -- <ref>\n');
console.log(`  risk level        ${risk.level}`);
console.log(`  merges on its own ${risk.autoMergeAllowed && !risk.codexRequired ? 'yes' : 'no'}`);
console.log(`  needs review      ${report.needsReview ? 'yes — adversarial review required' : 'no'}\n`);

// Grouped by why the path is owner-only, not lumped together. Red-zone is
// wider than project law — workflows, gate logic, contributor docs and the
// pull-request template are owner-controlled without being law — and a
// contributor told a PR template is "project law" discounts the rest of the
// message. The old code also printed owner[0].fix for the whole list, which
// was the wrong remedy for every item after the first once the list was mixed.
const OWNER_GROUPS = [
  { rule: 'owner-only-path', heading: '  You cannot change these. They are project law:' },
  { rule: 'red-zone-path', heading: '  You cannot change these. They are owner-controlled governance — not law, but still owner-only:' }
];

if (report.owner.length > 0) {
  const grouped = new Set();

  for (const { rule, heading } of OWNER_GROUPS) {
    const items = report.owner.filter((item) => item.rule === rule);
    if (items.length === 0) continue;
    console.log(heading);
    for (const item of items) {
      console.log(`    ${item.file}`);
      grouped.add(item);
    }
    console.log(`    ${items[0].fix}\n`);
  }

  // Anything the gate reported that is not a path-authority verdict keeps its
  // own reason and remedy rather than inheriting someone else's.
  const remaining = report.owner.filter((item) => !grouped.has(item));
  if (remaining.length > 0) {
    console.log('  These are the owner\'s to resolve:');
    for (const item of remaining) {
      console.log(`    ${item.file ?? 'this mutation'}\n      ${item.why}\n      ${item.fix}`);
    }
    console.log('');
  }
}

if (report.review.length > 0) {
  console.log('  These raise the risk level. You may change them, but they will wait for review:');
  for (const item of report.review) console.log(`    ${item.file}\n      ${item.why}`);
  console.log('    Splitting them into a separate pull request lets the rest merge on its own.\n');
}

if (report.owner.length === 0 && report.review.length === 0) {
  // "Nothing is blocking" is only ever a statement about path authority and
  // risk. Preflight does not run the test suite, read the pull-request body, or
  // scan content, so it is not entitled to promise a merge — a diff it calls
  // clean can still fail `npm test` or the attestation check.
  console.log('  No path here is owner-only, and nothing raises the risk level.');
  console.log('  That is not the whole gate: run `npm test` and `npm run gate:all`, and');
  console.log('  fill in the pull-request template, before calling this ready.\n');
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
