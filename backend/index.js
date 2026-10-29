const http = require('http');
const fs = require('fs');
const url = require('url');

const PORT = process.env.PORT || 4000;
const DB_FILE = process.env.DB_FILE || (__dirname + '/db.json');
const ADD_PASSWORD = process.env.ADD_PASSWORD || 'AWSGOD11';

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
  const corsOrigin = process.env.CORS_ORIGIN || '*';
  res.setHeader('Access-Control-Allow-Origin', corsOrigin);
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');

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
        const { studentName, certificateTitle, issuer, issueDate, certificateCode, addPassword, expiryDate } = payload;
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
          expiryDate: expiryDate || null,
          status: 'verified',
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

  const updateMatch = parsed.pathname.match(/^\/api\/certs\/([^\/]+)$/);
  if (updateMatch && (req.method === 'PUT' || req.method === 'DELETE')) {
    const id = updateMatch[1];
    let body = '';
    req.on('data', (chunk) => (body += chunk));
    req.on('end', () => {
      try {
        const records = readDB();
        const index = records.findIndex((r) => r.id === id);
        if (index === -1) {
          res.writeHead(404, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ error: 'Certificate not found' }));
        }

        if (req.method === 'DELETE') {
          records[index].status = 'revoked';
          records[index].updatedAt = new Date().toISOString();
          writeDB(records);
          res.writeHead(200, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify(records[index]));
        }

        const payload = JSON.parse(body || '{}');
        if (payload.status) {
          records[index].status = payload.status;
        }
        if (payload.expiryDate !== undefined) {
          records[index].expiryDate = payload.expiryDate;
        }
        records[index].updatedAt = new Date().toISOString();
        writeDB(records);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify(records[index]));
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

    const result = { ...found };
    if (result.status === 'revoked') {
      result.verificationStatus = 'revoked';
    } else if (result.expiryDate) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const expiry = new Date(result.expiryDate);
      expiry.setHours(0, 0, 0, 0);
      if (expiry < today) {
        result.verificationStatus = 'expired';
      } else {
        result.verificationStatus = 'verified';
      }
    } else {
      result.verificationStatus = 'verified';
    }
    result.verificationTimestamp = new Date().toISOString();
    result.verificationSource = 'server';

    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify(result));
  }

  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Not found' }));
});

server.listen(PORT, () => {
  console.log(`Advanced Certificate Verification backend listening on http://localhost:${PORT}`);
});
