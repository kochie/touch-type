# Notification System: Building and Testing

This document describes how the Touch Typer notification system works and how to build and test it on **Windows**, **macOS**, and **Linux**.

## Overview

The app supports **practice reminders** that can be scheduled by time and weekday. Delivery differs by platform:

| Platform | Mechanism | Requires | Notes |
|----------|------------|----------|--------|
| **macOS** | Apple Push Notification Service (APNS) | Signed app, provisioning profile | Server sends at scheduled time; works when app is in tray or closed. |
| **Windows** | Windows Notification Service (WNS) | APPX/MSIX (Store) build | Server sends at scheduled time. NSIS builds use local fallback only. |
| **Linux** | Local cron | None | App adds a crontab entry; no server, no sign-in required. |

- **macOS / Windows (Store)**: The app registers a device token (APNS) or channel URI (WNS) with your backend. A scheduled job (e.g. Supabase Edge Function) sends push notifications at the user’s chosen time.
- **Linux**: The app installs a cron job that launches the app with a deep link at the chosen time (local only).
- **Windows (NSIS)**: Same as Linux conceptually—local scheduling only (no WNS). The UI may still show “push” copy; behavior is local.

---

## Architecture (Desktop App)

- **`electron-src/notification-scheduler.ts`**  
  - IPC handlers: `registerPushNotifications`, `unregisterPushNotifications`, `scheduleNotification`, `cancelNotification`, `requestNotificationPermission`, `getNotificationStatus`, `getPushPlatform`, `isPushSupported`.  
  - macOS/Windows: delegates to push registration; Linux: installs/removes cron.  
  - When a push is received, shows a system notification and/or forwards to renderer via `push-notification` and handles click (e.g. bring app to front, deep link to practice).

- **`electron-src/push-registration.ts`**  
  - **macOS**: `pushNotifications.registerForAPNSNotifications()` (Electron).  
  - **Windows**: WNS channel via `electron-src/wns-channel.ts` (APPX only).  
  - **Linux**: No push; returns success and relies on scheduler’s cron path.

- **`electron-src/wns-channel.ts`**  
  - Creates WNS channel using `@aspect/windows-push` (or fallback). Only used when running as APPX/MSIX.

- **Renderer**  
  - `renderer/src/components/settings/NotificationSettings.tsx`: UI for enabling notifications, time, days, and message. Calls `window.electronAPI.registerPushNotifications()` / `scheduleNotification` / `cancelNotification` etc.  
  - Push tokens/channel URIs are sent to your backend by the app (implementation in your API).

---

## Building for Each Platform

### Prerequisites (all platforms)

- Node.js 18+
- pnpm  
- From repo root: `pnpm install` and `pnpm build` (renderer + Electron main).

### macOS

- **For APNS (push)**: Code-signed build with a provisioning profile that includes the Push Notifications capability.
- **Development (no push)**: Unsigned or signed without proper provisioning; APNS will not work; app shows a clear error and you can test UI/local behavior.

Commands (see also `DEVELOPMENT.md`):

```bash
# Unsigned local build (no APNS)
pnpm package:mac-unsigned

# MAS development build (APNS with dev provisioning profile)
# Requires build/mas-touchtyper-dev.provisionprofile and Apple Development cert
pnpm package:mac-mas-dev

# Full release (default + MAS)
pnpm build+release:mac
```

Output: `dist/mac-arm64/Touch Typer.app` (or `dist/mac/` for x64, `dist/mac-universal/` for universal).

### Windows

- **NSIS (portable/installer)**: No WNS; only local scheduling (if implemented for Windows).  
  ```bash
  pnpm build && electron-builder --win --x64
  ```
- **APPX/MSIX (Store / WNS)**: Required for push.  
  ```bash
  pnpm build && electron-builder --win --appx
  ```
- Config in `electron-builder.ts`: `win.target` includes both `nsis` and `appx`. Build the appx target for WNS testing.

Output:  
- NSIS: `dist/*.exe` (or in `dist/win-unpacked`).  
- APPX: under `dist/` (e.g. `.msix` / `.appx`).

### Linux

- No code signing or store requirement for notifications; cron is user-level.
- Build as needed for your distribution (AppImage, snap, etc.):

```bash
pnpm build && electron-builder --linux
```

Cron is installed in the current user’s crontab when the user enables notifications in the app.

---

## Testing the Notification System

### macOS

1. **UI and local behavior (unsigned / dev)**  
   - Run `pnpm package:mac-unsigned` and open the app.  
   - Go to Settings → Notifications, set time and days, enable.  
   - You should see the “APNS requires a signed build” (or similar) message; toggling and time/day changes should work.  
   - No push will be delivered until you use a signed build and register with your backend.

2. **Push (APNS) end-to-end**  
   - Build with a profile that has Push Notifications: e.g. `pnpm package:mac-mas-dev` (or a signed non-MAS build with the right entitlements).  
   - Open the app, sign in if your backend requires it, enable notifications and set a time.  
   - Confirm the app registers and sends the device token to your backend (check backend logs or DB).  
   - **Send a test push** using your backend’s test script (e.g. in `touch-type-backend`):  
     ```bash
     cd /path/to/touch-type-backend
     export APNS_KEY_ID=… APNS_TEAM_ID=… APNS_PRIVATE_KEY="$(cat path/to/AuthKey_xxx.p8)"
     # Use sandbox for development builds
     export APNS_SANDBOX=true
     deno run --allow-net --allow-env --allow-read scripts/test-push-notification.ts <device_token>
     ```  
   - You should get a system notification; clicking it should focus the app and optionally open practice (deep link).

