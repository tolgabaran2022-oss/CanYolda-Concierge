import { Router } from "express";
import { and, desc, eq, ilike, inArray, ne, or, sql } from "drizzle-orm";
import { db, pool, feedPosts, follows, notifications, socialProfiles } from "@workspace/db";
import { logger } from "../lib/logger.js";
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

/* ── POST /api/social/follow/:targetId ─ toggle follow ── */
router.post("/social/follow/:targetId", async (req, res) => {
  try {
    const followerId  = extractUserId(req);
    /* Normalize: seed posts are returned with userId="seed-<username>"; strip the prefix
       so follows always store the plain username (or real UUID). */
    const rawTarget   = req.params.targetId;
    const followingId = rawTarget.startsWith("seed-") ? rawTarget.slice("seed-".length) : rawTarget;

    if (!followerId) {
      res.status(401).json({ error: "Giriş yapılmamış" });
      return;
    }
    if (followerId === followingId) {
      res.status(400).json({ error: "Cannot follow yourself" });
      return;
    }

    const existing = await db
      .select()
      .from(follows)
      .where(and(eq(follows.followerId, followerId), eq(follows.followingId, followingId)))
      .limit(1);

    if (existing.length > 0) {
      await db
        .delete(follows)
        .where(and(eq(follows.followerId, followerId), eq(follows.followingId, followingId)));
      res.json({ following: false });
    } else {
      await db.insert(follows).values({ followerId, followingId }).onConflictDoNothing();
      /* create notification for the target user */
      const senderPost = await db
        .select({ username: feedPosts.username, avatarUrl: feedPosts.avatarUrl })
        .from(feedPosts)
        .where(eq(feedPosts.userId, followerId))
        .limit(1);
      const senderName   = senderPost[0]?.username ?? followerId;
      const senderAvatar = senderPost[0]?.avatarUrl ?? "";
      await db.insert(notifications).values({
        receiverId:   followingId,
        senderId:     followerId,
        senderName,
        senderAvatar,
        type:         "follow",
        message:      "seni takip etmeye başladı",
        read:         false,
      }).onConflictDoNothing();
      res.json({ following: true });
    }
  } catch (err) {
    req.log.error({ err }, "POST /social/follow failed");
    res.status(500).json({ error: "Internal server error" });
  }
});

/* ── GET /api/social/follow/check ─────────────────────── */
router.get("/social/follow/check", async (req, res) => {
  try {
    const followerId  = req.query["followerId"] as string;
    const rawTarget   = req.query["targetId"]   as string;
    const targetId    = rawTarget?.startsWith("seed-") ? rawTarget.slice("seed-".length) : rawTarget;
    if (!followerId || !targetId) {
      res.status(400).json({ error: "followerId and targetId required" });
      return;
    }
    const existing = await db
      .select({ id: follows.id })
      .from(follows)
      .where(and(eq(follows.followerId, followerId), eq(follows.followingId, targetId)))
      .limit(1);
    res.json({ following: existing.length > 0 });
  } catch (err) {
    req.log.error({ err }, "GET /social/follow/check failed");
    res.status(500).json({ error: "Internal server error" });
  }
});

/* Helper: detect whether a string looks like a UUID or a plain seed username */
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function stripSeedPrefix(id: string): string {
  return id.startsWith("seed-") ? id.slice("seed-".length) : id;
}

/* ── GET /api/social/follow/counts ────────────────────── */
router.get("/social/follow/counts", async (req, res) => {
  try {
    const raw    = req.query["userId"] as string;
    if (!raw) { res.status(400).json({ error: "userId required" }); return; }
    const userId = stripSeedPrefix(raw);

    const [followersRes, followingRes] = await Promise.all([
      db.select({ count: sql<number>`count(*)::int` }).from(follows).where(eq(follows.followingId, userId)),
      db.select({ count: sql<number>`count(*)::int` }).from(follows).where(eq(follows.followerId,  userId)),
    ]);
    res.json({
      followers: followersRes[0]?.count ?? 0,
      following: followingRes[0]?.count ?? 0,
    });
  } catch (err) {
    req.log.error({ err }, "GET /social/follow/counts failed");
    res.status(500).json({ error: "Internal server error" });
  }
});

