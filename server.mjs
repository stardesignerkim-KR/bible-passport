// 로컬 확인용 서버:  node server.mjs  →  http://localhost:3000
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import calendar from './api/calendar.js';

const PUB = fileURLToPath(new URL('./public/', import.meta.url));
const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon',
  '.webmanifest': 'application/manifest+json',
};

http.createServer(async (req, res) => {
  const { pathname } = new URL(req.url, 'http://localhost');
  if (pathname === '/api/calendar.ics' || pathname === '/api/calendar') return calendar(req, res);
  let rel = decodeURIComponent(pathname);
  if (rel.endsWith('/')) rel += 'index.html';
  if (!extname(rel)) rel += '.html';
  const file = normalize(join(PUB, rel));
  if (!file.startsWith(PUB)) { res.statusCode = 403; return res.end('forbidden'); }
  try {
    const buf = await readFile(file);
    res.setHeader('Content-Type', MIME[extname(file)] ?? 'application/octet-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.end(buf);
  } catch {
    res.statusCode = 404; res.end('not found');
  }
}).listen(process.env.PORT || 3000, () => console.log(`바이블패스포트 → http://localhost:${process.env.PORT || 3000}`));
