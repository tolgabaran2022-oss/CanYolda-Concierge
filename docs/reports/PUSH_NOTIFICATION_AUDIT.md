# Push Notification System Audit
**Date:** 2026-07-20  
**Auditor:** Agent (Static Review + API Tests)

---

## Architecture Summary

### Outbox Pattern (Implemented)
Push delivery uses a transactional outbox table (`notification_events`) instead of fire-and-forget. This guarantees:

| Property | Implementation |
|---|---|
| Durability | Event written to DB before response sent — survives server restart |
| Idempotency | `event_key` UNIQUE index — same event never produces duplicate push |
| Retry | Exponential backoff: 30s → 5min → 20min (max 3 attempts) |
| Observability | Structured log per attempt with eventId, eventType, recipientId, errorCode |
| Crash recovery | Stale "processing" events reclaimed after 60s |

### Worker Loop
- In-process `setInterval` every **10 seconds** in the persistent Express server
- Processes up to **10 events per batch**
- Status lifecycle: `pending → processing → sent | failed`
- DeviceNotRegistered tokens auto-disabled

### Reminder Scheduler
- In-process `setInterval` every **5 minutes**
- Timezone: **Europe/Istanbul (UTC+3)** — no DST
- Window: **15 minutes** ahead, ignores reminders >30 min overdue
- Covers: `pet_reminders`, `pet_vaccinations` (nextDueDate), `pet_appointments` (upcoming), `pet_medications` (active with scheduleTimes)
- Idempotency key: `{type}:{id}:{date}:{time}` — safe to run multiple times

---

## Event Connections

| Event | Route | DB Write First? | Enqueue Call | Recipient |
|---|---|---|---|---|
| New message | POST /messages/conversations/:id/messages | ✅ | ✅ `message:{insertedId}` | Other conversation participant (not sender) |
| New adoption request | POST /adoption-requests | ✅ | ✅ `adoption_request:{requestId}` | Listing owner |
| Request accepted | PATCH /adoption-requests/:id/status | ✅ | ✅ `adoption_status:{requestId}:accepted` | Requester |
| Request rejected | PATCH /adoption-requests/:id/status | ✅ | ✅ `adoption_status:{requestId}:rejected` | Requester |
| Pet reminder due | Scheduler | N/A | ✅ `reminder:{id}:{date}:{time}` | Reminder owner |
| Vaccination due | Scheduler | N/A | ✅ `vaccination:{id}:{nextDueDate}` | Vaccination owner |
| Appointment due | Scheduler | N/A | ✅ `appointment:{id}:{date}:{time}` | Appointment owner |
| Medication due | Scheduler | N/A | ✅ `medication:{id}:{date}:{time}` | Medication owner |

---

## Error Handling

- `enqueueNotification()` — if DB INSERT fails, route logs structured error but API response is NOT affected
- Worker delivery failure — logged with `{ eventId, eventType, recipientId, attempt, errorCode }`
- Secret/token/message content — NOT logged

---

## Token Lifecycle Security

| Scenario | Behaviour |
|---|---|
| New token registration | INSERT with onConflictDoNothing |
| Same user re-registration | onConflictDoUpdate — enabled=true, lastSeenAt updated |
| Different user on same device | Old record set enabled=false FIRST, then new record upserted |
| Logout | Only the provided token is set enabled=false (other device tokens preserved) |
| DeviceNotRegistered | Token set enabled=false during worker delivery |

### DB Constraint
`push_tokens` has `uniqueIndex("push_tokens_token_unique").on(t.expoPushToken)` — no duplicate active rows possible.

---

## Notification Preferences Check

Worker checks `notificationPreferences` before sending:
1. `generalEnabled` — if false, skip all
2. Type-specific preference (`messagesEnabled`, `adoptionEnabled`, `remindersEnabled`, `emergencyEnabled`) — if false, skip

Preference check uses existing DB row or defaults (all enabled).

---

## API Security Results

| Test | Result |
|---|---|
| POST /push-tokens without auth | **401** |
| DELETE /push-tokens without auth | **401** |
| GET /push-tokens/preferences without auth | **401** |
| PATCH /push-tokens/preferences without auth | **401** |
| Invalid token format (`InvalidToken`) | **400** |
| Duplicate token registration | **No duplicate** (onConflictDoUpdate) |
| User A cannot read User B's tokens | **Not exposed** — GET tokens endpoint lists only own tokens via JWT |
| User A cannot delete User B's tokens | **Enforced** — DELETE filters by `userId` from JWT |

*Results: PASS (curl + DB verification)*

---

## RECEIVE_BOOT_COMPLETED Permission

**Removed from app.json.** This permission is only needed for rescheduling local notifications after device reboot. The app uses server-side push via Expo Push API — no local notification scheduling requires boot awareness.

---

## Limitations / Blocked

| Item | Status | Reason |
|---|---|---|
| Expo Push receipt polling | STATIC REVIEW | Initial ticket returned; receipt check worker not yet implemented |
| Android physical device | BLOCKED | Requires development build |
| iOS physical device | BLOCKED | Requires development build |
| Foreground/background/terminated | BLOCKED | Requires physical device development build |
| Native deep link | BLOCKED | Requires physical device development build |
