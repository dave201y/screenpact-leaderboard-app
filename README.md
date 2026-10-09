# ScreenPact

ScreenPact is a screen-time accountability app that turns daily device usage into a private, group-friendly leaderboard. It combines a React web experience, an Express API, Supabase persistence, session-based authentication, and an Android UsageStatsManager collector.

> This repository is an active prototype. The Android collector currently supports pairing, permission reporting, manual daily sync, and sync heartbeats. Background WorkManager scheduling, offline queueing, and retry telemetry are not implemented yet.

## Frontend Preview

Here are some screenshots of the ScreenPact frontend, showcasing the app's user interface and key screens.

<p align="center">
  <img width="420" alt="ScreenPact frontend screenshot 1" src="https://github.com/user-attachments/assets/4aa80f5d-13e5-480e-9334-8b1aef56d782" />
  <img width="420" alt="ScreenPact frontend screenshot 2" src="https://github.com/user-attachments/assets/937fba61-a62d-4691-842e-9c12b2604381" />
</p>

<p align="center">
  <img width="420" alt="ScreenPact frontend screenshot 3" src="https://github.com/user-attachments/assets/b795773b-f3d6-452c-a835-e6513fd966b9" />
  <img width="420" alt="ScreenPact frontend screenshot 4" src="https://github.com/user-attachments/assets/497fb31f-58c8-4eb3-89c2-9ca9b577ad0f" />
</p>

## Product Idea

ScreenPact helps people reduce screen time through accountability instead of isolation. It collects a daily summary of device usage, compares progress inside private groups, ranks members by lower screen time, and lets each person set a personal goal. Only summarized usage is shared with the service; the app does not collect screen recordings, message contents, URLs, or keystrokes.

The core loop is simple:

1. Pair a device and grant usage access.
2. Sync a daily screen-time summary.
3. Compare progress with a private group.
4. Use goals and friendly competition to build lower-screen-time habits.

## What It Demonstrates

* React and Vite frontend development
* Express API design with validation, rate limiting, CORS, and session cookies
* Supabase Auth and Postgres persistence
* Device pairing with hashed device tokens
* Android native integration through a Capacitor plugin
* Daily usage aggregation and leaderboard ranking
* Vitest component tests and production builds

## Architecture

```text
React + Vite (port 8443)
        |
        | /api proxy in development
        v
Express API (port 8787)
        |
        +--> Supabase Auth
        +--> Supabase Postgres
        |
        +--> Android Capacitor plugin
                 |
                 v
        UsageStatsManager -> daily summary -> /api/usage/sync
```

### Main directories

| Path                    | Purpose                                               |
| ----------------------- | ----------------------------------------------------- |
| `src/`                  | React application and UI components                   |
| `server/index.js`       | Express API, auth, device pairing, and usage sync     |
| `server/supabase.js`    | Supabase admin and anonymous client creation          |
| `server/sql/schema.sql` | Tables, indexes, constraints, and RLS policies        |
| `android/`              | Capacitor Android project and native collector plugin |
| `docs/`                 | Collector specification, build order, and backlog     |
| `scripts/`              | API smoke checks and development utilities            |

## Run Locally

### Prerequisites

* Node.js 18+
* A Supabase project
* Android Studio and a configured Android SDK for native development

### Install

```bash
npm install
```

### Configure environment variables

