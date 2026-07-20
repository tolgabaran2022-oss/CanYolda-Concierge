# Web Release Checklist
**Date:** 2026-07-20

---

## Build

| Item | Status |
|---|---|
| `expo export --platform web` | ⚠️ NOT TESTED — Metro bundler reached ~81% but timed out in Replit sandbox (no errors visible) |
| Web bundler config | metro (set in app.json) | ✅ |
| react-native-maps web stub | ✅ metro.config.js resolver override present |
| EXPO_PUBLIC_DOMAIN env var | ✅ Required for web API calls; served via Replit proxy |

## Browser Tests

| Test | Status |
|---|---|
| Chrome - initial load | NOT TESTED |
| Register flow | NOT TESTED |
| Login flow | NOT TESTED |
| Logout / session restore | NOT TESTED |
| Forgot password | NOT TESTED |
| Map screen | NOT TESTED |
| Evcilim | NOT TESTED |
| Sahiplendirme | NOT TESTED |
| Mesajlar | NOT TESTED |
| Premium paywall | NOT TESTED |
| Responsive 320px / 375px / 390px | NOT TESTED |

## Known Limitations

| Item | Detail |
|---|---|
| Push notifications on web | expo-notifications does not support web push — expected behavior |
| RevenueCat IAP on web | react-native-purchases does not work on web — expected |
| react-native-maps on web | CJS stub returns null component — expected |
| Camera on web | expo-image-picker supports file input on web — untested |

## Verdict: NOT TESTED
Web build verification requires local development environment or CI pipeline. Replit sandbox does not have sufficient CPU/memory for expo export within the test timeout.
