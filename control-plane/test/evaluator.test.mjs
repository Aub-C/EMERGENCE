import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { fileURLToPath } from 'node:url';

const controlDir = fileURLToPath(new URL('..', import.meta.url));

// A fixture organism travels with the test rather than pointing at the repo
// root. Repo root only happens to be a valid organism in EMERGENCE; the
// private observer mirrors control-plane/ into gate/ with no organism above
// it, so a `../..` candidate would ENOENT there for reasons that have
// nothing to do with the evaluator itself.
const candidateDir = fileURLToPath(new URL('./fixtures/seed-organism/', import.meta.url));

test('observer accepts the seed organism', async () => {
  const child = spawn(process.execPath, ['evaluator.mjs', candidateDir], {
    cwd: controlDir,
    stdio: ['ignore', 'pipe', 'pipe']
  });

  let stdout = '';
  let stderr = '';
  child.stdout.on('data', (chunk) => { stdout += chunk; });
  child.stderr.on('data', (chunk) => { stderr += chunk; });
  const [code] = await once(child, 'exit');

  assert.equal(code, 0, stderr || stdout);
  const result = JSON.parse(stdout);
  assert.equal(result.accepted, true);
  assert.equal(result.identity, 'seed');
});
