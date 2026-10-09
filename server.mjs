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
const types = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.mjs': 'text/javascript', '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' };
export const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://localhost');
    if (!['GET', 'HEAD'].includes(req.method)) { res.writeHead(405).end(); return; }
    let file = samples[url.pathname];
    if (!file) {
      const pathname = decodeURIComponent(url.pathname);
      if (pathname === '/') file = 'index.html';
      else if (/^\/(src|vendor)\/[a-zA-Z0-9._/-]+$/.test(pathname) && !pathname.split('/').includes('..')) file = pathname.slice(1);
      else { res.writeHead(404).end('Not found'); return; }
    }
    const bytes = await readFile(path.join(root, file));
    res.writeHead(200, { 'Content-Type': `${types[path.extname(file)] || 'text/plain'}; charset=utf-8`, 'Cache-Control': 'no-cache', 'X-Content-Type-Options': 'nosniff' });
    res.end(req.method === 'HEAD' ? undefined : bytes);
  } catch { res.writeHead(404).end('Not found'); }
});
server.listen(port, '127.0.0.1', () => console.log(`Althea is ready at http://127.0.0.1:${port}`));
server.on('error', error => { console.error(error.code === 'EADDRINUSE' ? `Port ${port} is already in use. Set PORT to choose another port.` : error); process.exitCode = 1; });
