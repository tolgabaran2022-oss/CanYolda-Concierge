/**
 * promotionLedger.ts
 *
 * Server-only service for safe, ledger-based promotion recalculation.
 *
 * Design: After a refund or revocation, we cannot naively subtract time from
 * `promoted_until` because promotions are stacked. Instead we recompute the
 * correct `promoted_until` from the stored contribution records:
 *
 *   → max(promotion_expires_at) over all "processed" (non-refunded/revoked/failed)
 *     listing_promotion_purchases for the listing.
 *
 * This is conservative (may round in the user's favour in complex multi-stack
 * refund scenarios) but never removes valid unrefunded promotion time.
 *
 * Never called from mobile/client routes.
 */
import {
  db,
  adoptionListings,
  listingPromotionPurchases,
} from "@workspace/db";
import { and, eq, inArray, not, isNotNull } from "drizzle-orm";
import { sql } from "drizzle-orm";
import { logger } from "../lib/logger.js";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

const INVALID_STATUSES = ["refunded", "revoked", "failed"] as const;

/**
 * Recalculate the promotion window for a listing from its ledger.
 *
 * Loads all `processed` purchases that are NOT refunded/revoked/failed, then
 * sets `adopted_listings.promoted_until` to the furthest `promotion_expires_at`
 * among those purchases. If none exist the listing is set to un-promoted (null).
 *
 * @param listingId  UUID of the adoption listing.
 * @param tx         Optional Drizzle transaction to participate in.
 * @returns          The new promoted_until Date, or null if no active promotion.
 */
export async function recalculateListingPromotion(
  listingId: string,
  tx?: Tx
): Promise<Date | null> {
  const engine = tx ?? db;

  /* Load all valid (non-invalid-status, processed) purchase contribution records */
  const validPurchases = await engine
    .select({
      id:                 listingPromotionPurchases.id,
      promotionExpiresAt: listingPromotionPurchases.promotionExpiresAt,
    })
    .from(listingPromotionPurchases)
    .where(
      and(
        eq(listingPromotionPurchases.listingId, listingId),
        eq(listingPromotionPurchases.purchaseStatus, "processed"),
        isNotNull(listingPromotionPurchases.promotionExpiresAt),
        not(
          inArray(listingPromotionPurchases.purchaseStatus, [...INVALID_STATUSES])
        )
      )
    );

  /* Determine the new promoted_until: max(promotionExpiresAt) across valid records */
  let newPromotedUntil: Date | null = null;
  for (const row of validPurchases) {
    const exp = row.promotionExpiresAt;
    if (!exp) continue;
    if (!newPromotedUntil || exp > newPromotedUntil) {
      newPromotedUntil = exp;
    }
  }

  /* Atomically update the listing */
  await engine
    .update(adoptionListings)
    .set({
      promotedUntil: newPromotedUntil,
      updatedAt:     sql`now()`,
    })
    .where(eq(adoptionListings.id, listingId));

  logger.info(
    {
      listingId,
      validPurchaseCount: validPurchases.length,
      newPromotedUntil:   newPromotedUntil?.toISOString() ?? null,
    },
    "Promotion ledger recalculated"
  );

  return newPromotedUntil;
}
