import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluateAdversarialReview } from '../codex-review-gate.mjs';

const policy = {
  adversarial_review: {
    approved_reviewer_logins: ['codex-review-bot'],
    approval_marker: '[EMERGENCE-CODEX-APPROVED]',
    approval_labels: ['gate:codex-approved'],
    allow_maintainer_label_fallback: true,
    temporary_fallback_authority: 'Aub-C'
  }
};

test('low risk does not spend an adversarial review', () => {
  const result = evaluateAdversarialReview({ risk: { codexRequired: false }, policy });
  assert.equal(result.accepted, true);
  assert.equal(result.required, false);
});

test('high risk fails closed without review', () => {
  const result = evaluateAdversarialReview({ risk: { codexRequired: true }, policy });
  assert.equal(result.accepted, false);
});

test('approved bot review of the current head commit passes', () => {
  const result = evaluateAdversarialReview({
    risk: { codexRequired: true },
    policy,
    headSha: 'abc123',
    reviews: [{ user: { login: 'codex-review-bot' }, state: 'APPROVED', commit_id: 'abc123', body: 'Reviewed\n[EMERGENCE-CODEX-APPROVED]' }]
  });
  assert.equal(result.accepted, true);
});

test('approval of a superseded commit does not carry to a new head', () => {
  const result = evaluateAdversarialReview({
    risk: { codexRequired: true },
    policy,
    headSha: 'newsha999',
    reviews: [{ user: { login: 'codex-review-bot' }, state: 'APPROVED', commit_id: 'oldsha000', body: 'Reviewed\n[EMERGENCE-CODEX-APPROVED]' }]
  });
  assert.equal(result.accepted, false);
});

test('review approval is rejected when the head commit is unknown', () => {
  const result = evaluateAdversarialReview({
    risk: { codexRequired: true },
    policy,
    reviews: [{ user: { login: 'codex-review-bot' }, state: 'APPROVED', commit_id: 'abc123', body: '[EMERGENCE-CODEX-APPROVED]' }]
  });
  assert.equal(result.accepted, false);
});

test('unapproved identity cannot forge review marker', () => {
  const result = evaluateAdversarialReview({
    risk: { codexRequired: true },
    policy,
    headSha: 'abc123',
    reviews: [{ user: { login: 'random-agent' }, state: 'APPROVED', commit_id: 'abc123', body: '[EMERGENCE-CODEX-APPROVED]' }]
  });
  assert.equal(result.accepted, false);
});

test('an owner-applied label no longer grants approval on its own', () => {
  const result = evaluateAdversarialReview({
    risk: { codexRequired: true },
    policy,
    headSha: 'abc123',
    labels: [{ name: 'gate:codex-approved' }],
    labelEvents: [{ event: 'labeled', label: { name: 'gate:codex-approved' }, actor: { login: 'Aub-C' } }]
  });
  assert.equal(result.accepted, false, 'a label is not bound to a commit and must not approve');
});

test('an owner review of the current head passes and is commit-bound', () => {
  const approvingReview = {
    user: { login: 'Aub-C' }, state: 'APPROVED', commit_id: 'abc123',
    body: 'Reviewed by my agent.\n[EMERGENCE-CODEX-APPROVED]'
  };
  const owner = { adversarial_review: { ...policy.adversarial_review, approved_reviewer_logins: ['Aub-C'] } };

  assert.equal(evaluateAdversarialReview({
    risk: { codexRequired: true }, policy: owner, headSha: 'abc123', reviews: [approvingReview]
  }).accepted, true);

  assert.equal(evaluateAdversarialReview({
    risk: { codexRequired: true }, policy: owner, headSha: 'pushed-after-review', reviews: [approvingReview]
  }).accepted, false, 'a push after approval must invalidate it');
});


test('contributor-applied fallback label is rejected', () => {
  const result = evaluateAdversarialReview({
    risk: { codexRequired: true },
    policy,
    labels: [{ name: 'gate:codex-approved' }],
    labelEvents: [{ event: 'labeled', label: { name: 'gate:codex-approved' }, actor: { login: 'community-agent' } }]
  });
  assert.equal(result.accepted, false);
});

test('removed fallback label is rejected', () => {
  const result = evaluateAdversarialReview({
    risk: { codexRequired: true },
    policy,
    labels: [],
    labelEvents: [
      { event: 'labeled', label: { name: 'gate:codex-approved' }, actor: { login: 'Aub-C' } },
      { event: 'unlabeled', label: { name: 'gate:codex-approved' }, actor: { login: 'Aub-C' } }
    ]
  });
  assert.equal(result.accepted, false);
});

// --- commit-bound approval comment -----------------------------------------
// GitHub forbids approving your own pull request, so a review cannot express
// owner approval of an owner-authored mutation. A comment naming the exact head
// SHA carries the same commit binding: a later push changes the SHA, and the
// old comment stops matching on its own.

const ownerPolicy = { adversarial_review: { ...policy.adversarial_review, approved_reviewer_logins: ['Aub-C'] } };
const HEAD = 'a1b2c3d4e5f60718293a4b5c6d7e8f9012345678';

function withComment(body, login = 'Aub-C', headSha = HEAD) {
  return evaluateAdversarialReview({
    risk: { codexRequired: true }, policy: ownerPolicy, headSha,
    comments: [{ user: { login }, body }]
  });
}

test('an owner comment naming the head commit approves', () => {
  const r = withComment(`Reviewed with my agent.\n[EMERGENCE-CODEX-APPROVED] ${HEAD}`);
  assert.equal(r.accepted, true);
});

test('an abbreviated head sha is accepted', () => {
  const r = withComment(`[EMERGENCE-CODEX-APPROVED] ${HEAD.slice(0, 12)}`);
  assert.equal(r.accepted, true);
});

test('a comment naming a different commit does not approve', () => {
  const r = withComment('[EMERGENCE-CODEX-APPROVED] 0000000000000000000000000000000000000000');
  assert.equal(r.accepted, false, 'approval must not carry to a commit it did not name');
});

test('a comment with the marker but no commit reference does not approve', () => {
  const r = withComment('[EMERGENCE-CODEX-APPROVED] looks fine to me');
  assert.equal(r.accepted, false, 'an unbound approval is what the label path got wrong');
});

test('a comment naming the head commit without the marker does not approve', () => {
  const r = withComment(`I looked at ${HEAD} and it seems ok`);
  assert.equal(r.accepted, false);
});

test('a contributor cannot approve by imitating the comment', () => {
  const r = withComment(`[EMERGENCE-CODEX-APPROVED] ${HEAD}`, 'random-contributor');
  assert.equal(r.accepted, false);
});

test('an approval comment stops applying once the head moves', () => {
  const body = `[EMERGENCE-CODEX-APPROVED] ${HEAD}`;
  assert.equal(withComment(body, 'Aub-C', HEAD).accepted, true);
  assert.equal(withComment(body, 'Aub-C', 'ffffffffffffffffffffffffffffffffffffffff').accepted, false);
});
