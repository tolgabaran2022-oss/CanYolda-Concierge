import { db } from "@workspace/db";
import { featuredListings, listingPromotions, promotionPackages } from "@workspace/db/schema";
import { and, asc, desc, eq, gt, inArray, sql } from "drizzle-orm";
import { logger } from "./lib/logger.js";

export interface PromoPackage {
  id: string;
  code: string;
  name: string;
  durationDays: number;
  priceAmount: number;
  currency: string;
  badgeText: string | null;
  shortDescription: string;
  isPopular: boolean;
  displayOrder: number;
}

export interface BoostStatus {
  isFeatured: boolean;
  expiresAt: string | null;
  packageHours: number | null;
  packageName: string | null;
}

const FALLBACK_PACKAGES: PromoPackage[] = [
  { id: "fallback-1", code: "quick_3_days",    name: "Hızlı Öne Çıkar",      durationDays: 3,  priceAmount: 4990,  currency: "try", badgeText: null,                  shortDescription: "3 gün daha fazla kişiye ulaş.",      isPopular: false, displayOrder: 1 },
  { id: "fallback-2", code: "popular_7_days",  name: "Popüler",               durationDays: 7,  priceAmount: 9990,  currency: "try", badgeText: "EN ÇOK TERCİH EDİLEN", shortDescription: "7 gün güçlü görünürlük kazan.",     isPopular: true,  displayOrder: 2 },
  { id: "fallback-3", code: "maximum_15_days", name: "Maksimum Görünürlük",   durationDays: 15, priceAmount: 17990, currency: "try", badgeText: null,                  shortDescription: "15 gün boyunca ilanını öne taşı.",  isPopular: false, displayOrder: 3 },
];

export class Storage {
  async getBoostPackages(): Promise<PromoPackage[]> {
    try {
      const rows = await db
        .select()
        .from(promotionPackages)
        .where(eq(promotionPackages.isActive, true))
        .orderBy(asc(promotionPackages.displayOrder));

      if (!rows.length) return FALLBACK_PACKAGES;

      return rows.map((r) => ({
        id:               r.id,
        code:             r.code,
        name:             r.name,
        durationDays:     r.durationDays,
        priceAmount:      r.priceAmount,
        currency:         r.currency,
        badgeText:        r.badgeText ?? null,
        shortDescription: r.shortDescription,
        isPopular:        r.isPopular,
        displayOrder:     r.displayOrder,
      }));
    } catch {
      return FALLBACK_PACKAGES;
    }
  }

  async getBoostStatus(listingIds: string[]): Promise<Record<string, BoostStatus>> {
    if (!listingIds.length) return {};

    const now = new Date();
    const result: Record<string, BoostStatus> = {};
    for (const id of listingIds) {
      result[id] = { isFeatured: false, expiresAt: null, packageHours: null, packageName: null };
    }

    try {
      const rows = await db
        .select({
          listingId:   listingPromotions.listingId,
          expiresAt:   listingPromotions.expiresAt,
          durationDays: listingPromotions.durationDays,
          packageName: listingPromotions.packageName,
        })
        .from(listingPromotions)
        .where(
          and(
            inArray(listingPromotions.listingId, listingIds),
            eq(listingPromotions.status, "active"),
            gt(listingPromotions.expiresAt, now)
          )
        )
        .orderBy(desc(listingPromotions.createdAt));

      const seen = new Set<string>();
      for (const row of rows) {
        if (seen.has(row.listingId)) continue;
        seen.add(row.listingId);
        if (row.expiresAt) {
          result[row.listingId] = {
            isFeatured:  true,
            expiresAt:   row.expiresAt.toISOString(),
            packageHours: row.durationDays * 24,
            packageName: row.packageName,
          };
        }
      }
      return result;
    } catch {
      try {
        const rows = await db
          .select()
          .from(featuredListings)
          .where(and(inArray(featuredListings.listingId, listingIds), gt(featuredListings.expiresAt, now)));

        for (const row of rows) {
          result[row.listingId] = {
            isFeatured:  true,
            expiresAt:   row.expiresAt.toISOString(),
            packageHours: row.packageHours,
            packageName: null,
          };
        }
        return result;
      } catch {
        return result;
      }
    }
  }

  async createPendingPromotion(params: {
    listingId: string;
    ownerId: string;
    packageId: string;
    packageName: string;
    durationDays: number;
    stripeSessionId: string;
  }): Promise<void> {
    await db.insert(listingPromotions).values({
      listingId:       params.listingId,
      ownerId:         params.ownerId,
      packageId:       params.packageId,
      packageName:     params.packageName,
      durationDays:    params.durationDays,
      stripeSessionId: params.stripeSessionId,
      status:          "pending",
    });
  }

  async activateListingPromotion(stripeSessionId: string, durationDays: number): Promise<void> {
    const now      = new Date();
    const expiresAt = new Date(now.getTime() + durationDays * 24 * 60 * 60 * 1000);
    await db
      .update(listingPromotions)
      .set({ status: "active", startsAt: now, expiresAt, updatedAt: now })
      .where(eq(listingPromotions.stripeSessionId, stripeSessionId));
  }

  async getActivePromotion(listingId: string): Promise<{ packageName: string; expiresAt: string; durationDays: number } | null> {
    const now = new Date();
    const rows = await db
      .select()
      .from(listingPromotions)
      .where(
        and(
          eq(listingPromotions.listingId, listingId),
          eq(listingPromotions.status, "active"),
          gt(listingPromotions.expiresAt, now)
        )
      )
      .orderBy(desc(listingPromotions.createdAt))
      .limit(1);

    if (!rows.length || !rows[0].expiresAt) return null;
    return {
      packageName:  rows[0].packageName,
      expiresAt:    rows[0].expiresAt.toISOString(),
      durationDays: rows[0].durationDays,
    };
  }

