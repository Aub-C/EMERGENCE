import test from 'node:test';
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { discoverCells, findCellForPath } from '../scripts/lib/cells.mjs';

const execFileAsync = promisify(execFile);

test('cell catalog is valid and maps current source to seed', async () => {
  const catalog = await discoverCells();
  assert.deepEqual(catalog.errors, []);
  // Not a fixed number. Adding a cell is the project's own stated unit of
  // growth (AGENTS.md), and pinning the count made that mutation fail the
  // suite — which teaches a contributor to delete the assertion instead.
  assert.equal(catalog.cell_count, catalog.cells.length);
  assert.ok(catalog.cell_count >= 3, 'the three founding cells are still discoverable');
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
    !catalog.likely_catalog_gaps.some((entry) => entry.path === 'README.md'),
    'repository-root files are not gap candidates'
  );

  // Deliberately not pinned to any particular path, and deliberately not
  // requiring that any gap exist. Closing a gap is the mutation this feature
  // exists to recommend, so a test naming a gap and demanding it persist makes
  // the recommended first contribution turn the suite red — and teaches the
  // contributor that the right move is to delete the assertion. Round 5 caught
  // exactly that: two of the three suggested gaps could not be closed without
  // breaking this file. Assert the rules the output must obey, never the
  // inventory of the moment. An empty gap list is a success, not a regression.
  for (const entry of catalog.likely_catalog_gaps) {
    assert.ok(entry.claimed_sibling, `${entry.path} should name the sibling that makes it a gap`);
    assert.ok(entry.claim_manifest, `${entry.path} should name the manifest that would have to change`);
    assert.ok(['owner', 'contributor'].includes(entry.closable_by), `${entry.path} says who can close it`);

    // Whoever is told to act has to be told what it will cost them.
    if (entry.closable_by === 'owner') {
      assert.match(entry.why, /owner-controlled/i, `${entry.path} must say the obvious route is closed`);
    } else if (entry.owner_only) {
      assert.match(entry.why, /owner-only/i, `${entry.path} must warn against including the file itself`);
    } else {
      assert.match(entry.why, /yours to fix/i, `${entry.path} is unencumbered and should say so`);
    }

    // The defect round 4 found: a gap is only closable by a contributor if the
    // manifest they would widen is itself changeable. Most of these sit beside
    // a file claimed by the admission-gate cell, whose manifest is red-zone.
    // Offering one of those is offering a guaranteed critical hard-fail.
    if (entry.closable_by !== 'contributor') continue;
    assert.equal(
      catalog.cells.find((cell) => cell.id === entry.claimed_by_cell)?.metadata?.owner_only ?? false,
      false,
      `${entry.path} is offered to contributors but ${entry.claim_manifest} is owner-controlled`
    );
    assert.doesNotMatch(entry.claim_manifest, /^control-plane\//, `${entry.path} routes through a red-zone manifest`);
  }

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
  assert.ok(catalog.cells.length >= 3, 'cell discovery does not depend on git');
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
