/**
 * rcWebhook.ts
 *
 * RevenueCat webhook handler for CanYoldaşı.
 *
 * Security layers (in order):
 *   1. Authorization header (REVENUECAT_WEBHOOK_AUTH_TOKEN) — constant-time compare
 *   2. HMAC-SHA256 signature (REVENUECAT_WEBHOOK_SIGNING_SECRET) — if configured
 *   3. Timestamp staleness check (>5 min → 401)
 *   4. Zod payload validation
 *   5. Idempotency via revenuecat_event_id unique constraint
 *
 * Never exposes secrets; never called from mobile auth middleware.
 *
 * Exported: handleRcWebhook — wired up in app.ts with express.raw() before
 *           global express.json(), exactly like the Stripe webhook.
 */
import crypto from "node:crypto";
import { z } from "zod";
import {
  db,
  adoptionListings,
  listingPromotionPurchases,
  revenuecatWebhookEvents,
} from "@workspace/db";
import { and, eq } from "drizzle-orm";
import { sql } from "drizzle-orm";
import { logger } from "../lib/logger.js";
import { recalculateListingPromotion } from "../services/promotionLedger.js";
import type { Request, Response } from "express";

// ── Supported product IDs → duration mapping (server-only) ───────────────────
const PRODUCT_DURATION_MAP: Record<string, number> = {
  canyoldasi_boost_1_day:   1,
  canyoldasi_boost_3_days:  3,
  canyoldasi_boost_7_days:  7,
};

// ── Zod schema ────────────────────────────────────────────────────────────────
const RcEventSchema = z.object({
  api_version: z.string(),
  event: z.object({
    id:                      z.string(),
    type:                    z.string(),
    app_user_id:             z.string(),
    original_app_user_id:    z.string().optional(),
    product_id:              z.string().optional().nullable(),
    transaction_id:          z.string().optional().nullable(),
    original_transaction_id: z.string().optional().nullable(),
    store:                   z.string().optional().nullable(),
    environment:             z.string().optional().nullable(),
    event_timestamp_ms:      z.number().optional().nullable(),
    purchased_at_ms:         z.number().optional().nullable(),
    expiration_at_ms:        z.number().optional().nullable(),
    cancel_reason:           z.string().optional().nullable(),
  }).passthrough(),  // allow unknown future fields
}).passthrough();

type RcEvent = z.infer<typeof RcEventSchema>;

// ── Constants ─────────────────────────────────────────────────────────────────
const HMAC_TOLERANCE_SECONDS = 300;  // 5 minutes

// ── Helpers ───────────────────────────────────────────────────────────────────

function verifyAuthHeader(req: Request): boolean {
  const authHeader = typeof req.headers["authorization"] === "string"
    ? req.headers["authorization"]
    : undefined;
  const expected = process.env.REVENUECAT_WEBHOOK_AUTH_TOKEN;

  if (!expected) {
    logger.warn("REVENUECAT_WEBHOOK_AUTH_TOKEN is not configured — rejecting webhook");
    return false;
  }
  if (!authHeader) return false;

  const authBuf     = Buffer.from(authHeader);
  const expectedBuf = Buffer.from(expected);
  if (authBuf.length !== expectedBuf.length) return false;
  return crypto.timingSafeEqual(authBuf, expectedBuf);
}