/* ── GET /api/social/users ─ search ───────────────────── */
router.get("/social/users", async (req, res) => {
  try {
    const q = (req.query["q"] as string ?? "").trim();
    if (!q || q.length < 1) { res.json([]); return; }

    const rows = await db
      .selectDistinctOn([feedPosts.username], {
        username:  feedPosts.username,
        avatarUrl: feedPosts.avatarUrl,
        userId:    feedPosts.userId,
      })
      .from(feedPosts)
      .where(ilike(feedPosts.username, `%${q}%`))
      .limit(20);

    /* count posts per user */
    const userIds  = rows.map((r) => r.username);
    const counts: Record<string, number> = {};
    if (userIds.length > 0) {
      const countRows = await db
        .select({ username: feedPosts.username, count: sql<number>`count(*)::int` })
        .from(feedPosts)
        .where(or(...userIds.map((u) => eq(feedPosts.username, u))))
        .groupBy(feedPosts.username);
      countRows.forEach((r) => { counts[r.username] = r.count; });
    }

    res.json(
      rows.map((r) => ({
        userId:    r.userId || r.username,
        username:  r.username,
        avatarUrl: r.avatarUrl,
        postCount: counts[r.username] ?? 0,
      }))
    );
  } catch (err) {
    req.log.error({ err }, "GET /social/users failed");
    res.status(500).json({ error: "Internal server error" });
  }
});

/* ── GET /api/social/users/:userId ────────────────────── */
router.get("/social/users/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const row = await db
      .select({ username: feedPosts.username, avatarUrl: feedPosts.avatarUrl, userId: feedPosts.userId })
      .from(feedPosts)
      .where(or(eq(feedPosts.userId, userId), eq(feedPosts.username, userId)))
      .limit(1);
    if (!row[0]) { res.status(404).json({ error: "User not found" }); return; }

    const [postCount] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(feedPosts)
      .where(or(eq(feedPosts.userId, userId), eq(feedPosts.username, userId)));

    res.json({
      userId:    row[0].userId || row[0].username,
      username:  row[0].username,
      avatarUrl: row[0].avatarUrl,
      postCount: postCount?.count ?? 0,
    });
  } catch (err) {
    req.log.error({ err }, "GET /social/users/:userId failed");
    res.status(500).json({ error: "Internal server error" });
  }
});

/* ── GET /api/social/follow/followers/:userId ─ list ─── */
router.get("/social/follow/followers/:userId", async (req, res) => {
  try {
    const userId   = stripSeedPrefix(req.params.userId);
    const callerId = req.query["callerId"] as string | undefined;

    const rows = await db
      .select({ followerId: follows.followerId })
      .from(follows)
      .where(eq(follows.followingId, userId));

    if (rows.length === 0) { res.json([]); return; }

    const ids = rows.map((r) => r.followerId);

    /* Real users: look up in social_profiles */
    const uuidIds = ids.filter((id) => UUID_RE.test(id));
    const profiles = uuidIds.length > 0
      ? await db
          .select({ id: socialProfiles.id, name: socialProfiles.name, username: socialProfiles.username, avatarUrl: socialProfiles.avatarUrl })
          .from(socialProfiles)
          .where(inArray(socialProfiles.id, uuidIds))
      : [];
    const profileMap = new Map(profiles.map((p) => [p.id, p]));

    /* Check which of these users the caller follows */
    let callerFollowingIds = new Set<string>();
    if (callerId) {
      const cfRows = await db
        .select({ followingId: follows.followingId })
        .from(follows)
        .where(and(eq(follows.followerId, callerId), inArray(follows.followingId, ids)));
      callerFollowingIds = new Set(cfRows.map((r) => r.followingId));
    }

    /* Fallback for real users missing from social_profiles: query feedPosts by userId */
    const missingUuids = uuidIds.filter((id) => !profileMap.has(id));
    if (missingUuids.length > 0) {
      const postRows = await db
        .selectDistinctOn([feedPosts.userId], { userId: feedPosts.userId, username: feedPosts.username, avatarUrl: feedPosts.avatarUrl })
        .from(feedPosts)
        .where(inArray(feedPosts.userId, missingUuids));
      postRows.forEach((r) => {
        if (r.userId) profileMap.set(r.userId, { id: r.userId, name: r.username, username: r.username, avatarUrl: r.avatarUrl });
      });
    }

    /* Seed users (plain username, not UUID): query feedPosts by username */
    const seedIds = ids.filter((id) => !UUID_RE.test(id));
    if (seedIds.length > 0) {
      const seedRows = await db
        .selectDistinctOn([feedPosts.username], { username: feedPosts.username, avatarUrl: feedPosts.avatarUrl })
        .from(feedPosts)
        .where(inArray(feedPosts.username, seedIds));
      seedRows.forEach((r) => {
        profileMap.set(r.username, { id: r.username, name: r.username, username: r.username, avatarUrl: r.avatarUrl });
      });
    }

    const result = ids.map((id) => {
      const p = profileMap.get(id);
      return {
        userId:      id,
        username:    p?.username ?? p?.name ?? id,
        avatarUrl:   p?.avatarUrl ?? "",
        isFollowing: callerFollowingIds.has(id),
      };
    }).filter((r) => r.username);

    res.json(result);
  } catch (err) {
    req.log.error({ err }, "GET /social/follow/followers failed");
    res.status(500).json({ error: "Internal server error" });
  }
});

