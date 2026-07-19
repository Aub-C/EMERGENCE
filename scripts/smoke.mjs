import { once } from 'node:events';
import { createAppServer } from '../src/server.mjs';

const server = createAppServer();
server.listen(0, '127.0.0.1');
await once(server, 'listening');

try {
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('unexpected server address');

  const health = await fetch(`http://127.0.0.1:${address.port}/healthz`);
  if (health.status !== 200) throw new Error(`health check returned ${health.status}`);

  const state = await fetch(`http://127.0.0.1:${address.port}/api/state`);
  if (state.status !== 200) throw new Error(`state check returned ${state.status}`);

  const payload = await state.json();
  if (!payload.mutable) throw new Error('organism does not report mutable state');

  console.log(JSON.stringify({ smoke: 'passed', identity: payload.identity }));
} finally {
  await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
}
