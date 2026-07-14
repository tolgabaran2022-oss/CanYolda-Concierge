import { Router, type IRouter } from "express";
import { db, adoptionListings, listingPromotions } from "@workspace/db";
import { and, eq, gt, desc } from "drizzle-orm";
import { storage } from "../storage.js";
import { extractUserId } from "../lib/jwtAuth.js";
import { logger } from "../lib/logger.js";

const router: IRouter = Router();

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
   We trust the JWT-authenticated user and activate the boost directly.
   In production, you'd also verify the receipt with RC REST API.
─────────────────────────────────────────────────────────────────*/
router.post("/boost/verify-iap", async (req, res): Promise<void> => {
  try {
    const { listingId, rcPackageIdentifier, durationDays, packageName } = req.body as {
      listingId: string;
      rcPackageIdentifier: string;
      durationDays: number;
      packageName: string;
    };

    if (!listingId || !rcPackageIdentifier || !durationDays || !packageName) {
      res.status(400).json({ error: "listingId, rcPackageIdentifier, durationDays ve packageName zorunludur" });
      return;
    }

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
      res.status(409).json({ error: "Bu ilan zaten öne çıkarılıyor", expiresAt: existing.expiresAt });
      return;
    }

    /* Activate the promotion immediately */
    const now = new Date();
    const expiresAt = new Date(now.getTime() + durationDays * 24 * 60 * 60 * 1000);

    await db.insert(listingPromotions).values({
      listingId,
      ownerId:            userId,
      packageId:          rcPackageIdentifier,
      packageName,
      durationDays,
      platform:           "iap",
      verifiedAt:         now,
      startsAt:           now,
      expiresAt,
      status:             "active",
    });

    logger.info({ listingId, userId, rcPackageIdentifier, durationDays }, "IAP boost activated");

    res.json({ success: true, expiresAt: expiresAt.toISOString() });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Satın alma doğrulanamadı";
    logger.error({ err }, "Failed to verify IAP boost");
    res.status(500).json({ error: msg });
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
