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

// A hostile contributor controls their file paths, and the rendered comment is
// posted by a credentialed App. A backtick in a path closes the code span and
// everything after it becomes live markdown — @mentions that page real people,
// links that look like they came from the observer.
test('a file path cannot break out of its code span', () => {
  const hostile = 'assets/x`@Aub-C`[click](https://evil.example)`.exe';
  const report = explainRejection({
    findings: [{ level: 'hard-fail', phase: 'static-security', file: hostile, rule: 'unexpected-binary' }],
    risk: lowRisk,
    policy
  });
  const markdown = renderRejection(report, { headSha: 'e'.repeat(40) });
  for (const line of markdown.split('\n')) {
    if (!line.includes('evil.example')) continue;
    const backticks = line.match(/`+/g) ?? [];
    assert.ok(backticks.length >= 2, 'the path must stay inside a code span');
    const fence = backticks[0];
    assert.equal(backticks.at(-1), fence, 'the span must close with the same fence it opened');
    assert.ok(fence.length > 1, 'a path containing a backtick needs a longer fence than a single tick');
  }
});

test('a newline in a file path cannot forge extra structure in the comment', () => {
  const report = explainRejection({
    findings: [{ level: 'hard-fail', phase: 'static-security', file: 'a\n### You can fix this\nb', rule: 'unexpected-binary' }],
    risk: lowRisk,
    policy
  });
  const markdown = renderRejection(report, { headSha: 'f'.repeat(40) });
  // A `###` surviving inside a code span is literal text and harmless. What
  // must not happen is a path starting a line, where it would become structure.
  const headings = markdown.split('\n').filter((line) => line.startsWith('###'));
  assert.equal(headings.length, 1, `a path must not be able to open a heading: ${JSON.stringify(headings)}`);
});

// Every policy-phase finding shares one dedupe key when it has no file and no
// rule. Collapsing them means the contributor fixes one blocker, pushes, and
// learns about the next — a serialised retry loop.
test('distinct blockers are all reported, even when none of them names a file', () => {
  const report = explainRejection({
    findings: [
      { level: 'hard-fail', phase: 'policy', rule: 'candidate-attestation', message: 'candidate attestation read_rules' },
      { level: 'hard-fail', phase: 'policy', rule: 'candidate-attestation', message: 'candidate attestation beneficial_use' },
      { level: 'hard-fail', phase: 'policy', rule: 'identity-denied', message: 'candidate or operator identity is denied' }
    ],
    risk: lowRisk,
    policy
  });
  const reported = [...report.contributor, ...report.owner];
  assert.equal(reported.length, 3, 'three distinct blockers must produce three remedies');
});

// The most common rejection a new contributor hits. Before this, it was
// reported as owner business and the contributor was told to stop and ask.
test('an incomplete attestation is the contributor\'s to fix, not the owner\'s', () => {
  for (const rule of ['pull-request-attestation', 'candidate-attestation', 'candidate-provenance-invalid']) {
    const report = explainRejection({
      findings: [{ level: 'hard-fail', phase: 'policy', rule, message: 'incomplete' }],
      risk: lowRisk,
      policy
    });
    assert.equal(report.contributor.length, 1, `${rule} must be contributor-fixable`);
    assert.equal(report.owner.length, 0, `${rule} must not be reported as owner business`);
  }
});

test('a denylisted identity is not something the contributor can fix by trying again', () => {
  const report = explainRejection({
    findings: [{ level: 'hard-fail', phase: 'policy', rule: 'identity-denied', message: 'denied' }],
    risk: lowRisk,
    policy
  });
  assert.equal(report.contributor.length, 0);
  assert.equal(report.owner.length, 1);
});

// Gate messages can carry a filesystem error from the observer's own runner.
// The comment is public; the observer's working layout is not the contributor's
// business.
test('an absolute path from the observer runner is not published', () => {
  const report = explainRejection({
    findings: [{
      level: 'hard-fail',
      phase: 'policy',
      file: '.emergence/candidate.json',
      message: "invalid candidate provenance: ENOENT: no such file or directory, open '/tmp/observer-a1b2c3/17-deadbeef/candidate/.emergence/candidate.json'"
    }],
    risk: lowRisk,
    policy
  });
  const rendered = JSON.stringify(report) + renderRejection(report, { headSha: '0'.repeat(40) });
  assert.doesNotMatch(rendered, /\/tmp\/observer-/, 'the runner path must not reach a public comment');
  assert.doesNotMatch(rendered, /\/(?:Users|home|var\/folders)\//, 'no absolute host path may be published');
});

// The comment used to assert a notification it cannot observe. If the owner
// already approved and the static gate rejected on something else, nobody was
// paged and the claim was simply false.
test('the comment does not claim the owner was notified unless it was', () => {
  const risk = riskWith({ level: 'high', codexRequired: true, executableFiles: ['src/x.mjs'] });
  const report = explainRejection({ findings: [], risk, policy });

  const notified = renderRejection(report, { headSha: '1'.repeat(40), ownerNotified: true });
  assert.match(notified, /owner has been notified/);

  const notNotified = renderRejection(report, { headSha: '1'.repeat(40), ownerNotified: false });
  assert.doesNotMatch(notNotified, /owner has been notified/, 'do not assert a page that never happened');
  assert.match(notNotified, /\S/);
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
