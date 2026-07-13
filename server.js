const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const WORDS_FILE = path.join(ROOT, 'words.json');
const PORT = process.env.PORT || 8000;

const MIME = {
  '.html': 'text/html',
  '.json': 'application/json',
  '.ico': 'image/x-icon',
  '.png': 'image/png',
  '.js': 'text/javascript',
  '.css': 'text/css',
};

function serveStatic(req, res) {
  const reqPath = decodeURIComponent((req.url === '/' ? '/index.html' : req.url).split('?')[0]);
  const filePath = path.normalize(path.join(ROOT, reqPath));
  if (!filePath.startsWith(ROOT)) { res.writeHead(403); res.end(); return; }
  fs.readFile(filePath, (err, data) => {
    if (err) { res.writeHead(404); res.end('Not found'); return; }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(filePath)] || 'application/octet-stream' });
    res.end(data);
  });
}

function addWord(req, res) {
  let body = '';
  req.on('data', chunk => {
    body += chunk;
    if (body.length > 1e6) req.destroy();
  });
  req.on('end', () => {
    let payload;
    try { payload = JSON.parse(body); } catch {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Invalid JSON' }));
      return;
    }
    const word = (payload.word || '').trim();
    const definition = (payload.definition || '').trim();
    if (!word || !definition) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'word and definition required' }));
      return;
    }
    fs.readFile(WORDS_FILE, 'utf8', (err, data) => {
      if (err) { res.writeHead(500, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ error: 'read failed' })); return; }
      const words = JSON.parse(data);
      const entry = { word, definition };
      words.push(entry);
      fs.writeFile(WORDS_FILE, JSON.stringify(words, null, 2), err2 => {
        if (err2) { res.writeHead(500, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ error: 'write failed' })); return; }
        res.writeHead(201, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(entry));
      });
    });
  });
}

function updateWord(req, res) {
  let body = '';
  req.on('data', chunk => {
    body += chunk;
    if (body.length > 1e6) req.destroy();
  });
  req.on('end', () => {
    let payload;
    try { payload = JSON.parse(body); } catch {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Invalid JSON' }));
      return;
    }
    const original = (payload.original || '').trim();
    const word = (payload.word || '').trim();
    const definition = (payload.definition || '').trim();
    if (!original || !word || !definition) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'original, word and definition required' }));
      return;
    }
    fs.readFile(WORDS_FILE, 'utf8', (err, data) => {
      if (err) { res.writeHead(500, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ error: 'read failed' })); return; }
      const words = JSON.parse(data);
      const idx = words.findIndex(w => w.word.toLowerCase() === original.toLowerCase());
      if (idx === -1) {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'word not found' }));
        return;
      }
      const entry = { word, definition };
      words[idx] = entry;
      fs.writeFile(WORDS_FILE, JSON.stringify(words, null, 2), err2 => {
        if (err2) { res.writeHead(500, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ error: 'write failed' })); return; }
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(entry));
      });
    });
  });
}

const server = http.createServer((req, res) => {
  if (req.method === 'POST' && req.url === '/api/words') return addWord(req, res);
  if (req.method === 'PUT' && req.url === '/api/words') return updateWord(req, res);
  if (req.method === 'GET') return serveStatic(req, res);
  res.writeHead(405);
  res.end();
});

server.listen(PORT, () => console.log(`VocaFly running at http://localhost:${PORT}`));
