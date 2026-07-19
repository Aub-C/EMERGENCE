import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { createAppServer } from '../src/server.mjs';

test('server exposes health, state, and the organism surface', async (t) => {
  const server = createAppServer();
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(() => server.close());

  const address = server.address();
  assert.ok(address && typeof address !== 'string');
  const base = `http://127.0.0.1:${address.port}`;

  const health = await fetch(`${base}/healthz`);
  assert.equal(health.status, 200);
  assert.deepEqual(await health.json(), { status: 'alive' });

  const state = await fetch(`${base}/api/state`);
  assert.equal(state.status, 200);
  assert.equal((await state.json()).identity, 'seed');

  const page = await fetch(base);
  assert.equal(page.status, 200);
  assert.match(await page.text(), /EMERGENCE/);
});

test('server rejects traversal and unsupported methods', async (t) => {
  const server = createAppServer();
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(() => server.close());

  const address = server.address();
  assert.ok(address && typeof address !== 'string');
  const base = `http://127.0.0.1:${address.port}`;

  assert.equal((await fetch(`${base}/missing`)).status, 404);
  assert.equal((await fetch(`${base}/healthz`, { method: 'POST' })).status, 405);
});
