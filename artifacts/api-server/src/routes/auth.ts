import { Router } from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { db, pool, oauthUsers, localUsers } from "@workspace/db";
import { and, eq } from "drizzle-orm";
import { logger } from "../lib/logger.js";
import { randomInt } from "crypto";

/* ── password_reset_codes table (auto-created) ─────────────── */
pool.query(`
  CREATE TABLE IF NOT EXISTS password_reset_codes (
    id         TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    email      TEXT NOT NULL,
    code       TEXT NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '15 minutes'),
    used       BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  );
  CREATE INDEX IF NOT EXISTS idx_prc_email ON password_reset_codes(email);
`).catch(() => {});

const router = Router();

const JWT_SECRET =
  process.env.JWT_SECRET ?? process.env.SESSION_SECRET ?? "dev-secret-change-me";
const JWT_EXPIRES = "30d";
const BCRYPT_ROUNDS = 10;

/* ── helpers ──────────────────────────────────────────────── */

function makeToken(user: { id: string; email: string | null; name: string | null }) {
  return jwt.sign(
    { sub: user.id, email: user.email, name: user.name },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES }
  );
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

/* ── POST /api/auth/register ──────────────────────────────────
   Body: { name, email, password }
──────────────────────────────────────────────────────────── */
router.post("/auth/register", async (req, res): Promise<void> => {
  const { name, email, password } = req.body as {
    name?: string; email?: string; password?: string;
  };

  if (!name || !email || !password) {
    res.status(400).json({ error: "Ad, e-posta ve şifre gerekli" });
    return;
  }
  if (password.length < 6) {
    res.status(400).json({ error: "Şifre en az 6 karakter olmalı" });
    return;
  }

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

/* ── POST /api/auth/login ─────────────────────────────────────
   Body: { email, password }
──────────────────────────────────────────────────────────── */
router.post("/auth/login", async (req, res): Promise<void> => {
  const { email, password } = req.body as { email?: string; password?: string };

  if (!email || !password) {
    res.status(400).json({ error: "E-posta ve şifre gerekli" });
    return;
  }

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

/* ── POST /api/auth/change-password ───────────────────────────
   Header: Authorization: Bearer <token>
   Body: { currentPassword, newPassword }
──────────────────────────────────────────────────────────── */
router.post("/auth/change-password", async (req, res): Promise<void> => {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Token gerekli" });
    return;
  }

  let userId: string;
  try {
    const payload = jwt.verify(header.slice(7), JWT_SECRET) as jwt.JwtPayload;
    userId = payload.sub as string;
  } catch {
    res.status(401).json({ error: "Geçersiz token" });
    return;
  }

  const { currentPassword, newPassword } = req.body as {
    currentPassword?: string; newPassword?: string;
  };
  if (!currentPassword || !newPassword) {
    res.status(400).json({ error: "Mevcut ve yeni şifre gerekli" });
    return;
  }
  if (newPassword.length < 6) {
    res.status(400).json({ error: "Yeni şifre en az 6 karakter olmalı" });
    return;
  }

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
    await db.update(localUsers).set({ passwordHash: newHash, updatedAt: new Date() }).where(eq(localUsers.id, userId));
    res.json({ ok: true });
  } catch (err) {
    logger.error({ err }, "POST /auth/change-password error");
    res.status(500).json({ error: "Sunucu hatası" });
  }
});

/* ── POST /api/auth/forgot-password ──────────────────────────
   Body: { email }
   Generates a 6-digit code stored in DB (15-min TTL).
   In dev returns devCode in response; in prod you'd email it.
──────────────────────────────────────────────────────────── */
router.post("/auth/forgot-password", async (req, res): Promise<void> => {
  const { email } = req.body as { email?: string };
  if (!email || typeof email !== "string") {
    res.status(400).json({ error: "E-posta adresi gerekli" });
    return;
  }

  const normalizedEmail = email.toLowerCase().trim();
  const isDev = process.env.NODE_ENV !== "production";

  try {
    /* Silently pass if user not found — security: don't reveal existence */
    const users = await db
      .select({ id: localUsers.id })
      .from(localUsers)
      .where(eq(localUsers.email, normalizedEmail))
      .limit(1);

    if (users.length === 0) {
      /* Still return ok — don't reveal whether email is registered */
      const fakeCode = isDev ? String(100000 + randomInt(900000)) : undefined;
      res.json({ ok: true, ...(isDev ? { devCode: fakeCode } : {}) });
      return;
    }

    /* Invalidate any existing unused codes */
    await pool.query(
      `UPDATE password_reset_codes SET used = true WHERE email = $1 AND used = false`,
      [normalizedEmail]
    );

    /* Generate 6-digit code */
    const code = String(100000 + randomInt(900000));
    await pool.query(
      `INSERT INTO password_reset_codes (email, code) VALUES ($1, $2)`,
      [normalizedEmail, code]
    );

    /* TODO: send email via SMTP/SendGrid in production */
    req.log.info({ email: normalizedEmail }, "Password reset code generated");

    res.json({
      ok: true,
      /* Only expose code in development for testing */
      ...(isDev ? { devCode: code } : {}),
    });
  } catch (err) {
    req.log.error({ err }, "POST /auth/forgot-password error");
    res.status(500).json({ error: "Sunucu hatası" });
  }
});

/* ── POST /api/auth/reset-password ───────────────────────────
   Body: { email, code, password }
──────────────────────────────────────────────────────────── */
router.post("/auth/reset-password", async (req, res): Promise<void> => {
  const { email, code, password } = req.body as {
    email?: string; code?: string; password?: string;
  };

  if (!email || !code || !password) {
    res.status(400).json({ error: "E-posta, kod ve yeni şifre gerekli" });
    return;
  }

  const normalizedEmail = email.toLowerCase().trim();
  const trimmedCode     = code.trim();

  /* Password strength: min 8, upper, lower, digit, special */
  if (password.length < 8) {
    res.status(400).json({ error: "Şifre en az 8 karakter olmalı" });
    return;
  }
  if (!/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/[0-9]/.test(password) || !/[^A-Za-z0-9]/.test(password)) {
    res.status(400).json({ error: "Şifre güvenlik kurallarını karşılamıyor" });
    return;
  }

  try {
    /* Look up the most recent unused code for this email */
    const rows = await pool.query<{
      id: string; code: string; expires_at: Date; used: boolean;
    }>(
      `SELECT id, code, expires_at, used
       FROM password_reset_codes
       WHERE email = $1 AND used = false
       ORDER BY created_at DESC
       LIMIT 1`,
      [normalizedEmail]
    );

    if (rows.rowCount === 0) {
      res.status(400).json({ error: "Geçersiz veya kullanılmış sıfırlama kodu" });
      return;
    }

    const row = rows.rows[0];

    if (row.code !== trimmedCode) {
      res.status(400).json({ error: "Sıfırlama kodu geçersiz" });
      return;
    }

    if (new Date() > new Date(row.expires_at)) {
      res.status(400).json({ error: "Kodun süresi dolmuş. Lütfen yeni bir kod talep edin." });
      return;
    }

    /* Mark code as used */
    await pool.query(
      `UPDATE password_reset_codes SET used = true WHERE id = $1`,
      [row.id]
    );

    /* Update password */
    const newHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    await db
      .update(localUsers)
      .set({ passwordHash: newHash, updatedAt: new Date() })
      .where(eq(localUsers.email, normalizedEmail));

    req.log.info({ email: normalizedEmail }, "Password reset successful");
    res.json({ ok: true });
  } catch (err) {
    req.log.error({ err }, "POST /auth/reset-password error");
    res.status(500).json({ error: "Sunucu hatası" });
  }
});

/* ── POST /api/auth/facebook ──────────────────────────────────
   Body: { accessToken: string }
──────────────────────────────────────────────────────────── */
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

/* ── GET /api/auth/me ─────────────────────────────────────────
   Header: Authorization: Bearer <token>
──────────────────────────────────────────────────────────── */
router.get("/auth/me", (req, res): void => {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Token gerekli" });
    return;
  }
  try {
    const payload = jwt.verify(header.slice(7), JWT_SECRET) as jwt.JwtPayload;
    res.json({ id: payload.sub, email: payload.email, name: payload.name });
  } catch {
    res.status(401).json({ error: "Geçersiz token" });
  }
});

export default router;
