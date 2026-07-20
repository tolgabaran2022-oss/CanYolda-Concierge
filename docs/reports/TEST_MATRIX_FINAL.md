# Test Matrix Final
**Date:** 2026-07-20  
**Legend:** PASS | FAIL | STATIC REVIEW | BLOCKED | NOT TESTED

---

## AŞAMA 1 — Build & Environment

| # | Test | iOS | Android | Web | Evidence |
|---|---|---|---|---|---|
| 1.1 | TypeScript (mobile) | PASS | PASS | PASS | `pnpm typecheck` — no errors |
| 1.2 | TypeScript (api-server) | PASS | PASS | PASS | `pnpm typecheck` — no errors |
| 1.3 | expo-doctor | NOT TESTED | NOT TESTED | NOT TESTED | Not available in local CLI |
| 1.4 | console.log in source | PASS | PASS | PASS | All behind `__DEV__` guard |
| 1.5 | TODO/FIXME/HACK in source | PASS | PASS | PASS | None found |
| 1.6 | localhost in bundle | PASS | PASS | PASS | Conditional on `EXPO_PUBLIC_DOMAIN` |
| 1.7 | Secret keys in source | PASS | PASS | PASS | None found |
| 1.8 | Mock/fake data in production | **FAIL** | **FAIL** | **FAIL** | `mockViews/mockFavs/mockMsgs` fake engagement stats in adoption.tsx |
| 1.9 | Deprecated packages | STATIC REVIEW | STATIC REVIEW | STATIC REVIEW | expo-notifications warns SDK 53+ removed from Expo Go |
| 1.10 | react-native-maps pinned | PASS | PASS | PASS | 1.18.0 pinned, NOT in plugins |

## AŞAMA 2 — Web Production Build

| # | Test | Result | Evidence |
|---|---|---|---|
| 2.1 | expo export --platform web | NOT TESTED | Metro reached ~81% (no errors) then timed out — Replit sandbox CPU/memory limit |
| 2.2 | Browser functional test | NOT TESTED | Build required first |

## AŞAMA 3 — Auth

| # | Test | API Test | UI Test | Evidence |
|---|---|---|---|---|
| 3.1 | Geçerli kayıt | PASS | BLOCKED | curl → 268-char JWT, user in DB |
| 3.2 | Aynı email duplicate | PASS | BLOCKED | "Bu e-posta adresi zaten kullanılıyor" |
| 3.3 | Hatalı email | PASS | BLOCKED | Zod validation error |
| 3.4 | Zayıf şifre | PASS | BLOCKED | Zod validation error |
| 3.5 | Doğru şifre login | PASS | BLOCKED | JWT issued |
| 3.6 | Yanlış şifre | PASS | BLOCKED | "E-posta veya şifre hatalı" |
| 3.7 | /auth/me valid token | PASS | BLOCKED | Correct email returned |
| 3.8 | /auth/me invalid JWT | PASS | BLOCKED | 401 |
| 3.9 | Forgot password (valid email) | PASS | BLOCKED | Same message for valid/invalid (timing-safe) |
| 3.10 | Forgot password (invalid email) | PASS | BLOCKED | Same safe message |
| 3.11 | Account deletion auth guard | PASS | BLOCKED | 401 without token |
| 3.12 | Google OAuth | BLOCKED | BLOCKED | Requires Google callback config |
| 3.13 | Apple OAuth | BLOCKED | BLOCKED | Requires Apple config |
| 3.14 | Password reset flow end-to-end | STATIC REVIEW | BLOCKED | Code exists; RESEND_API_KEY required |

## AŞAMA 4 — Evcilim

