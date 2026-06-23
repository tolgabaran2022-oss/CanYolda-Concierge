import { integer, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const featuredListings = pgTable("featured_listings", {
  id: text("id")
    .primaryKey()
    .default(sql`gen_random_uuid()::text`),
  listingId: text("listing_id").notNull(),
  userEmail: text("user_email").notNull(),
  stripeSessionId: text("stripe_session_id"),
  packageHours: integer("package_hours").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export type FeaturedListing = typeof featuredListings.$inferSelect;
export type InsertFeaturedListing = typeof featuredListings.$inferInsert;
