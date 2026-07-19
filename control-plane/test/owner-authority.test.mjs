import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluateOwnerAuthority, pathMatches } from '../owner-authority.mjs';

const authority = {
  sole_authority_github_login: 'Aub-C',
  owner_only_paths: ['RULES.md', 'control-plane/policy.json', '.github/CODEOWNERS']
};

test('matches exact owner-only paths', () => {
  assert.equal(pathMatches('RULES.md', 'RULES.md'), true);
  assert.equal(pathMatches('docs/RULES.md', 'RULES.md'), false);
});

test('ordinary organism changes remain open', () => {
  const result = evaluateOwnerAuthority({
    changedFiles: ['src/server.mjs'],
    actor: 'community-agent',
    author: 'community-agent',
    authority
  });
  assert.equal(result.accepted, true);
});

test('non-owner cannot alter project law', () => {
  const result = evaluateOwnerAuthority({
    changedFiles: ['RULES.md'],
    actor: 'community-agent',
    author: 'community-agent',
    authority
  });
  assert.equal(result.accepted, false);
  assert.deepEqual(result.protectedChanges, ['RULES.md']);
});

test('agent cannot alter law merely by authoring a PR under another identity', () => {
  const result = evaluateOwnerAuthority({
    changedFiles: ['control-plane/policy.json'],
    actor: 'automation-bot',
    author: 'Aub-C',
    authority
  });
  assert.equal(result.accepted, false);
});

test('non-owner cannot alter a red-zone workflow', () => {
  const result = evaluateOwnerAuthority({
    changedFiles: ['.github/workflows/gate.yml'],
    actor: 'community-agent',
    author: 'community-agent',
    authority,
    protectedPaths: [...authority.owner_only_paths, '.github/workflows/**']
  });
  assert.equal(result.accepted, false);
});

test('sole owner identity can prepare an owner-only change', () => {
  const result = evaluateOwnerAuthority({
    changedFiles: ['RULES.md', 'src/server.mjs'],
    actor: 'Aub-C',
    author: 'Aub-C',
    authority
  });
  assert.equal(result.accepted, true);
  assert.deepEqual(result.protectedChanges, ['RULES.md']);
});
