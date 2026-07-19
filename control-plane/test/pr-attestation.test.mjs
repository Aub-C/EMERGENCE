import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { evaluatePullRequestAttestation } from '../pr-attestation.mjs';

const template = await readFile(new URL('../../.github/pull_request_template.md', import.meta.url), 'utf8');

test('unchecked template does not satisfy attestation', () => {
  const result = evaluatePullRequestAttestation(template);
  assert.equal(result.accepted, false);
  assert.equal(result.missing.length, 6);
});

test('all checked attestations and sections pass', () => {
  const body = template.replaceAll('- [ ]', '- [x]');
  const result = evaluatePullRequestAttestation(body);
  assert.equal(result.accepted, true);
  assert.deepEqual(result.missing, []);
  assert.deepEqual(result.missingSections, []);
});

test('missing disclosure section fails', () => {
  const body = template.replaceAll('- [ ]', '- [x]').replace('## Actual capabilities and behavior', 'Capabilities');
  const result = evaluatePullRequestAttestation(body);
  assert.equal(result.accepted, false);
  assert.ok(result.missingSections.includes('## Actual capabilities and behavior'));
});
