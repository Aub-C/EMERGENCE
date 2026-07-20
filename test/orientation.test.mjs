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
