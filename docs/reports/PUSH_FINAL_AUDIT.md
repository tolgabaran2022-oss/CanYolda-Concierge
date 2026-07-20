# Push Notification Final Audit
**Date:** 2026-07-20

---

## Architecture

| Component | Status |
|---|---|
| Delivery mechanism | Expo Push API (server-side) |
| Outbox table | notification_events — SELECT→UPDATE (no UPDATE LIMIT) |
| Worker | In-process setInterval 10s — confirmed running |
| Retry policy | Exponential backoff: 30s → 5min → 20min, max 3 attempts |
| Idempotency | event_key UNIQUE index |
| Crash recovery | Stale "processing" events (>60s) reclaimed each batch |
| Reminder scheduler | In-process setInterval 5min — confirmed running |
| Timezone | Europe/Istanbul (UTC+3, no DST) |
| Reminder window | 15 min ahead, ignores >30 min overdue |

## Event Connections

| Event | Route | Status |
|---|---|---|
| New message | POST /messages/conversations/:id/messages | ✅ enqueueNotification |
| New adoption request | POST /adoption-requests | ✅ enqueueNotification |
| Request accepted | PATCH /adoption-requests/:id/status | ✅ enqueueNotification |
| Request rejected | PATCH /adoption-requests/:id/status | ✅ enqueueNotification |
| Pet reminder due | Reminder scheduler | ✅ enqueueNotification |
| Vaccination due | Reminder scheduler | ✅ enqueueNotification |
| Appointment due | Reminder scheduler | ✅ enqueueNotification |
| Medication due | Reminder scheduler | ✅ enqueueNotification |

## API Security Tests

| Test | Method | Result |
|---|---|---|
| POST /push-tokens auth guard | curl | **PASS** — 401 |
| DELETE /push-tokens auth guard | curl | **PASS** — 401 |
| GET /push-tokens/preferences auth guard | curl | **PASS** — 401 |
| PATCH /push-tokens/preferences auth guard | curl | **PASS** — 401 |
| Invalid token format | curl with auth | **PASS** — 400 |
| Valid ExponentPushToken registration | curl | **PASS** — ok |
| Duplicate token registration | curl | **PASS** — idempotent, no duplicate |
| Preferences GET defaults | curl | **PASS** — all true |
| Preferences PATCH | curl | **PASS** — ok |
| Cross-user token delete (IDOR) | curl + DB verify | **PASS** — userId filter prevents cross-delete |

## Token Lifecycle

| Scenario | Behavior | Status |
|---|---|---|
| New device registers | INSERT with onConflictDoNothing | ✅ |
| Same user re-registers | onConflictDoUpdate, enabled=true | ✅ |
| Different user registers same token | Deactivates old record first | ✅ |
| Logout | enabled=false for that token only | ✅ |
| DeviceNotRegistered error | enabled=false in worker | STATIC REVIEW |

## Notification Preferences

| Preference | Check in worker | Status |
|---|---|---|
| generalEnabled | ✅ | ✅ |
| messagesEnabled | ✅ | ✅ |
| adoptionEnabled | ✅ | ✅ |
| remindersEnabled | ✅ | ✅ |
| emergencyEnabled | ✅ | ✅ |

## Physical Device Tests

| Test | Status |
|---|---|
| Android 13+ permission dialog | **BLOCKED** — development build required |
| iOS permission dialog | **BLOCKED** — development build required |
| Foreground notification | **BLOCKED** |
| Background notification | **BLOCKED** |
| Terminated app notification | **BLOCKED** |
| Deep link — message screen | **BLOCKED** |
| Deep link — adoption listing screen | **BLOCKED** |
| Deep link — reminder screen | **BLOCKED** |

## Missing: Push Receipt Polling

Expo Push API returns tickets immediately. Actual delivery status requires a second API call to `https://exp.host/--/api/v2/push/getReceipts`. This receipt polling worker is **NOT IMPLEMENTED**. Without it, `DeviceNotRegistered` and permanent failures may not be caught on first delivery.

**Recommendation:** Implement a receipt polling job that runs 15-30 minutes after delivery and processes `receipts[id].status === "error"`.

## REVENUECAT_WEBHOOK_AUTH_TOKEN

This is not set in the deployed environment. RevenueCat webhooks will be rejected by the server, meaning IAP purchases will not activate boost/premium in the DB until it is set.

## Critical Issues

| # | Issue | Priority |
|---|---|---|
| P0-1 | Physical device push test BLOCKED | P0 — must pass before submission |
| P1-1 | Expo push receipt polling not implemented | P1 — delivery failures not fully tracked |
| P1-2 | REVENUECAT_WEBHOOK_AUTH_TOKEN not set in deployment | P1 — IAP won't activate |
