#!/usr/bin/env node
const http = require('http');
const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const distDir = path.join(rootDir, 'dist');
const host = process.env.HOST || '127.0.0.1';
const preferredPort = Number(process.env.PORT || 3000);

const mimeTypes = {
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8'
};

function findAvailablePort(port) {
  return new Promise((resolve, reject) => {
    const probe = http.createServer();
    probe.once('error', (error) => {
      if (error.code === 'EADDRINUSE') {
        resolve(findAvailablePort(port + 1));
      } else {
        reject(error);
      }
    });
    probe.once('listening', () => {
      const address = probe.address();
      probe.close(() => resolve(address.port));
    });
    probe.listen(port, host);
  });
}

function isSafePath(requestPath) {
  const resolved = path.resolve(distDir, `.${requestPath}`);
  return resolved.startsWith(distDir);
}

function sendFile(res, filePath) {
  const extension = path.extname(filePath).toLowerCase();
  const contentType = mimeTypes[extension] || 'application/octet-stream';
  fs.readFile(filePath, (error, content) => {
    if (error) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Not found');
      return;
    }
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(content);
  });
}

async function main() {
  const port = await findAvailablePort(preferredPort);
  const server = http.createServer((req, res) => {
    const requestUrl = new URL(req.url, `http://${req.headers.host || '127.0.0.1'}`);
    let requestPath = decodeURIComponent(requestUrl.pathname);

    if (requestPath === '/') {
      requestPath = '/index.html';
    }

    if (!isSafePath(requestPath)) {
      res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Forbidden');
      return;
    }

    const filePath = path.join(distDir, requestPath);
    const fileStat = fs.existsSync(filePath) && fs.statSync(filePath);

    if (fileStat && fileStat.isDirectory()) {
      sendFile(res, path.join(filePath, 'index.html'));
      return;
    }

    sendFile(res, filePath);
  });

  server.listen(port, host, () => {
    console.log(`Libac dev server running at http://${host}:${port}`);
  });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
