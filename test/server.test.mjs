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

test('an internal failure is reported without leaking the server internals', async (t) => {
  // The failure carries an absolute server path, the way a real fs error does.
  const leak = '/home/someone/secret/.emergence/organism.json';

  // The handler logs the failure on purpose. Letting it print here makes a
  // passing suite look like it crashed on first run, which is the first thing
  // a newcomer sees; capture it instead, and assert it was actually logged.
  const logged = [];
  const realError = console.error;
  console.error = (...args) => logged.push(args);
  t.after(() => { console.error = realError; });

  const server = createAppServer({
    getState: async () => {
      throw new Error(`ENOENT: no such file or directory, open '${leak}'`);
    }
  });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(() => server.close());

  const address = server.address();
  assert.ok(address && typeof address !== 'string');

  const response = await fetch(`http://127.0.0.1:${address.port}/api/state`);
  assert.equal(response.status, 500);

  const body = await response.text();
  assert.equal(body.includes(leak), false, 'the response disclosed a server path');
  assert.equal(body.includes('ENOENT'), false, 'the response disclosed the underlying error');
  assert.deepEqual(JSON.parse(body), { error: 'organism_failure' });

  // Suppressed from the response, but not lost: the operator still gets it.
  assert.equal(logged.length, 1, 'the failure reached the server log');
  assert.equal(String(logged[0][1]?.message ?? '').includes(leak), true, 'the log kept the detail');
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
