import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { classifyMutation } from '../risk-classifier.mjs';

const policy = JSON.parse(await readFile(new URL('../policy.json', import.meta.url), 'utf8'));

test('documentation-only mutation is low risk', () => {
  const result = classifyMutation(['docs/example.md'], policy);
  assert.equal(result.level, 'low');
  assert.equal(result.codexRequired, false);
  assert.equal(result.autoMergeAllowed, true);
});

test('executable source requires adversarial review', () => {
  const result = classifyMutation(['src/new-feature.mjs'], policy);
  assert.equal(result.level, 'high');
  assert.equal(result.codexRequired, true);
  assert.equal(result.autoMergeAllowed, true);
});

test('red-zone mutation is critical and cannot auto-merge', () => {
  const result = classifyMutation(['.github/workflows/new.yml'], policy);
  assert.equal(result.level, 'critical');
  assert.equal(result.codexRequired, true);
  assert.equal(result.autoMergeAllowed, false);
});

test('vector images and plain data formats are recognised static assets', () => {
  const result = classifyMutation([
    'assets/brand/logo/emergence-logo-dark.svg',
    'assets/brand/brand-manifest.json',
    'assets/brand/asset-checksums.sha256',
    'data/lineage.ndjson',
    'data/scores.csv'
  ], policy);
  assert.deepEqual(result.unknownFiles, []);
  assert.equal(result.level, 'low');
  assert.equal(result.codexRequired, false);
  assert.equal(result.autoMergeAllowed, true);
});

test('dependency manifests stay high risk despite a low-risk extension', () => {
  const result = classifyMutation(['npm-shrinkwrap.json', 'requirements.txt'], policy);
  assert.deepEqual(result.dependencyFiles, ['npm-shrinkwrap.json', 'requirements.txt']);
  assert.equal(result.level, 'high');
  assert.equal(result.codexRequired, true);
});

test('package.json stays critical because it is also red-zone', () => {
  const result = classifyMutation(['package.json'], policy);
  assert.equal(result.level, 'critical');
  assert.equal(result.autoMergeAllowed, false);
});

test('owner-only json stays critical despite the json extension', () => {
  const result = classifyMutation(['control-plane/policy.json'], policy);
  assert.equal(result.level, 'critical');
  assert.equal(result.autoMergeAllowed, false);
});

test('html remains unclassified because scripting is its purpose', () => {
  const result = classifyMutation(['assets/brand/templates/readme-header.html'], policy);
  assert.deepEqual(result.unknownFiles, ['assets/brand/templates/readme-header.html']);
  assert.equal(result.level, 'high');
  assert.equal(result.codexRequired, true);
});

// Project law must be recognised however the path is spelled. The classifier
// matched patterns against the literal string, so `docs/../RULES.md` — the same
// file as `RULES.md` — classified as ordinary documentation, while the static
// scanner resolved it and saw project law. Two modules disagreeing about which
// file is law is how a protected path stops being protected.
test('a traversal-spelled path is still the file it resolves to', () => {
  for (const spelling of ['docs/../RULES.md', './docs/../RULES.md', 'a/b/../../RULES.md']) {
    const result = classifyMutation([spelling], policy);
    assert.equal(result.level, 'critical', `${spelling} must be recognised as project law`);
    assert.equal(result.autoMergeAllowed, false, `${spelling} must not be auto-mergeable`);
    assert.ok(
      result.ownerOnlyFiles.length + result.redZoneFiles.length > 0,
      `${spelling} must appear in a protected list, got ${JSON.stringify(result)}`
    );
  }
});

test('a redundantly separated path is still the file it resolves to', () => {
  const result = classifyMutation(['control-plane//policy.json'], policy);
  assert.equal(result.level, 'critical');
  assert.equal(result.ownerOnlyFiles.length, 1, 'owner-only matching must survive a doubled separator');
});

// A path that climbs above the repository root is not a file this project can
// reason about, and must never quietly land in the low-risk bucket.
test('a path escaping the repository root is never treated as a static asset', () => {
  const result = classifyMutation(['../outside/secrets.md'], policy);
  assert.notEqual(result.level, 'low', 'an out-of-tree path must not classify as low risk');
});
