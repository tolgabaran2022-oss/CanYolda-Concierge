import { validateEnv } from "./lib/env.js";

/* ── Fail-fast: validate required environment variables FIRST ─────────────
   Imports below pull in route modules that read JWT_SECRET / DATABASE_URL.
   We validate before the server handles any requests so a mis-configured
   deployment fails loudly at boot rather than silently at runtime.
──────────────────────────────────────────────────────────────────────────── */
validateEnv();

import app from "./app.js";
import { logger } from "./lib/logger.js";
import { storage } from "./storage.js";
import { runMigrations } from "stripe-replit-sync";
import { getStripeSync } from "./stripeClient.js";
import { startNotificationWorker } from "./lib/notificationWorker.js";
import { startReminderScheduler } from "./lib/reminderScheduler.js";

/* ── Global unhandled rejection handler ──────────────────────────────────── */
process.on("unhandledRejection", (reason: unknown) => {
  logger.error({ reason }, "Unhandled Promise rejection — this is a bug, fix it");
});

process.on("uncaughtException", (err: Error) => {
  logger.fatal({ err }, "Uncaught exception — shutting down");
  process.exit(1);
});

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

/* ── Start in-process background workers ─────────────────────────── */
startNotificationWorker();
startReminderScheduler();

const server = app.listen(port, "0.0.0.0", () => {
  logger.info({ port, host: "0.0.0.0" }, "Server listening");
});

server.on("error", (err: NodeJS.ErrnoException) => {
  logger.fatal({ err }, "Server failed to bind — shutting down");
  process.exit(1);
});
