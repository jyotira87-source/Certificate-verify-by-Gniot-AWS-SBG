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

## Notes

- Printed codes are matched case-insensitively.
- Duplicate certificate codes are blocked.
- `Clear All` removes all records from this browser only.