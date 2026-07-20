# iOS Release Checklist
**Date:** 2026-07-20

---

## Static Review (app.json)

| Item | Value | Status |
|---|---|---|
| Bundle ID | com.canyoldasi.app | ✅ |
| Display Name | CanYoldaşı | ✅ |
| Version | 1.0.0 | ✅ |
| Build Number | "1" (EAS autoIncrement in production) | ✅ |
| supportsTablet | true | ✅ |
| Orientation | portrait | ✅ |
| aps-environment entitlement | production | ✅ |
| ITSAppUsesNonExemptEncryption | false | ✅ |
| CFBundleDevelopmentRegion | tr | ✅ |
| CFBundleLocalizations | tr, en | ✅ |
| Icon | ./assets/images/icon.png | ✅ |
| Splash image | ./assets/images/icon.png | ✅ |
| Deep link scheme | com.canyoldasi.app, mobile | ✅ |

## Permissions (NSUsageDescription)

| Permission | Description Set | Status |
|---|---|---|
| NSLocationWhenInUseUsageDescription | ✅ set | ✅ |
| NSPhotoLibraryUsageDescription | ✅ set | ✅ |
| NSCameraUsageDescription | ✅ set | ✅ |
| NSMicrophoneUsageDescription | Not set | ✅ (no audio) |
| NSContactsUsageDescription | Not set | ✅ (no contacts) |
| NSBluetoothAlwaysUsageDescription | Not set | ✅ (no BT) |
| RECEIVE_BOOT_COMPLETED | Removed | ✅ |

## Plugins

| Plugin | Status |
|---|---|
| expo-router | ✅ |
| expo-font | ✅ |
| expo-location | ✅ |
| expo-image-picker | ✅ |
| expo-splash-screen | ✅ |
| expo-notifications | ✅ — with icon/color config |
| react-native-maps | ✅ NOT in plugins (correct — crashes otherwise) |

## EAS Build Config

| Item | Value | Status |
|---|---|---|
| Production distribution | store | ✅ |
| iOS buildType | release | ✅ |
| autoIncrement | true | ✅ |
| Apple Team ID | $APPLE_TEAM_ID env var | ⚠️ Must be set |
| App Store Connect App ID | $APP_STORE_CONNECT_APP_ID env var | ⚠️ Must be set |

## RevenueCat IAP (iOS)

| Item | Status |
|---|---|
| EXPO_PUBLIC_REVENUECAT_IOS_API_KEY | ❌ NOT SET — critical before submission |
| Legacy EXPO_PUBLIC_REVENUECAT_API_KEY | ⚠️ test_ key — not production |
| In-App Purchase capability | Must be enabled in App Store Connect |
| Offering: canyoldasi_pet_premium | STATIC REVIEW — created in RC dashboard |
| Offering: canyoldasi_boost | STATIC REVIEW — created in RC dashboard |

## Physical Device Tests

| Test | Status |
|---|---|
| Login / Register | **BLOCKED** — requires dev build |
| Push notification permission dialog | **BLOCKED** |
| Push delivery (foreground/background/terminated) | **BLOCKED** |
| Deep link from notification | **BLOCKED** |
| Camera permission | **BLOCKED** |
| Location permission | **BLOCKED** |
| IAP purchase flow | **BLOCKED** |
| Restore purchases | **BLOCKED** |

## App Store Connect Requirements

| Item | Status |
|---|---|
| App description (TR) | ❌ NOT DONE |
| Screenshots (6.5", 5.5", iPad) | ❌ NOT DONE |
| Privacy policy URL | ❌ NOT DONE |
| Terms of service URL | ❌ NOT DONE |
| Privacy Nutrition Labels | ❌ NOT DONE |
| Review account (test credentials) | ❌ NOT DONE |
| Review notes | ❌ NOT DONE |
| IAP products in App Store Connect | ❌ NOT CONFIRMED |

## Verdict: NOT READY
Physical device tests BLOCKED. App Store Connect metadata missing. EXPO_PUBLIC_REVENUECAT_IOS_API_KEY not set.
