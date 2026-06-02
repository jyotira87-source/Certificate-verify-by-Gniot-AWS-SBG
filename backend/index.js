const http = require('http');
const fs = require('fs');
const url = require('url');

const PORT = process.env.PORT || 4000;
const DB_FILE = __dirname + '/db.json';
const ADD_PASSWORD = 'AWSGOD11';

function readDB() {
  try {
    const raw = fs.readFileSync(DB_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    return [];
  }
}

function writeDB(records) {
  fs.writeFileSync(DB_FILE, JSON.stringify(records, null, 2), 'utf8');
}

function normalizeCode(val) {
  return String(val || '').trim().toUpperCase();
}

const server = http.createServer((req, res) => {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  const parsed = url.parse(req.url, true);
  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    return res.end();
  }

  if (parsed.pathname === '/api/certs' && req.method === 'GET') {
    const records = readDB();
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify(records));
  }

  if (parsed.pathname === '/api/certs' && req.method === 'POST') {
    let body = '';
    req.on('data', (chunk) => (body += chunk));
    req.on('end', () => {
      try {
        const payload = JSON.parse(body || '{}');
        const { studentName, certificateTitle, issuer, issueDate, certificateCode, addPassword } = payload;
        if (!studentName || !certificateTitle || !issuer || !issueDate || !certificateCode) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ error: 'Missing required fields' }));
        }

        if (String(addPassword || '') !== ADD_PASSWORD) {
          res.writeHead(403, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ error: 'Invalid add-certificate password' }));
        }

        const records = readDB();
        const norm = normalizeCode(certificateCode);
        if (records.some((r) => normalizeCode(r.certificateCode) === norm)) {
          res.writeHead(409, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ error: 'Duplicate certificate code' }));
        }

        const newRecord = {
          id: String(Date.now()),
          studentName,
          certificateTitle,
          issuer,
          issueDate,
          certificateCode: norm,
          createdAt: new Date().toISOString(),
        };
        records.unshift(newRecord);
        writeDB(records);
        res.writeHead(201, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify(newRecord));
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: 'Invalid JSON' }));
      }
    });
    return;
  }

  if (parsed.pathname === '/api/certs/verify' && req.method === 'GET') {
    const code = String(parsed.query.code || parsed.query.q || '');
    const norm = normalizeCode(code);
    if (!norm) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: 'Missing code' }));
    }
    const records = readDB();
    const found = records.find((r) => normalizeCode(r.certificateCode) === norm) || null;
    if (!found) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: 'Not found' }));
    }

    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify(found));
  }

  // Not found
  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Not found' }));
});

server.listen(PORT, () => {
  console.log(`Certificate backend listening on http://localhost:${PORT}`);
});
