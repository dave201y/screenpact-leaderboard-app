# Screenpact Leaderboard App

Frontend: Vite + React
Backend: Express + Supabase + session auth

## Local setup

1. Install dependencies:

```bash
npm install
```

2. Create `.env` from `.env.example` and set values.

3. Start both frontend and backend:

```bash
npm run dev:full
```

Frontend runs on `http://localhost:8080` and API runs on `http://localhost:8787`.

## Mobile shell (Capacitor)

To prepare Android + iOS shells:

```bash
npm install
npm run cap:add:android
npm run cap:add:ios
npm run mobile:build
npm run cap:sync
```

Open native projects:

```bash
npm run cap:open:android
npm run cap:open:ios
```

Notes:
- Android project is generated under `android/`.
- iOS project is generated under `ios/`.
- Building/signing iOS requires macOS with Xcode and CocoaPods installed.

Priority-first mobile plan is tracked in [docs/mobile-build-order.md](docs/mobile-build-order.md).

## Supabase schema

Run [server/sql/schema.sql](server/sql/schema.sql) in Supabase SQL Editor.

## API endpoints

### Auth

- `POST /api/auth/signup`
	- Disabled for this app (returns 403).
- `POST /api/auth/login`
	- Body: `{ "email": "user@example.com", "password": "..." }`
	- Creates a server session cookie.
	- Access is restricted to owner credentials (`OWNER_EMAIL`, `OWNER_PASSWORD`).
- `POST /api/auth/logout`
- `GET /api/auth/session`

### App data

- `GET /api/health`
- `GET /api/leaderboard?date=YYYY-MM-DD`
	- Public endpoint.
- `GET /api/my-stats`
	- Requires authenticated session.
- `GET /api/profile`
	- Requires authenticated session.
- `GET /api/settings`
	- Requires authenticated session.
- `PUT /api/settings`
	- Requires authenticated session.
	- Body:
		- `notifications`: boolean
		- `darkMode`: boolean
		- `dailyGoalMinutes`: integer between `30` and `960`
- `GET /api/privacy`
	- Requires authenticated session.
	- Returns account privacy summary and recent requests.
- `POST /api/privacy/request`
	- Requires authenticated session.
	- Body:
		- `type`: `export` or `delete`
		- `note`: optional string up to 500 characters
- `POST /api/usage/sync`
	- Requires auth via session cookie, `Authorization: Bearer <supabase_access_token>`, or device token (`X-Device-Token` or `Authorization: Device <token>`).
	- Stores only summary usage data for one day and updates leaderboard/profile rollups.
	- Body:
		- `date`: optional ISO date, defaults to today
		- `totalMinutes`: number
		- `topApp`: object with `name`, `icon`, `minutes`, optional `color`
		- `apps`: optional array of summarized app usage rows
- `POST /api/usage/sync/batch`
	- Requires auth via session cookie, `Authorization: Bearer <supabase_access_token>`, or device token (`X-Device-Token` or `Authorization: Device <token>`).
	- Uploads up to 31 summary day entries in one request.
	- Body: `{ "entries": [ ...same shape as /api/usage/sync ] }`

### Connected devices

- `GET /api/devices`
	- Lists linked devices for the current session/account.
- `POST /api/devices`
	- Links a device.
	- Body:
		- `name`: optional string, defaults to `This device`
		- `platform`: optional string, defaults to `web`
- `DELETE /api/devices/:deviceId`
	- Revokes a linked device.
- `POST /api/devices/pairing-code`
	- Generates a short-lived pairing code (10 minutes) for linking another device.
- `POST /api/devices/pairing/consume`
	- Consumes a pairing code, links the native device, and returns a device token for API auth.
	- Body:
		- `code`: required 6-char pairing code
		- `name`: optional device label
		- `platform`: optional platform string (`ios`, `android`, etc.)
	- Returns:
		- `device`
		- `deviceToken` (store securely on device)
- `POST /api/devices/:deviceId/permission`
	- Updates phone usage-access state.
	- Body:
		- `status`: `unknown`, `requested`, `granted`, `denied`, or `restricted`
- `POST /api/devices/:deviceId/sync-heartbeat`
	- Marks a linked phone/device as recently synced.
	- Intended for native collectors after successful phone settings access and sync.

Example payload:

```json
{
  "date": "2026-04-08",
  "totalMinutes": 158,
  "topApp": {
    "name": "YouTube",
    "icon": "▶️",
    "minutes": 68,
    "color": "hsl(0 72% 51%)"
  },
  "apps": [
    { "name": "YouTube", "icon": "▶️", "minutes": 68, "color": "hsl(0 72% 51%)" },
    { "name": "Messages", "icon": "💬", "minutes": 32, "color": "hsl(92 60% 25%)" }
  ]
}
```

## Notes

- If Supabase env vars are not configured, endpoints return mock data where possible so frontend development can continue.
- Session storage currently uses in-memory store (good for local dev). Use a persistent session store in production.
- API hardening includes strict CORS allowlist, JSON body size limit, and rate limits for login/sync endpoints.
- After pulling latest backend code, run updated [server/sql/schema.sql](server/sql/schema.sql) to create `privacy_requests`, `devices`, `device_pairing_codes`, `device_sync_logs`, and related policies.
<img width="420" height="594" alt="image" src="https://github.com/user-attachments/assets/4aa80f5d-13e5-480e-9334-8b1aef56d782" />
<img width="453" height="575" alt="image" src="https://github.com/user-attachments/assets/937fba61-a62d-4691-842e-9c12b2604381" />
<img width="410" height="568" alt="image" src="https://github.com/user-attachments/assets/b795773b-f3d6-452c-a835-e6513fd966b9" />
<img width="422" height="546" alt="image" src="https://github.com/user-attachments/assets/497fb31f-58c8-4eb3-89c2-9ca9b577ad0f" />