/** Returns null if HMAC check passes (or is skipped); returns error string if rejected. */
function verifyHmacSignature(req: Request, rawBody: Buffer): string | null {
  const signingSecret = process.env.REVENUECAT_WEBHOOK_SIGNING_SECRET;
  if (!signingSecret) {
    // Signing secret not configured — HMAC check skipped (auth-token-only mode)
    return null;
  }

  const sigHeader = typeof req.headers["x-revenuecat-webhook-signature"] === "string"
    ? req.headers["x-revenuecat-webhook-signature"]
    : undefined;

  if (!sigHeader) return "Missing X-RevenueCat-Webhook-Signature header";

  // Parse: t=<unix_ts>,v1=<hex>
  const parts  = sigHeader.split(",");
  const tPart  = parts.find((p) => p.startsWith("t="))?.slice(2);
  const v1Part = parts.find((p) => p.startsWith("v1="))?.slice(3);

  if (!tPart || !v1Part) return "Malformed signature header";

  const timestamp = parseInt(tPart, 10);
  if (Number.isNaN(timestamp)) return "Invalid timestamp in signature";

  // Staleness check
  const nowSeconds = Math.floor(Date.now() / 1000);
  if (Math.abs(nowSeconds - timestamp) > HMAC_TOLERANCE_SECONDS) {
    return "Stale webhook signature";
  }

  // Compute expected HMAC over "<timestamp>.<rawBodyUtf8>"
  const signed   = `${tPart}.${rawBody.toString("utf8")}`;
  const expected = crypto
    .createHmac("sha256", signingSecret)
    .update(signed)
    .digest("hex");

  // Constant-time compare (both as hex strings → Buffer)
  let v1Buf: Buffer;
  try {
    v1Buf = Buffer.from(v1Part, "hex");
  } catch {
    return "Malformed v1 signature value";
  }
  const expectedBuf = Buffer.from(expected, "hex");
  if (v1Buf.length !== expectedBuf.length) return "Signature length mismatch";
  if (!crypto.timingSafeEqual(v1Buf, expectedBuf)) return "Signature mismatch";

  return null;
}

// ── Main handler (exported — NOT a Router, registered in app.ts with raw body) ─
export async function handleRcWebhook(rawBody: Buffer, req: Request, res: Response): Promise<void> {
  /* ── 1. Validate raw body is a Buffer ── */
  if (!Buffer.isBuffer(rawBody)) {
    logger.error("RC WEBHOOK: req.body is not a Buffer — check middleware order");
    res.status(500).json({ error: "Internal configuration error" });
    return;
  }

  /* ── 2. Authorization header check ── */
  if (!verifyAuthHeader(req)) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  /* ── 3. HMAC signature verification ── */
  const hmacError = verifyHmacSignature(req, rawBody);
  if (hmacError) {
    logger.warn({ hmacError }, "RC webhook HMAC rejection");
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  /* ── 4. Parse JSON body (after signature verification) ── */
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawBody.toString("utf8"));
  } catch {
    res.status(400).json({ error: "Invalid JSON payload" });
    return;
  }

  /* ── 5. Zod validation ── */
  const validation = RcEventSchema.safeParse(parsed);
  if (!validation.success) {
    logger.warn({ issues: validation.error.issues }, "RC webhook Zod validation failed");
    res.status(400).json({ error: "Malformed webhook payload" });
    return;
  }

  const payload = validation.data as RcEvent;
  const { event } = payload;

  /* ── 6. Idempotency — check if already recorded ── */
  try {
    const existing = await db
      .select({ id: revenuecatWebhookEvents.id, processingStatus: revenuecatWebhookEvents.processingStatus })
      .from(revenuecatWebhookEvents)
      .where(eq(revenuecatWebhookEvents.revenuecatEventId, event.id))
      .limit(1);

    if (existing.length > 0) {
      logger.info(
        { rcEventId: event.id, eventType: event.type, existingStatus: existing[0]!.processingStatus },
        "RC webhook duplicate event — idempotent 200"
      );
      res.status(200).json({ received: true, duplicate: true });
      return;
    }
  } catch (err) {
    logger.error({ err }, "RC webhook idempotency check DB failure");
    res.status(500).json({ error: "Database error" });
    return;
  }

  /* ── 7. Persist event record (durably record before responding) ── */
  const safePayload = JSON.stringify({
    api_version: payload.api_version,
    event: {
      id:           event.id,
      type:         event.type,
      product_id:   event.product_id,
      environment:  event.environment,
      store:        event.store,
      // omit subscriber attributes and PII
    },
  });

  let webhookEventDbId: string;
  try {
    const [inserted] = await db
      .insert(revenuecatWebhookEvents)
      .values({
        revenuecatEventId: event.id,
        eventType:         event.type,
        appUserId:         event.app_user_id,
        productId:         event.product_id ?? null,
        transactionId:     event.transaction_id ?? null,
        environment:       event.environment ?? null,
        processingStatus:  "received",
        payload:           safePayload,
      })
      .returning({ id: revenuecatWebhookEvents.id });
    webhookEventDbId = inserted!.id;
  } catch (err) {
    logger.error({ err, rcEventId: event.id }, "RC webhook event DB insert failed");
    res.status(500).json({ error: "Database error" });
    return;
  }

  /* ── 8. Route by event type ── */
  logger.info(
    { rcEventId: event.id, eventType: event.type, productId: event.product_id, environment: event.environment },
    "RC webhook processing"
  );

  try {
    switch (event.type) {
      case "NON_RENEWING_PURCHASE":
        await handleNonRenewingPurchase(event, webhookEventDbId);
        break;

      case "CANCELLATION":
        await handleCancellation(event, webhookEventDbId);
        break;

      case "REFUND_REVERSED":
        await handleRefundReversed(event, webhookEventDbId);
        break;

      case "TEST":
        // Validate + store only — no listing mutations
        await markEventProcessed(webhookEventDbId, "skipped");
        break;

      default:
        // Unknown/future event type — record as skipped, do NOT crash
        logger.info({ rcEventId: event.id, eventType: event.type }, "RC webhook: unhandled event type — skipping");
        await markEventProcessed(webhookEventDbId, "skipped");
        break;
    }

    res.status(200).json({ received: true });
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    logger.error({ err, rcEventId: event.id, eventType: event.type }, "RC webhook processing error");
    try {
      await db
        .update(revenuecatWebhookEvents)
        .set({ processingStatus: "failed", failureReason: reason, updatedAt: sql`now()` })
        .where(eq(revenuecatWebhookEvents.id, webhookEventDbId));
    } catch { /* best-effort */ }
    res.status(500).json({ error: "Processing failed" });
  }
}

