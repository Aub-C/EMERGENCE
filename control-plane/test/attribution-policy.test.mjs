import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { readFile } from 'node:fs/promises';
import { scanChangedFiles } from '../security-scan.mjs';

const policy = JSON.parse(await readFile(new URL('../policy.json', import.meta.url), 'utf8'));

// The gate blocks security risks. Naming a vendor or a model is not one.
//
// This rule used to hard-fail — the same verdict class as a fork bomb or a
// credential harvester — for writing a model's name outside a provenance file.
// It blocked honest contributors while protecting nothing, because it was an
// enumeration and enumerations do not hold. It listed nine vendors and missed
// every model released after it was written, so an agent naming one vendor was
// rejected while an agent naming another sailed through. A rule that arbitrary
// is worse than no rule: a contributor cannot predict it.
//
// Honest provenance is still required. That obligation lives in the candidate
// record and is enforced separately. It never depended on banning strings.
test('naming a vendor or model does not block a mutation', async () => {
  assert.equal(
    policy.attribution_policy,
    undefined,
    'attribution enforcement was removed from the gate deliberately; re-adding it is an owner decision'
  );

  const root = await mkdtemp(join(tmpdir(), 'emergence-attr-'));
  await writeFile(join(root, 'NOTES.md'), 'This mutation was written by an agent running Claude, GPT, and Gemini.\n');

  const result = await scanChangedFiles({ root, changedFiles: ['NOTES.md'], policy });
  const blocking = result.findings.filter((finding) => finding.level === 'hard-fail');

  assert.deepEqual(blocking, [], 'a file naming models must still be accepted');
});

// The half worth keeping: an agent may say who it is, and the place for it is
// the provenance record. Removing the block changes nothing about that.
test('provenance remains the place identity is recorded', () => {
  assert.ok(
    policy.required_files.includes('.emergence/candidate.json'),
    'the candidate provenance record is still mandatory'
  );
});
