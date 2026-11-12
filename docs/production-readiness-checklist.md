# ScreenPact Production Readiness Checklist

Legend: `[x]` complete and validated, `[ ]` not started, `[~]` blocked or intentionally deferred with an issue recorded.

## Active Product Integration

- [x] Connect profile screen to `GET /api/profile`. Profile identity, rank, averages, and achievements are live; device cards remain deferred.
- [x] Connect settings screen to `GET/PUT /api/settings` with save failure rollback.
- [x] Add an active logout control using `POST /api/auth/logout`.
- [x] Connect group management to the backend-backed membership and invite flows. Supabase mode loads, creates, joins, renames, and leaves groups; local demo fallback remains available without Supabase.
- [x] Replace active-shell group placeholders with inline create/join/rename/leave controls and invite-code copy feedback.
- [x] Add sync status and queued-upload retry UI to My Stats. Native Android exposes pending retry state; the web shell shows server heartbeat status.

## Security and Reliability

- [x] Prevent the service worker from caching `/api` responses. Validated with the production build.
- [x] Add CSRF protection for cookie-authenticated state changes. Session-backed token cookie/header validation is implemented and covered by rejected/accepted mutation tests.
- [~] Make usage sync atomic across daily usage, app usage, leaderboard, and profile updates. RPC migration and rollback/idempotency SQL test are prepared; live Supabase validation is blocked by unavailable database credentials.
- [~] Add WorkManager scheduling for pending Android sync retries. Skipped: Android build tooling/JDK is unavailable in this environment.
- [~] Move Android device-token storage to Android Keystore. Skipped: Android build tooling/JDK is unavailable for validation.
- [~] Add direct Supabase RLS authorization tests. Skipped: requires a configured test Supabase project and separate test roles; no credentials are available.

## Testing and Operations

- [~] Add browser end-to-end coverage for authentication and live leaderboard loading. Skipped: Playwright is configured but no stable test server/auth fixture or real database fixture exists.
- [x] Add CI for typecheck, lint, build, frontend tests, and API authorization tests. Added `.github/workflows/ci.yml`; local Phase 1 commands all pass.
- [~] Add structured logs, sync metrics, and failure monitoring. Skipped: no deployment/monitoring target is defined in the repository.
- [~] Establish a real Supabase deployment smoke test with test accounts. Skipped: requires external Supabase credentials and accounts.
- [~] Complete privacy export/deletion fulfillment. Skipped: requires an admin/job workflow and product decisions not present in the codebase.
- [~] Complete iOS Screen Time integration if iOS remains a supported target. Skipped: requires macOS, Xcode, entitlements, and Apple review configuration.

## Issue Log

- Group backend: migration and routes are present; live Supabase validation still requires configured credentials.
- CSRF: session-backed token/header contract is implemented and tested; future cookie-authenticated mutations must use it.
- Atomic sync and RLS tests: RPC migration/test are prepared, but live execution requires a disposable Supabase test database and credentials.
- Android WorkManager/Keystore: Java/JDK and Android validation tooling are unavailable in this environment.
- Browser E2E: no stable authenticated test fixture or deployment target is defined.
- Monitoring/deployment/privacy/iOS: require external infrastructure, product decisions, or platform credentials.
- Phase 1 validation: `typecheck` passed, `lint` passed with seven existing Fast Refresh warnings, `build` passed, frontend tests passed (2 files/2 tests), and `test:api-auth` passed (13 checks).
- Phase 2 validation: CSRF-aware `typecheck`, `lint`, `build`, and frontend tests passed; `test:api-auth` passed with 14 checks including the CSRF guard.
- Phase 3 validation: server typecheck and `test:api-auth` passed; atomic RPC migration and rollback/idempotency SQL test have diagnostics but live Supabase execution is blocked.
- Phase 4 validation: typecheck passed, production build passed, frontend tests passed (2 files/2 tests), and `test:api-auth` passed (14 checks).
