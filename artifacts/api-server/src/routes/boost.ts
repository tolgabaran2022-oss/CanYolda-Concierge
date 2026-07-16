import { Router, type IRouter } from "express";
import { db, adoptionListings, listingPromotions } from "@workspace/db";
import { and, eq, gt, desc } from "drizzle-orm";
import { storage } from "../storage.js";
import { extractUserId } from "../lib/jwtAuth.js";
import { logger } from "../lib/logger.js";

const router: IRouter = Router();

/* ── Server-side package → duration mapping ──────────────────────
   The client MUST NOT control durationDays directly.
   The server resolves it from the verified package identifier.
   Allowed values match the CHECK constraint on listing_promotions.
─────────────────────────────────────────────────────────────────*/
const RC_PACKAGE_MAP: Record<string, { durationDays: 1 | 3 | 7; label: string }> = {
  boost_1_day:  { durationDays: 1, label: "1 Günlük Boost" },
  boost_3_days: { durationDays: 3, label: "3 Günlük Boost" },
  boost_7_days: { durationDays: 7, label: "7 Günlük Boost" },
};

/* ── GET /api/boost/packages ──────────────────────────────────── */
router.get("/boost/packages", async (_req, res): Promise<void> => {
  try {
    const packages = await storage.getBoostPackages();
    res.json({ data: packages });
  } catch (err: unknown) {
    logger.error({ err }, "Failed to fetch boost packages");
    res.status(500).json({ error: "Failed to fetch packages" });
  }
});

/* ── POST /api/boost/verify-iap ────────────────────────────────
   Called by the mobile app after a successful RevenueCat purchase.

   Security properties:
   - JWT authentication required (extractUserId throws on failure)
   - Listing ownership verified before any write
   - durationDays resolved server-side from rcPackageIdentifier (client cannot spoof duration)
   - store_transaction_id unique constraint prevents double-activation at DB level
   - Active promotion guard prevents extension without a new transaction
─────────────────────────────────────────────────────────────────*/
router.post("/boost/verify-iap", async (req, res): Promise<void> => {
  try {
    const {
      listingId,
      rcPackageIdentifier,
      rcTransactionId,
      rcUserId,
      productIdentifier,
    } = req.body as {
      listingId:            string;
      rcPackageIdentifier:  string;
      rcTransactionId?:     string;
      rcUserId?:            string;
      productIdentifier?:   string;
    };

    if (!listingId || !rcPackageIdentifier) {
      res.status(400).json({ error: "listingId ve rcPackageIdentifier zorunludur" });
      return;
    }

    /* Resolve duration from server-side map — client cannot inject arbitrary duration */
    const pkg = RC_PACKAGE_MAP[rcPackageIdentifier];
    if (!pkg) {
      res.status(400).json({ error: `Geçersiz paket tanımlayıcı: ${rcPackageIdentifier}` });
      return;
    }
    const { durationDays, label: packageName } = pkg;

    /* Require authenticated user */
    let userId: string;
    try {
      userId = extractUserId(req);
      if (!userId) throw new Error("No user");
    } catch {
      res.status(401).json({ error: "Bu işlem için giriş yapmanız gerekiyor" });
      return;
    }

    /* Look up the listing and verify ownership */
    const listingRows = await db
      .select({ id: adoptionListings.id, userId: adoptionListings.userId })
      .from(adoptionListings)
      .where(eq(adoptionListings.id, listingId))
      .limit(1);

    if (!listingRows.length) {
      res.status(404).json({ error: "İlan bulunamadı" });
      return;
    }
    const listing = listingRows[0]!;

    if (listing.userId !== userId) {
      res.status(403).json({ error: "Bu ilan size ait değil" });
      return;
    }

    /* Block double-purchase while an active promotion exists */
    const existing = await storage.getActivePromotion(listingId);
    if (existing) {
      res.status(409).json({
        error: "Bu ilan zaten öne çıkarılıyor",
        expiresAt: existing.expiresAt,
      });
      return;
    }

    /* Activate the promotion immediately.
       store_transaction_id unique index at DB level prevents concurrent duplicates. */
    const now = new Date();
    const expiresAt = new Date(now.getTime() + durationDays * 24 * 60 * 60 * 1000);

    await db.insert(listingPromotions).values({
      listingId,
      ownerId:            userId,
      packageId:          rcPackageIdentifier,
      packageName,
      durationDays,
      platform:           "iap",
      storeTransactionId: rcTransactionId ?? null,
      revenuecatAppUserId: rcUserId ?? null,
      productIdentifier:  productIdentifier ?? null,
      verifiedAt:         now,
      startsAt:           now,
      expiresAt,
      status:             "active",
    });

    logger.info(
      { listingId, userId, rcPackageIdentifier, durationDays, rcTransactionId },
      "IAP boost activated"
    );

    res.json({ success: true, expiresAt: expiresAt.toISOString() });
  } catch (err: unknown) {
    /* Unique constraint violation = duplicate transaction */
    const msg = err instanceof Error ? err.message : "";
    if (msg.includes("store_transaction_id") || msg.includes("listing_promotions_store_tx_idx")) {
      logger.warn({ err }, "Duplicate IAP transaction rejected");
      res.status(409).json({ error: "Bu işlem daha önce işlendi" });
      return;
    }
    logger.error({ err }, "Failed to verify IAP boost");
    res.status(500).json({ error: "Satın alma doğrulanamadı" });
  }
});

/* ── POST /api/boost/status ──────────────────────────────────── */
router.post("/boost/status", async (req, res): Promise<void> => {
  try {
    const { listingIds } = req.body as { listingIds: string[] };
    if (!Array.isArray(listingIds)) {
      res.status(400).json({ error: "listingIds must be an array" });
      return;
    }
    const status = await storage.getBoostStatus(listingIds);
    res.json({ data: status });
  } catch (err: unknown) {
    logger.error({ err }, "Failed to fetch boost status");
    res.status(500).json({ error: "Failed to fetch status" });
  }
});

/* ── GET /api/boost/my-boosts ─────────────────────────────────── */
router.get("/boost/my-boosts", async (req, res): Promise<void> => {
  try {
    let userId: string;
    try {
      userId = extractUserId(req);
    } catch {
      res.status(401).json({ error: "Giriş yapmanız gerekiyor" });
      return;
    }
    const now = new Date();
    const rows = await db
      .select()
      .from(listingPromotions)
      .where(
        and(
          eq(listingPromotions.ownerId, userId),
          eq(listingPromotions.status, "active"),
          gt(listingPromotions.expiresAt, now)
        )
      )
      .orderBy(desc(listingPromotions.expiresAt));
    res.json({ data: rows });
  } catch (err: unknown) {
    logger.error({ err }, "Failed to fetch user boosts");
    res.status(500).json({ error: "Failed to fetch boosts" });
  }
});

export default router;
