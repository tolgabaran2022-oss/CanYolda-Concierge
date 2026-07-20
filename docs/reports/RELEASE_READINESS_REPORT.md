# Release Readiness Report
**Date:** 2026-07-20  
**App:** CanYoldaşı  
**Version:** Pre-Release

---

## P0 Checklist

| Item | Status | Notes |
|---|---|---|
| Push outbox/worker reliable | ✅ IMPLEMENTED | notification_events table, 10s poll, retry+backoff |
| Message events connected | ✅ IMPLEMENTED | POST /messages → enqueueNotification |
| Adoption request events connected | ✅ IMPLEMENTED | POST + PATCH /adoption-requests → enqueueNotification |
| Reminder scheduler deployed | ✅ IMPLEMENTED | In-process 5min poll, Turkey timezone |
| Token API security | ✅ PASS (curl) | Auth guard on all 4 endpoints |
| Duplicate token prevention | ✅ PASS (curl) | UNIQUE index + onConflictDoNothing |
| Token ownership transfer | ✅ IMPLEMENTED | Explicit deactivate before reassign |
| Permission flow correct | ✅ IMPLEMENTED | syncExistingPushToken on login, requestAndRegister only on explicit tap |
| Android physical device | ⛔ BLOCKED | Requires development build |
| iOS physical device | ⛔ BLOCKED | Requires development build |
| Foreground/background/terminated | ⛔ BLOCKED | Requires physical device |
| Native deep link | ⛔ BLOCKED | Requires physical device |
| Web production build | ⚠️ NOT TESTED | expo export timeout in Replit sandbox |

---

## Summary

**Overall Status:** `IMPLEMENTED — NATIVE VERIFICATION BLOCKED`

Code-level implementation is complete and verified via static review and API tests.  
Native push delivery (foreground/background/terminated/deep-link) requires a development build on a physical device.

---

## What's Complete (Verified)

- Transactional outbox: all push events persist to DB before delivery, survive server restart
- In-process worker: processes pending events every 10s, retries with exponential backoff
- Reminder scheduler: checks due reminders every 5min (pet_reminders, vaccinations, appointments, medications)
- Idempotent event keys: no duplicate pushes from repeated scheduler runs
- Auth guard on all push token routes
- Token ownership security: cross-user reassignment explicit + logged
- Permission flow: no popup on login, only on explicit "Enable Notifications" tap
- Structured error logging: eventId, eventType, recipientId, errorCode (no secrets)

---

## What Requires Physical Device

- Development build (new expo-notifications plugin requires rebuild, not supported in Expo Go)
- Android 13+ push permission grant/deny
- iOS push permission grant/deny
- Foreground notification display
- Background notification delivery
- Terminated app notification tap → deep link
- Token DB verification after real device push