// ── Event handlers ────────────────────────────────────────────────────────────

/**
 * NON_RENEWING_PURCHASE
 *
 * Represents a completed one-time purchase. If the client's verify-purchase
 * flow already activated the listing, this is idempotent. If not (e.g. client
 * crashed), we reconcile — but ONLY if a secure listing purchase record exists
 * (we never assign promotion to an arbitrary listing from webhook alone).
 */
async function handleNonRenewingPurchase(
  event: RcEvent["event"],
  webhookEventDbId: string
): Promise<void> {
  const { product_id, transaction_id, original_transaction_id, app_user_id } = event;

  // Only process supported products
  if (!product_id || !(product_id in PRODUCT_DURATION_MAP)) {
    logger.info({ rcEventId: event.id, productId: product_id }, "RC NON_RENEWING_PURCHASE: unknown product — skipping");
    await markEventProcessed(webhookEventDbId, "skipped");
    return;
  }

  // Find matching purchase record by transaction_id or original_transaction_id
  const txId = transaction_id ?? original_transaction_id;
  if (!txId) {
    logger.warn({ rcEventId: event.id }, "RC NON_RENEWING_PURCHASE: no transaction_id — cannot match");
    await markEventProcessed(webhookEventDbId, "skipped");
    return;
  }

  const purchase = await db
    .select({
      id:             listingPromotionPurchases.id,
      listingId:      listingPromotionPurchases.listingId,
      purchaseStatus: listingPromotionPurchases.purchaseStatus,
      durationDays:   listingPromotionPurchases.durationDays,
    })
    .from(listingPromotionPurchases)
    .where(eq(listingPromotionPurchases.transactionIdentifier, txId))
    .limit(1);

  if (!purchase.length) {
    // No matching record — mobile client hasn't called verify-purchase yet
    // Record as awaiting reconciliation; do NOT assign to an arbitrary listing
    logger.info({ rcEventId: event.id, txId, appUserId: app_user_id }, "RC NON_RENEWING_PURCHASE: no matching purchase record — awaiting reconciliation");
    await db
      .update(revenuecatWebhookEvents)
      .set({ processingStatus: "skipped", failureReason: "no_matching_purchase_record", processedAt: sql`now()`, updatedAt: sql`now()` })
      .where(eq(revenuecatWebhookEvents.id, webhookEventDbId));
    return;
  }

  const rec = purchase[0]!;

  // Already processed → idempotent
  if (rec.purchaseStatus === "processed") {
    logger.info({ rcEventId: event.id, purchaseId: rec.id }, "RC NON_RENEWING_PURCHASE: already processed — skipping");
    await markEventProcessed(webhookEventDbId, "processed");
    return;
  }

  // Record skipped/failed statuses — do not re-activate
  if (rec.purchaseStatus === "refunded" || rec.purchaseStatus === "revoked" || rec.purchaseStatus === "failed") {
    logger.warn({ rcEventId: event.id, purchaseId: rec.id, status: rec.purchaseStatus }, "RC NON_RENEWING_PURCHASE: purchase in terminal status — skipping");
    await markEventProcessed(webhookEventDbId, "skipped");
    return;
  }

  // Purchase in "verified" state — activate (webhook reconciliation path)
  if (rec.listingId) {
    await db.transaction(async (tx) => {
      const durationDays = PRODUCT_DURATION_MAP[product_id] ?? rec.durationDays;
      const listingRows = await tx
        .select({ promotedUntil: adoptionListings.promotedUntil })
        .from(adoptionListings)
        .where(eq(adoptionListings.id, rec.listingId!))
        .limit(1);

      const currentPromotedUntil = listingRows[0]?.promotedUntil ?? null;
      const now   = new Date();
      const base  = currentPromotedUntil && currentPromotedUntil > now ? currentPromotedUntil : now;
      const newPromotedUntil = new Date(base.getTime() + durationDays * 86_400_000);

      await tx
        .update(adoptionListings)
        .set({ promotedUntil: newPromotedUntil, updatedAt: sql`now()` })
        .where(eq(adoptionListings.id, rec.listingId!));

      await tx
        .update(listingPromotionPurchases)
        .set({
          purchaseStatus:     "processed",
          promotionStartedAt: now,
          promotionExpiresAt: newPromotedUntil,
          revenuecatEventId:  event.id,
          updatedAt:          sql`now()`,
        })
        .where(eq(listingPromotionPurchases.id, rec.id));

      await tx
        .update(revenuecatWebhookEvents)
        .set({ processingStatus: "processed", processedAt: sql`now()`, updatedAt: sql`now()` })
        .where(eq(revenuecatWebhookEvents.id, webhookEventDbId));
    });

    logger.info({ rcEventId: event.id, purchaseId: rec.id, listingId: rec.listingId }, "RC NON_RENEWING_PURCHASE: reconciliation activation complete");
  } else {
    // Purchase has no listing context — cannot safely activate
    logger.warn({ rcEventId: event.id, purchaseId: rec.id }, "RC NON_RENEWING_PURCHASE: purchase has no listingId — cannot activate");
    await markEventProcessed(webhookEventDbId, "skipped");
  }
}

