const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const PORT = Number(process.env.PORT || 8745);
const HOST = process.env.HOST || '127.0.0.1';

const MIME_TYPES = {
  '.css': 'text/css; charset=utf-8',
  '.gif': 'image/gif',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.webp': 'image/webp'
};

const RESERVED_ROOT_SEGMENTS = {
  admin: true,
  assets: true,
  css: true,
  dashboard: true,
  js: true,
  kaarten: true,
  login: true,
  scripts: true,
  sets: true,
  templates: true,
  wizard: true
};

function safeDecode(value) {
  try {
    return decodeURIComponent(value);
  } catch (_error) {
    return value;
  }
}

function normalizeUrlPath(rawPath) {
  const pathname = String(rawPath || '/').split('?')[0].split('#')[0] || '/';
  const decoded = safeDecode(pathname);
  const cleaned = decoded.replace(/\/+/g, '/');
  if (!cleaned.startsWith('/')) return '/';
  return cleaned;
}

function rewritePrettyDashboard(pathname) {
  const match = pathname.match(/^\/([^/]+)\/dashboard(\/.*)?$/);
  if (!match) return pathname;
  const rest = match[2] || '/';
  return '/dashboard' + rest;
}

function rewriteWizardPath(pathname) {
  if (/^\/dashboard\/wizard(?:\/.*)?$/.test(pathname)) {
    return '/dashboard/index.html';
  }
  return pathname;
}

function isReservedRootSegment(segment) {
  return !!RESERVED_ROOT_SEGMENTS[String(segment || '').toLowerCase()];
}

function rewritePrettyPublic(pathname) {
  const normalized = normalizeUrlPath(pathname);
  const parts = normalized.replace(/^\/|\/$/g, '').split('/').filter(Boolean);
  if (!parts.length) return normalized;
  if (parts.length === 1 && !isReservedRootSegment(parts[0])) {
    return '/index.html';
  }
  if (parts.length === 2 && parts[1] !== 'dashboard' && !isReservedRootSegment(parts[0]) && !isReservedRootSegment(parts[1])) {
    return '/kaarten/index.html';
  }
  return normalized;
}

function resolveFilePath(requestPath) {
  let pathname = rewritePrettyDashboard(normalizeUrlPath(requestPath));
  pathname = rewriteWizardPath(pathname);
  pathname = rewritePrettyPublic(pathname);

  if (pathname === '/') {
    pathname = '/index.html';
  } else if (pathname.endsWith('/')) {
    pathname += 'index.html';
  } else if (!path.extname(pathname)) {
    const asDir = path.join(ROOT, pathname.replace(/^\/+/, ''), 'index.html');
    if (fs.existsSync(asDir)) return asDir;
  }

  return path.join(ROOT, pathname.replace(/^\/+/, ''));
}

function send(res, status, headers, body) {
  res.writeHead(status, headers);
  res.end(body);
}

const server = http.createServer(function(req, res) {
  const requestPath = req.url || '/';
  const filePath = resolveFilePath(requestPath);
  const normalizedRoot = ROOT.endsWith(path.sep) ? ROOT : ROOT + path.sep;
  const normalizedFile = path.resolve(filePath);

  if (normalizedFile !== ROOT && !normalizedFile.startsWith(normalizedRoot)) {
    send(res, 403, { 'Content-Type': 'text/plain; charset=utf-8' }, 'Forbidden');
    return;
  }

  fs.stat(normalizedFile, function(statError, stat) {
    if (statError || !stat.isFile()) {
      send(res, 404, { 'Content-Type': 'text/plain; charset=utf-8' }, 'Not found');
      return;
    }

    const ext = path.extname(normalizedFile).toLowerCase();
    const type = MIME_TYPES[ext] || 'application/octet-stream';
    fs.readFile(normalizedFile, function(readError, content) {
      if (readError) {
        send(res, 500, { 'Content-Type': 'text/plain; charset=utf-8' }, 'Server error');
        return;
      }
      send(res, 200, {
        'Cache-Control': 'no-store',
        'Content-Type': type
      }, content);
    });
  });
});

server.listen(PORT, HOST, function() {
  console.log('Local dashboard server running on http://' + HOST + ':' + PORT + '/');
});
