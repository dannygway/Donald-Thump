// Minimal production server for hosts like Railway: serves the game's static
// files and the /api/verify payment check. No dependencies; Node 18+.
//   PORT               set by the host
//   STRIPE_SECRET_KEY  restricted Stripe key (read Checkout Sessions)
//   PAYMENT_LINKS      optional comma-separated plink_... ids
import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { onRequestGet as verify } from './functions/api/verify.js';

const ROOT = fileURLToPath(new URL('.', import.meta.url));
// only these are public; everything else in the repo (tools, functions, .git) is not
const PUBLIC = [/^\/$/, /^\/index\.html$/, /^\/sw\.js$/, /^\/manifest\.webmanifest$/, /^\/icons\/[\w.-]+\.png$/, /^\/voice\/[\w.-]+\.(mp3|json)$/, /^\/sfx\/[\w.-]+\.(mp3|json)$/];
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.webmanifest': 'application/manifest+json',
  '.png': 'image/png', '.mp3': 'audio/mpeg', '.json': 'application/json' };
const SECURITY = {
  'x-content-type-options': 'nosniff',
  'referrer-policy': 'strict-origin-when-cross-origin',
  'strict-transport-security': 'max-age=31536000; includeSubDomains'
};

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    if (url.pathname === '/api/verify') {
      if (req.method !== 'GET') { res.writeHead(405); return res.end(); }
      const r = await verify({ request: new Request(url), env: process.env });
      res.writeHead(r.status, { ...SECURITY, ...Object.fromEntries(r.headers) });
      return res.end(await r.text());
    }
    if (req.method !== 'GET' && req.method !== 'HEAD') { res.writeHead(405); return res.end(); }
    let path = decodeURIComponent(url.pathname);
    if (!PUBLIC.some(re => re.test(path))) { res.writeHead(404, SECURITY); return res.end('Not found'); }
    if (path === '/') path = '/index.html';
    const file = normalize(join(ROOT, path));
    if (!file.startsWith(ROOT.endsWith(sep) ? ROOT : ROOT + sep)) { res.writeHead(403); return res.end(); }
    const info = await stat(file).catch(() => null);
    if (!info || !info.isFile()) { res.writeHead(404, SECURITY); return res.end('Not found'); }
    const ext = extname(file);
    // the page and service worker must always revalidate so updates land; audio/icons can cache
    const cache = ext === '.html' || path === '/sw.js' || ext === '.webmanifest' || ext === '.json' ? 'no-cache' : 'public, max-age=604800';
    res.writeHead(200, { ...SECURITY, 'content-type': TYPES[ext] || 'application/octet-stream', 'content-length': info.size, 'cache-control': cache });
    if (req.method === 'HEAD') return res.end();
    res.end(await readFile(file));
  } catch (e) {
    res.writeHead(500); res.end('Server error');
  }
});
server.listen(process.env.PORT || 3000, () => console.log(`Donald Thump on :${process.env.PORT || 3000}`));
