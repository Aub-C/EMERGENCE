import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { fileURLToPath } from 'node:url';

const controlDir = fileURLToPath(new URL('..', import.meta.url));
const candidateDir = fileURLToPath(new URL('../..', import.meta.url));

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
