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
test('catalog surfaces unclaimed paths and the ones that look like gaps', async (t) => {
  const { stdout } = await execFileAsync(process.execPath, ['scripts/catalog.mjs']);
  const catalog = JSON.parse(stdout);

  // Coverage needs `git ls-files`, and the gate deliberately runs this suite in
  // a minimal container that has no git. Skipping there is honest; asserting on
  // numbers the run could not compute is not. The degraded contract itself is
  // covered unconditionally by the test below.
  if (!catalog.path_coverage.available) {
    return t.skip(`path coverage unavailable: ${catalog.path_coverage.reason}`);
  }

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

  const openGap = catalog.likely_catalog_gaps.find((entry) => entry.owner_only === false);
  assert.ok(openGap, 'contributor-fixable gaps are distinguishable from owner-only ones');
  assert.match(openGap.why, /yours to fix/i);

  // The gap this feature was written to surface. Reporting a defect and then
  // leaving it open is worse than not reporting it — the first thing an
  // arriving agent sees should not be a defect nobody bothered to fix.
  assert.ok(
    !catalog.likely_catalog_gaps.some((entry) => entry.path === 'scripts/preflight.mjs'),
    'scripts/preflight.mjs is claimed by a cell'
  );
  assert.equal(findCellForPath(await discoverCells(), 'scripts/preflight.mjs')?.id, 'platform.repository-intelligence');
});

// Coverage is computed from `git ls-files`, and the admission gate runs the
// suite inside a networkless container built from a node slim image, which has
// no git. Reporting empty arrays there is not a degraded answer, it is a wrong
// one: a contributor or tool reading `likely_catalog_gaps: []` concludes the
// catalog is complete, when in truth this run never looked. Not looking and
// finding nothing must not be indistinguishable.
test('catalog says it could not measure coverage rather than reporting none', async () => {
  const { stdout } = await execFileAsync(process.execPath, ['scripts/catalog.mjs'], {
    env: { ...process.env, PATH: '/nonexistent' } // git becomes unfindable, as in the container
  });
  const catalog = JSON.parse(stdout);

  assert.equal(catalog.path_coverage.available, false);
  assert.match(catalog.path_coverage.reason, /git/i, 'the reason names what was missing');

  assert.equal(catalog.unclaimed_paths, null, 'an empty list would read as "nothing unclaimed"');
  assert.equal(catalog.likely_catalog_gaps, null, 'an empty list would read as "no gaps"');

  // The cells themselves come from the filesystem, so that half still works and
  // the tool is still useful — it just stops overstating what it knows.
  assert.equal(catalog.cells.length, 3, 'cell discovery does not depend on git');
  assert.equal(catalog.errors.length, 0, 'a git-less environment is a limitation, not a failure');
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
