import index from './src/index.html';
import { assertCodexSessionsDir } from './src/server/scanner';
import { handleApi } from './src/server/routes';

await assertCodexSessionsDir();

const server = Bun.serve({
  port: Number(process.env.PORT) || 3456,
  development: process.env.NODE_ENV !== 'production',
  routes: {
    '/': index,
    '/stats': index,
    '/sessions/:id': index,
    '/api/*': (req) => handleApi(req)
  },
  error(err) {
    console.error(err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
});

console.log(`Codex Viz running at http://localhost:${server.port}`);

if (process.env.OPEN_BROWSER !== '0') {
  const opener = process.platform === 'darwin'
    ? 'open'
    : process.platform === 'win32'
      ? 'start'
      : 'xdg-open';
  try {
    Bun.spawn([opener, `http://localhost:${server.port}`]);
  } catch {
    // Browser auto-open is best effort only.
  }
}
