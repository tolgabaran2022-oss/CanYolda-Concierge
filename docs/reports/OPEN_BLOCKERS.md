# Open Blockers
**Date:** 2026-07-20

---

## P0 Blockers (release cannot ship without these)

| # | Blocker | Owner | Notes |
|---|---|---|---|
| P0-1 | Android physical device push test | App developer | Requires development build on Android 13+ device |
| P0-2 | iOS physical device push test | App developer | Requires TestFlight or local dev build |
| P0-3 | Foreground/background/terminated push delivery | App developer | Requires physical device development build |
| P0-4 | Deep link from notification tap | App developer | Requires physical device development build |

## P1 Items (important but not blocking release)

| # | Item | Status |
|---|---|---|
| P1-1 | Expo Push receipt polling | STATIC REVIEW — initial ticket received, receipt check worker not yet built |
| P1-2 | Web production build verification | NOT TESTED — expo export times out in Replit sandbox; needs local build or CI |
| P1-3 | Restore purchases flow test | BLOCKED — requires physical device with active subscription |
| P1-4 | Reminder "1 day before" notification | IMPLEMENTED but not tested end-to-end |

## P2 Items (nice to have)

| # | Item |
|---|---|
| P2-1 | Push analytics dashboard (sent/failed/pending counts) |
| P2-2 | Scheduled push for emergency broadcasts |
| P2-3 | User-configurable reminder timing (1hr before, 1 day before, etc.) |
