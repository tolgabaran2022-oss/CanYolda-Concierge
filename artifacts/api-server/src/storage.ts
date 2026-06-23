import { db } from "@workspace/db";
import { featuredListings } from "@workspace/db/schema";
import { and, gt, inArray, sql } from "drizzle-orm";
import { getUncachableStripeClient } from "./stripeClient.js";

export interface BoostPackage {
  id: string;
  packageHours: number;
  priceId: string;
  unitAmount: number;
  currency: string;
  label: string;
  description: string;
}

export interface BoostStatus {
  isFeatured: boolean;
  expiresAt: string | null;
  packageHours: number | null;
}

export class Storage {
  async getBoostPackages(): Promise<BoostPackage[]> {
    try {
      const stripe = await getUncachableStripeClient();
      const products = await stripe.products.search({
        query: "metadata['boost_type']:'featured_listing' AND active:'true'",
      });

      const packages: BoostPackage[] = [];
      for (const product of products.data) {
        const prices = await stripe.prices.list({
          product: product.id,
          active: true,
          limit: 1,
        });
        if (!prices.data.length) continue;
        const price = prices.data[0]!;
        const hours = parseInt(product.metadata.package_hours ?? "24", 10);
        packages.push({
          id: product.id,
          packageHours: hours,
          priceId: price.id,
          unitAmount: price.unit_amount ?? 0,
          currency: price.currency,
          label: hours === 24 ? "24 Saatlik" : hours === 72 ? "72 Saatlik" : `${hours} Saatlik`,
          description: hours === 24 ? "1 gün öne çıkarma" : "3 gün öne çıkarma",
        });
      }
      return packages.sort((a, b) => a.unitAmount - b.unitAmount);
    } catch {
      return [];
    }
  }

  async getBoostStatus(listingIds: string[]): Promise<Record<string, BoostStatus>> {
    if (!listingIds.length) return {};

    const now = new Date();
    const rows = await db
      .select()
      .from(featuredListings)
      .where(
        and(
          inArray(featuredListings.listingId, listingIds),
          gt(featuredListings.expiresAt, now)
        )
      );

    const result: Record<string, BoostStatus> = {};
    for (const id of listingIds) {
      result[id] = { isFeatured: false, expiresAt: null, packageHours: null };
    }
    for (const row of rows) {
      result[row.listingId] = {
        isFeatured: true,
        expiresAt: row.expiresAt.toISOString(),
        packageHours: row.packageHours,
      };
    }
    return result;
  }

  async getMyBoosts(userEmail: string) {
    const now = new Date();
    return await db
      .select()
      .from(featuredListings)
      .where(
        and(
          sql`${featuredListings.userEmail} = ${userEmail}`,
          gt(featuredListings.expiresAt, now)
        )
      )
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
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS featured_listings_listing_id_idx ON featured_listings(listing_id)
    `);
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS featured_listings_expires_at_idx ON featured_listings(expires_at)
    `);
  }
}

export const storage = new Storage();
