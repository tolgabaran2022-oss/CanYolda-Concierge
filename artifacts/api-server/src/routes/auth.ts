import { Router } from "express";
import jwt from "jsonwebtoken";
import { db, oauthUsers } from "@workspace/db";
import { and, eq } from "drizzle-orm";
import { logger } from "../lib/logger.js";

const router = Router();

const JWT_SECRET =
  process.env.JWT_SECRET ?? process.env.SESSION_SECRET ?? "dev-secret-change-me";
const JWT_EXPIRES = "30d";

/* ── helpers ──────────────────────────────────────────────── */

function makeToken(user: { id: string; email: string | null; name: string | null }) {
  return jwt.sign(
    { sub: user.id, email: user.email, name: user.name },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES }
  );
}

async function upsertUser(
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

/* ── POST /api/auth/facebook ──────────────────────────────────
   Body: { accessToken: string }
   Verifies token via Facebook Graph API.
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
    // Verify token belongs to our app
    const appToken = `${FACEBOOK_APP_ID}|${FACEBOOK_APP_SECRET}`;
    const debugResp = await fetch(
      `https://graph.facebook.com/debug_token?input_token=${encodeURIComponent(accessToken)}&access_token=${encodeURIComponent(appToken)}`
    );
    const debug = (await debugResp.json()) as { data?: { is_valid?: boolean } };
    if (!debug.data?.is_valid) {
      res.status(401).json({ error: "Geçersiz Facebook token" });
      return;
    }

    // Get user profile
    const profileResp = await fetch(
      `https://graph.facebook.com/me?fields=id,name,email,picture.type(large)&access_token=${encodeURIComponent(accessToken)}`
    );
    const profile = (await profileResp.json()) as {
      id: string;
      name?: string;
      email?: string;
      picture?: { data?: { url?: string } };
    };

    const { user, isNewUser } = await upsertUser(
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
