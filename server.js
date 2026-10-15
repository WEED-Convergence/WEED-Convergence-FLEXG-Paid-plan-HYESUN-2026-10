const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PORT = process.env.PORT || 4000;
const ROOT = __dirname;
const PUBLIC_DIR = path.join(ROOT, 'public');
const DATA_FILE = path.join(ROOT, 'data', 'notes.json');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
};

function readNotes() {
  try {
    const raw = fs.readFileSync(DATA_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch (err) {
    return [];
  }
}

function writeNotes(notes) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(notes, null, 2), 'utf-8');
}

function sendJSON(res, status, data) {
  const body = JSON.stringify(data);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
  });
  res.end(body);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let chunks = '';
    req.on('data', (chunk) => {
      chunks += chunk;
      if (chunks.length > 1e6) {
        req.destroy();
        reject(new Error('요청 본문이 너무 큽니다.'));
      }
    });
    req.on('end', () => {
      if (!chunks) return resolve({});
      try {
        resolve(JSON.parse(chunks));
      } catch (err) {
        reject(err);
      }
    });
    req.on('error', reject);
  });
}

function formatDate(d) {
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${mm}/${dd}`;
}

function randomRotate() {
  return Math.round((Math.random() * 8 - 4) * 10) / 10;
}

async function handleApi(req, res, pathname, urlObj) {
  if (pathname === '/api/notes' && req.method === 'GET') {
    const screen = urlObj.searchParams.get('screen');
    const notes = readNotes();
    const filtered = screen ? notes.filter((n) => n.screen === screen) : notes;
    return sendJSON(res, 200, filtered);
  }

  if (pathname === '/api/notes' && req.method === 'POST') {
    let body;
    try {
      body = await readBody(req);
    } catch (err) {
      return sendJSON(res, 400, { error: '요청 본문을 해석할 수 없습니다.' });
    }
    if (!body.screen || !body.type) {
      return sendJSON(res, 400, { error: 'screen, type 값이 필요합니다.' });
    }
    const notes = readNotes();
    const now = new Date();
    const id = body.id && !notes.some((n) => n.id === body.id) ? body.id : crypto.randomUUID();
    const note = {
      id,
      screen: body.screen,
      type: body.type,
      x: typeof body.x === 'number' ? body.x : 20,
      y: typeof body.y === 'number' ? body.y : 20,
      rotate: typeof body.rotate === 'number' ? body.rotate : randomRotate(),
      content: typeof body.content === 'string' ? body.content : '',
      date: body.date || formatDate(now),
      createdAt: body.createdAt || now.toISOString(),
    };
    notes.push(note);
    writeNotes(notes);
    return sendJSON(res, 201, note);
  }

  const idMatch = pathname.match(/^\/api\/notes\/([^/]+)$/);

  if (idMatch && req.method === 'PATCH') {
    const id = decodeURIComponent(idMatch[1]);
    let body;
    try {
      body = await readBody(req);
    } catch (err) {
      return sendJSON(res, 400, { error: '요청 본문을 해석할 수 없습니다.' });
    }
    const notes = readNotes();
    const idx = notes.findIndex((n) => n.id === id);
    if (idx === -1) return sendJSON(res, 404, { error: '메모를 찾을 수 없습니다.' });
    const allowed = ['type', 'x', 'y', 'rotate', 'content'];
    allowed.forEach((key) => {
      if (key in body) notes[idx][key] = body[key];
    });
    writeNotes(notes);
    return sendJSON(res, 200, notes[idx]);
  }

  if (idMatch && req.method === 'DELETE') {
    const id = decodeURIComponent(idMatch[1]);
    const notes = readNotes();
    const next = notes.filter((n) => n.id !== id);
    writeNotes(next);
    return sendJSON(res, 200, { ok: true });
  }

  sendJSON(res, 404, { error: 'Not Found' });
}

function serveStatic(req, res, pathname) {
  let filePath = pathname === '/' ? '/p-01.html' : pathname;
  filePath = path.normalize(filePath).replace(/^(\.\.[/\\])+/, '');
  const fullPath = path.join(PUBLIC_DIR, filePath);
  if (!fullPath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403);
    return res.end('Forbidden');
  }
  fs.readFile(fullPath, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      return res.end('Not Found');
    }
    const ext = path.extname(fullPath);
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
    res.end(data);
  });
}

const server = http.createServer((req, res) => {
  const urlObj = new URL(req.url, `http://${req.headers.host}`);
  const pathname = urlObj.pathname;

  if (pathname.startsWith('/api/')) {
    handleApi(req, res, pathname, urlObj).catch((err) => {
      console.error(err);
      sendJSON(res, 500, { error: '서버 오류가 발생했습니다.' });
    });
    return;
  }

  serveStatic(req, res, pathname);
});

server.listen(PORT, () => {
  console.log(`화면설계서 프로토타입 서버가 http://localhost:${PORT} 에서 실행 중입니다.`);
});
