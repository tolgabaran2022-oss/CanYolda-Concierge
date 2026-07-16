---
name: RevenueCat webhook & refund lifecycle
description: Architecture for the RC webhook endpoint, auth model, idempotency, and promotion recalculation after refund/revocation.
---

## Endpoint

`POST /api/webhooks/revenuecat` — registered in `app.ts` with `express.raw({ type: "application/json" })` BEFORE global `express.json()`, mirroring the Stripe webhook pattern. Handler lives in `src/routes/rcWebhook.ts` (exported function `handleRcWebhook`).

## Auth

Two-layer, both checked on every request:

1. **Authorization header** vs `REVENUECAT_WEBHOOK_AUTH_TOKEN` env var — constant-time compare via `crypto.timingSafeEqual`. If env var unset → reject all (fail-closed).
2. **HMAC-SHA256** (`X-RevenueCat-Webhook-Signature: t=<ts>,v1=<hex>`) vs `REVENUECAT_WEBHOOK_SIGNING_SECRET` — computed over `"${timestamp}.${rawBodyUtf8}"`. Only enforced if env var is set; staleness window = 5 min.

## Idempotency

`revenuecat_webhook_events.revenuecat_event_id` has a `UNIQUE` index. On duplicate delivery → immediate 200, no re-processing.

## DB tables

- `revenuecat_webhook_events` — durable log; columns: `revenuecat_event_id` (UNIQUE), `event_type`, `processing_status` (received|processed|skipped|failed), `payload` (redacted JSON text), timestamps.
- `listing_promotion_purchases` — added three server-only columns: `refunded_at TIMESTAMPTZ`, `cancel_reason TEXT`, `revenuecat_event_id TEXT`.

## Supported products

`canyoldasi_boost_1_day` (1d), `canyoldasi_boost_3_days` (3d), `canyoldasi_boost_7_days` (7d). Unknown products → 200 skipped.

## Event routing

| Event type | Action |
|---|---|
| `NON_RENEWING_PURCHASE` | Reconciliation path — activates purchase if `verified` state + has `listingId`; idempotent if already `processed` |
| `CANCELLATION` | Marks purchase `refunded`, runs `recalculateListingPromotion` |
| `REFUND_REVERSED` | Restores `refunded` → `processed`, runs `recalculateListingPromotion` |
| `TEST` | Stored as `skipped` — no listing mutation |
| unknown | Stored as `skipped` — safe default |

## recalculateListingPromotion

Lives in `src/services/promotionLedger.ts`. Algorithm: load all `purchaseStatus = "processed"` (non-refunded, non-revoked, non-failed) purchases for the listing → `new promotedUntil = max(promotionExpiresAt)` across those records → update `adoption_listings.promoted_until`.

**Why max(promotionExpiresAt):** each purchase's `promotionExpiresAt` is the cumulative listing end-date _at the time of that purchase_. Taking the max safely handles stacking (later stacked purchases have larger values). May be slightly generous in complex multi-refund stacking edge cases but never removes valid unrefunded time.

## Security notes

- Service MUST have `REVENUECAT_WEBHOOK_AUTH_TOKEN` set before RevenueCat can deliver events.
- `REVENUECAT_WEBHOOK_SIGNING_SECRET` is optional but strongly recommended for production.
- Payload stored to DB is redacted (no subscriber attributes, no PII).
