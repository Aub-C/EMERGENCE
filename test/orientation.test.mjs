import test from 'node:test';
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { discoverCells, findCellForPath } from '../scripts/lib/cells.mjs';

const execFileAsync = promisify(execFile);

test('cell catalog is valid and maps current source to seed', async () => {
  const catalog = await discoverCells();
  assert.deepEqual(catalog.errors, []);
  assert.equal(catalog.cell_count, 3);
  assert.equal(findCellForPath(catalog, 'src/server.mjs')?.id, 'core.seed');
  assert.equal(findCellForPath(catalog, 'scripts/orient.mjs')?.id, 'platform.repository-intelligence');
  assert.equal(findCellForPath(catalog, 'control-plane/static-gate.mjs')?.id, 'governance.admission-gate');
});

test('orientation packet gives an agent a bounded read plan', async () => {
  const { stdout } = await execFileAsync(process.execPath, ['scripts/orient.mjs', '--cell', 'core.seed']);
  const packet = JSON.parse(stdout);
  assert.equal(packet.target.id, 'core.seed');
  assert.equal(packet.mandatory_law.owner, 'Aub-C');
  assert.ok(packet.read_plan.includes('RULES.md'));
  assert.ok(packet.read_plan.includes('src/server.mjs'));
  assert.ok(packet.mutation_guidance.validation.includes('npm test'));
});

// The hardest part of contributing here is finding something worth fixing:
// there is no backlog by design. A file sitting unclaimed beside claimed
// siblings is a real, checkable gap, and surfacing it turns a dead end into a
// first mutation. Top-level files are excluded — the repository root is
// miscellaneous by nature and would drown the signal.
test('catalog surfaces unclaimed paths and the ones that look like gaps', async () => {
  const { stdout } = await execFileAsync(process.execPath, ['scripts/catalog.mjs']);
  const catalog = JSON.parse(stdout);

  assert.ok(Array.isArray(catalog.unclaimed_paths), 'unclaimed_paths is reported');
  assert.ok(catalog.unclaimed_paths.includes('README.md'), 'top-level docs are unclaimed');

  assert.ok(Array.isArray(catalog.likely_catalog_gaps));
  assert.ok(
    catalog.likely_catalog_gaps.some((entry) => entry.path === 'protocol/candidate.schema.json'),
    'a schema beside a claimed schema is a gap'
  );
  assert.ok(
    !catalog.likely_catalog_gaps.some((entry) => entry.path === 'README.md'),
    'repository-root files are not gap candidates'
  );
  for (const entry of catalog.likely_catalog_gaps) {
    assert.ok(entry.claimed_sibling, `${entry.path} should name the sibling that makes it a gap`);
  }

  // Suggesting work is only useful if it does not send a contributor at a file
  // they may not touch — the same defect orientation used to have.
  const schemaGap = catalog.likely_catalog_gaps.find((entry) => entry.path === 'protocol/candidate.schema.json');
  assert.equal(schemaGap.owner_only, true, 'protocol/** is owner-only');
  assert.match(schemaGap.why, /owner/i);

  const preflightGap = catalog.likely_catalog_gaps.find((entry) => entry.path === 'scripts/preflight.mjs');
  assert.equal(preflightGap.owner_only, false, 'scripts/preflight.mjs is contributor-fixable');
  assert.match(preflightGap.why, /yours to fix/i);
});

// The orientation packet is the tool START_HERE.md tells an agent to trust over
// prose, so it must not recommend files the policy forbids the agent to change.
// `core.seed` legitimately scopes package.json, package-lock.json and
// Dockerfile — all red-zone — and offering them as "preferred scope" walks a
// contributor straight into a critical-risk rejection.
test('orientation never offers an owner-only path as preferred scope', async () => {
  const { stdout } = await execFileAsync(process.execPath, ['scripts/orient.mjs', '--cell', 'core.seed']);
  const { mutation_guidance: guidance } = JSON.parse(stdout);

  assert.ok(guidance.preferred_scope.includes('src'), 'src is the contributor-changeable part of this cell');
  for (const path of ['package.json', 'package-lock.json', 'Dockerfile']) {
    assert.ok(!guidance.preferred_scope.includes(path), `${path} is red-zone and must not be recommended`);
    assert.ok(guidance.owner_only_scope.includes(path), `${path} must still be disclosed as owner-only`);
  }
  assert.match(guidance.owner_only_scope_note, /owner/i);
});

// A path outside every cell scope is the common case for a newcomer improving
// README.md or a doc. Throwing a raw stack trace that reads "Specify --cell or
// --path" blames the caller for an invocation that was in fact correct.
test('orientation explains an uncovered path instead of blaming the caller', async () => {
  const error = await execFileAsync(process.execPath, ['scripts/orient.mjs', '--path', 'README.md'])
    .then(() => null, (failure) => failure);

  assert.ok(error, 'an uncovered path must not exit 0');
  assert.equal(error.code, 1, 'it should exit 1, not crash');
  const message = `${error.stdout ?? ''}${error.stderr ?? ''}`;
  assert.doesNotMatch(message, /at file:\/\//, 'no stack trace');
  assert.match(message, /README\.md/, 'name the path that failed');
  assert.match(message, /core\.seed/, 'name the cells that do exist');
  assert.match(message, /no cell/i, 'say what was actually wrong');
});