3. **Tray**  
   - Minimize to tray; trigger a test push. Notification should still appear and clicking it should restore the window.

### Windows

1. **NSIS build**  
   - Install/run the NSIS build. Enable notifications in settings.  
   - Only local scheduling (if implemented) can be tested; no WNS.

2. **APPX build (WNS)**  
   - Build the appx and install (sideload or Store).  
   - Enable notifications; the app should register a WNS channel URI with your backend.  
   - Use your backend’s scheduled job or test path to send a WNS notification to that channel URI.  
   - Verify toast appears and click behavior (e.g. open app, deep link).

3. **Tray**  
   - On first minimize to tray, the app may show a balloon explaining that reminders will still be delivered (see `electron-src/tray.ts`).

### Linux

1. **Cron-based reminders**  
   - Build and run the app (e.g. from `dist/` or `pnpm dev`).  
   - Enable notifications in settings and set time and days.  
   - Check that a crontab entry is added:  
     ```bash
     crontab -l | grep TouchTyperReminder
     ```  
   - You should see a line like: `MM HH * * DDD /path/to/app "touchtyper://practice?duration=…" # TouchTyperReminder`.  
   - Either wait for the scheduled time or temporarily add a line with a time 1–2 minutes in the future (same command format), then confirm the app launches and the deep link works.  
   - Disable notifications and run `crontab -l` again; the TouchTyperReminder line should be gone.

2. **Permission**  
   - If your environment doesn’t support `Notification.isSupported()`, the in-app notification UI may still work; actual display depends on the system (e.g. GNOME, KDE).

---

## Quick Test Matrix

| Platform   | Build type      | What to test |
|-----------|-----------------|---------------|
| macOS     | Unsigned        | Settings UI; enable/disable; time/days; expect “signed build required” for push. |
| macOS     | Signed (mas-dev) | Register for push; get device token in backend; send test APNS; tray + click. |
| Windows   | NSIS            | Settings UI; local scheduling only (if implemented). |
| Windows   | APPX            | Register for push; get channel URI; send test WNS; tray + click. |
| Linux     | Any             | Enable notifications → crontab added; disable → crontab removed; trigger time → app launches. |

---

## Troubleshooting

### macOS

- **“Bundle identifier mismatch” / APNS fails**  
  - APNS only works with a signed build and a provisioning profile that includes push. Use `package:mac-mas-dev` or a signed Developer ID build with the correct entitlements and profile.

- **No notification when app is in tray**  
  - Ensure the app is not quit (only minimized to tray). Push is received by the running process; if the process exits, no delivery until next launch.

- **Development vs production APNS**  
  - Development builds must use the **sandbox** APNS endpoint; your backend test script should use `APNS_SANDBOX=true` when sending to dev builds.

### Windows

- **“WNS requires Windows Store packaging”**  
  - WNS is only available when the app is built and run as APPX/MSIX. Use `electron-builder --win --appx` and install that package.

- **No toast**  
  - Confirm the app is registered and the backend is sending to the correct channel URI. Channel URIs can expire; re-register if needed.

### Linux

- **Cron not firing**  
  - Check `crontab -l` and that the path to the executable is correct and the deep link is quoted.  
  - Ensure cron daemon is running (e.g. `systemctl status cron` or equivalent).

- **App doesn’t open from cron**  
  - Some environments require a display/session; the cron job runs as the user but may not have `DISPLAY` set. You may need to set `DISPLAY=:0` (or appropriate value) in the cron entry or wrap the launch in a script that sets the environment.

### All platforms

- **Token/URI not reaching backend**  
  - Check network and backend logs; ensure the app is calling your API with the token or channel URI after registration.  
  - For macOS, ensure the backend uses the correct APNS environment (sandbox vs production) for the build type.

---

## Server-Side Scheduling (Reference)

Scheduled delivery for macOS and Windows is done by your backend, not the desktop app. The desktop app only:

- Registers for push (APNS token or WNS channel URI).  
- Sends that token/URI (and user id) to your API.  
- Receives push and shows a notification.

Example: the `touch-type-backend` repo includes a Supabase Edge Function `send-notifications` that queries users with `notifications_enabled` and matching `notification_time` and `notification_days`, then sends via APNS and WNS. For testing APNS from the backend, use `scripts/test-push-notification.ts` with the device token obtained from the app (see “macOS → Push (APNS) end-to-end” above).

---

## Summary

- **Build**: macOS signed (mas-dev or release) for APNS; Windows APPX for WNS; Linux any build for cron.  
- **Test**: Use backend test script for APNS (and equivalent for WNS), and crontab + a near-future time for Linux.  
- **Docs**: `DEVELOPMENT.md` for general build and signing; this file for notification-specific build and test steps on Windows, macOS, and Linux.
