# Advance Certificate Verification

A secure, production-oriented certificate verification platform with server-authoritative
verification, administrator dashboard, camera scanning, OCR-assisted extraction,
QR codes, audit logs, and CSV exports.

## Architecture

- **Frontend**: Vanilla HTML/CSS/JS with ES modules, responsive design, dark/light themes
- **Backend**: Vanilla Node.js HTTP server (no framework)
- **Storage**: JSON file with atomic writes (migration path to SQL documented)
- **Authentication**: Session-based with bcrypt password hashing
- **Deployment**: Frontend on Vercel/static hosting, backend on Node.js-compatible hosting

## Project Structure

```
├── index.html                  # Landing page
├── verify.html                 # Certificate verification
├── scan.html                   # Camera scan & upload
├── result.html                 # Verification result
├── register.html               # Certificate registration (admin)
├── admin-login.html            # Admin login
├── admin-dashboard.html        # Admin dashboard
├── admin-records.html          # Certificate records
├── admin-audit.html            # Audit logs
├── help.html                   # Help page
├── privacy.html                # Privacy policy
├── terms.html                  # Terms of service
├── contact.html                # Contact page
├── manifest.json               # PWA manifest
├── frontend/css/               # Design system & styles
├── frontend/js/                # JavaScript modules (ES modules)
├── backend/                    # Node.js backend
│   ├── server.js               # HTTP server & route mounting
│   ├── config.js               # Environment configuration
│   ├── storage.js              # Atomic JSON file storage
│   ├── models/                 # Data models (Certificate, Admin, AuditLog, VerificationLog)
│   ├── middleware/             # Auth, validation, rate limiting, security
│   ├── routes/                 # API routes (auth, certs, verification, audit, export)
│   ├── .env.example            # Environment variables template
│   └── db.json                 # Certificate data store
├── tests/                      # Test suite
├── package.json                # Dependencies & scripts
└── vercel.json                 # Vercel deployment config
```

## API Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/` | Public | API info |
| POST | `/api/auth/login` | Public | Admin login |
| POST | `/api/auth/logout` | Admin | Admin logout |
| GET | `/api/auth/verify` | Admin | Verify session |
| GET | `/api/certs` | Optional | List certificates |
| POST | `/api/certs` | Admin | Create certificate |
| GET | `/api/certs/:id` | Optional | Get certificate |
| PUT | `/api/certs/:id` | Admin | Update certificate |
| DELETE | `/api/certs/:id` | Admin | Revoke certificate |
| POST | `/api/certs/:id/restore` | Admin | Restore certificate |
| GET | `/api/certs/search` | Optional | Search certificates |
| GET | `/api/certs/stats` | Admin | Dashboard statistics |
| GET | `/api/certs/verify` | Public | Verify certificate |
| GET | `/api/audit` | Admin | Audit logs |
| GET | `/api/export/csv` | Admin | CSV export |

## Installation

```bash
# Install dependencies
npm install

# Configure environment
cp backend/.env.example backend/.env
# Edit backend/.env with your settings (especially ADMIN_PASSWORD_HASH)

# Start the backend
npm start

# Open the frontend
open index.html
# Or serve with a static server:
python3 -m http.server 5500
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | 4000 |
| `NODE_ENV` | Environment | development |
| `SESSION_SECRET` | Session signing secret | (required in production) |
| `ADMIN_USERNAME` | Admin username | admin |
| `ADMIN_PASSWORD_HASH` | bcrypt hash of admin password | (required) |
| `BCRYPT_SALT_ROUNDS` | bcrypt salt rounds | 12 |
| `CORS_ORIGIN` | CORS allowed origin | * |
| `PUBLIC_URL` | Public app URL (for QR codes) | http://localhost:4000 |
| `DATA_DIR` | Data directory | ./backend |

Generate a password hash:
```bash
node -e "const bcrypt=require('bcryptjs'); bcrypt.hash('your-password',12).then(h=>console.log('ADMIN_PASSWORD_HASH=' + h))"
```

## Default Credentials

Username: `admin`
Password: `admin123`

**Change these in production** by setting `ADMIN_PASSWORD_HASH` to a bcrypt hash.

## Testing

```bash
npm test
```

## Deployment

### Backend (Node.js hosting - Render, Railway, etc.)
1. Deploy the `backend/` directory as a Node.js service
2. Set environment variables (see `.env.example`)
3. Enable persistent disk for `db.json` durability (or migrate to SQL)

### Frontend (Vercel, Netlify, static hosting)
1. Deploy all HTML/CSS/JS files
2. Configure `/api/*` rewrites to your backend URL
3. Set `window.API_BASE` if frontend and backend are on different origins

### Vercel (`vercel.json`)
```json
{
  "rewrites": [
    { "source": "/api/:path*", "destination": "https://your-backend.onrender.com/:path*" }
  ]
}
```

## Security

- Server-side authentication and authorization
- bcrypt password hashing (12 rounds)
- Session-based auth with 24-hour TTL
- Login rate limiting (10 requests per 15 minutes)
- API rate limiting (100 requests per minute)
- Security headers (CSP, X-Content-Type-Options, X-Frame-Options, etc.)
- CORS configurable via environment
- Input validation on server and client
- SQL injection protection (no SQL used)
- File upload type and size validation
- No secrets in client-side code

## Limitations

- JSON file storage is suitable for low-to-medium traffic; migrate to PostgreSQL/SQLite for high concurrency
- OCR requires Tesseract.js loaded from CDN (adds ~5MB bundle)
- Camera access requires HTTPS or localhost
- Default admin credentials must be changed in production
- PWA manifest included; service worker not yet implemented

## License

Private - Advance Certificate Verification
