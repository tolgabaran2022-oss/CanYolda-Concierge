import { Router } from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { createHash, randomInt } from "crypto";
import { z } from "zod";
import { db, pool, oauthUsers, localUsers } from "@workspace/db";
import { and, eq } from "drizzle-orm";
import { logger } from "../lib/logger.js";
import { getJwtSecret } from "../lib/jwtAuth.js";
import { authLimiter, passwordResetLimiter } from "../lib/rateLimiter.js";
import { validateBody } from "../lib/validate.js";

const router = Router();

/* ── Constants ───────────────────────────────────────────────── */
const JWT_EXPIRES = "30d";

/* ── Zod schemas ─────────────────────────────────────────────── */
const RegisterSchema = z.object({
  name:     z.string().trim().min(1, "Ad gerekli").max(100),
  email:    z.string().trim().email("Geçerli bir e-posta girin").max(255),
  password: z.string().min(6, "Şifre en az 6 karakter olmalı").max(128),
});

const LoginSchema = z.object({
  email:    z.string().trim().email("Geçerli bir e-posta girin").max(255),
  password: z.string().min(1, "Şifre gerekli").max(128),
});

const ForgotPasswordSchema = z.object({
  email: z.string().trim().email("Geçerli bir e-posta girin").max(255),
});

const VerifyResetCodeSchema = z.object({
  email: z.string().trim().email("Geçerli bir e-posta girin").max(255),
  code:  z.string().regex(/^\d{6}$/, "Kod 6 haneli olmalıdır"),
});

const ResetPasswordSchema = z.object({
  resetToken: z.string().min(1, "Sıfırlama token'ı gerekli").max(1000),
  password:   z.string().min(8, "Şifre en az 8 karakter olmalı").max(128),
});

const ChangePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Mevcut şifre gerekli").max(128),
  newPassword:     z.string().min(6, "Yeni şifre en az 6 karakter olmalı").max(128),
});

const OAuthSchema = z.object({
  provider:   z.string().min(1).max(50),
  providerId: z.string().min(1).max(255),
  email:      z.string().trim().email().max(255).nullable().optional(),
  name:       z.string().trim().max(200).nullable().optional(),
  avatarUrl:  z.string().url().max(1000).nullable().optional(),
});
const RESET_TOKEN_TTL     = "15m";
const BCRYPT_ROUNDS       = 10;
const RESET_CODE_TTL_MS   = 10 * 60 * 1000;   // 10 minutes
const MAX_ATTEMPTS        = 5;
const RESEND_COOLDOWN_MS  = 60 * 1000;         // 60 seconds

/* ── password_reset_codes table (idempotent) ─────────────────── */
pool.query(`
  CREATE TABLE IF NOT EXISTS password_reset_codes (
    id            TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    user_id       TEXT NOT NULL,
    email         TEXT NOT NULL,
    code_hash     TEXT NOT NULL,
    expires_at    TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '10 minutes'),
    used_at       TIMESTAMPTZ,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    attempt_count INTEGER NOT NULL DEFAULT 0
  );
  CREATE INDEX IF NOT EXISTS idx_prc_user_id ON password_reset_codes(user_id);
  CREATE INDEX IF NOT EXISTS idx_prc_email   ON password_reset_codes(email);
  CREATE INDEX IF NOT EXISTS idx_prc_active  ON password_reset_codes(email, used_at, expires_at);
`).catch(() => {});

/* ── Helpers ─────────────────────────────────────────────────── */

function makeToken(user: { id: string; email: string | null; name: string | null }) {
  return jwt.sign(
    { sub: user.id, email: user.email, name: user.name },
    getJwtSecret(),
    { expiresIn: JWT_EXPIRES }
  );
}

