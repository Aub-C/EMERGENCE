import test from 'node:test';
import assert from 'node:assert/strict';
import { decideEnforcement } from '../enforcement.mjs';

const policy = { enforcement: { escalation: { ban_threshold: 2, account_block: 'owner-confirmed', report_abuse: true } } };
const banEligible = { detected: true, ban_eligible: true };

test('a clean mutation produces no enforcement action', () => {
  const result = decideEnforcement({ evasion: { detected: false, ban_eligible: false }, policy });
  assert.equal(result.action, 'none');
  assert.deepEqual(result.denylist_add, []);
});

test('gate tampering without a prohibited capability is flagged, not banned', () => {
  const result = decideEnforcement({ evasion: { detected: true, ban_eligible: false }, policy });
  assert.equal(result.action, 'flag');
  assert.deepEqual(result.denylist_add, []);
  assert.equal(result.account_block, 'none');
});

test('a first ban-eligible attempt warns before enforcement', () => {
  const result = decideEnforcement({ evasion: banEligible, priorBanEligibleStrikes: 0, policy });
  assert.equal(result.action, 'warn');
  assert.equal(result.strike, 1);
  assert.deepEqual(result.denylist_add, []);
});

test('a repeat ban-eligible attempt after warning bans and denylists linked identities', () => {
  const result = decideEnforcement({
    evasion: banEligible,
    priorBanEligibleStrikes: 1,
    identities: ['Rogue-Agent', 'operator-x', 'rogue-agent'],
    policy
  });
  assert.equal(result.action, 'ban');
  assert.equal(result.strike, 2);
  assert.deepEqual(result.denylist_add, ['rogue-agent', 'operator-x']);
  assert.equal(result.account_block, 'recommended');
  assert.equal(result.report_abuse, true);
});

test('automatic posture escalates the account block without owner confirmation', () => {
  const autoPolicy = { enforcement: { escalation: { ban_threshold: 2, account_block: 'automatic' } } };
  const result = decideEnforcement({ evasion: banEligible, priorBanEligibleStrikes: 1, identities: ['x'], policy: autoPolicy });
  assert.equal(result.account_block, 'automatic');
});

test('ban evasion by a returning denied identity escalates immediately', () => {
  const result = decideEnforcement({ evasion: { detected: false, ban_eligible: false }, alreadyDenied: true, identities: ['ghost'], policy });
  assert.equal(result.action, 'ban');
  assert.deepEqual(result.denylist_add, ['ghost']);
});

test('the ban threshold is configurable', () => {
  const strict = { enforcement: { escalation: { ban_threshold: 1 } } };
  const result = decideEnforcement({ evasion: banEligible, priorBanEligibleStrikes: 0, identities: ['a'], policy: strict });
  assert.equal(result.action, 'ban');
});
