# Android ScreenTime Plugin API

Plugin name: `ScreenTime`

## Available Methods

- `setApiBaseUrl({ apiBaseUrl })`
- `getCollectorState()`
- `clearPairing()`
- `checkUsageAccess()`
- `openUsageAccessSettings()`
- `consumePairingCode({ code, name?, platform? })`
- `updatePermissionStatus({ status })`
- `sendSyncHeartbeat()`
- `syncTodayUsage()`

## Quick Setup

```ts
import { registerPlugin } from "@capacitor/core";
const ScreenTime = registerPlugin("ScreenTime");

// Example
await ScreenTime.setApiBaseUrl({ apiBaseUrl: "http://10.0.2.2:8787" });
await ScreenTime.consumePairingCode({ code: "...", platform: "android" });
```

## Notes

- Emulator: `http://10.0.2.2:8787`
- Physical device: `http://192.168.x.x:8787`