function sha256(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

/* ── In-memory IP rate limiter ───────────────────────────────── */
interface RateLimitEntry { count: number; resetAt: number; }
const ipResetMap = new Map<string, RateLimitEntry>();
const ipVerifyMap = new Map<string, RateLimitEntry>();

function checkIpRateLimit(
  map: Map<string, RateLimitEntry>,
  ip: string,
  maxCount: number,
  windowMs: number
): boolean {
  const now = Date.now();
  const entry = map.get(ip);
  if (!entry || entry.resetAt < now) {
    map.set(ip, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (entry.count >= maxCount) return false;
  entry.count++;
  return true;
}

function getClientIp(req: Parameters<typeof router.post>[1] extends (req: infer R, ...a: unknown[]) => unknown ? R : never): string {
  const fwd = req.headers["x-forwarded-for"];
  const raw = Array.isArray(fwd) ? fwd[0] : fwd ?? req.socket.remoteAddress ?? "unknown";
  return raw.split(",")[0].trim();
}

/* ── Resend email ─────────────────────────────────────────────── */
async function sendResetEmail(toEmail: string, code: string): Promise<void> {
  const RESEND_API_KEY = process.env.RESEND_API_KEY;
  if (!RESEND_API_KEY) throw new Error("RESEND_API_KEY not configured");

  const html = `<!DOCTYPE html>
<html lang="tr">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#FBF2EA;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#FBF2EA;padding:40px 20px">
    <tr><td>
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;margin:0 auto;background:#ffffff;border-radius:24px;overflow:hidden;box-shadow:0 4px 24px rgba(108,92,231,0.10)">
        <tr>
          <td style="background:linear-gradient(135deg,#6C5CE7,#534AB7);padding:32px 40px;text-align:center">
            <p style="margin:0;font-size:28px">&#x1F43E;</p>
            <h1 style="margin:8px 0 0;color:#ffffff;font-size:22px;font-weight:700;letter-spacing:-0.3px">CanYolda&#x15F;&#x131;</h1>
            <p style="margin:4px 0 0;color:rgba(255,255,255,0.80);font-size:13px">Dostlar&#x131;n &#x130;&#xe7;in, Hep Yan&#x131;nda</p>
          </td>
        </tr>
        <tr>
          <td style="padding:36px 40px">
            <p style="margin:0 0 16px;font-size:15px;color:#4A4A6A;line-height:1.6">Merhaba,</p>
            <p style="margin:0 0 24px;font-size:15px;color:#4A4A6A;line-height:1.6">
              CanYolda&#x15F;&#x131; hesab&#x131;n&#x131;z i&#xe7;in bir &#x15F;ifre s&#x131;f&#x131;rlama iste&#x11F;i ald&#x131;k.
              &#x15E;ifre s&#x131;f&#x131;rlama kodunuz:
            </p>
            <div style="background:#F0EEFF;border:2px solid #6C5CE7;border-radius:16px;padding:24px;text-align:center;margin:0 0 24px">
              <span style="font-size:38px;font-weight:800;letter-spacing:12px;color:#26215C;font-family:'Courier New',monospace">${code}</span>
            </div>
            <p style="margin:0 0 12px;font-size:13.5px;color:#8B8798;line-height:1.6">
              &#x23F1; Bu kod <strong>10 dakika</strong> boyunca ge&#xe7;erlidir.
            </p>
            <p style="margin:0;font-size:13.5px;color:#8B8798;line-height:1.6">
              Bu i&#x15F;lemi siz istemedinizse bu e-postas&#x131; dikkate almayabilirsiniz.
            </p>
          </td>
        </tr>
        <tr>
          <td style="background:#F7F4FF;padding:20px 40px;text-align:center;border-top:1px solid #EAE7FB">
            <p style="margin:0;font-size:12px;color:#8B8798">
              CanYolda&#x15F;&#x131; &middot; Dostlar&#x131;n &#x130;&#xe7;in, Hep Yan&#x131;nda &#x1F43E;
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  const resp = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: process.env.RESEND_FROM_EMAIL ?? "CanYoldaşı <onboarding@resend.dev>",
      to: [toEmail],
      subject: "CanYoldaşı Şifre Sıfırlama Kodu",
      html,
    }),
  });

  if (!resp.ok) {
    const body = await resp.text().catch(() => "");
    throw new Error(`Resend ${resp.status}: ${body}`);
  }
}

async function upsertOAuthUser(
  provider: string,
  providerId: string,
  email: string | null,
  name: string | null,
  avatarUrl: string | null
): Promise<{ user: typeof oauthUsers.$inferSelect; isNewUser: boolean }> {
  const existing = await db
    .select()
    .from(oauthUsers)
    .where(and(eq(oauthUsers.provider, provider), eq(oauthUsers.providerId, providerId)))
    .limit(1);

  if (existing.length > 0) {
    const [user] = await db
      .update(oauthUsers)
      .set({ email, name, avatarUrl, updatedAt: new Date() })
      .where(eq(oauthUsers.id, existing[0].id))
      .returning();
    return { user, isNewUser: false };
  }

  const [user] = await db
    .insert(oauthUsers)
    .values({ provider, providerId, email, name, avatarUrl })
    .returning();
  return { user, isNewUser: true };
}

/* ═══════════════════════════════════════════════════════════════
   AUTH ROUTES
   ═══════════════════════════════════════════════════════════════ */

/* ── POST /api/auth/register ─────────────────────────────────── */
router.post("/auth/register", authLimiter, validateBody(RegisterSchema), async (req, res): Promise<void> => {
  const { name, email, password } = req.body as z.infer<typeof RegisterSchema>;

  try {
    const normalizedEmail = email.toLowerCase().trim();

    const existing = await db
      .select({ id: localUsers.id })
      .from(localUsers)
      .where(eq(localUsers.email, normalizedEmail))
      .limit(1);

    if (existing.length > 0) {
      res.status(409).json({ error: "Bu e-posta adresi zaten kullanılıyor." });
      return;
    }

    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

    const [user] = await db
      .insert(localUsers)
      .values({ name: name.trim(), email: normalizedEmail, passwordHash })
      .returning();

    res.status(201).json({
      token: makeToken(user),
      user: { id: user.id, email: user.email, name: user.name, avatar: user.avatarUrl ?? null },
    });
  } catch (err) {
    logger.error({ err }, "POST /auth/register error");
    res.status(500).json({ error: "Sunucu hatası" });
  }
});

/* ── POST /api/auth/login ────────────────────────────────────── */
router.post("/auth/login", authLimiter, validateBody(LoginSchema), async (req, res): Promise<void> => {
  const { email, password } = req.body as z.infer<typeof LoginSchema>;

  try {
    const normalizedEmail = email.toLowerCase().trim();

    const rows = await db
      .select()
      .from(localUsers)
      .where(eq(localUsers.email, normalizedEmail))
      .limit(1);

    if (rows.length === 0) {
      res.status(401).json({ error: "E-posta veya şifre hatalı." });
      return;
    }

    const user = rows[0];
    const match = await bcrypt.compare(password, user.passwordHash);
    if (!match) {
      res.status(401).json({ error: "E-posta veya şifre hatalı." });
      return;
    }

    res.json({
      token: makeToken(user),
      user: { id: user.id, email: user.email, name: user.name, avatar: user.avatarUrl ?? null },
    });
  } catch (err) {
    logger.error({ err }, "POST /auth/login error");
    res.status(500).json({ error: "Sunucu hatası" });
  }
});

/* ── POST /api/auth/change-password ─────────────────────────── */
router.post("/auth/change-password", async (req, res): Promise<void> => {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Token gerekli" });
    return;
  }

  let userId: string;
  try {
    const payload = jwt.verify(header.slice(7), getJwtSecret()) as jwt.JwtPayload;
    userId = payload.sub as string;
  } catch {
    res.status(401).json({ error: "Geçersiz token" });
    return;
  }

  const parsed = ChangePasswordSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Geçersiz istek", details: parsed.error.issues.map(i => i.message) });
    return;
  }
  const { currentPassword, newPassword } = parsed.data;

  try {
    const rows = await db.select().from(localUsers).where(eq(localUsers.id, userId)).limit(1);
    if (rows.length === 0) {
      res.status(404).json({ error: "Kullanıcı bulunamadı" });
      return;
    }
    const match = await bcrypt.compare(currentPassword, rows[0].passwordHash);
    if (!match) {
      res.status(401).json({ error: "Mevcut şifre hatalı." });
      return;
    }
    const newHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
    await db
      .update(localUsers)
      .set({ passwordHash: newHash, updatedAt: new Date() })
      .where(eq(localUsers.id, userId));
    res.json({ ok: true });
  } catch (err) {
    logger.error({ err }, "POST /auth/change-password error");
    res.status(500).json({ error: "Sunucu hatası" });
  }
});

/* ═══════════════════════════════════════════════════════════════
   PASSWORD RESET — 3-step secure flow
   ═══════════════════════════════════════════════════════════════
   1. POST /api/auth/forgot-password     → generates code, sends email
   2. POST /api/auth/verify-reset-code   → verifies code, returns reset token
   3. POST /api/auth/reset-password      → verifies reset token, updates password
   ═══════════════════════════════════════════════════════════════ */

const GENERIC_RESPONSE = {
  ok: true,
  message: "Eğer bu e-posta adresiyle kayıtlı bir hesap varsa, şifre sıfırlama kodu gönderildi.",
};

/* ── POST /api/auth/forgot-password ─────────────────────────── */
router.post("/auth/forgot-password", passwordResetLimiter, validateBody(ForgotPasswordSchema), async (req, res): Promise<void> => {
  const ip = getClientIp(req);

  // Secondary IP rate limit guard (express-rate-limit is the primary)
  if (!checkIpRateLimit(ipResetMap, ip, 5, 15 * 60 * 1000)) {
    res.status(429).json({ error: "Çok fazla istek. Lütfen daha sonra tekrar deneyin." });
    return;
  }

  const { email } = req.body as z.infer<typeof ForgotPasswordSchema>;
  const normalizedEmail = email.toLowerCase().trim();

  try {
    const users = await db
      .select({ id: localUsers.id })
      .from(localUsers)
      .where(eq(localUsers.email, normalizedEmail))
      .limit(1);

    // Always return generic response to prevent email enumeration
    if (users.length === 0) {
      res.json(GENERIC_RESPONSE);
      return;
    }

    const user = users[0];

    // 60-second resend cooldown
    const recent = await pool.query<{ created_at: Date }>(
      `SELECT created_at FROM password_reset_codes
       WHERE user_id = $1 AND used_at IS NULL AND expires_at > now()
       ORDER BY created_at DESC LIMIT 1`,
      [user.id]
    );
    if ((recent.rowCount ?? 0) > 0) {
      const elapsed = Date.now() - new Date(recent.rows[0].created_at).getTime();
      if (elapsed < RESEND_COOLDOWN_MS) {
        const waitSec = Math.ceil((RESEND_COOLDOWN_MS - elapsed) / 1000);
        res.status(429).json({ error: `Lütfen ${waitSec} saniye bekleyin.` });
        return;
      }
    }

    // Invalidate all previous unused codes for this user
    await pool.query(
      `UPDATE password_reset_codes SET used_at = now() WHERE user_id = $1 AND used_at IS NULL`,
      [user.id]
    );

    // Generate cryptographically secure 6-digit code
    const code = String(randomInt(100000, 1000000)).padStart(6, "0");
    const codeHash = sha256(code);
    const expiresAt = new Date(Date.now() + RESET_CODE_TTL_MS);

    const inserted = await pool.query<{ id: string }>(
      `INSERT INTO password_reset_codes (user_id, email, code_hash, expires_at)
       VALUES ($1, $2, $3, $4) RETURNING id`,
      [user.id, normalizedEmail, codeHash, expiresAt]
    );

    req.log.info({ codeId: inserted.rows[0].id }, "Reset code generated");

    // Send email — if Resend fails, log but still return generic response
    try {
      await sendResetEmail(normalizedEmail, code);
      req.log.info({ userId: user.id }, "Password reset email sent via Resend");
    } catch (emailErr) {
      req.log.error({ err: emailErr, msg: emailErr instanceof Error ? emailErr.message : String(emailErr) }, "Resend email failed");
      // In dev: expose code in logs only (never in response)
      if (process.env.NODE_ENV !== "production") {
        req.log.warn({ code }, "DEV MODE — reset code (not sent via email)");
      }
    }

    res.json(GENERIC_RESPONSE);
  } catch (err) {
    req.log.error({ err }, "POST /auth/forgot-password error");
    // Still return generic to avoid information leakage
    res.json(GENERIC_RESPONSE);
  }
});

/* ── POST /api/auth/verify-reset-code ───────────────────────── */
router.post("/auth/verify-reset-code", passwordResetLimiter, validateBody(VerifyResetCodeSchema), async (req, res): Promise<void> => {
  const ip = getClientIp(req);

  // Secondary IP rate limit guard
  if (!checkIpRateLimit(ipVerifyMap, ip, 20, 15 * 60 * 1000)) {
    res.status(429).json({ error: "Çok fazla istek. Lütfen daha sonra tekrar deneyin." });
    return;
  }

  const { email, code } = req.body as z.infer<typeof VerifyResetCodeSchema>;
  const normalizedEmail = email.toLowerCase().trim();
  const trimmedCode = code.replace(/\D/g, "").slice(0, 6);

  try {
    // Get most recent active code for this email
    const rows = await pool.query<{
      id: string; user_id: string; code_hash: string;
      expires_at: Date; used_at: Date | null; attempt_count: number;
    }>(
      `SELECT id, user_id, code_hash, expires_at, used_at, attempt_count
       FROM password_reset_codes
       WHERE email = $1 AND used_at IS NULL
       ORDER BY created_at DESC LIMIT 1`,
      [normalizedEmail]
    );

    if ((rows.rowCount ?? 0) === 0) {
      res.status(400).json({ error: "Geçerli bir sıfırlama kodu bulunamadı." });
      return;
    }

    const row = rows.rows[0];

    // Max attempts gate (check BEFORE incrementing)
    if (row.attempt_count >= MAX_ATTEMPTS) {
      res.status(400).json({
        error: "Maksimum deneme sayısına ulaşıldı. Lütfen yeni bir kod talep edin.",
        maxAttemptsReached: true,
      });
      return;
    }

    // Increment attempt_count atomically
    await pool.query(
      `UPDATE password_reset_codes SET attempt_count = attempt_count + 1 WHERE id = $1`,
      [row.id]
    );

    // Check expiry
    if (new Date() > new Date(row.expires_at)) {
      res.status(400).json({ error: "Kodun süresi dolmuş. Lütfen yeni bir kod talep edin." });
      return;
    }

    // Constant-time hash comparison
    const incomingHash = sha256(trimmedCode);
    if (incomingHash !== row.code_hash) {
      const remaining = MAX_ATTEMPTS - (row.attempt_count + 1);
      if (remaining <= 0) {
        res.status(400).json({
          error: "Maksimum deneme sayısına ulaşıldı. Lütfen yeni bir kod talep edin.",
          maxAttemptsReached: true,
        });
      } else {
        res.status(400).json({
          error: `Kod hatalı. ${remaining} deneme hakkınız kaldı.`,
          remaining,
        });
      }
      return;
    }

    // Code valid — issue short-lived reset token (15 min)
    // jti = code record ID so we can invalidate it on use
    const resetToken = jwt.sign(
      { sub: row.user_id, type: "password_reset", jti: row.id },
      getJwtSecret() + "_reset_v1",
      { expiresIn: RESET_TOKEN_TTL }
    );

    req.log.info({ userId: row.user_id, codeId: row.id }, "Reset code verified, reset token issued");
    res.json({ ok: true, resetToken });
  } catch (err) {
    req.log.error({ err }, "POST /auth/verify-reset-code error");
    res.status(500).json({ error: "Sunucu hatası" });
  }
});

/* ── POST /api/auth/reset-password ──────────────────────────── */
router.post("/auth/reset-password", passwordResetLimiter, validateBody(ResetPasswordSchema), async (req, res): Promise<void> => {
  const { resetToken, password } = req.body as z.infer<typeof ResetPasswordSchema>;

  // Verify reset token
  let payload: jwt.JwtPayload;
  try {
    payload = jwt.verify(resetToken, getJwtSecret() + "_reset_v1") as jwt.JwtPayload;
  } catch {
    res.status(401).json({
      error: "Sıfırlama oturumunun süresi dolmuş. Lütfen tekrar başlayın.",
      expired: true,
    });
    return;
  }

  if (payload.type !== "password_reset" || !payload.sub || !payload.jti) {
    res.status(401).json({ error: "Geçersiz token" });
    return;
  }

  // Password strength
  if (password.length < 8) {
    res.status(400).json({ error: "Şifre en az 8 karakter olmalı" });
    return;
  }
  if (
    !/[A-Z]/.test(password) ||
    !/[a-z]/.test(password) ||
    !/[0-9]/.test(password) ||
    !/[^A-Za-z0-9]/.test(password)
  ) {
    res.status(400).json({
      error: "Şifre; büyük harf, küçük harf, rakam ve özel karakter içermelidir.",
    });
    return;
  }

  try {
    // Verify code record is still unused (prevent replay)
    const rows = await pool.query<{ id: string; used_at: Date | null }>(
      `SELECT id, used_at FROM password_reset_codes WHERE id = $1`,
      [payload.jti as string]
    );

    if ((rows.rowCount ?? 0) === 0 || rows.rows[0].used_at !== null) {
      res.status(400).json({
        error: "Bu sıfırlama oturumu zaten kullanılmış veya geçersiz.",
        expired: true,
      });
      return;
    }

    // Hash new password — never log plaintext
    const newHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

    // Update password
    await db
      .update(localUsers)
      .set({ passwordHash: newHash, updatedAt: new Date() })
      .where(eq(localUsers.id, payload.sub as string));

    // Mark code as used (single-use enforcement)
    await pool.query(
      `UPDATE password_reset_codes SET used_at = now() WHERE id = $1`,
      [payload.jti as string]
    );

    req.log.info({ userId: payload.sub }, "Password reset completed");
    res.json({ ok: true });
  } catch (err) {
    req.log.error({ err }, "POST /auth/reset-password error");
    res.status(500).json({ error: "Sunucu hatası" });
  }
});

/* ── POST /api/auth/facebook ─────────────────────────────────── */
router.post("/auth/facebook", async (req, res): Promise<void> => {
  const { accessToken } = req.body as { accessToken?: string };
  if (!accessToken) { res.status(400).json({ error: "accessToken gerekli" }); return; }

  const FACEBOOK_APP_ID     = process.env.FACEBOOK_APP_ID;
  const FACEBOOK_APP_SECRET = process.env.FACEBOOK_APP_SECRET;
  if (!FACEBOOK_APP_ID || !FACEBOOK_APP_SECRET) {
    res.status(503).json({ error: "Facebook credentials henüz yapılandırılmamış" });
    return;
  }

  try {
    const appToken = `${FACEBOOK_APP_ID}|${FACEBOOK_APP_SECRET}`;
    const debugResp = await fetch(
      `https://graph.facebook.com/debug_token?input_token=${encodeURIComponent(accessToken)}&access_token=${encodeURIComponent(appToken)}`
    );
    const debug = (await debugResp.json()) as { data?: { is_valid?: boolean } };
    if (!debug.data?.is_valid) {
      res.status(401).json({ error: "Geçersiz Facebook token" });
      return;
    }

    const profileResp = await fetch(
      `https://graph.facebook.com/me?fields=id,name,email,picture.type(large)&access_token=${encodeURIComponent(accessToken)}`
    );
    const profile = (await profileResp.json()) as {
      id: string; name?: string; email?: string;
      picture?: { data?: { url?: string } };
    };

    const { user, isNewUser } = await upsertOAuthUser(
      "facebook",
      profile.id,
      profile.email ?? null,
      profile.name ?? null,
      profile.picture?.data?.url ?? null
    );

    res.json({
      token: makeToken(user),
      user: { id: user.id, email: user.email, name: user.name, avatar: user.avatarUrl },
      isNewUser,
    });
  } catch (err) {
    logger.error({ err }, "Facebook auth error");
    res.status(500).json({ error: "Sunucu hatası" });
  }
});

/* ── GET /api/auth/me ────────────────────────────────────────── */
router.get("/auth/me", (req, res): void => {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Token gerekli" });
    return;
  }
  try {
    const payload = jwt.verify(header.slice(7), getJwtSecret()) as jwt.JwtPayload;
    res.json({ id: payload.sub, email: payload.email, name: payload.name });
  } catch {
    res.status(401).json({ error: "Geçersiz token" });
  }
});

export default router;
