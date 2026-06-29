import { Router } from "express";
import jwt from "jsonwebtoken";
import { createPublicKey } from "crypto";
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

/* ── POST /api/auth/google ────────────────────────────────────
   Body: { idToken: string }
   Verifies Google ID token via Google's tokeninfo endpoint.
──────────────────────────────────────────────────────────── */
router.post("/auth/google", async (req, res): Promise<void> => {
  const { idToken } = req.body as { idToken?: string };
  if (!idToken) { res.status(400).json({ error: "idToken gerekli" }); return; }

  const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
  if (!GOOGLE_CLIENT_ID) {
    res.status(503).json({ error: "Google credentials henüz yapılandırılmamış" });
    return;
  }

  try {
    const resp = await fetch(
      `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`
    );
    if (!resp.ok) { res.status(401).json({ error: "Geçersiz Google token" }); return; }

    const payload = (await resp.json()) as {
      sub: string;
      email?: string;
      name?: string;
      picture?: string;
      aud?: string;
      error_description?: string;
    };

    if (payload.error_description) {
      res.status(401).json({ error: payload.error_description });
      return;
    }

    // Verify audience matches our app
    if (payload.aud !== GOOGLE_CLIENT_ID) {
      res.status(401).json({ error: "Token bu uygulama için geçerli değil" });
      return;
    }

    const { user, isNewUser } = await upsertUser(
      "google",
      payload.sub,
      payload.email ?? null,
      payload.name ?? null,
      payload.picture ?? null
    );

    res.json({
      token: makeToken(user),
      user: { id: user.id, email: user.email, name: user.name, avatar: user.avatarUrl },
      isNewUser,
    });
  } catch (err) {
    logger.error({ err }, "Google auth error");
    res.status(500).json({ error: "Sunucu hatası" });
  }
});

/* ── POST /api/auth/apple ─────────────────────────────────────
   Body: { identityToken: string, fullName?: string }
   Verifies Apple identity token using Apple's public JWKs.
──────────────────────────────────────────────────────────── */
router.post("/auth/apple", async (req, res): Promise<void> => {
  const { identityToken, fullName } = req.body as {
    identityToken?: string;
    fullName?: string;
  };
  if (!identityToken) { res.status(400).json({ error: "identityToken gerekli" }); return; }

  try {
    // Decode header to find which key Apple used
    const decoded = jwt.decode(identityToken, { complete: true });
    if (!decoded || typeof decoded === "string") {
      res.status(401).json({ error: "Geçersiz Apple token formatı" });
      return;
    }

    // Fetch Apple's current public keys
    const keysResp = await fetch("https://appleid.apple.com/auth/keys");
    const { keys } = (await keysResp.json()) as {
      keys: Array<{ kid: string; kty: string; use: string; alg: string; n: string; e: string }>;
    };

    const appleKey = keys.find((k) => k.kid === decoded.header.kid);
    if (!appleKey) { res.status(401).json({ error: "Apple imzalama anahtarı bulunamadı" }); return; }

    // Convert JWK to KeyObject for jwt.verify
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const publicKey = createPublicKey({ key: appleKey as any, format: "jwk" } as any);

    const payload = jwt.verify(identityToken, publicKey, {
      algorithms: ["RS256"],
      issuer: "https://appleid.apple.com",
    }) as jwt.JwtPayload;

    const { user, isNewUser } = await upsertUser(
      "apple",
      payload.sub as string,
      (payload.email as string | undefined) ?? null,
      fullName ?? null,
      null
    );

    res.json({
      token: makeToken(user),
      user: { id: user.id, email: user.email, name: user.name, avatar: null },
      isNewUser,
    });
  } catch (err) {
    logger.error({ err }, "Apple auth error");
    res.status(401).json({ error: "Apple token doğrulanamadı" });
  }
});

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
