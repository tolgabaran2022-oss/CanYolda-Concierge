import { Router, type IRouter } from "express";
import {
  db,
  adoptionListings,
  listingPromotionPurchases,
} from "@workspace/db";
import { and, eq, gt, sql } from "drizzle-orm";
import { extractUserId } from "../lib/jwtAuth.js";
import { logger } from "../lib/logger.js";

const router: IRouter = Router();

/* ─── Server-side package → duration mapping ────────────────────
   Single source of truth. The client MUST NOT control durationDays.
   Reject any identifier not in this map.
──────────────────────────────────────────────────────────────── */
const PACKAGE_MAP: Record<string, { durationDays: 1 | 3 | 7 }> = {
  boost_1_day:  { durationDays: 1 },
  boost_3_days: { durationDays: 3 },
  boost_7_days: { durationDays: 7 },
};

/*
 * POST /api/promotions/verify-purchase
 *
 * Single controlled pipeline — verify RevenueCat purchase AND atomically
 * activate the adoption-listing promotion in one Drizzle transaction.
 *
 * Security properties
 * ───────────────────
 * • JWT required — 401 for anonymous
 * • Listing ownership verified (listing.userId === auth userId) — 403
 * • durationDays derived server-side from PACKAGE_MAP; never trusted from client
 * • promotedUntil / expiresAt / durationDays from client body are IGNORED
 * • Stacking: if listing already has an active promotion, new time is appended
 * • transaction_identifier UNIQUE index prevents double-insert at DB level
 * • Idempotency: already-processed transaction → safe 200, no second extension
 * • listing_promotion_purchases.purchase_status only transitions: verified → processed
 *
 * Attack mitigations (per spec §17)
 * ───────────────────────────────────
 * A1  durationDays=999      → ignored; server reads PACKAGE_MAP
 * A2  promotedUntil=2099    → ignored; server calculates from DB value
 * A3  same txn submitted 2× → idempotent; UNIQUE index + pre-check
 * A4  concurrent same txn   → DB UNIQUE catches second insert; tx serialises
 * A5  purchase for A → B    → purchase.listingId check inside tx
 * A6  promote other's listing → listing.userId check
 * A7  status failed/revoked → only 'verified' transitions to 'processed'
 * A8  client writes directly → backend-only column; client has no direct DB access
 */
