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
