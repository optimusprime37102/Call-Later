# Call Later

A professional Android-first React Native app (Expo + TypeScript + Expo Router) that helps you remember to call people back.

Schedule a callback, get a local notification at the chosen time, snooze if needed, then tap **Call Now** to open the native dialer.

## Features

- Home dashboard with **Overdue**, **Today**, and **Upcoming** reminders
- Schedule from contacts or enter a name/number manually
- Quick times: 15m, 30m, 1h, 3h, tonight, tomorrow, or custom date/time
- Optional notes
- Local notifications with **Call Now** and snooze actions (where supported)
- Snooze for 10 minutes, 30 minutes, or 1 hour
- Call Now opens the Android dialer via `tel:` (no direct-call or call-log permissions)
- Edit, reschedule, complete, and delete reminders
- Completed history screen
- Settings: light/dark/system theme, default snooze, notification toggle
- Offline-first: Expo SQLite + AsyncStorage, no backend or auth

## Stack

- Expo SDK 58
- Expo Router
- TypeScript (strict)
- Expo SQLite
- Expo Notifications
- Expo Contacts
- React Native Linking

## Project structure

```text
app/                 Expo Router screens
src/
  components/        UI + feature components
  context/           Theme + reminders providers
  db/                SQLite setup + repository
  hooks/             Notification response handling
  services/          Reminders, notifications, dialer, contacts, settings
  theme/             Design tokens
  types/             Strongly typed models
  utils/             Dates, phone helpers, ids
```

## Setup

```bash
npm install
```

Prerequisites for a USB phone: USB debugging on, `adb` on PATH, and `adb devices` showing the device.

### Run

```bash
npm run android:device          # USB device (Metro via adb reverse → 127.0.0.1:8081)
npm run android                 # emulator
npm run android:rebuild         # clean prebuild + reinstall on USB device
```

`android:device` tunnels Metro over USB (`adb reverse`) and sets `REACT_NATIVE_PACKAGER_HOSTNAME=127.0.0.1` so the phone does not try a LAN IP (`192.168.…`) that often fails with `ConnectException` / `ETIMEDOUT`. After a successful run, Metro should be `http://127.0.0.1:8081`.

For Expo Go only (limited native reliability):

```bash
npm start
```

## Expo Go vs development build

| Capability | Expo Go | Dev / production build |
|---|---|---|
| Create / edit / complete reminders | Yes | Yes |
| Local SQLite storage | Yes | Yes |
| Schedule local notifications | Yes | Yes |
| Open dialer (`tel:`) | Yes | Yes |
| Contact picker | Yes (permission required) | Yes |
| Notification action buttons | May vary by Expo Go / Android version | Recommended |
| Exact alarm reliability / battery exemptions | Limited by OS + Expo Go | Better with a dedicated build |

For the most reliable reminder delivery and notification actions on Android, use a native build on device:

```bash
npm run android:device
```

Or a clean rebuild:

```bash
npm run android:rebuild
```

## Permissions (V1)

Requested only when needed:

- **Contacts** — pick people to call back
- **Notifications** — schedule local reminders
- **Exact alarms / boot completed** — improve scheduled delivery on Android (best-effort)

Not requested in V1:

- Call log access
- Direct CALL_PHONE permission (the app opens the dialer instead)

## Android notification caveats

Exact-time delivery is **not guaranteed**.

Android may delay notifications when:

- Battery optimization / Doze is aggressive
- The manufacturer kills background apps
- Exact alarms are restricted
- The user denied notification permission

Tips for better reliability:

1. Allow notifications for Call Later
2. Disable battery optimization for the app (system settings)
3. Prefer a development or Play Store build over Expo Go for production use
4. Keep reminder times a bit ahead of when you truly need them

## Core flows to verify

1. Schedule a reminder 1–2 minutes ahead with a real number
2. Confirm it appears under Today/Upcoming
3. Wait for the notification (device unlocked first while testing)
4. Tap the notification → reminder detail opens
5. Use **Call Now** → dialer opens with the number
6. Use **Snooze** → scheduled time moves forward
7. Edit / reschedule / complete / delete
8. Toggle theme and default snooze in Settings
9. Kill and reopen the app — pending reminders still appear and notifications rehydrate when enabled

## Design

Emerald/teal accent on neutral surfaces, light and dark themes, compact reminder cards with a left accent edge, and clear empty states. Safe areas and Android navigation spacing are handled via `react-native-safe-area-context`.

## License

Private project — all rights reserved.
