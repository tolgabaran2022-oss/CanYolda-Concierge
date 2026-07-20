---
name: Push notification system
description: Push notification architecture for CanYoldaşı — packages, DB tables, API routes, mobile service, AuthContext integration
---

## Architecture

**Packages installed:**
- `expo-notifications@57.0.6` (SDK54 expected ~0.32.17 but 57 works; not fully supported in Expo Go — needs dev build for real push)
- `expo-device@57.0.1` (SDK54 expected ~8.0.10)

**Why the version gap doesn't break runtime:** Expo Go shows a warning but the SDK still loads. Push token registration is guarded by `Device.isDevice` so it silently skips in Expo Go / simulator.

## DB Tables (lib/db/src/schema/index.ts)
- `push_tokens` — stores Expo push tokens per user+device; `enabled` flag deactivated on logout or DeviceNotRegistered response
- `notification_preferences` — per-user boolean flags: `generalEnabled`, `messagesEnabled`, `adoptionEnabled`, `remindersEnabled`, `emergencyEnabled`

## Backend Routes (artifacts/api-server/src/routes/pushTokens.ts)
- `POST /api/push-tokens` — register token (upsert by expo_push_token)
- `DELETE /api/push-tokens` — deactivate token on logout
- `GET /api/push-tokens/preferences` — fetch user preferences (returns defaults if none)
- `PATCH /api/push-tokens/preferences` — upsert partial updates
- Registered in routes/index.ts via `router.use(pushTokensRouter)`

## Push Service (artifacts/api-server/src/lib/pushService.ts)
- `sendPushNotification(userId, payload)` — fetches active tokens, checks preferences, calls Expo Push API (https://exp.host/--/api/v2/push/send), auto-deactivates DeviceNotRegistered tokens

## Mobile Service (artifacts/mobile/services/notifications.ts)
- `setupAndroidChannels()` — creates 5 Android notification channels (default, messages, adoption, reminders, emergency)
- `requestNotificationPermission()` — uses type cast `as _PermResult` because expo-notifications@57 types don't expose `granted`/`canAskAgain` directly from `NotificationPermissionsStatus`
- `registerForPushNotifications(authToken)` — full flow: channels + permission + token + backend registration
- `deregisterPushToken(authToken)` — called on logout to disable the device token
- Caches token in AsyncStorage under `@canyoldasi:pushToken`

## AuthContext integration
- `login()` and `register()`: call `registerForPushNotifications(token).catch(() => {})` after setToken
- `logout()`: reads stored JWT from AsyncStorage, calls `deregisterPushToken` before clearing credentials

## account.tsx additions
- "Abonelik" section: platform-aware link (iOS → apps.apple.com/account/subscriptions, Android → play.google.com, Web → Alert)
- "Bildirimler" section: 5 Switch toggles backed by GET/PATCH /api/push-tokens/preferences; sub-toggles dim when generalEnabled=false

## expo-device Metro ENOENT
Installing expo-device@57 creates a `_tmp_NNNNN` dir that Metro watches; after install the dir may not exist. Fix: `mkdir -p <missing_path>` then restart the expo workflow.

**Why:** Same issue as general Metro ENOENT pattern — see metro-watcher-enoent.md
