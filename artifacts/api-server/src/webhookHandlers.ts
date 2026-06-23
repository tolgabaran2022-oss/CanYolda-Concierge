import { db } from "@workspace/db";
import { featuredListings } from "@workspace/db/schema";
import { getStripeSync } from "./stripeClient.js";
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
        const packageHours = parseInt(meta.package_hours ?? "24", 10);

        if (listingId && userEmail) {
          const expiresAt = new Date(Date.now() + packageHours * 60 * 60 * 1000);

          try {
            await db.insert(featuredListings).values({
              listingId,
              userEmail,
              stripeSessionId: session.id,
              packageHours,
              expiresAt,
            });

            logger.info(
              { listingId, userEmail, packageHours, expiresAt },
              "Boost activated via webhook"
            );
          } catch (err: unknown) {
            logger.error({ err, sessionId: session.id }, "Failed to insert featured listing");
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