  async activateBoost(params: {
    listingId: string;
    userEmail: string;
    packageId: string;
  }): Promise<{ expiresAt: string; packageHours: number }> {
    const HOURS: Record<string, number> = { standart: 24, premium: 24 * 7, vip: 24 * 30 };
    const packageHours = HOURS[params.packageId];
    if (!packageHours) throw new Error(`Invalid packageId: ${params.packageId}`);
    const expiresAt = new Date(Date.now() + packageHours * 3_600_000);
    await db.delete(featuredListings).where(eq(featuredListings.listingId, params.listingId));
    await db.insert(featuredListings).values({ listingId: params.listingId, userEmail: params.userEmail, packageHours, expiresAt });
    return { expiresAt: expiresAt.toISOString(), packageHours };
  }

  async getMyBoosts(userEmail: string) {
    const now = new Date();
    return await db
      .select()
      .from(featuredListings)
      .where(and(sql`${featuredListings.userEmail} = ${userEmail}`, gt(featuredListings.expiresAt, now)))
      .orderBy(featuredListings.expiresAt);
  }

  async ensureTable() {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS featured_listings (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        listing_id TEXT NOT NULL,
        user_email TEXT NOT NULL,
        stripe_session_id TEXT,
        package_hours INTEGER NOT NULL,
        expires_at TIMESTAMPTZ NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS featured_listings_listing_id_idx ON featured_listings(listing_id)`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS featured_listings_expires_at_idx ON featured_listings(expires_at)`);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS promotion_packages (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        code TEXT NOT NULL,
        name TEXT NOT NULL,
        duration_days INTEGER NOT NULL,
        price_amount INTEGER NOT NULL,
        currency TEXT NOT NULL DEFAULT 'try',
        badge_text TEXT,
        short_description TEXT NOT NULL DEFAULT '',
        is_popular BOOLEAN NOT NULL DEFAULT false,
        is_active BOOLEAN NOT NULL DEFAULT true,
        display_order INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    await db.execute(sql`CREATE UNIQUE INDEX IF NOT EXISTS promotion_packages_code_idx ON promotion_packages(code)`);

    await db.execute(sql`
      INSERT INTO promotion_packages (code, name, duration_days, price_amount, currency, short_description, is_popular, display_order)
      VALUES
        ('quick_3_days',    'Hızlı Öne Çıkar',    3,  4990,  'try', '3 gün daha fazla kişiye ulaş.',      false, 1),
        ('popular_7_days',  'Popüler',             7,  9990,  'try', '7 gün güçlü görünürlük kazan.',     true,  2),
        ('maximum_15_days', 'Maksimum Görünürlük', 15, 17990, 'try', '15 gün boyunca ilanını öne taşı.', false, 3)
      ON CONFLICT (code) DO NOTHING
    `);
    await db.execute(sql`
      UPDATE promotion_packages SET badge_text = 'EN ÇOK TERCİH EDİLEN'
      WHERE code = 'popular_7_days' AND badge_text IS NULL
    `);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS listing_promotions (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        listing_id TEXT NOT NULL REFERENCES adoption_listings(id) ON DELETE CASCADE,
        owner_id TEXT NOT NULL,
        package_id TEXT NOT NULL,
        stripe_session_id TEXT,
        store_transaction_id TEXT,
        revenuecat_app_user_id TEXT,
        product_identifier TEXT,
        platform TEXT,
        verified_at TIMESTAMPTZ,
        package_name TEXT NOT NULL DEFAULT '',
        duration_days INTEGER NOT NULL
          CONSTRAINT listing_promotions_duration_check CHECK (duration_days IN (1, 3, 7, 15)),
        starts_at TIMESTAMPTZ,
        expires_at TIMESTAMPTZ,
        status TEXT NOT NULL DEFAULT 'pending'
          CONSTRAINT listing_promotions_status_check CHECK (status IN ('pending','active','verified','processed','failed','refunded','revoked')),
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS listing_promotions_listing_id_idx ON listing_promotions(listing_id)`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS listing_promotions_session_id_idx ON listing_promotions(stripe_session_id)`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS listing_promotions_status_expires_idx ON listing_promotions(status, expires_at)`);
    await db.execute(sql`CREATE UNIQUE INDEX IF NOT EXISTS listing_promotions_store_tx_idx ON listing_promotions(store_transaction_id) WHERE store_transaction_id IS NOT NULL`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS listing_promotions_rc_user_idx ON listing_promotions(revenuecat_app_user_id) WHERE revenuecat_app_user_id IS NOT NULL`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS listing_promotions_owner_status_idx ON listing_promotions(owner_id, status)`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS listing_promotions_expires_idx ON listing_promotions(expires_at) WHERE expires_at IS NOT NULL`);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS stories (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        user_id TEXT NOT NULL,
        username TEXT NOT NULL,
        avatar_url TEXT NOT NULL DEFAULT '',
        image_url TEXT NOT NULL,
        caption TEXT NOT NULL DEFAULT '',
        created_at TIMESTAMPTZ DEFAULT NOW(),
        expires_at TIMESTAMPTZ NOT NULL
      )
    `);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS stories_user_id_idx ON stories(user_id)`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS stories_expires_at_idx ON stories(expires_at)`);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS story_views (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        story_id TEXT NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
        viewer_id TEXT NOT NULL,
        viewed_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(story_id, viewer_id)
      )
    `);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS story_views_story_id_idx ON story_views(story_id)`);
  }
}

export const storage = new Storage();
