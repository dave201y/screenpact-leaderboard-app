# Mobile Build Order (Priority-First)

This follows the exact order we agreed on, with status tracking.

## 1. Add Capacitor shell for Android + iOS
- Status: Done
- Added:
  - `capacitor.config.ts`
  - `@capacitor/core`, `@capacitor/android`, `@capacitor/ios`, `@capacitor/cli`
  - scripts for `cap:add`, `cap:sync`, and `cap:open`
-  - native projects added: `android/` and `ios/`
- Notes:
-  - iOS build/tooling steps still require Xcode + CocoaPods on macOS.

## 2. Implement pairing code consume endpoint + device token auth
- Status: Done
- Implemented on backend:
  - `POST /api/devices/pairing/consume`
  - device token issuance + hashed storage
  - token auth via `X-Device-Token` and `Authorization: Device <token>`

## 3. Build Android collector first
- Status: In progress (active priority)
- Goal:
  - request Usage Access permission on Android
  - call permission endpoint and heartbeat endpoint
  - send daily sync payloads via existing usage sync endpoint
- Needed implementation outputs:
  - native permission flow
  - foreground/background sync worker
  - secure token storage

## 4. Build iOS collector with entitlement path
- Status: Pending
- Goal:
  - implement Screen Time/Family Controls access path
  - map iOS permission states into app permission status endpoints
- Notes:
  - requires Apple entitlement and review-sensitive implementation

## 5. Add background sync + retry + telemetry
- Status: Pending
- Add:
  - offline queue with retry backoff
  - sync failure metrics
  - heartbeat reliability checks

## 6. Finish store compliance and release
- Status: Pending
- Required:
  - privacy disclosures and permission rationale
  - App Store / Play Store compliance fields
  - signing, release build pipeline, and real-device QA
