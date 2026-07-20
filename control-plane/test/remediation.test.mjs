import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { explainRejection, renderRejection } from '../remediation.mjs';

const policy = JSON.parse(await readFile(new URL('../policy.json', import.meta.url), 'utf8'));

const lowRisk = { level: 'low', codexRequired: false, ownerOnlyFiles: [], redZoneFiles: [], executableFiles: [], dependencyFiles: [], workflowFiles: [], unknownFiles: [] };

function riskWith(overrides) {
  return { ...lowRisk, ...overrides };
}

test('a recognised scanner finding is something the contributor may fix', () => {
  const report = explainRejection({
    findings: [{ level: 'hard-fail', phase: 'static-security', file: 'assets/logo.svg', rule: 'markup-script-element' }],
    risk: lowRisk,
    policy
  });
  assert.equal(report.contributor.length, 1);
  assert.equal(report.owner.length, 0);
  assert.equal(report.contributor[0].file, 'assets/logo.svg');
  assert.match(report.contributor[0].fix, /\S/);
});

test('findings below hard-fail are not remediation material', () => {
  const report = explainRejection({
    findings: [{ level: 'warn', phase: 'static-security', file: 'README.md', rule: 'secret-pattern' }],
    risk: lowRisk,
    policy
  });
  assert.equal(report.contributor.length, 0);
  assert.equal(report.explained, false);
});

// The fail-safe that the whole module exists for. A contributor told to fix
// project law will retry against a hard-fail forever.
test('an unrecognised rule is attributed to the owner, never to the contributor', () => {
  const report = explainRejection({
    findings: [{ level: 'hard-fail', phase: 'policy', message: 'owner-only path changed by a non-owner' }],
    risk: lowRisk,
    policy
  });
  assert.equal(report.contributor.length, 0, 'an undeterminable finding must not be offered to the contributor');
  assert.equal(report.owner.length, 1);
});

test('a recognised rule on an owner-only path still belongs to the owner', () => {
  const report = explainRejection({
    findings: [{ level: 'hard-fail', phase: 'static-security', file: 'control-plane/policy.json', rule: 'secret-pattern' }],
    risk: riskWith({ ownerOnlyFiles: ['control-plane/policy.json'] }),
    policy
  });
  assert.equal(report.contributor.length, 0, 'path authority outranks a contributor-fixable rule');
  assert.equal(report.owner.length, 1);
  assert.equal(report.owner[0].file, 'control-plane/policy.json');
});

test('the same protected file is reported once, not once per source', () => {
  const report = explainRejection({
    findings: [{ level: 'hard-fail', phase: 'policy', file: 'RULES.md' }],
    risk: riskWith({ ownerOnlyFiles: ['RULES.md'], redZoneFiles: ['RULES.md'] }),
    policy
  });
  assert.equal(report.owner.length, 1);
});

test('files that raise the risk level are named, not summarised as a boolean', () => {
  const report = explainRejection({
    findings: [],
    risk: riskWith({ level: 'high', codexRequired: true, executableFiles: ['test/orientation.test.mjs'] }),
    policy
  });
  assert.equal(report.needsReview, true);
  assert.deepEqual(report.review.map((item) => item.file), ['test/orientation.test.mjs']);
  assert.match(report.review[0].why, /\S/);
});

test('a protected file is not also listed as merely awaiting review', () => {
  const report = explainRejection({
    findings: [],
    risk: riskWith({ level: 'critical', codexRequired: true, ownerOnlyFiles: ['control-plane/policy.json'], executableFiles: ['control-plane/policy.json'] }),
    policy
  });
  assert.deepEqual(report.review, [], 'a file the contributor cannot touch is not waiting on review');
  assert.equal(report.owner.length, 1);
});

