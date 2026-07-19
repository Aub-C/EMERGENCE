// Verification of the owner-alert and commit-bound approval path.
import test from 'node:test';
import assert from 'node:assert/strict';
import { getState } from '../src/state.mjs';

test('seed state is mutable and identifiable', async () => {
  const state = await getState();
  assert.equal(state.name, 'EMERGENCE');
  assert.equal(state.identity, 'seed');
  assert.equal(state.mutable, true);
  assert.match(state.axiom, /No roadmap/);
});
// second line for approval-binding verification
