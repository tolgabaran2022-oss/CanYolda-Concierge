---
name: EAS build & app.json release config
description: Production build config decisions — buildType, submit env vars, permission cleanup, versioning.
---

## Rules

- `eas.json` production Android → `buildType: "app-bundle"` (NOT "apk"). Google Play requires AAB.
- `eas.json` submit iOS uses env vars `$APP_STORE_CONNECT_APP_ID` / `$APPLE_TEAM_ID` — never hardcoded placeholders.
- Top-level `buildNumber` in app.json is non-standard and ignored by Expo — keep buildNumber only under `ios`.
- `ios.buildNumber` format: simple integer string e.g. `"1"` (EAS autoIncrement works best with this).

**Why:** APK format is rejected by Google Play for production; hardcoded placeholder strings cause `eas submit` to fail with a validation error.

## Permissions kept (app.json)

iOS infoPlist (3 keys):
- `NSLocationWhenInUseUsageDescription` — map/location features
- `NSPhotoLibraryUsageDescription` — image upload
- `NSCameraUsageDescription` — photo capture

Android permissions (4):
- `ACCESS_FINE_LOCATION`, `ACCESS_COARSE_LOCATION` — map
- `CAMERA` — photo capture
- `VIBRATE` — expo-haptics

## Permissions removed (were never used)

iOS: `NSFaceIDUsageDescription`, `NSMicrophoneUsageDescription`, `NSUserTrackingUsageDescription`, `NSLocationAlwaysUsageDescription`, `NSLocationAlwaysAndWhenInUseUsageDescription`, `NSPhotoLibraryAddUsageDescription`

Android: `READ_EXTERNAL_STORAGE`, `WRITE_EXTERNAL_STORAGE`, `RECEIVE_BOOT_COMPLETED`

**Why:** App has no biometrics, microphone, ATT, background location, or save-to-gallery. Leaving unused permissions in causes App Review rejection and Google Play policy flags.

## Still required before store submission (manual steps)

1. Set `APP_STORE_CONNECT_APP_ID` + `APPLE_TEAM_ID` as EAS secrets or CI env vars
2. Set `EXPO_PUBLIC_REVENUECAT_IOS_API_KEY` + `EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY`
3. Set `REVENUECAT_WEBHOOK_AUTH_TOKEN`
4. Add Privacy Policy URL + Terms of Service URL (required by both stores)
5. Set `extra.eas.projectId` in app.json (required for EAS Update if ever enabled)
6. Create dedicated adaptive icon foreground (transparent PNG, no padding) for better Android appearance
7. Create proper splash screen asset separate from app icon