/**
 * CANCELLATION (refund / cancellation)
 *
 * Marks the purchase as refunded and recalculates the listing's promotion window
 * from the remaining valid (non-refunded) purchase records.
 */
async function handleCancellation(
  event: RcEvent["event"],
  webhookEventDbId: string
): Promise<void> {
  const { product_id, transaction_id, original_transaction_id, cancel_reason } = event;

  if (!product_id || !(product_id in PRODUCT_DURATION_MAP)) {
    logger.info({ rcEventId: event.id, productId: product_id }, "RC CANCELLATION: unknown product — skipping");
    await markEventProcessed(webhookEventDbId, "skipped");
    return;
  }

  const txId = transaction_id ?? original_transaction_id;
  if (!txId) {
    logger.warn({ rcEventId: event.id }, "RC CANCELLATION: no transaction_id — cannot match");
    await markEventProcessed(webhookEventDbId, "skipped");
    return;
  }

  const purchase = await db
    .select({
      id:             listingPromotionPurchases.id,
      listingId:      listingPromotionPurchases.listingId,
      purchaseStatus: listingPromotionPurchases.purchaseStatus,
    })
    .from(listingPromotionPurchases)
    .where(eq(listingPromotionPurchases.transactionIdentifier, txId))
    .limit(1);

  if (!purchase.length) {
    logger.info({ rcEventId: event.id, txId }, "RC CANCELLATION: no matching purchase — skipping");
    await markEventProcessed(webhookEventDbId, "skipped");
    return;
  }

  const rec = purchase[0]!;

  // Already refunded/revoked — idempotent
  if (rec.purchaseStatus === "refunded" || rec.purchaseStatus === "revoked") {
    logger.info({ rcEventId: event.id, purchaseId: rec.id }, "RC CANCELLATION: already refunded/revoked — idempotent");
    await markEventProcessed(webhookEventDbId, "processed");
    return;
  }

  await db.transaction(async (tx) => {
    // Mark purchase refunded
    await tx
      .update(listingPromotionPurchases)
      .set({
        purchaseStatus:    "refunded",
        refundedAt:        new Date(),
        cancelReason:      cancel_reason ?? null,
        revenuecatEventId: event.id,
        updatedAt:         sql`now()`,
      })
      .where(eq(listingPromotionPurchases.id, rec.id));

    // Recalculate listing promotion from remaining valid purchases
    if (rec.listingId) {
      await recalculateListingPromotion(rec.listingId, tx);
    }

    await tx
      .update(revenuecatWebhookEvents)
      .set({ processingStatus: "processed", processedAt: sql`now()`, updatedAt: sql`now()` })
      .where(eq(revenuecatWebhookEvents.id, webhookEventDbId));
  });

  logger.info({ rcEventId: event.id, purchaseId: rec.id, listingId: rec.listingId }, "RC CANCELLATION: purchase refunded, promotion recalculated");
}

