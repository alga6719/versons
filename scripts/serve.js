const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = process.env.PORT || 8080;
const HOST = process.env.HOST || '0.0.0.0';
const ROOT = process.cwd();

const MIME_TYPES = {
  '.html': 'text/html; charset=UTF-8',
  '.js': 'application/javascript; charset=UTF-8',
  '.json': 'application/json; charset=UTF-8',
  '.css': 'text/css; charset=UTF-8',
  '.svg': 'image/svg+xml'
};

function resolvePath(requestPath) {
  let pathname = decodeURIComponent(requestPath.split('?')[0]);
  if (pathname === '/' || pathname === '') {
    pathname = '/dashboard.html';
  }
  const filePath = path.join(ROOT, pathname);
  if (!filePath.startsWith(ROOT)) {
    return null;
  }
  return filePath;
}

const server = http.createServer((req, res) => {
  const filePath = resolvePath(url.parse(req.url).pathname);
  if (!filePath) {
    res.writeHead(403, { 'Content-Type': 'text/plain; charset=UTF-8' });
    res.end('Forbidden');
    return;
  }

  fs.stat(filePath, (err, stats) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=UTF-8' });
      res.end('Not found');
      return;
    }

    if (stats.isDirectory()) {
      const location = req.url.endsWith('/') ? `${req.url}dashboard.html` : `${req.url}/dashboard.html`;
      res.writeHead(301, { Location: location });
      res.end();
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const mime = MIME_TYPES[ext] || 'application/octet-stream';

    const stream = fs.createReadStream(filePath);
    stream.on('open', () => {
      res.writeHead(200, { 'Content-Type': mime });
      stream.pipe(res);
    });
    stream.on('error', () => {
      res.writeHead(500, { 'Content-Type': 'text/plain; charset=UTF-8' });
      res.end('Server error');
    });
  });
});

server.listen(PORT, HOST, () => {
  console.log(`TrendIQ mock server running at http://${HOST}:${PORT}/dashboard.html`);
});