// The real pull request #4 finding set: 30 files of brand assets dragged to
// critical by three files, one of which the contributor was not permitted to
// change. This fixture is the reason the module reports authority at all.
test('pull request #4: the mutation splits into what may proceed and what may not', () => {
  const report = explainRejection({
    findings: [{ level: 'hard-fail', phase: 'static-security', file: 'assets/brand/asset-checksums.sha256', rule: 'unexpected-binary' }],
    risk: riskWith({
      level: 'critical',
      codexRequired: true,
      ownerOnlyFiles: ['docs/PROJECT_MANIFEST.json'],
      executableFiles: ['test/orientation.test.mjs']
    }),
    policy
  });
  assert.deepEqual(report.contributor.map((i) => i.file), ['assets/brand/asset-checksums.sha256']);
  assert.deepEqual(report.owner.map((i) => i.file), ['docs/PROJECT_MANIFEST.json']);
  assert.deepEqual(report.review.map((i) => i.file), ['test/orientation.test.mjs']);
  assert.equal(report.needsReview, true);

  const markdown = renderRejection(report, { headSha: 'a'.repeat(40) });
  assert.match(markdown, /asset-checksums\.sha256/);
  assert.match(markdown, /PROJECT_MANIFEST\.json/);
  assert.match(markdown, /orientation\.test\.mjs/);
  assert.match(markdown, /split/i, 'a mixed-authority mutation should suggest splitting');
});

test('a rejection this module cannot explain says so instead of inventing advice', () => {
  const report = explainRejection({ findings: [], risk: lowRisk, policy });
  assert.equal(report.explained, false);
  const markdown = renderRejection(report);
  assert.match(markdown, /\S/);
  assert.doesNotMatch(markdown, /You can fix/);
});

test('the rendered comment carries a machine-readable block for an agent', () => {
  const report = explainRejection({
    findings: [{ level: 'hard-fail', phase: 'static-security', file: 'a.svg', rule: 'markup-script-element' }],
    risk: riskWith({ ownerOnlyFiles: ['RULES.md'] }),
    policy
  });
  const markdown = renderRejection(report, { headSha: 'b'.repeat(40) });
  const fenced = markdown.match(/```json\n([\s\S]*?)\n```/);
  assert.ok(fenced, 'expected a fenced json block');
  const parsed = JSON.parse(fenced[1]);
  assert.equal(parsed.contributorCanFix, 1);
  assert.equal(parsed.ownerOnly, 1);
  assert.equal(parsed.headSha, 'b'.repeat(40));
});

test('the head SHA is named so the comment cannot be read against the wrong commit', () => {
  const report = explainRejection({
    findings: [{ level: 'hard-fail', phase: 'static-security', file: 'a.svg', rule: 'markup-script-element' }],
    risk: lowRisk,
    policy
  });
  assert.match(renderRejection(report, { headSha: 'c'.repeat(40) }), /c{7}/);
});

test('a held mutation tells the contributor not to act, and does not claim a fault', () => {
  const report = explainRejection({
    findings: [],
    risk: riskWith({ level: 'high', codexRequired: true, executableFiles: ['src/feature.mjs'] }),
    policy
  });
  const markdown = renderRejection(report, { headSha: 'd'.repeat(40) });
  assert.match(markdown, /review/i);
  assert.doesNotMatch(markdown, /You can fix/, 'nothing is wrong here; offering a fix would be a lie');
});

test('malformed input produces a usable report instead of throwing', () => {
  for (const input of [undefined, {}, { findings: null, risk: null }, { findings: [null], risk: {} }]) {
    const report = explainRejection(input);
    assert.equal(typeof report, 'object');
    assert.ok(Array.isArray(report.contributor));
    assert.match(renderRejection(report), /\S/);
  }
});

// The comment is public. A gate message is gate-authored today, but a future
// rule that embedded matched content would publish it.
test('a finding message is clipped and flattened before it reaches a public comment', () => {
  const report = explainRejection({
    findings: [{ level: 'hard-fail', phase: 'policy', file: 'x', message: `leading\n${'A'.repeat(500)}` }],
    risk: lowRisk,
    policy
  });
  assert.equal(report.owner.length, 1);
  assert.doesNotMatch(report.owner[0].why, /\n/, 'a multi-line message must not break the rendered layout');
  assert.ok(report.owner[0].why.length < 400, `expected a clipped message, got ${report.owner[0].why.length} chars`);
  assert.doesNotMatch(report.owner[0].why, /A{300}/, 'the message must not be reproduced in full');
});

test('the approval marker is read from policy, never hard-coded', () => {
  const report = explainRejection({ findings: [], risk: riskWith({ level: 'high', codexRequired: true }), policy });
  assert.equal(report.approvalMarker, policy.adversarial_review.approval_marker);
});
