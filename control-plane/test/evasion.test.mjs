import test from 'node:test';
import assert from 'node:assert/strict';
import { detectEvasion } from '../evasion.mjs';

test('a prohibited-capability finding is a ban-eligible evasion signal', () => {
  const result = detectEvasion({
    findings: [{ level: 'hard-fail', rule: 'shell-download-pipe', file: 'src/x.mjs' }],
    risk: {},
    isOwner: false
  });
  assert.equal(result.detected, true);
  assert.equal(result.ban_eligible, true);
  assert.equal(result.signals[0].kind, 'prohibited-capability');
});

test('a non-owner gate modification is detected but not auto-ban', () => {
  const result = detectEvasion({
    findings: [],
    risk: { redZoneFiles: ['control-plane/policy.json'] },
    isOwner: false
  });
  assert.equal(result.detected, true);
  assert.equal(result.ban_eligible, false);
  assert.equal(result.signals[0].kind, 'gate-or-governance-modification');
});

test('the owner changing gate paths is not flagged as evasion', () => {
  const result = detectEvasion({
    findings: [],
    risk: { redZoneFiles: ['control-plane/policy.json'] },
    isOwner: true
  });
  assert.equal(result.detected, false);
});

test('a benign mutation produces no evasion signal', () => {
  const result = detectEvasion({ findings: [{ level: 'pass' }], risk: {}, isOwner: false });
  assert.equal(result.detected, false);
  assert.equal(result.ban_eligible, false);
});
