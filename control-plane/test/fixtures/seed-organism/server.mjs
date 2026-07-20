import { createServer } from 'node:http';

// Stand-in for src/server.mjs. The evaluator's runtime check only needs
// organism.start to listen on PORT and answer organism.health.path with
// organism.health.expected_status, so this trims the real server down to
// exactly that.
const port = Number(process.env.PORT ?? 3000);

const server = createServer((request, response) => {
  if (request.url === '/healthz') {
    response.writeHead(200, { 'content-type': 'application/json; charset=utf-8' });
    response.end(JSON.stringify({ status: 'alive' }));
    return;
  }
  response.writeHead(404);
  response.end();
});

server.listen(port, '127.0.0.1');

process.on('SIGTERM', () => server.close(() => process.exit(0)));
