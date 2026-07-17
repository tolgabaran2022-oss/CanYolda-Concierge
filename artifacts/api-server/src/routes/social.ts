import { Router } from "express";
import { eq, ilike, or } from "drizzle-orm";
import { db, pool, socialProfiles } from "@workspace/db";
import { extractUserId } from "../lib/jwtAuth.js";

const router = Router();

/* ── Auto-migrate: privacy/notification columns ──────────── */
pool.query(`
  ALTER TABLE social_profiles
    ADD COLUMN IF NOT EXISTS is_profile_public              BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN IF NOT EXISTS are_stories_visible            BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN IF NOT EXISTS like_notifications_enabled     BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN IF NOT EXISTS comment_notifications_enabled  BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN IF NOT EXISTS message_notifications_enabled  BOOLEAN NOT NULL DEFAULT true;
`).catch(() => {});

/* ── GET /api/social/users ─ search users ─────────────────── */
router.get("/social/users", async (req, res) => {
  const callerId = extractUserId(req);
  if (!callerId) { res.status(401).json({ error: "Giriş yapılmamış" }); return; }

  try {
    const q = (req.query["q"] as string ?? "").trim();
    if (!q || q.length < 1) { res.json([]); return; }

    const rows = await db
      .select({
        id:        socialProfiles.id,
        username:  socialProfiles.username,
        name:      socialProfiles.name,
        avatarUrl: socialProfiles.avatarUrl,
      })
      .from(socialProfiles)
      .where(or(
        ilike(socialProfiles.name,     `%${q}%`),
        ilike(socialProfiles.username, `%${q}%`),
      ))
      .limit(20);

    res.json(rows.map((r) => ({
      userId:    r.id,
      username:  r.username ?? r.name,
      avatarUrl: r.avatarUrl,
      postCount: 0,
    })));
  } catch (err) {
    req.log.error({ err }, "GET /social/users failed");
    res.status(500).json({ error: "Internal server error" });
  }
});

/* ── GET /api/social/users/:userId ───────────────────────── */
router.get("/social/users/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const [row] = await db
      .select({
        id:        socialProfiles.id,
        username:  socialProfiles.username,
        name:      socialProfiles.name,
        avatarUrl: socialProfiles.avatarUrl,
      })
      .from(socialProfiles)
      .where(eq(socialProfiles.id, userId))
      .limit(1);

    if (!row) { res.status(404).json({ error: "User not found" }); return; }
    res.json({
      userId:    row.id,
      username:  row.username ?? row.name,
      avatarUrl: row.avatarUrl,
      postCount: 0,
    });
  } catch (err) {
    req.log.error({ err }, "GET /social/users/:userId failed");
    res.status(500).json({ error: "Internal server error" });
  }
});

/* ── GET /api/social/settings ─────────────────────────────── */
router.get("/social/settings", async (req, res) => {
  try {
    const userId = extractUserId(req);
    if (!userId) { res.status(401).json({ error: "Giriş yapılmamış" }); return; }

    const [profile] = await db
      .select({
        isProfilePublic:             socialProfiles.isProfilePublic,
        areStoriesVisible:           socialProfiles.areStoriesVisible,
        likeNotificationsEnabled:    socialProfiles.likeNotificationsEnabled,
        commentNotificationsEnabled: socialProfiles.commentNotificationsEnabled,
        messageNotificationsEnabled: socialProfiles.messageNotificationsEnabled,
      })
      .from(socialProfiles)
      .where(eq(socialProfiles.id, userId))
      .limit(1);

    res.json(profile ?? {
      isProfilePublic:             true,
      areStoriesVisible:           true,
      likeNotificationsEnabled:    true,
      commentNotificationsEnabled: true,
      messageNotificationsEnabled: true,
    });
  } catch (err) {
    req.log.error({ err }, "GET /social/settings failed");
    res.status(500).json({ error: "Internal server error" });
  }
});

/* ── PATCH /api/social/settings ───────────────────────────── */
router.patch("/social/settings", async (req, res) => {
  try {
    const userId = extractUserId(req);
    if (!userId) { res.status(401).json({ error: "Giriş yapılmamış" }); return; }

    const {
      isProfilePublic,
      areStoriesVisible,
      likeNotificationsEnabled,
      commentNotificationsEnabled,
      messageNotificationsEnabled,
    } = req.body as Record<string, boolean | undefined>;

    const updates: Record<string, boolean> = {};
    if (isProfilePublic             !== undefined) updates.isProfilePublic             = Boolean(isProfilePublic);
    if (areStoriesVisible           !== undefined) updates.areStoriesVisible           = Boolean(areStoriesVisible);
    if (likeNotificationsEnabled    !== undefined) updates.likeNotificationsEnabled    = Boolean(likeNotificationsEnabled);
    if (commentNotificationsEnabled !== undefined) updates.commentNotificationsEnabled = Boolean(commentNotificationsEnabled);
    if (messageNotificationsEnabled !== undefined) updates.messageNotificationsEnabled = Boolean(messageNotificationsEnabled);

    if (Object.keys(updates).length === 0) { res.json({ ok: true }); return; }

    await db
      .insert(socialProfiles)
      .values({ id: userId, ...updates })
      .onConflictDoUpdate({
        target: socialProfiles.id,
        set:    { ...updates, updatedAt: new Date() },
      });

    res.json({ ok: true });
  } catch (err) {
    req.log.error({ err }, "PATCH /social/settings failed");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