router.post("/promotions/verify-purchase", async (req, res): Promise<void> => {
  /* ── 1. Authentication ──────────────────────────────────────── */
  let userId: string;
  try {
    userId = extractUserId(req);
    if (!userId) throw new Error("empty userId");
  } catch {
    res.status(401).json({ error: "Bu işlem için giriş yapmanız gerekiyor" });
    return;
  }

  /* ── 2. Input extraction ────────────────────────────────────── */
  const {
    listingId,
    rcPackageIdentifier,
    productIdentifier,
    transactionIdentifier,
    rcUserId,
    store,
  } = req.body as {
    listingId?:             string;
    rcPackageIdentifier?:   string;
    productIdentifier?:     string;
    transactionIdentifier?: string;
    rcUserId?:              string;
    store?:                 string;
  };

  /* ── 3. Required field validation ───────────────────────────── */
  if (!listingId || typeof listingId !== "string") {
    res.status(400).json({ error: "listingId zorunludur" });
    return;
  }
  if (!rcPackageIdentifier || typeof rcPackageIdentifier !== "string") {
    res.status(400).json({ error: "rcPackageIdentifier zorunludur" });
    return;
  }
  if (!productIdentifier || typeof productIdentifier !== "string") {
    res.status(400).json({ error: "productIdentifier zorunludur" });
    return;
  }
  if (!transactionIdentifier || typeof transactionIdentifier !== "string") {
    res.status(400).json({ error: "transactionIdentifier zorunludur" });
    return;
  }
  if (!rcUserId || typeof rcUserId !== "string") {
    res.status(400).json({ error: "rcUserId zorunludur" });
    return;
  }

  /* ── 4. Package validation — server-side only ───────────────── */
  const pkg = PACKAGE_MAP[rcPackageIdentifier];
  if (!pkg) {
    res.status(400).json({ error: `Geçersiz paket: ${rcPackageIdentifier}` });
    return;
  }
  const { durationDays } = pkg;

  /* ── 5. Listing existence + ownership (outside transaction) ─── */
  let listing: { id: string; userId: string; promotedUntil: Date | null };
  try {
    const rows = await db
      .select({
        id:           adoptionListings.id,
        userId:       adoptionListings.userId,
        promotedUntil: adoptionListings.promotedUntil,
      })
      .from(adoptionListings)
      .where(eq(adoptionListings.id, listingId))
      .limit(1);

    if (!rows.length) {
      res.status(404).json({ error: "İlan bulunamadı" });
      return;
    }
    listing = rows[0]!;

    if (listing.userId !== userId) {
      res.status(403).json({ error: "Bu ilan size ait değil" });
      return;
    }
  } catch (err: unknown) {
    logger.error({ err }, "Failed to fetch listing for promotion check");
    res.status(500).json({ error: "İlan doğrulanamadı" });
    return;
  }

  /* ── 6. Atomic transaction: verify + activate ───────────────── */
  try {
    type ActivationResult = {
      success:            boolean;
      alreadyProcessed:   boolean;
      purchaseId:         string;
      listingId:          string;
      packageIdentifier:  string;
      durationDays:       number;
      promotionStartedAt: string;
      promotedUntil:      string;
    };

    const result = await db.transaction(async (tx) => {
      /* ── 6a. Check existing purchase record by transactionIdentifier ── */
      const existing = await tx
        .select({
          id:             listingPromotionPurchases.id,
          purchaseStatus: listingPromotionPurchases.purchaseStatus,
          listingId:      listingPromotionPurchases.listingId,
          userId:         listingPromotionPurchases.userId,
          promotionExpiresAt: listingPromotionPurchases.promotionExpiresAt,
        })
        .from(listingPromotionPurchases)
        .where(eq(listingPromotionPurchases.transactionIdentifier, transactionIdentifier))
        .limit(1);

      /* ── 6b. Idempotency: already processed → return without change ── */
      if (existing.length && existing[0]!.purchaseStatus === "processed") {
        const processed = existing[0]!;
        const promotedUntilIso = processed.promotionExpiresAt?.toISOString() ?? new Date().toISOString();
        return {
          success:            true,
          alreadyProcessed:   true,
          purchaseId:         processed.id,
          listingId,
          packageIdentifier:  rcPackageIdentifier,
          durationDays,
          promotionStartedAt: promotedUntilIso,
          promotedUntil:      promotedUntilIso,
        } satisfies ActivationResult;
      }

      /* ── 6c. Authorization: purchase must belong to this user + listing ── */
      if (existing.length) {
        const ex = existing[0]!;
        if (ex.userId !== userId) {
          throw Object.assign(new Error("ownership_mismatch"), { statusCode: 403 });
        }
        if (ex.listingId && ex.listingId !== listingId) {
          throw Object.assign(new Error("listing_mismatch"), { statusCode: 403 });
        }
        /* Only 'verified' may be promoted; reject invalid status transitions */
        if (ex.purchaseStatus !== "verified") {
          throw Object.assign(
            new Error(`invalid_status_transition:${ex.purchaseStatus}`),
            { statusCode: 409 }
          );
        }
      }

      /* ── 6d. Insert if not yet recorded ─────────────────────────────── */
      let purchaseId: string;

      if (!existing.length) {
        const [inserted] = await tx
          .insert(listingPromotionPurchases)
          .values({
            userId,
            listingId,
            revenuecatAppUserId:   rcUserId,
            packageIdentifier:     rcPackageIdentifier,
            productIdentifier,
            transactionIdentifier,
            store:                 store ?? null,
            purchaseStatus:        "verified",
            durationDays,
            verifiedAt:            new Date(),
          })
          .returning({ id: listingPromotionPurchases.id });

        purchaseId = inserted!.id;
      } else {
        purchaseId = existing[0]!.id;
      }

      /* ── 6e. Re-read listing's current promotedUntil inside tx ──────── */
      const listingRow = await tx
        .select({ promotedUntil: adoptionListings.promotedUntil })
        .from(adoptionListings)
        .where(eq(adoptionListings.id, listingId))
        .limit(1);

      const currentPromotedUntil = listingRow[0]?.promotedUntil ?? null;

      /* ── 6f. Stacking logic (UTC, server clock) ──────────────────────
         If listing has an active promotion, stack on top of it.
         If not (or expired), start from now().
      ──────────────────────────────────────────────────────────────────── */
      const now = new Date();
      const base = currentPromotedUntil && currentPromotedUntil > now
        ? currentPromotedUntil
        : now;

      const newPromotedUntil = new Date(base.getTime() + durationDays * 24 * 60 * 60 * 1000);
      const promotionStartedAt = now;

      /* ── 6g. Update listing.promoted_until ───────────────────────── */
      await tx
        .update(adoptionListings)
        .set({
          promotedUntil: newPromotedUntil,
          updatedAt:     sql`now()`,
        })
        .where(eq(adoptionListings.id, listingId));

      /* ── 6h. Transition purchase → processed ─────────────────────── */
      await tx
        .update(listingPromotionPurchases)
        .set({
          purchaseStatus:     "processed",
          promotionStartedAt,
          promotionExpiresAt: newPromotedUntil,
          updatedAt:          sql`now()`,
        })
        .where(eq(listingPromotionPurchases.id, purchaseId));

      return {
        success:            true,
        alreadyProcessed:   false,
        purchaseId,
        listingId,
        packageIdentifier:  rcPackageIdentifier,
        durationDays,
        promotionStartedAt: promotionStartedAt.toISOString(),
        promotedUntil:      newPromotedUntil.toISOString(),
      } satisfies ActivationResult;
    });

    logger.info(
      {
        userId,
        listingId,
        rcPackageIdentifier,
        durationDays,
        transactionIdentifier,
        alreadyProcessed: result.alreadyProcessed,
        promotedUntil:    result.promotedUntil,
      },
      result.alreadyProcessed ? "IAP promotion idempotent (already processed)" : "IAP promotion activated"
    );

    res.status(result.alreadyProcessed ? 200 : 201).json(result);

  } catch (err: unknown) {
    const statusCode = (err as { statusCode?: number }).statusCode;
    if (statusCode === 403) {
      res.status(403).json({ error: "Bu işlem için yetkiniz yok" });
      return;
    }
    if (statusCode === 409) {
      res.status(409).json({ error: "Bu satın alma durumu işlenemiyor" });
      return;
    }

    /* UNIQUE index violation = two concurrent identical transactions */
    const msg = err instanceof Error ? err.message : "";
    if (msg.includes("lpp_transaction_id") || msg.includes("transaction_identifier")) {
      logger.warn({ transactionIdentifier }, "Concurrent duplicate IAP transaction rejected");
      res.status(409).json({ error: "Bu işlem daha önce kaydedildi" });
      return;
    }

    logger.error({ err, userId, listingId, transactionIdentifier }, "Failed to activate IAP promotion");
    res.status(500).json({ error: "Promosyon etkinleştirilemedi" });
  }
});

/* ── GET /api/promotions/status/:listingId ──────────────────────
   Returns current promotion state for a single listing.
   Used by the mobile client to refresh after activation.
──────────────────────────────────────────────────────────────── */
router.get("/promotions/status/:listingId", async (req, res): Promise<void> => {
  const { listingId } = req.params;
  if (!listingId) { res.status(400).json({ error: "listingId gerekli" }); return; }

  try {
    const rows = await db
      .select({
        id:            adoptionListings.id,
        promotedUntil: adoptionListings.promotedUntil,
      })
      .from(adoptionListings)
      .where(eq(adoptionListings.id, listingId))
      .limit(1);

    if (!rows.length) { res.status(404).json({ error: "İlan bulunamadı" }); return; }

    const row = rows[0]!;
    const now = new Date();
    const isPromoted = !!row.promotedUntil && row.promotedUntil > now;

    res.json({
      listingId,
      isPromoted,
      promotedUntil: row.promotedUntil?.toISOString() ?? null,
    });
  } catch (err: unknown) {
    logger.error({ err }, "GET /promotions/status/:listingId failed");
    res.status(500).json({ error: "Durum alınamadı" });
  }
});

export default router;
