import { createServer } from 'node:http';
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { request as httpRequest } from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SITE_PORT   = Number(process.env.SITE_PORT   || 8080);
const API_PORT    = Number(process.env.API_PORT     || 5000);
const API_HOST    = process.env.API_HOST            || 'localhost';
const SITE_HOST   = process.env.SITE_HOST           || '127.0.0.1';
const PUBLIC_FILES = new Set([
  'admin.js',
  'admin.html',
  'bg.png',
  'favicon.ico',
  'index.html',
  'mobile-bg.png',
  'script.js',
  'style.css'
]);

const contentTypes = {
  '.html':  'text/html; charset=utf-8',
  '.css':   'text/css; charset=utf-8',
  '.js':    'text/javascript; charset=utf-8',
  '.json':  'application/json; charset=utf-8',
  '.png':   'image/png',
  '.jpg':   'image/jpeg',
  '.jpeg':  'image/jpeg',
  '.webp':  'image/webp',
  '.gif':   'image/gif',
  '.svg':   'image/svg+xml',
  '.ico':   'image/x-icon',
  '.woff':  'font/woff',
  '.woff2': 'font/woff2',
  '.ttf':   'font/ttf',
  '.otf':   'font/otf'
};

/**
 * Proxy an /api/* request to the backend Express server.
 * Cookies are forwarded in both directions so JWT auth works
 * without any cross-origin cookie issues.
 */
function proxyToBackend(req, res) {
  const options = {
    hostname: API_HOST,
    port:     API_PORT,
    path:     req.url,
    method:   req.method,
    headers:  {
      ...req.headers,
      host: `${API_HOST}:${API_PORT}`  // rewrite Host header
    }
  };

  const proxyReq = httpRequest(options, (proxyRes) => {
    // Forward all response headers (including Set-Cookie)
    res.writeHead(proxyRes.statusCode, proxyRes.headers);
    proxyRes.pipe(res, { end: true });
  });

  proxyReq.on('error', (err) => {
    console.error('[proxy error]', err.message);
    if (!res.headersSent) {
      res.writeHead(502, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, message: 'Backend not reachable. Is npm run start:backend running?' }));
    }
  });

  req.pipe(proxyReq, { end: true });
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${SITE_PORT}`);

  // ── Proxy all /api/* requests to the Express backend ──────────────────────
  if (url.pathname.startsWith('/api/')) {
    return proxyToBackend(req, res);
  }

  // ── Static file serving ────────────────────────────────────────────────────
  const routePath      = (url.pathname === '/admin' || url.pathname === '/admin/') ? '/admin.html' : url.pathname;
  const requestedPath  = routePath === '/' ? '/index.html' : decodeURIComponent(routePath);
  const publicFile     = requestedPath.replace(/^\/+/, '');

  if (!PUBLIC_FILES.has(publicFile)) {
    const isSpaRoute = !path.extname(publicFile)
      && !publicFile.includes('\\')
      && !publicFile.includes('..');

    if (isSpaRoute) {
      res.writeHead(200, {
        'Content-Type': contentTypes['.html'],
        'Cache-Control': 'no-store'
      });
      createReadStream(path.join(__dirname, 'index.html')).pipe(res);
      return;
    }

    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Not found');
    return;
  }

  const filePath       = path.join(__dirname, publicFile);

  try {
    const info = await stat(filePath);
    if (!info.isFile()) throw new Error('Not a file');

    res.writeHead(200, {
      'Content-Type':  contentTypes[path.extname(filePath)] || 'application/octet-stream',
      'Cache-Control': 'no-store'
    });
    createReadStream(filePath).pipe(res);
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Not found');
  }
});

server.listen(SITE_PORT, SITE_HOST, () => {
  console.log(`Unipaper static site running at http://${SITE_HOST}:${SITE_PORT}`);
  console.log(`Admin panel available at    http://${SITE_HOST}:${SITE_PORT}/admin`);
  console.log(`API requests proxied to     http://${API_HOST}:${API_PORT}/api/*`);
});
