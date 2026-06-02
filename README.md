# Certificate Verification Frontend

Frontend-only website to:

- Add certificate records
- Verify a physical certificate by entering the printed code
- View added certificates in a styled dashboard

This project stores data in browser `localStorage` (no backend).

## Design

UI style follows the same design language as your reference project:

- Dark background
- Glassmorphism cards
- Cyan/blue accent gradients
- Clean, modern section-based layout

## Files

- `index.html` - main page structure
- `styles.css` - visual theme and responsive styling
- `script.js` - add/verify logic and storage handling
- `tests/certificate.test.js` - tiny Node sanity tests for core logic
- `package.json` - test script

## Quick Start

Open `index.html` directly in a browser, or run a local static server.

### Run sanity tests

```bash
npm test
```

### Optional: start a local static server (Python 3)

```bash
python3 -m http.server 5500
```

Then open: `http://localhost:5500`

## Backend (optional)

A tiny Node.js backend lives in `backend/index.js`. It stores certificate records in `backend/db.json` and exposes a minimal API:

- `GET /api/certs` — list all certificates
- `POST /api/certs` — add a new certificate (JSON body; requires `addPassword` set to `AWSGOD11`)
- `GET /api/certs/verify?code=...` — lookup certificate by printed code

The backend does not require external dependencies — run it with Node.js:

```bash
node backend/index.js
```

By default the server listens on port `4000` (use `PORT` env var to change).

If you host the backend separately from the frontend, set `window.API_BASE` to the backend origin (for example, add in `index.html` or your hosting environment):

```html
<script>window.API_BASE = 'https://your-backend.example.com';</script>
```

When the backend is available the frontend will prefer it for add/verify operations and will fall back to browser `localStorage` when the backend is unreachable.

## Notes

- Printed codes are matched case-insensitively.
- Duplicate certificate codes are blocked.
- `Clear All` removes all records from this browser only.