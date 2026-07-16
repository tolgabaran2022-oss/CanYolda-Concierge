import express, { type Express } from "express";
import cors from "cors";
import helmet from "helmet";
import pinoHttp from "pino-http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import router from "./routes/index.js";
import { WebhookHandlers } from "./webhookHandlers.js";
import { handleRcWebhook } from "./routes/rcWebhook.js";
import { logger } from "./lib/logger.js";
import { generalLimiter } from "./lib/rateLimiter.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app: Express = express();

/* ── Trust proxy (Replit reverse proxy) ──────────────────────────────────── */
app.set("trust proxy", 1);

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

/* ── Security headers (Helmet) ──────────────────────────────────────────── */
app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
    hsts: process.env.NODE_ENV === "production"
      ? { maxAge: 31536000, includeSubDomains: true }
      : false,
  })
);

/* Permissions-Policy — not included in helmet defaults */
app.use((_req, res, next) => {
  res.setHeader(
    "Permissions-Policy",
    "geolocation=(), microphone=(), camera=(), payment=()"
  );
  next();
});

/* ── CORS ───────────────────────────────────────────────────────────────── */
const replitDomains = (process.env.REPLIT_DOMAINS ?? "")
  .split(",")
  .map((d) => d.trim())
  .filter(Boolean)
  .map((d) => `https://${d}`);

const extraOrigins = (process.env.ALLOWED_ORIGINS ?? "")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

const allowedOrigins = new Set([...replitDomains, ...extraOrigins]);

app.use(
  cors({
    origin(origin, callback) {
      /* Mobile apps and curl don't send Origin — allow them */
      if (!origin) return callback(null, true);

      /* Allow any Replit preview / production domain (prefix match) */
      const replitMatch = replitDomains.some(
        (d) => origin === d || origin.endsWith(".replit.dev") || origin.endsWith(".replit.app")
      );
      if (replitMatch) return callback(null, true);

      /* Allow explicitly configured origins */
      if (allowedOrigins.has(origin)) return callback(null, true);

      /* In development allow all origins */
      if (process.env.NODE_ENV !== "production") return callback(null, true);

      return callback(new Error(`CORS: origin "${origin}" is not allowed`));
    },
    credentials: true,
  })
);

/* ── General rate limiting ──────────────────────────────────────────────── */
app.use("/api", generalLimiter);

/* ── Logging ────────────────────────────────────────────────────────────── */
app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id:     req.id,
          method: req.method,
          url:    req.url?.split("?")[0],
          /* Never log Authorization, Cookie, or x-user-id headers */
        };
      },
      res(res) {
        return { statusCode: res.statusCode };
      },
    },
  })
);

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

const uploadsDir = path.resolve(__dirname, "../../uploads");
app.use("/api/uploads", express.static(uploadsDir));

app.use("/api", router);

export default app;
