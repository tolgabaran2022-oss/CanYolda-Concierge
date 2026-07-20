# Open Blockers — Final
**Date:** 2026-07-20  
**App:** CanYoldaşı v1.0.0

---

## P0 — Submission Blockers (must resolve before any store submission)

| # | Blocker | Platform | Action Required | Owner |
|---|---|---|---|---|
| P0-1 | Physical device push notification test | iOS + Android | Development build + physical device | App developer |
| P0-2 | EXPO_PUBLIC_REVENUECAT_IOS_API_KEY not set | iOS | Set live RC iOS key before EAS production build | Developer |
| P0-3 | EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY not set | Android | Set live RC Android key before EAS production build | Developer |
| P0-4 | REVENUECAT_WEBHOOK_AUTH_TOKEN not set in deployment | Backend | Set in Replit deployment secrets | Developer |
| P0-5 | App Store Connect metadata missing | iOS | Description, screenshots, privacy policy, review notes | Developer |
| P0-6 | Google Play Console metadata missing | Android | Screenshots, data safety, privacy policy | Developer |
| P0-7 | IAP products not confirmed in App Store Connect | iOS | Create/confirm $rc_monthly and $rc_annual products | Developer |
| P0-8 | IAP products not confirmed in Google Play | Android | Create/confirm subscription products | Developer |
| P0-9 | Apple Team ID / App Store Connect App ID env vars | iOS | Set $APPLE_TEAM_ID and $APP_STORE_CONNECT_APP_ID for EAS submit | Developer |
| P0-10 | RevenueCat API key is test_ prefix | Both | Get live keys from RC dashboard before EAS production build | Developer |

---

## P1 — Important (should fix before launch)

| # | Item | Platform | Detail |
|---|---|---|---|
| P1-1 | Fake engagement stats in My Listings | All | mockViews/mockFavs/mockMsgs — deterministic hash functions, not real counts. Fixed in this audit. |
| P1-2 | Expo push receipt polling not implemented | Backend | Delivery failures not confirmed. Implement receipt check worker. |
| P1-3 | Web build not verified | Web | expo export times out in Replit sandbox. Verify in local or CI environment. |
| P1-4 | Google OAuth end-to-end test | All | Requires Google OAuth callback URL configured |
| P1-5 | Apple OAuth end-to-end test | iOS | Requires Apple Sign-in configured |
| P1-6 | Password reset email delivery | All | Requires RESEND_API_KEY set; email not tested end-to-end |
| P1-7 | expo-notifications not in Expo Go | Both | Use development build for all push notification testing |
| P1-8 | Animal POST requires imageUrl (required field) | All | Mobile upload flow must call /api/upload first; STATIC REVIEW only |
| P1-9 | expo-device version mismatch warning | All | expo-doctor reports expected: ~8.0.10, got 57.0.1 |

---

## P2 — Nice to Have

| # | Item |
|---|---|
| P2-1 | Expo push receipt polling worker |
| P2-2 | Real view/favorite/message counts for adoption listings |
| P2-3 | App Store/Play Store analytics integration |
| P2-4 | Crashlytics or Sentry integration |
| P2-5 | Performance profiling (startup time, large list FPS) |
| P2-6 | Accessibility (VoiceOver/TalkBack) testing |

---

## User-Required Actions

The developer must do the following before submission — these cannot be automated:

1. **EAS Build**: `eas build --platform all --profile production` (requires Apple account)
2. **Physical device test**: Install development build, test push notifications, IAP, camera, location
3. **App Store Connect**: Create app, upload screenshots, fill metadata, create IAP products
4. **Google Play Console**: Create app, upload screenshots, fill data safety form
5. **RevenueCat Dashboard**: Set live API keys for iOS and Android, verify offerings exist
6. **Environment secrets**: Set REVENUECAT_WEBHOOK_AUTH_TOKEN, EXPO_PUBLIC_REVENUECAT_IOS_API_KEY, EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY
7. **RESEND_API_KEY**: Set for password reset email delivery

---

## Estimated Time to Launch (Unblocked Items Only)

| Phase | Estimate |
|---|---|
| Set environment secrets + RC live keys | 1 hour |
| EAS production build (iOS + Android) | 2-3 hours |
| Physical device testing | 4-8 hours |
| App Store Connect / Play Console metadata | 4-8 hours |
| Review process (Apple) | 1-7 days |
| Review process (Google) | 1-3 days |
| **Total (from now)** | **~2-3 weeks** |
