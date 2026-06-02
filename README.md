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

## Deploy: frontend on Vercel, backend on Render (recommended/simple)

This repository is ready to deploy with the frontend hosted on Vercel (fast static hosting) and the backend on Render (simple Node web service).

1) Deploy backend to Render

	- In Render: Create a new **Web Service** and connect your GitHub repo.
	- Set the **Service Directory** to `backend` so Render runs the Node service there.
	- Start Command: `npm start` (or `node index.js`).
	- Add environment variable `ADD_PASSWORD` set to `AWSGOD11` (recommended) in Render's dashboard.
	- (Optional) Enable **Persistent Disk** in Render and set `DATA_DIR` env var to the mounted path so `db.json` persists across deploys.
	- After deploy you'll get a backend URL such as `https://your-backend.onrender.com`.

2) Configure frontend rewrite for Vercel

		- The frontend uses relative `/api` endpoints by default. To forward those calls to the Render backend, Vercel can rewrite `/api/*` to your Render backend.
		- A `vercel.json` is included in the repo and already configured to proxy `/api/*` to the Render backend at:

			`https://certificate-verify-by-gniot-aws-sbg.onrender.com`

			If your backend URL is different, update `vercel.json` accordingly. Example rewrite format:

```json
{
	"rewrites": [
		{ "source": "/api/:path*", "destination": "https://your-backend.onrender.com/:path*" }
	]
}
```
```json
{
	"rewrites": [
		{ "source": "/api/:path*", "destination": "https://your-backend.onrender.com/:path*" }
	]
}
```

3) Deploy frontend to Vercel

	- On Vercel: New Project → Import Git Repository → select this repo and `main` branch.
	- Framework Preset: `Other` (static). Build command: leave empty. Output directory: root (`/`) where `index.html` lives.
	- Vercel will publish the static site. The frontend will make requests to `/api/*` which Vercel will rewrite to your Render backend.

4) Test

	- Add page: `https://<your-vercel-site>/add.html` (or use the deployed domain)
	- Verify page: `https://<your-vercel-site>/verify.html`
	- Adding a certificate will POST to `/api/certs` which will be proxied to the Render backend.

Notes

	- Keep `ADD_PASSWORD` secret and set it as an environment variable in Render.
	- If you prefer to serve frontend from the backend (single origin), you can implement static file serving in the backend and deploy only the backend on Render.

## Notes

- Printed codes are matched case-insensitively.
- Duplicate certificate codes are blocked.
- `Clear All` removes all records from this browser only.