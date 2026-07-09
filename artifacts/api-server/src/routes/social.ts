import { Router } from "express";
import { and, desc, eq, ilike, ne, or, sql } from "drizzle-orm";
import { db, feedPosts, follows, notifications } from "@workspace/db";
import { logger } from "../lib/logger.js";

const router = Router();

/* ── POST /api/social/follow/:targetId ─ toggle follow ── */
router.post("/social/follow/:targetId", async (req, res) => {
  try {
    const followerId  = req.headers["x-user-id"] as string;
    const followingId = req.params.targetId;

    if (!followerId) {
      res.status(400).json({ error: "x-user-id header required" });
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
    const targetId    = req.query["targetId"]   as string;
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

/* ── GET /api/social/follow/counts ────────────────────── */
router.get("/social/follow/counts", async (req, res) => {
  try {
    const userId = req.query["userId"] as string;
    if (!userId) { res.status(400).json({ error: "userId required" }); return; }

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

export default router;
