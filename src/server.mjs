import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { getState } from './state.mjs';

const publicDir = fileURLToPath(new URL('./public/', import.meta.url));
const port = Number(process.env.PORT ?? 3000);
const host = process.env.HOST ?? '127.0.0.1';

const mime = new Map([
  ['.html', 'text/html; charset=utf-8'],
  ['.css', 'text/css; charset=utf-8'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.svg', 'image/svg+xml']
]);

// `dependencies` exists so a test can force the failure path; production calls
// pass nothing and get the real state reader.
export function createAppServer(dependencies = {}) {
  const readState = dependencies.getState ?? getState;

  return createServer(async (request, response) => {
    try {
      const url = new URL(request.url ?? '/', 'http://localhost');

      if (request.method !== 'GET') {
        return sendJson(response, 405, { error: 'method_not_allowed' });
      }

      if (url.pathname === '/healthz') {
        return sendJson(response, 200, { status: 'alive' });
      }

      if (url.pathname === '/api/state') {
        return sendJson(response, 200, await readState());
      }

      const requestedPath = url.pathname === '/' ? '/index.html' : url.pathname;
      const safePath = normalize(requestedPath).replace(/^(\.\.(\/|\\|$))+/, '');
      const filePath = join(publicDir, safePath);

      if (!filePath.startsWith(publicDir) || !(await isFile(filePath))) {
        return sendJson(response, 404, { error: 'not_found' });
      }

      const body = await readFile(filePath);
      response.writeHead(200, {
        'content-type': mime.get(extname(filePath)) ?? 'application/octet-stream',
        'cache-control': 'no-store',
        'x-content-type-options': 'nosniff'
      });
      response.end(body);
    } catch (error) {
      // The detail stays on the server. A filesystem error message carries the
      // absolute path it failed on, which tells a stranger where the organism
      // lives and how it is laid out; the operator reading the log already
      // knows both.
      console.error('organism_failure', error);
      sendJson(response, 500, { error: 'organism_failure' });
    }
  });
}

async function isFile(filePath) {
  try {
    return (await stat(filePath)).isFile();
  } catch {
    return false;
  }
}

function sendJson(response, status, payload) {
  response.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
    'x-content-type-options': 'nosniff'
  });
  response.end(JSON.stringify(payload));
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const server = createAppServer();
  server.listen(port, host, () => {
    console.log(`EMERGENCE ${process.pid} listening on http://${host}:${port}`);
  });

  const shutdown = () => server.close(() => process.exit(0));
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}
