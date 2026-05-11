# Screenpact Bugs and Backlog

This document captures the current rough edges, unfinished work, and the main things still left to build in the app.

## Page map

- `/auth` -> owner sign-in page.
- `/app` -> main app shell with tabs for Leaderboard, My stats, Group, Profile, and Settings.
- `/privacy` -> privacy/data requests page.

Most of the current product gaps show up inside `/app`, especially the Group, Profile, and Settings tabs.

## Known bugs and rough edges

### Auth and session behavior
- `/auth`: The app is still effectively single-owner. Login is restricted to one email/password pair in the backend, so there is no real multi-user onboarding yet.
- `/auth` and `/app`: The server session store is in memory, so restarting the API clears active logins. That is fine for local dev, but it is a production bug if left as-is.
- `/auth` and `/app`: If the backend is restarted with a stale process still on the port, the frontend can appear broken even when the code is correct. That is a deployment/runtime issue that still needs guardrails.

### Settings and preferences
- `/app -> Settings`: Settings can get out of sync because the UI updates immediately before the save call finishes. If the save fails, the local toggle may stay changed while the backend never received it.
- `/app -> Settings`: Dark mode, notifications, and the daily goal currently fall back to `localStorage` when the API is unavailable. That makes local dev usable, but it means preferences can diverge from the server.
- `/app -> Settings`: The daily goal editor still uses a browser prompt. That works, but it is a rough user experience and not a polished settings flow.

### Group and invite flow
- `/app -> Group`: The invite link is still based on a hardcoded group code. There is no backend-backed group creation, join, or membership persistence yet.
- `/app -> Group`: The "Join another group" input is not wired to a real join endpoint. The button only shows a toast.
- `/app -> Group`: The "Create new group" button is also placeholder behavior.
- `/app -> Group` and `/auth`: The invite URL includes a query parameter, but the app does not currently consume it to auto-join or prefill onboarding.

### Privacy and account management
- `/privacy`: Privacy requests can be created, but there is no admin review console or request fulfillment workflow yet.
- `/privacy`: The app can store privacy requests, but it does not yet generate actual export bundles or process delete requests end to end.
- `/app -> Profile` and `/auth`: Account management is still minimal. There is no profile editing, email change flow, password reset flow, or account deletion UI.

### Usage sync and device collection
- `/app -> My stats`, `/app -> Leaderboard`, and backend sync endpoints: Usage sync only accepts summarized daily data. There is no native collector or browser extension that gathers real device/app usage automatically.
- `/app -> My stats` and `/app -> Profile`: The app does not yet have a real mobile collector, desktop agent, or OS-level integration for top-app tracking.
- `/app -> Settings` and backend sync endpoints: The batch sync endpoint exists, but there is no end-user sync UI showing pending uploads, retry state, or conflict handling.

## Unfinished work

### Product experience
- `/app -> Settings`: Replace the prompt-based goal editor with a proper settings control.
- `/app -> Settings`: Turn the settings section into a fully polished account/preferences screen.
- `/auth` and `/app`: Add better onboarding for first-time users after login.
- `/app -> Group`: Build a proper group management flow with real create/join/invite states.
- `/auth` and `/app -> Group`: Make invite links actually land users in a usable onboarding path.

### Auth and access control
- `/auth`: Replace the hardcoded owner login with a real authentication model if the app is meant for more than one account.
- `/auth`: Add password reset, session refresh, and account recovery flows.
- `/auth` and `/app`: Add stronger session persistence for production.

### Privacy and compliance
- `/privacy`: Build a request review dashboard for export/delete requests.
- `/privacy` and backend jobs: Implement export generation and request fulfillment.
- `/privacy`: Add clear status tracking for privacy requests so users can see what happened.

### Usage and analytics
- `/app -> My stats` and backend sync: Build a real usage collector instead of relying on manual or summary-only sync.
- `/app -> Settings` and backend sync: Add background sync, retry logic, and deduplication for uploads.
- `/app -> My stats` and `/app -> Leaderboard`: Add better reporting around missing days, partial uploads, and sync failures.

### Infrastructure and release readiness
- `/auth` and `/app`: Replace the in-memory session store with a persistent store.
- Entire app: Add production deployment config and secrets management.
- Entire app and backend: Add monitoring/alerting for login failures, API errors, and sync failures.
- Entire app and backend: Add a real CI check that runs build and API smoke tests before release.

## Things still left to build

### Core platform
- `/auth`: Multi-user auth and onboarding.
- `/app -> Group`: Persistent group membership.
- `/auth` and `/app -> Group`: Real invite acceptance flow.
- `/app -> Profile` and `/app -> Settings`: Real profile/account settings management.

### Data pipeline
- Backend plus `/app -> My stats`: Native usage collection.
- Backend plus `/app -> My stats` and `/app -> Settings`: Scheduled sync and retry support.
- Backend plus `/privacy`: Export and delete processing for privacy requests.
- Backend plus `/app -> Profile` and `/app -> My stats`: A more complete data model for daily usage, devices, and account history.

### Admin and ops
- `/privacy` and backend admin routes: Admin review tools for moderation and privacy requests.
- Entire app and backend: Production session store and deployment hardening.
- Entire app and backend: Monitoring, logs, and failure alerting.
- Entire app and backend: Better release validation beyond local smoke tests.

### UX polish
- `/app -> Group`, `/app -> Settings`, and `/privacy`: Replace placeholder interactions with real actions.
- `/app` and `/auth`: Remove remaining dev-style feedback where the user expects real behavior.
- `/auth` and `/app`: Make the app feel complete on first launch without requiring manual setup knowledge.

## Suggested priority order

1. Persistent auth/session storage.
2. Real group/invite flows.
3. Privacy request fulfillment workflow.
4. Native or background usage collection.
5. Settings and onboarding polish.
6. Production deployment, monitoring, and CI.

## Notes

- The app currently supports the main web shell, auth gate, privacy page, leaderboard views, and backend API basics.
- The biggest gap is that several flows still stop at UI or summary-only API level instead of being fully end-to-end.
- The current codebase is good enough for local development, but not yet complete for a multi-user production launch.
