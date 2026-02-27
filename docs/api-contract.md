# Haptimize Backend API Contract (Initial)

## Health

- `GET /health`
  - Response: `{ "ok": true, "service": "haptimize-backend" }`

## Auth

- `POST /api/auth/signup/request-code`
  - Body:
    - `email: string`
    - `password: string (min 8)`
    - `username?: string`
  - Behavior:
    - Sends 6-digit code with 2-minute expiry
    - Tracks resend count per email
    - `showEmailConfirmation=true` after second resend
    - Blocks IP for 15 minutes if resend count exceeds 3
  - Success: `200`
  - Error: `400 | 429 | 502`

- `POST /api/auth/signup/verify-code`
  - Body:
    - `email: string`
    - `code: string (6 digits)`
  - Behavior:
    - Creates account only after valid code verification
  - Success: `201`
  - Error: `400 | 401 | 404 | 410 | 500`

- `POST /api/auth/google/exchange`
  - Placeholder for future server-side token exchange
  - Current response: `501`

## AI

- `POST /api/ai/chat`
  - Body: `{ "message": "..." }`
  - Rate limited by user/IP
  - Success: `200` with `{ ok, reply }`
  - Error: `400 | 429 | 502`

## Reminders

- `GET /api/reminders?userId=<id>&type=casual|dated`
  - List user reminders (optionally filtered by type)

- `POST /api/reminders`
  - Body:
    - `userId: string`
    - `text: string`
    - `reminderType: "casual" | "dated"`
    - `date?: string`

- `PATCH /api/reminders/:reminderId`
  - Body:
    - `userId: string`
    - `text?: string`
    - `date?: string`
    - `completed?: boolean`

- `DELETE /api/reminders/:reminderId?userId=<id>`