/**
 * REFUND_REVERSED
 *
 * A previously refunded purchase has been reversed. Restore the purchase to
 * "processed" and recalculate the listing's promotion window.
 */
async function handleRefundReversed(
  event: RcEvent["event"],
  webhookEventDbId: string
): Promise<void> {
  const { product_id, transaction_id, original_transaction_id } = event;

  if (!product_id || !(product_id in PRODUCT_DURATION_MAP)) {
    logger.info({ rcEventId: event.id, productId: product_id }, "RC REFUND_REVERSED: unknown product — skipping");
    await markEventProcessed(webhookEventDbId, "skipped");
    return;
  }

  const txId = transaction_id ?? original_transaction_id;
  if (!txId) {
    logger.warn({ rcEventId: event.id }, "RC REFUND_REVERSED: no transaction_id — cannot match");
    await markEventProcessed(webhookEventDbId, "skipped");
    return;
  }

  const purchase = await db
    .select({
      id:             listingPromotionPurchases.id,
      listingId:      listingPromotionPurchases.listingId,
      purchaseStatus: listingPromotionPurchases.purchaseStatus,
    })
    .from(listingPromotionPurchases)
    .where(eq(listingPromotionPurchases.transactionIdentifier, txId))
    .limit(1);

  if (!purchase.length) {
    logger.info({ rcEventId: event.id, txId }, "RC REFUND_REVERSED: no matching purchase — skipping");
    await markEventProcessed(webhookEventDbId, "skipped");
    return;
  }

  const rec = purchase[0]!;

  // Must be in "refunded" state to reverse
  if (rec.purchaseStatus !== "refunded") {
    logger.info({ rcEventId: event.id, purchaseId: rec.id, status: rec.purchaseStatus }, "RC REFUND_REVERSED: purchase not in refunded status — skipping");
    await markEventProcessed(webhookEventDbId, "skipped");
    return;
  }

  await db.transaction(async (tx) => {
    // Restore to processed; clear refund fields
    await tx
      .update(listingPromotionPurchases)
      .set({
        purchaseStatus:    "processed",
        refundedAt:        null,
        cancelReason:      null,
        revenuecatEventId: event.id,
        updatedAt:         sql`now()`,
      })
      .where(eq(listingPromotionPurchases.id, rec.id));

    // Recalculate listing promotion (re-adds this purchase's contribution)
    if (rec.listingId) {
      await recalculateListingPromotion(rec.listingId, tx);
    }

    await tx
      .update(revenuecatWebhookEvents)
      .set({ processingStatus: "processed", processedAt: sql`now()`, updatedAt: sql`now()` })
      .where(eq(revenuecatWebhookEvents.id, webhookEventDbId));
  });

  logger.info({ rcEventId: event.id, purchaseId: rec.id, listingId: rec.listingId }, "RC REFUND_REVERSED: purchase restored, promotion recalculated");
}

// ── Utility ───────────────────────────────────────────────────────────────────

async function markEventProcessed(
  webhookEventDbId: string,
  status: "processed" | "skipped"
): Promise<void> {
  await db
    .update(revenuecatWebhookEvents)
    .set({ processingStatus: status, processedAt: sql`now()`, updatedAt: sql`now()` })
    .where(eq(revenuecatWebhookEvents.id, webhookEventDbId));
}
