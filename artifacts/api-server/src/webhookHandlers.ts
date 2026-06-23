import { db } from "@workspace/db";
import { featuredListings } from "@workspace/db/schema";
import { getStripeClientAndSecret, getStripeSync } from "./stripeClient.js";
import { logger } from "./lib/logger.js";

export class WebhookHandlers {
  static async processWebhook(payload: Buffer, signature: string): Promise<void> {
    if (!Buffer.isBuffer(payload)) {
      throw new Error(
        "STRIPE WEBHOOK ERROR: Payload must be a Buffer. " +
          "Ensure webhook route is registered BEFORE app.use(express.json())."
      );
    }

    const { stripe, webhookSecret } = await getStripeClientAndSecret();

    if (!webhookSecret) {
      logger.warn("Webhook secret not configured — skipping signature verification");
      return;
    }

    let event: { type: string; data: { object: unknown } };
    try {
      event = stripe.webhooks.constructEvent(
        payload,
        signature,
        webhookSecret
      ) as typeof event;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new Error(`Webhook signature verification failed: ${msg}`);
    }

    if (event.type === "checkout.session.completed") {
      const session = event.data.object as {
        id: string;
        metadata?: Record<string, string>;
        payment_status?: string;
      };

      if (session.payment_status !== "paid") return;

      const meta = session.metadata ?? {};
      const listingId = meta.listing_id;
      const userEmail = meta.user_email;
      const packageHours = parseInt(meta.package_hours ?? "24", 10);

      if (!listingId || !userEmail) {
        logger.warn({ sessionId: session.id }, "Boost webhook: missing metadata");
        return;
      }

      const expiresAt = new Date(Date.now() + packageHours * 60 * 60 * 1000);

      await db.insert(featuredListings).values({
        listingId,
        userEmail,
        stripeSessionId: session.id,
        packageHours,
        expiresAt,
      });

      logger.info(
        { listingId, userEmail, packageHours, expiresAt },
        "Boost activated"
      );
    }

    try {
      const sync = await getStripeSync();
      await sync.processWebhook(payload, signature);
    } catch (err: unknown) {
      logger.warn({ err }, "StripeSync processWebhook non-critical error");
    }
  }
}
