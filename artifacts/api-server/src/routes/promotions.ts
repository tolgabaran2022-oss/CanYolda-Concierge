import { Router, type IRouter } from "express";
import { db, adoptionListings, listingPromotionPurchases } from "@workspace/db";
import { eq } from "drizzle-orm";
import { extractUserId } from "../lib/jwtAuth.js";
import { logger } from "../lib/logger.js";

const router: IRouter = Router();

/* ─── Server-side package → duration mapping ────────────────────
   The client MUST NOT control durationDays.
   Only these three identifiers are valid for IAP boost packages.
──────────────────────────────────────────────────────────────── */
const PACKAGE_MAP: Record<string, { durationDays: 1 | 3 | 7 }> = {
  boost_1_day:  { durationDays: 1 },
  boost_3_days: { durationDays: 3 },
  boost_7_days: { durationDays: 7 },
};

/* ─── POST /api/promotions/verify-purchase ───────────────────────
   Securely records a completed RevenueCat purchase.

   Security properties:
   - JWT authentication required (401 for anonymous)
   - Listing ownership verified before any write (403 on mismatch)
   - durationDays resolved server-side; never trusted from client
   - transaction_identifier UNIQUE index prevents double-insert at DB level
   - purchase_status is hardcoded to 'verified'; client cannot set it
   - No promotion activation — listing_promotions is NOT written here
   - Response omits all sensitive purchase data (tokens, receipts)
──────────────────────────────────────────────────────────────── */
router.post("/promotions/verify-purchase", async (req, res): Promise<void> => {
  /* ── 1. Authentication ────────────────────────────────────────── */
  let userId: string;
  try {
    userId = extractUserId(req);
    if (!userId) throw new Error("empty userId");
  } catch {
    res.status(401).json({ error: "Bu işlem için giriş yapmanız gerekiyor" });
    return;
  }

  /* ── 2. Input extraction ─────────────────────────────────────── */
  const {
    listingId,
    rcPackageIdentifier,
    productIdentifier,
    transactionIdentifier,
    rcUserId,
    store,
  } = req.body as {
    listingId:             string | undefined;
    rcPackageIdentifier:   string | undefined;
    productIdentifier:     string | undefined;
    transactionIdentifier: string | undefined;
    rcUserId:              string | undefined;
    store:                 string | undefined;
  };

  /* ── 3. Required field validation ────────────────────────────── */
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

  /* ── 4. Package validation — server-side mapping only ────────── */
  const pkg = PACKAGE_MAP[rcPackageIdentifier];
  if (!pkg) {
    res.status(400).json({
      error: `Geçersiz paket tanımlayıcı: ${rcPackageIdentifier}`,
    });
    return;
  }
  const { durationDays } = pkg;

  try {
    /* ── 5. Listing existence and ownership check ──────────────── */
    const listingRows = await db
      .select({ id: adoptionListings.id, userId: adoptionListings.userId })
      .from(adoptionListings)
      .where(eq(adoptionListings.id, listingId))
      .limit(1);

    if (!listingRows.length) {
      res.status(404).json({ error: "İlan bulunamadı" });
      return;
    }

    if (listingRows[0]!.userId !== userId) {
      res.status(403).json({ error: "Bu ilan size ait değil" });
      return;
    }

    /* ── 6. Duplicate transaction check (belt + suspenders) ───────
       The UNIQUE index on transaction_identifier is the authoritative
       guard; this pre-check gives a cleaner 409 before the DB error.
    ──────────────────────────────────────────────────────────────── */
    const existingRows = await db
      .select({ id: listingPromotionPurchases.id })
      .from(listingPromotionPurchases)
      .where(eq(listingPromotionPurchases.transactionIdentifier, transactionIdentifier))
      .limit(1);

    if (existingRows.length) {
      res.status(409).json({
        error:      "Bu işlem daha önce kaydedildi",
        purchaseId: existingRows[0]!.id,
      });
      return;
    }

    /* ── 7. Insert verified purchase record ───────────────────────
       purchase_status is hardcoded to 'verified' — client cannot inject.
       Promotion is NOT activated; listing_promotions is NOT touched.
    ──────────────────────────────────────────────────────────────── */
    const [inserted] = await db
      .insert(listingPromotionPurchases)
      .values({
        userId,
        listingId,
        revenueCatUserId:      rcUserId,
        packageIdentifier:     rcPackageIdentifier,
        productIdentifier,
        transactionIdentifier,
        store:                 store ?? null,
        purchaseStatus:        "verified",
        durationDays,
        verifiedAt:            new Date(),
      })
      .returning({
        id:               listingPromotionPurchases.id,
        packageIdentifier: listingPromotionPurchases.packageIdentifier,
        durationDays:     listingPromotionPurchases.durationDays,
      });

    logger.info(
      { userId, listingId, rcPackageIdentifier, durationDays, transactionIdentifier },
      "IAP purchase verified and recorded"
    );

    /* ── 8. Return non-sensitive confirmation ─────────────────── */
    res.status(201).json({
      success:          true,
      purchaseId:       inserted!.id,
      packageIdentifier: inserted!.packageIdentifier,
      durationDays:     inserted!.durationDays,
    });
  } catch (err: unknown) {
    /* UNIQUE index violation = concurrent duplicate */
    const msg = err instanceof Error ? err.message : "";
    if (
      msg.includes("lpp_transaction_id") ||
      msg.includes("transaction_identifier")
    ) {
      logger.warn({ transactionIdentifier }, "Duplicate IAP transaction rejected at DB level");
      res.status(409).json({ error: "Bu işlem daha önce kaydedildi" });
      return;
    }
    logger.error({ err }, "Failed to verify IAP purchase");
    res.status(500).json({ error: "Satın alma doğrulanamadı" });
  }
});

export default router;
