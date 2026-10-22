import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.dirname(fileURLToPath(import.meta.url));
const port = Number(process.env.PORT || 4173);
const samples = {
  '/samples/quotations.xlsx': 'Training Data - Quotation Manager.xlsx',
  '/samples/codes.xlsx': 'Training Data - Code Manager.xlsx',
};
const types = { '.png':'image/png', '.woff2':'font/woff2', '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.mjs': 'text/javascript', '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' };
const json = (res, status, body) => res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }).end(JSON.stringify(body));
// The Pi adapter is optional and loaded on first use, so the static app keeps running without the SDK.
const piAnalyst = () => import('./agent/pi-analyst.mjs');
async function api(req, res, url) {
  // Only this app's own pages may spend the researcher's model credentials.
  const origin = req.headers.origin;
  if (origin && origin !== `http://${req.headers.host}`) return json(res, 403, { error: 'Cross-origin requests are not allowed.' });
  if (url.pathname === '/api/pi/status' && req.method === 'GET') return json(res, 200, await (await piAnalyst()).piStatus());
  if (url.pathname !== '/api/analyze' || req.method !== 'POST') return json(res, 404, { error: 'Not found' });
  if (!req.headers['content-type']?.startsWith('application/json')) return json(res, 415, { error: 'Send JSON.' });
  let size = 0; const chunks = [];
  for await (const chunk of req) { if ((size += chunk.length) > 20 * 1024 * 1024) return json(res, 413, { error: 'The project is too large to analyse.' }); chunks.push(chunk); }
  const { module, payload, options } = JSON.parse(Buffer.concat(chunks).toString('utf8'));
  // A closed browser request (Cancel, navigation) aborts the agent run.
  const controller = new AbortController();
  res.on('close', () => { if (!res.writableEnded) controller.abort(); });
  try { json(res, 200, { finding: await (await piAnalyst()).analyzeWithPi({ module, payload, options, signal: controller.signal }) }); }
  catch (error) { if (!controller.signal.aborted) json(res, 502, { error: error.message }); }
}
export const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://localhost');
    if (url.pathname.startsWith('/api/')) { await api(req, res, url); return; }
    if (!['GET', 'HEAD'].includes(req.method)) { res.writeHead(405).end(); return; }
    let file = samples[url.pathname];
    if (!file) {
      const pathname = decodeURIComponent(url.pathname);
      if (pathname === '/') file = 'index.html';
      else if (/^\/(src|vendor|Assets)\/[a-zA-Z0-9._ /-]+$/.test(pathname) && !pathname.split('/').includes('..')) file = pathname.slice(1);
      else { res.writeHead(404).end('Not found'); return; }
    }
    const bytes = await readFile(path.join(root, file));
    res.writeHead(200, { 'Content-Type': `${types[path.extname(file)] || 'text/plain'}; charset=utf-8`, 'Cache-Control': 'no-cache', 'X-Content-Type-Options': 'nosniff' });
    res.end(req.method === 'HEAD' ? undefined : bytes);
  } catch { res.writeHead(404).end('Not found'); }
});
server.listen(port, '127.0.0.1', () => console.log(`Althea is ready at http://127.0.0.1:${port}`));
server.on('error', error => { console.error(error.code === 'EADDRINUSE' ? `Port ${port} is already in use. Set PORT to choose another port.` : error); process.exitCode = 1; });
