import test from 'node:test';
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { discoverCells, findCellForPath } from '../scripts/lib/cells.mjs';

const execFileAsync = promisify(execFile);

test('cell catalog is valid and maps current source to seed', async () => {
  const catalog = await discoverCells();
  assert.deepEqual(catalog.errors, []);
  assert.equal(catalog.cell_count, 4);
  assert.equal(findCellForPath(catalog, 'src/server.mjs')?.id, 'core.seed');
  assert.equal(findCellForPath(catalog, 'scripts/orient.mjs')?.id, 'platform.repository-intelligence');
  assert.equal(findCellForPath(catalog, 'control-plane/static-gate.mjs')?.id, 'governance.admission-gate');
  assert.equal(findCellForPath(catalog, 'assets/brand/logo/emergence-logo-dark.svg')?.id, 'project.visual-identity');
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
