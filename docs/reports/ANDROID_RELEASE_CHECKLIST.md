# Android Release Checklist
**Date:** 2026-07-20

---

## Static Review (app.json)

| Item | Value | Status |
|---|---|---|
| Package name | com.canyoldasi.app | ✅ |
| Version name | 1.0.0 | ✅ |
| Version code | 1 (EAS autoIncrement in production) | ✅ |
| Adaptive icon | foregroundImage + backgroundColor | ✅ |
| Orientation | portrait | ✅ |

## Permissions

| Permission | Status |
|---|---|
| ACCESS_FINE_LOCATION | ✅ |
| ACCESS_COARSE_LOCATION | ✅ |
| CAMERA | ✅ |
| VIBRATE | ✅ |
| android.permission.POST_NOTIFICATIONS | ✅ (Android 13+ required) |
| RECORD_AUDIO | ❌ Blocked in blockedPermissions ✅ |

## EAS Build Config

| Item | Value | Status |
|---|---|---|
| Production distribution | store | ✅ |
| Android buildType | app-bundle | ✅ |
| autoIncrement | true | ✅ |

## RevenueCat IAP (Android)

| Item | Status |
|---|---|
| EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY | ❌ NOT SET — critical before submission |
| Google Play Billing dependency | Handled by react-native-purchases |
| Play Billing Library v5+ | STATIC REVIEW — react-native-purchases@10.x uses BL5 |

## Notification Icon

| Item | Status |
|---|---|
| expo-notifications icon set in app.json | ✅ — ./assets/images/icon.png |
| Color | ✅ — #7C45D9 |
| Notification channel | ✅ — "default" |

## Physical Device Tests

| Test | Status |
|---|---|
| Login / Register on Android 13+ | **BLOCKED** |
| Push notification permission dialog (Android 13+) | **BLOCKED** |
| Push delivery | **BLOCKED** |
| Deep link from notification | **BLOCKED** |
| Camera | **BLOCKED** |
| Location | **BLOCKED** |
| IAP purchase | **BLOCKED** |

## Google Play Console Requirements

| Item | Status |
|---|---|
| App description (TR) | ❌ NOT DONE |
| Screenshots (phone, 7", 10") | ❌ NOT DONE |
| Feature graphic | ❌ NOT DONE |
| Data safety form | ❌ NOT DONE |
| Privacy policy URL | ❌ NOT DONE |
| Account deletion URL | ❌ NOT DONE |
| Target API level | STATIC REVIEW — Expo SDK 54 targets API 35 ✅ |
| Billing declaration | ❌ NOT CONFIRMED |

## Verdict: NOT READY
Physical device tests BLOCKED. Play Console metadata missing. EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY not set.