Copy `.env.example` to `.env` and fill in the values:

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-publishable-key
SUPABASE_SERVICE_ROLE_KEY=your-server-only-secret
SESSION_SECRET=use-a-long-random-value
OWNER_EMAIL=optional-owner-email
OWNER_PASSWORD=optional-owner-password
```

`SUPABASE_SERVICE_ROLE_KEY` and `SESSION_SECRET` must remain server-side. Do not commit `.env` or expose either value in frontend code.

### Create the database schema

Run [server/sql/schema.sql](server/sql/schema.sql) in the Supabase SQL Editor. It creates the application tables, indexes, constraints, and row-level security policies.

### Start the application

Use two terminals:

```bash
# Terminal 1: API
npm run server
```

```bash
# Terminal 2: frontend
npm run dev
```

## API Overview

### Application data

| Method        | Endpoint                | Purpose                                   |
| ------------- | ----------------------- | ----------------------------------------- |
| `GET`         | `/api/health`           | Health check                              |
| `GET`         | `/api/leaderboard`      | Read the daily leaderboard                |
| `GET`         | `/api/my-stats`         | Read authenticated usage statistics       |
| `GET`         | `/api/profile`          | Read profile and achievements             |
| `GET` / `PUT` | `/api/settings`         | Read or update preferences and daily goal |
| `GET`         | `/api/privacy`          | Read privacy summary and requests         |
| `POST`        | `/api/privacy/request`  | Request export or deletion                |
| `POST`        | `/api/usage/sync`       | Store one daily usage summary             |
| `POST`        | `/api/usage/sync/batch` | Store up to 31 daily summaries            |

### Devices

| Method         | Endpoint                                | Purpose                                    |
| -------------- | --------------------------------------- | ------------------------------------------ |
| `GET` / `POST` | `/api/devices`                          | List or link devices                       |
| `DELETE`       | `/api/devices/:deviceId`                | Revoke a device                            |
| `POST`         | `/api/devices/pairing-code`             | Generate a 10-minute pairing code          |
| `POST`         | `/api/devices/pairing/consume`          | Exchange a pairing code for a device token |
| `POST`         | `/api/devices/:deviceId/permission`     | Record usage-access permission state       |
| `POST`         | `/api/devices/:deviceId/sync-heartbeat` | Record the last successful device sync     |

## Database Model

The schema contains 11 application tables:

* `sessions`: persistent Express sessions
* `profiles`: display and aggregate user data
* `leaderboard_daily`: daily ranking snapshots
* `daily_usage`: one usage total per user and date
* `app_usage`: summarized app usage per user and date
* `achievements`: profile achievements
* `user_settings`: notification, theme, and goal preferences
* `devices`: linked device metadata and token hashes
* `device_pairing_codes`: short-lived pairing codes
* `device_sync_logs`: intended sync history records
* `privacy_requests`: export and deletion requests

Supabase Auth maintains the account records in `auth.users`. The application does not store raw passwords, raw device tokens, message contents, URLs, keystrokes, or screen recordings.

## Android Collector

The native plugin is in [ScreenTimePlugin.java](android/app/src/main/java/com/screenpact/app/ScreenTimePlugin.java). The current flow is:

1. Generate a pairing code in the web app.
2. Consume the code on the Android device.
3. Store the returned device credential.
4. Request Android Usage Access permission.
5. Build today's summary from `UsageStatsManager`.
6. Submit the summary to `/api/usage/sync`.
7. Send a sync heartbeat.

Open the native projects with Capacitor when the required platform tooling is installed:

```bash
npx cap sync
npx cap open android
npx cap open ios
```

Android development requires Android Studio. iOS builds require macOS, Xcode, and CocoaPods.

## Testing and Quality Checks

```bash
npm test
npm run typecheck
npm run build
npm run lint
```

The repository currently includes tests for the basic application render and the lock-in interaction. The API smoke script can be run against a running backend with:

```bash
node scripts/api-smoke-test.mjs
```

The existing API smoke script expects a production-style CORS rejection for an untrusted origin. Development mode intentionally allows origins for local use, so run that check against a production-configured server.

## Security Notes

* Keep Supabase service-role credentials on the server only.
* Use a long random `SESSION_SECRET` in any deployed environment.
* Use HTTPS for deployed frontend, API, and Android API URLs.
* Review CORS origins before deployment.
* Device tokens should be stored using Android Keystore-backed storage before production release.
* The service worker should not cache authenticated `/api` responses.

## Current Limitations

* Background Android scheduling with WorkManager is not implemented.
* Offline queueing and exponential retry are not implemented.
* Privacy requests are recorded, but export/deletion fulfillment is not implemented.
* Group membership is currently represented by frontend demo state rather than a complete backend group model.
* The web UI and API-backed screens are still being consolidated.

## Project Status

ScreenPact is a learning and portfolio project focused on full-stack integration, device data collection, authentication, and privacy-aware usage summaries. The most valuable next milestones are API authorization tests, idempotent sync retries, production deployment, and validation with real testers.
