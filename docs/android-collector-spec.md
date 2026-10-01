# Android Collector Spec (Phase 1)

This is the first native collector implementation target, aligned with the priority roadmap.

## Goal

Collect daily Android app-usage summary data from device settings permissions and sync it to backend endpoints securely with a device token.

## Native permission requirement

- Android permission path: Usage Access (UsageStatsManager)
- User action needed:
  - Open Android settings screen for usage access
  - Grant usage access to the ScreenPact app

## Required backend endpoints

- `POST /api/devices/pairing/consume`
  - exchange pairing code for `deviceToken`
- `POST /api/devices/:deviceId/permission`
  - send `requested|granted|denied|restricted`
- `POST /api/devices/:deviceId/sync-heartbeat`
  - report collector heartbeat
- `POST /api/usage/sync`
  - send summarized daily usage payload

Auth header for collector:

- `X-Device-Token: <deviceToken>`
- or `Authorization: Device <deviceToken>`

## Collector flow (Android-first)

1. Pair device using code from web app.
2. Store returned `deviceToken` securely in Android Keystore-backed storage.
3. Mark permission status `requested`.
4. Launch Usage Access settings screen.
5. Re-check access:
   - if granted -> send `granted`
   - else -> send `denied` or `restricted`
6. Build summary payload for current date:
   - `totalMinutes`
   - `topApp`
   - top N `apps` list
7. Send `/api/usage/sync`.
8. Send `/api/devices/:deviceId/sync-heartbeat`.
9. Repeat on schedule (WorkManager), with retry/backoff on failure.

## Data mapping rules

- Convert foreground usage to minutes and round to whole minutes.
- Ignore zero-minute rows.
- Keep top app and top N apps only (summary model).
- Cap daily total to 1440.

## Retry and resilience

- Queue sync payloads when offline.
- Retry with exponential backoff.
- Keep idempotent behavior by syncing by date.

## Minimum telemetry to log

- permission check result
- sync success/failure
- HTTP status + error message for failed sync
- last successful sync timestamp

## Deliverables checklist

- [x] Android module requests Usage Access permission (native plugin method + settings deep link)
- [x] Pairing code consume implemented on Android (native plugin method)
- [x] Secure token storage (SharedPreferences skeleton)
- [x] Daily summary extraction from UsageStats (native plugin method)
- [x] `/api/usage/sync` call with device token (native plugin method)
- [x] heartbeat endpoint call (native plugin method)
- [ ] WorkManager background retry
- [ ] basic crash + sync logging
