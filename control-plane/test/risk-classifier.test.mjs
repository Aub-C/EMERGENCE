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
