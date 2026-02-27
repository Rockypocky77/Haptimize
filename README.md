# Haptimize

Backend-first scaffold for the Haptimize habit tracker.

## Stack (current)

- Flask (Python)
- Firebase Admin SDK (optional local credentials)
- Resend (verification emails)
- OpenAI API (Hapti AI)

## Quick Start (backend)

1. Create a virtual environment and install dependencies:
   - `python3 -m venv .venv`
   - `source .venv/bin/activate`
   - `pip install -r backend/requirements.txt`
2. Copy env values:
   - `cp .env.example .env`
3. Run backend:
   - `cd backend`
   - `python app.py`
4. Verify:
   - `GET http://localhost:8000/health`

## Notes

- If `FIREBASE_ADMIN_CREDENTIALS` is not set, signup verification creates mock users for local dev.
- If `RESEND_API_KEY` is not set and `ALLOW_MOCK_EMAIL=true`, verification email sending is mocked.
- Initial API endpoints are documented in `docs/api-contract.md`.
