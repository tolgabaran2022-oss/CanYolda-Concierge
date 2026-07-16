/**
 * rateLimiter.ts — Express rate limiter factory.
 *
 * Different limits for different endpoint groups.
 * Keyed by IP address; in-memory store (single process).
 * For multi-instance deployments, replace with a Redis store.
 */
import rateLimit, { type Options } from "express-rate-limit";

function make(opts: Partial<Options>) {
  return rateLimit({
    standardHeaders: true,
    legacyHeaders:   false,
    message:         { error: "Çok fazla istek gönderildi, lütfen biraz bekleyin." },
    keyGenerator:    (req) => {
      const fwd = req.headers["x-forwarded-for"];
      const raw = Array.isArray(fwd) ? fwd[0] : fwd ?? req.socket.remoteAddress ?? "unknown";
      return raw.split(",")[0]!.trim();
    },
    ...opts,
  });
}

/** Login / Register — 10 attempts per 15 min */
export const authLimiter = make({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: "Çok fazla giriş denemesi. 15 dakika sonra tekrar deneyin." },
});

/** Password reset — 5 per hour */
export const passwordResetLimiter = make({
  windowMs: 60 * 60 * 1000,
  max: 5,
  message: { error: "Çok fazla şifre sıfırlama isteği. 1 saat sonra tekrar deneyin." },
});

/** Image upload — 20 per minute */
export const uploadLimiter = make({
  windowMs: 60 * 1000,
  max: 20,
  message: { error: "Çok fazla yükleme isteği. 1 dakika sonra tekrar deneyin." },
});

/** Content creation (animal reports, adoption listings) — 30 per 10 min */
export const createLimiter = make({
  windowMs: 10 * 60 * 1000,
  max: 30,
  message: { error: "Çok fazla oluşturma isteği. 10 dakika sonra tekrar deneyin." },
});

/** Promotion / RevenueCat verification — 20 per 10 min */
export const promotionLimiter = make({
  windowMs: 10 * 60 * 1000,
  max: 20,
  message: { error: "Çok fazla promosyon isteği. 10 dakika sonra tekrar deneyin." },
});

/** Chat / Messages — 60 per minute */
export const chatLimiter = make({
  windowMs: 60 * 1000,
  max: 60,
  message: { error: "Çok fazla mesaj isteği. 1 dakika sonra tekrar deneyin." },
});

/** General API — 300 per minute (broad protection) */
export const generalLimiter = make({
  windowMs: 60 * 1000,
  max: 300,
});
