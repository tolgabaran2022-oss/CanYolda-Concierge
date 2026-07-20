import { Router } from "express";
import { and, eq } from "drizzle-orm";
import { db, pushTokens, notificationPreferences } from "@workspace/db";
import { extractUserId } from "../lib/jwtAuth.js";

const router = Router();

/* ── POST /api/push-tokens ─ register a device token ───── */
router.post("/push-tokens", async (req, res) => {
  try {
    const userId = extractUserId(req);
    if (!userId) { res.status(401).json({ error: "Giriş yapılmamış" }); return; }

    const { token, platform, appVersion } = req.body as {
      token?: string;
      platform?: string;
      appVersion?: string;
    };

    if (!token || typeof token !== "string" || !token.startsWith("ExponentPushToken[")) {
      res.status(400).json({ error: "Geçersiz Expo push token" });
      return;
    }

    const validPlatform = ["ios", "android"].includes(platform ?? "") ? platform! : "unknown";

    await db
      .insert(pushTokens)
      .values({
        userId,
        expoPushToken: token,
        platform:      validPlatform,
        appVersion:    appVersion ?? null,
        enabled:       true,
        lastSeenAt:    new Date(),
      })
      .onConflictDoUpdate({
        target: pushTokens.expoPushToken,
        set:    { userId, enabled: true, updatedAt: new Date(), lastSeenAt: new Date(), appVersion: appVersion ?? null },
      });

    res.json({ ok: true });
  } catch (err) {
    req.log.error({ err }, "POST /push-tokens failed");
    res.status(500).json({ error: "Internal server error" });
  }
});

/* ── DELETE /api/push-tokens ─ deregister on logout ─────── */
router.delete("/push-tokens", async (req, res) => {
  try {
    const userId = extractUserId(req);
    if (!userId) { res.status(401).json({ error: "Giriş yapılmamış" }); return; }

    const { token } = req.body as { token?: string };
    if (!token) { res.status(400).json({ error: "Token gerekli" }); return; }

    await db
      .update(pushTokens)
      .set({ enabled: false, updatedAt: new Date() })
      .where(
        and(
          eq(pushTokens.expoPushToken, token),
          eq(pushTokens.userId, userId)
        )
      );

    res.json({ ok: true });
  } catch (err) {
    req.log.error({ err }, "DELETE /push-tokens failed");
    res.status(500).json({ error: "Internal server error" });
  }
});

/* ── GET /api/push-tokens/preferences ────────────────────── */
router.get("/push-tokens/preferences", async (req, res) => {
  try {
    const userId = extractUserId(req);
    if (!userId) { res.status(401).json({ error: "Giriş yapılmamış" }); return; }

    const [prefs] = await db
      .select()
      .from(notificationPreferences)
      .where(eq(notificationPreferences.userId, userId))
      .limit(1);

    if (!prefs) {
      res.json({
        generalEnabled:   true,
        messagesEnabled:  true,
        adoptionEnabled:  true,
        remindersEnabled: true,
        emergencyEnabled: true,
      });
      return;
    }

    res.json({
      generalEnabled:   prefs.generalEnabled,
      messagesEnabled:  prefs.messagesEnabled,
      adoptionEnabled:  prefs.adoptionEnabled,
      remindersEnabled: prefs.remindersEnabled,
      emergencyEnabled: prefs.emergencyEnabled,
    });
  } catch (err) {
    req.log.error({ err }, "GET /push-tokens/preferences failed");
    res.status(500).json({ error: "Internal server error" });
  }
});

/* ── PATCH /api/push-tokens/preferences ──────────────────── */
router.patch("/push-tokens/preferences", async (req, res) => {
  try {
    const userId = extractUserId(req);
    if (!userId) { res.status(401).json({ error: "Giriş yapılmamış" }); return; }

    const {
      generalEnabled,
      messagesEnabled,
      adoptionEnabled,
      remindersEnabled,
      emergencyEnabled,
    } = req.body as Partial<{
      generalEnabled:   boolean;
      messagesEnabled:  boolean;
      adoptionEnabled:  boolean;
      remindersEnabled: boolean;
      emergencyEnabled: boolean;
    }>;

    const update: Record<string, boolean | Date> = { updatedAt: new Date() };
    if (typeof generalEnabled   === "boolean") update.generalEnabled   = generalEnabled;
    if (typeof messagesEnabled  === "boolean") update.messagesEnabled  = messagesEnabled;
    if (typeof adoptionEnabled  === "boolean") update.adoptionEnabled  = adoptionEnabled;
    if (typeof remindersEnabled === "boolean") update.remindersEnabled = remindersEnabled;
    if (typeof emergencyEnabled === "boolean") update.emergencyEnabled = emergencyEnabled;

    await db
      .insert(notificationPreferences)
      .values({
        userId,
        generalEnabled:   generalEnabled   ?? true,
        messagesEnabled:  messagesEnabled  ?? true,
        adoptionEnabled:  adoptionEnabled  ?? true,
        remindersEnabled: remindersEnabled ?? true,
        emergencyEnabled: emergencyEnabled ?? true,
      })
      .onConflictDoUpdate({
        target: notificationPreferences.userId,
        set:    update,
      });

    res.json({ ok: true });
  } catch (err) {
    req.log.error({ err }, "PATCH /push-tokens/preferences failed");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
