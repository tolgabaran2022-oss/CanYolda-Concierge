import { Router } from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { db, oauthUsers, localUsers } from "@workspace/db";
import { and, eq } from "drizzle-orm";
import { logger } from "../lib/logger.js";

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
