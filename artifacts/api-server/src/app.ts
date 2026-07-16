import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import router from "./routes/index.js";
import { WebhookHandlers } from "./webhookHandlers.js";
import { handleRcWebhook } from "./routes/rcWebhook.js";
import { logger } from "./lib/logger.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app: Express = express();

/* ── RevenueCat webhook ─────────────────────────────────────────────────────
   Registered BEFORE global express.json() so the body arrives as a raw Buffer.
   No JWT auth middleware — the handler authenticates via Authorization header
   and HMAC-SHA256 signature internally.
──────────────────────────────────────────────────────────────────────────── */
app.post(
  "/api/webhooks/revenuecat",
  express.raw({ type: "application/json" }),
  async (req, res): Promise<void> => {
    await handleRcWebhook(req.body as Buffer, req, res);
  }
);

/* ── Stripe webhook ─────────────────────────────────────────────────────── */
app.post(
  "/api/stripe/webhook",
  express.raw({ type: "application/json" }),
  async (req, res): Promise<void> => {
    const signature = req.headers["stripe-signature"];
    if (!signature) {
      res.status(400).json({ error: "Missing stripe-signature" });
      return;
    }

    try {
      const sig = Array.isArray(signature) ? signature[0] : signature;

      if (!Buffer.isBuffer(req.body)) {
        logger.error(
          "STRIPE WEBHOOK ERROR: req.body is not a Buffer — check middleware order"
        );
        res.status(500).json({ error: "Webhook processing error" });
        return;
      }

      await WebhookHandlers.processWebhook(req.body as Buffer, sig);
      res.status(200).json({ received: true });
    } catch (err: unknown) {
      logger.error({ err }, "Webhook error");
      res.status(400).json({ error: "Webhook processing error" });
    }
  }
);

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  })
);
app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

const uploadsDir = path.resolve(__dirname, "../../uploads");
app.use("/api/uploads", express.static(uploadsDir));

app.use("/api", router);

export default app;