/* ── GET /api/social/follow/following/:userId ─ list ─── */
router.get("/social/follow/following/:userId", async (req, res) => {
  try {
    const userId   = stripSeedPrefix(req.params.userId);
    const callerId = req.query["callerId"] as string | undefined;

    const rows = await db
      .select({ followingId: follows.followingId })
      .from(follows)
      .where(eq(follows.followerId, userId));

    if (rows.length === 0) { res.json([]); return; }

    const ids = rows.map((r) => r.followingId);

    /* Real users: look up in social_profiles */
    const uuidIds = ids.filter((id) => UUID_RE.test(id));
    const profiles = uuidIds.length > 0
      ? await db
          .select({ id: socialProfiles.id, name: socialProfiles.name, username: socialProfiles.username, avatarUrl: socialProfiles.avatarUrl })
          .from(socialProfiles)
          .where(inArray(socialProfiles.id, uuidIds))
      : [];
    const profileMap = new Map(profiles.map((p) => [p.id, p]));

    let callerFollowingIds = new Set<string>();
    if (callerId) {
      const cfRows = await db
        .select({ followingId: follows.followingId })
        .from(follows)
        .where(and(eq(follows.followerId, callerId), inArray(follows.followingId, ids)));
      callerFollowingIds = new Set(cfRows.map((r) => r.followingId));
    }

    /* Fallback for real users missing from social_profiles */
    const missingUuids = uuidIds.filter((id) => !profileMap.has(id));
    if (missingUuids.length > 0) {
      const postRows = await db
        .selectDistinctOn([feedPosts.userId], { userId: feedPosts.userId, username: feedPosts.username, avatarUrl: feedPosts.avatarUrl })
        .from(feedPosts)
        .where(inArray(feedPosts.userId, missingUuids));
      postRows.forEach((r) => {
        if (r.userId) profileMap.set(r.userId, { id: r.userId, name: r.username, username: r.username, avatarUrl: r.avatarUrl });
      });
    }

    /* Seed users (plain username, not UUID): query feedPosts by username */
    const seedIds = ids.filter((id) => !UUID_RE.test(id));
    if (seedIds.length > 0) {
      const seedRows = await db
        .selectDistinctOn([feedPosts.username], { username: feedPosts.username, avatarUrl: feedPosts.avatarUrl })
        .from(feedPosts)
        .where(inArray(feedPosts.username, seedIds));
      seedRows.forEach((r) => {
        profileMap.set(r.username, { id: r.username, name: r.username, username: r.username, avatarUrl: r.avatarUrl });
      });
    }

    const result = ids.map((id) => {
      const p = profileMap.get(id);
      return {
        userId:      id,
        username:    p?.username ?? p?.name ?? id,
        avatarUrl:   p?.avatarUrl ?? "",
        isFollowing: callerFollowingIds.has(id),
      };
    }).filter((r) => r.username);

    res.json(result);
  } catch (err) {
    req.log.error({ err }, "GET /social/follow/following failed");
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
      isProfilePublic: true,
      areStoriesVisible: true,
      likeNotificationsEnabled: true,
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

    /* Upsert so it works even if social_profiles row doesn't exist yet */
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