| # | Test | API Test | UI Test | Evidence |
|---|---|---|---|---|
| 4.1 | Pet oluşturma | PASS | BLOCKED | Pet ID returned |
| 4.2 | Pet IDOR edit guard | PASS | BLOCKED | 403 for non-owner |
| 4.3 | Pet IDOR delete guard | PASS | BLOCKED | 403 for non-owner |
| 4.4 | Ücretsiz → ikinci pet → premium modal | STATIC REVIEW | BLOCKED | grandfatheredPetLimit logic in code |
| 4.5 | Veri: aşı, randevu, ilaç, belgeler | STATIC REVIEW | BLOCKED | Tables in DB |
| 4.6 | Premium kapı: belgeler | STATIC REVIEW | BLOCKED | Route guard in code |
| 4.7 | Premium kapı: ilaçlar | STATIC REVIEW | BLOCKED | Route guard in code |
| 4.8 | Direct route bypass | STATIC REVIEW | BLOCKED | Server-side check enforces |

## AŞAMA 5 — RevenueCat Premium

| # | Test | Result | Evidence |
|---|---|---|---|
| 5.1 | iOS API key set | FAIL | EXPO_PUBLIC_REVENUECAT_IOS_API_KEY not set |
| 5.2 | Android API key set | FAIL | EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY not set |
| 5.3 | RC offering loads | BLOCKED | Physical device required |
| 5.4 | Package prices correct | BLOCKED | Physical device required |
| 5.5 | Purchase flow | BLOCKED | Physical device required |
| 5.6 | Webhook activates premium | BLOCKED | REVENUECAT_WEBHOOK_AUTH_TOKEN not set + physical device |
| 5.7 | Restore purchases | BLOCKED | Physical device required |
| 5.8 | Boost purchase | BLOCKED | Physical device required |

## AŞAMA 6 — Push Notifications

| # | Test | API Test | Device Test | Evidence |
|---|---|---|---|---|
| 6.1 | Token register auth guard | PASS | BLOCKED | 401 without token |
| 6.2 | Token delete auth guard | PASS | BLOCKED | 401 without token |
| 6.3 | Preferences get/patch | PASS | BLOCKED | Returns correct defaults |
| 6.4 | Invalid token format | PASS | BLOCKED | 400 |
| 6.5 | Valid token registration | PASS | BLOCKED | ok |
| 6.6 | Cross-user token delete IDOR | PASS | BLOCKED | DB count stays same |
| 6.7 | Outbox worker running | PASS | — | Log: notification_worker: started |
| 6.8 | Reminder scheduler running | PASS | — | Log: reminder_scheduler: started |
| 6.9 | Message event enqueued | PASS | — | 1 pending event in notification_events |
| 6.10 | Physical device permission | BLOCKED | BLOCKED | Dev build required |
| 6.11 | Foreground delivery | BLOCKED | BLOCKED | Dev build required |
| 6.12 | Background delivery | BLOCKED | BLOCKED | Dev build required |
| 6.13 | Terminated app delivery | BLOCKED | BLOCKED | Dev build required |
| 6.14 | Deep link from notification | BLOCKED | BLOCKED | Dev build required |

## AŞAMA 7 — Database Security

| # | Test | Result | Evidence |
|---|---|---|---|
| 7.1 | Pet IDOR (edit/delete) | PASS | 403 confirmed |
| 7.2 | Adoption listing IDOR (edit/delete) | PASS | 403 confirmed |
| 7.3 | Message conversation IDOR | PASS | 403 confirmed |
| 7.4 | Push token cross-user delete | PASS | DB verified, count unchanged |
| 7.5 | Auth guards on all write endpoints | PASS | 401 confirmed |

## AŞAMA 8 — Sahiplendirme

| # | Test | API Test | UI Test | Evidence |
|---|---|---|---|---|
| 8.1 | İlan oluşturma | PASS | BLOCKED | ID returned in DB |
| 8.2 | İlan IDOR edit | PASS | BLOCKED | 403 |
| 8.3 | İlan IDOR delete | PASS | BLOCKED | 403 |
| 8.4 | Talep gönderme | FAIL (field names) | BLOCKED | API validation: `hadPetBefore` field required |
| 8.5 | Talep IDOR accept | STATIC REVIEW | BLOCKED | ownerId check in code |
| 8.6 | Boost listing | BLOCKED | BLOCKED | IAP required |

