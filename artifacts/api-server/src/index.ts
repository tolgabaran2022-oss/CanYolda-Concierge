import app from "./app.js";
import { logger } from "./lib/logger.js";
import { storage } from "./storage.js";
import { runMigrations } from "stripe-replit-sync";
import { getStripeSync } from "./stripeClient.js";

async function initDatabase() {
  await storage.ensureTable();
  logger.info("App tables ready");
}

async function initStripe() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    logger.warn("DATABASE_URL not set — Stripe integration disabled");
    return;
  }

  try {
    logger.info("Initializing Stripe schema...");
    await runMigrations({ databaseUrl });
    logger.info("Stripe schema ready");

    const stripeSync = await getStripeSync();

    const domains = process.env.REPLIT_DOMAINS?.split(",") ?? [];
    if (domains.length > 0) {
      const webhookBaseUrl = `https://${domains[0]}`;
      await stripeSync.findOrCreateManagedWebhook(
        `${webhookBaseUrl}/api/stripe/webhook`
      );
      logger.info("Stripe webhook configured");
    }

    stripeSync.syncBackfill().then(() => {
      logger.info("Stripe data synced");
    }).catch((err: unknown) => {
      logger.error({ err }, "Stripe backfill error");
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.warn(
      { err: msg },
      "Stripe initialization skipped — connect Stripe via the Integrations tab to enable payments"
    );
  }
}

const rawPort = process.env["PORT"];
if (!rawPort) {
  throw new Error("PORT environment variable is required but was not provided.");
}

const port = Number(rawPort);
if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

await initDatabase();
await initStripe();

app.listen(port, (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }
  logger.info({ port }, "Server listening");
});
