import { db } from "@workspace/db";
import { featuredListings } from "@workspace/db/schema";
import { getStripeSync } from "./stripeClient.js";
import { storage } from "./storage.js";
import { logger } from "./lib/logger.js";

export class WebhookHandlers {
  static async processWebhook(payload: Buffer, signature: string): Promise<void> {
    if (!Buffer.isBuffer(payload)) {
      throw new Error(
        "STRIPE WEBHOOK ERROR: Payload must be a Buffer. " +
          "Ensure webhook route is registered BEFORE app.use(express.json())."
      );
    }

    // Parse the raw event for application-level handling.
    // stripe-replit-sync's processWebhook handles signature verification internally.
    let event: { type: string; data: { object: Record<string, unknown> } };
    try {
      event = JSON.parse(payload.toString()) as typeof event;
    } catch {
      throw new Error("Invalid webhook payload — could not parse JSON");
    }

    if (event.type === "checkout.session.completed") {
      const session = event.data.object as {
        id: string;
        metadata?: Record<string, string>;
        payment_status?: string;
      };

      if (session.payment_status === "paid") {
        const meta = session.metadata ?? {};
        const listingId = meta.listing_id;
        const userEmail = meta.user_email;

        if (listingId && userEmail) {
          const packageHoursNum = parseInt(meta.package_hours ?? "72", 10);
          const durationDays = parseInt(meta.duration_days ?? String(Math.ceil(packageHoursNum / 24)), 10);
          const expiresAt = new Date(Date.now() + packageHoursNum * 60 * 60 * 1000);

          /* 1. Insert into featured_listings (backward compat) */
          try {
            await db.insert(featuredListings).values({
              listingId,
              userEmail,
              stripeSessionId: session.id,
              packageHours: packageHoursNum,
              expiresAt,
            });
            logger.info({ listingId, userEmail, packageHoursNum, expiresAt }, "Boost activated via webhook (featured_listings)");
          } catch (err: unknown) {
            logger.error({ err, sessionId: session.id }, "Failed to insert featured listing");
          }

          /* 2. Activate listing_promotions record */
          try {
            await storage.activateListingPromotion(session.id, durationDays);
            logger.info({ listingId, sessionId: session.id, durationDays }, "Listing promotion activated");
          } catch (err: unknown) {
            logger.warn({ err, sessionId: session.id }, "Failed to activate listing promotion (non-critical)");
          }
        } else {
          logger.warn({ sessionId: session.id }, "Boost webhook: missing listing_id or user_email in metadata");
        }
      }
    }

    // Let stripe-replit-sync handle data sync (verifies signature & syncs Stripe data to DB)
    try {
      const sync = await getStripeSync();
      await sync.processWebhook(payload, signature);
    } catch (err: unknown) {
      // Non-critical — sync failures don't affect our application logic above
      logger.warn({ err }, "StripeSync processWebhook error (non-critical)");
    }
  }
}