## AŞAMA 9 — Mesajlaşma

| # | Test | API Test | UI Test | Evidence |
|---|---|---|---|---|
| 9.1 | Konuşma oluşturma | PASS | BLOCKED | Conversation ID returned |
| 9.2 | Mesaj gönderme | PASS | BLOCKED | Message ID returned |
| 9.3 | Mesaj okuma (katılımcı) | PASS | BLOCKED | 200 |
| 9.4 | Mesaj okuma (dışarıdan) | PASS | BLOCKED | 403 |
| 9.5 | Mesaj gönderme (dışarıdan) | PASS | BLOCKED | 403 |
| 9.6 | Notification event oluştu | PASS | — | 1 pending in DB |
| 9.7 | Real-time (polling/ws) | STATIC REVIEW | BLOCKED | Polling via HTTP |

## AŞAMA 10 — Harita ve Konum

| # | Test | Result | Evidence |
|---|---|---|---|
| 10.1 | Animals list (public) | PASS | 200 |
| 10.2 | Animal creation (auth required) | STATIC REVIEW | imageUrl required field |
| 10.3 | Konum izin flow | BLOCKED | Physical device |
| 10.4 | Map markers | BLOCKED | Physical device |
| 10.5 | Yardım sayacı | STATIC REVIEW | helperCount in query |

## AŞAMA 11 — Kamera ve Storage

| # | Test | Result | Evidence |
|---|---|---|---|
| 11.1 | Upload auth guard | PASS | 401 |
| 11.2 | Camera/gallery permission | BLOCKED | Physical device |
| 11.3 | Image upload flow | BLOCKED | Physical device |
| 11.4 | HEIC support | BLOCKED | Physical device |

## AŞAMA 12-13 — iOS/Android Release Audit

| # | Test | Result | Evidence |
|---|---|---|---|
| 12.1 | Bundle ID correct | STATIC REVIEW | com.canyoldasi.app |
| 12.2 | Version/build number | STATIC REVIEW | 1.0.0 / EAS autoIncrement |
| 12.3 | Icon asset exists | PASS | ls confirms |
| 12.4 | Splash asset exists | PASS | ls confirms |
| 12.5 | iOS permissions set | STATIC REVIEW | NSLocation/Camera/Photos all set |
| 12.6 | Android permissions set | STATIC REVIEW | Location/Camera/Push declared |
| 12.7 | aps-environment: production | STATIC REVIEW | Set in entitlements |
| 12.8 | Android buildType: app-bundle | STATIC REVIEW | eas.json production |
| 12.9 | Physical device — all | BLOCKED | BLOCKED | Dev build required |
| 12.10 | App Store metadata | NOT DONE | NOT DONE | Description, screenshots, privacy |
| 12.11 | Google Play metadata | NOT DONE | NOT DONE | Screenshots, data safety, privacy |

## AŞAMA 14 — Performance

| # | Test | Result |
|---|---|---|
| 14.1 | API response time | STATIC REVIEW — no timeouts observed in tests |
| 14.2 | App startup time | BLOCKED |
| 14.3 | Large list scrolling | BLOCKED |
| 14.4 | Memory | BLOCKED |

## AŞAMA 15 — Store Ready Checklist

| Item | Status |
|---|---|
| Apple: App description | ❌ NOT DONE |
| Apple: Screenshots | ❌ NOT DONE |
| Apple: Privacy policy | ❌ NOT DONE |
| Apple: Review account | ❌ NOT DONE |
| Apple: IAP configured | ❌ NOT CONFIRMED |
| Google: Screenshots | ❌ NOT DONE |
| Google: Data safety form | ❌ NOT DONE |
| Google: Account deletion URL | ❌ NOT DONE |
