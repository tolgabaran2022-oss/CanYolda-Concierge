import { Router } from "express";
import { extractUserIdDual } from "../lib/jwtAuth.js";
import { and, desc, eq, gt, inArray, sql } from "drizzle-orm";
import { db, pool, stories, storyViews, storyLikes, storyReplies, socialProfiles, follows, notifications, conversations, messages } from "@workspace/db";
import { logger } from "../lib/logger.js";
import { extractUserId } from "../lib/jwtAuth.js";

const router = Router();
const STORY_LIFETIME_HOURS = 24;

function expiry() {
  return new Date(Date.now() + STORY_LIFETIME_HOURS * 60 * 60 * 1000);
}

/* ── Auto-migration ──────────────────────────────────────── */
pool.query(`
  CREATE TABLE IF NOT EXISTS story_likes (
    id         text PRIMARY KEY DEFAULT gen_random_uuid()::text,
    story_id   text NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
    user_id    text NOT NULL,
    created_at timestamptz DEFAULT now(),
    UNIQUE(story_id, user_id)
  );
  CREATE TABLE IF NOT EXISTS story_replies (
    id          text PRIMARY KEY DEFAULT gen_random_uuid()::text,
    story_id    text NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
    sender_id   text NOT NULL,
    receiver_id text NOT NULL,
    message     text NOT NULL,
    created_at  timestamptz DEFAULT now()
  );
`).then(() => {
  logger.info("story_likes / story_replies tables ensured");
}).catch((err: unknown) => {
  logger.error({ err }, "story_likes / story_replies migration failed");
});

const SEED_STORIES = [
  {
    userId: "seed-user-1",
    username: "miyav.house",
    avatarUrl: "https://loremflickr.com/100/100/kitten?lock=11",
    imageUrl: "https://loremflickr.com/400/700/cat?lock=501",
    caption: "Bugun parkta yeni dostumuzla tanistik! 🐱💜",
  },
  {
    userId: "seed-user-2",
    username: "patili.bir.dunya",
    avatarUrl: "https://loremflickr.com/100/100/puppy?lock=22",
    imageUrl: "https://loremflickr.com/400/700/golden?lock=502",
    caption: "Max artik guvende! Veteriner kontrolu tamamlandi 🐶❤️",
  },
  {
    userId: "seed-user-3",
    username: "sokak.dostlari",
    avatarUrl: "https://loremflickr.com/100/100/dog?lock=44",
    imageUrl: "https://loremflickr.com/400/700/dog?lock=503",
    caption: "Mahallemizin kahramani bugun kuru mama yedi! 🐕🍖",
  },
];

async function seedIfEmpty() {
  try {
    const existing = await db.select({ id: stories.id }).from(stories).limit(1);
    if (existing.length === 0) {
      const exp = expiry();
      await db.insert(stories).values(
        SEED_STORIES.map((s) => ({ ...s, expiresAt: exp }))
      );
      logger.info("Stories seeded (%d)", SEED_STORIES.length);
    }
  } catch (err) {
    logger.error({ err }, "Stories seed failed");
  }
}

/* ── GET /api/stories/user/:userId — active stories for one user ── */
router.get("/stories/user/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const viewerId = extractUserIdDual(req) || undefined;
    const now = new Date();

    /* Privacy checks */
    const [profile] = await db
      .select({ areStoriesVisible: socialProfiles.areStoriesVisible, isProfilePublic: socialProfiles.isProfilePublic })
      .from(socialProfiles)
      .where(eq(socialProfiles.id, userId))
      .limit(1);

    if (profile && !profile.areStoriesVisible) { res.json(null); return; }

    if (profile && !profile.isProfilePublic && viewerId && viewerId !== userId) {
      const [followRow] = await db
        .select({ id: follows.id })
        .from(follows)
        .where(and(eq(follows.followerId, viewerId), eq(follows.followingId, userId)))
        .limit(1);
      if (!followRow) { res.json(null); return; }
    }

    const rows = await db
      .select()
      .from(stories)
      .where(and(eq(stories.userId, userId), gt(stories.expiresAt, now)))
      .orderBy(desc(stories.createdAt));

    if (rows.length === 0) { res.json(null); return; }

    const storyIds = rows.map((r) => r.id);
    const [views, myViews, likeRows, myLikes] = await Promise.all([
      db.select({ storyId: storyViews.storyId, count: sql<number>`count(*)::int` })
        .from(storyViews).where(inArray(storyViews.storyId, storyIds)).groupBy(storyViews.storyId),
      viewerId
        ? db.select({ storyId: storyViews.storyId }).from(storyViews)
            .where(and(inArray(storyViews.storyId, storyIds), eq(storyViews.viewerId, viewerId)))
        : Promise.resolve([]),
      db.select({ storyId: storyLikes.storyId, count: sql<number>`count(*)::int` })
        .from(storyLikes).where(inArray(storyLikes.storyId, storyIds)).groupBy(storyLikes.storyId),
      viewerId
        ? db.select({ storyId: storyLikes.storyId }).from(storyLikes)
            .where(and(inArray(storyLikes.storyId, storyIds), eq(storyLikes.userId, viewerId)))
        : Promise.resolve([]),
    ]);

    const viewMap  = new Map(views.map((v) => [v.storyId, v.count]));
    const seenSet  = new Set(myViews.map((v) => v.storyId));
    const likeMap  = new Map(likeRows.map((l) => [l.storyId, l.count]));
    const likedSet = new Set(myLikes.map((l) => l.storyId));

    res.json({
      userId: rows[0]!.userId,
      username:  rows[0]!.username,
      avatarUrl: rows[0]!.avatarUrl,
      hasUnseen: rows.some((s) => !seenSet.has(s.id)),
      stories: rows.map((s) => ({
        id:         s.id,
        imageUrl:   s.imageUrl,
        caption:    s.caption ?? "",
        createdAt:  s.createdAt,
        viewCount:  viewMap.get(s.id) ?? 0,
        seen:       seenSet.has(s.id),
        liked:      likedSet.has(s.id),
        likesCount: likeMap.get(s.id) ?? 0,
      })),
    });
  } catch (err) {
    req.log.error({ err }, "GET /stories/user/:userId failed");
    res.status(500).json({ error: "Internal server error" });
  }
});

/* ── GET /api/stories — active stories with view/like counts ── */
router.get("/stories", async (req, res) => {
  try {
    await seedIfEmpty();
    const viewerId = extractUserIdDual(req) || undefined;
    const now = new Date();

    const hiddenUsers = await db
      .select({ id: socialProfiles.id })
      .from(socialProfiles)
      .where(eq(socialProfiles.areStoriesVisible, false));
    const hiddenIds = new Set(hiddenUsers.map((u) => u.id));

    const rows = (await db
      .select()
      .from(stories)
      .where(gt(stories.expiresAt, now))
      .orderBy(desc(stories.createdAt)))
      .filter((s) => !hiddenIds.has(s.userId));

    const storyIds = rows.map((r) => r.id);
    if (storyIds.length === 0) { res.json([]); return; }

    const [views, myViews, likeRows, myLikes] = await Promise.all([
      db
        .select({ storyId: storyViews.storyId, count: sql<number>`count(*)::int` })
        .from(storyViews)
        .where(inArray(storyViews.storyId, storyIds))
        .groupBy(storyViews.storyId),
      viewerId
        ? db.select({ storyId: storyViews.storyId }).from(storyViews)
            .where(and(inArray(storyViews.storyId, storyIds), eq(storyViews.viewerId, viewerId)))
        : Promise.resolve([]),
      db
        .select({ storyId: storyLikes.storyId, count: sql<number>`count(*)::int` })
        .from(storyLikes)
        .where(inArray(storyLikes.storyId, storyIds))
        .groupBy(storyLikes.storyId),
      viewerId
        ? db.select({ storyId: storyLikes.storyId }).from(storyLikes)
            .where(and(inArray(storyLikes.storyId, storyIds), eq(storyLikes.userId, viewerId)))
        : Promise.resolve([]),
    ]);

    const viewMap  = new Map(views.map((v) => [v.storyId, v.count]));
    const seenSet  = new Set(myViews.map((v) => v.storyId));
    const likeMap  = new Map(likeRows.map((l) => [l.storyId, l.count]));
    const likedSet = new Set(myLikes.map((l) => l.storyId));

    const byUser = new Map<string, typeof rows>();
    for (const s of rows) {
      const arr = byUser.get(s.userId) ?? [];
      arr.push(s);
      byUser.set(s.userId, arr);
    }

    const result = Array.from(byUser.entries()).map(([userId, userStories]) => ({
      userId,
      username:  userStories[0]!.username,
      avatarUrl: userStories[0]!.avatarUrl,
      hasUnseen: userStories.some((s) => !seenSet.has(s.id)),
      stories: userStories.map((s) => ({
        id:         s.id,
        imageUrl:   s.imageUrl,
        caption:    s.caption,
        createdAt:  s.createdAt,
        viewCount:  viewMap.get(s.id) ?? 0,
        seen:       seenSet.has(s.id),
        liked:      likedSet.has(s.id),
        likesCount: likeMap.get(s.id) ?? 0,
      })),
    }));

    result.sort((a, b) => {
      if (viewerId) {
        if (a.userId === viewerId && b.userId !== viewerId) return -1;
        if (a.userId !== viewerId && b.userId === viewerId) return 1;
      }
      return (b.hasUnseen ? 1 : 0) - (a.hasUnseen ? 1 : 0);
    });

    res.json(result);
  } catch (err) {
    req.log.error({ err }, "GET /stories failed");
    res.status(500).json({ error: "Internal server error" });
  }
});

/* ── POST /api/stories — create story ── */
router.post("/stories", async (req, res) => {
  try {
    /* userId MUST come from the verified JWT token, never from req.body */
    const userId = extractUserId(req);
    if (!userId) {
      res.status(401).json({ error: "Giriş yapılmamış" });
      return;
    }

    const { username, avatarUrl, imageUrl, caption } = req.body as Record<string, string>;
    if (!imageUrl) {
      res.status(400).json({ error: "imageUrl required" });
      return;
    }

    const [story] = await db
      .insert(stories)
      .values({ userId, username: username ?? "Kullanici", avatarUrl: avatarUrl ?? "", imageUrl, caption: caption ?? "", expiresAt: expiry() })
      .returning();
    res.json({
      userId,
      username: story.username,
      avatarUrl: story.avatarUrl,
      hasUnseen: true,
      stories: [{ id: story.id, imageUrl: story.imageUrl, caption: story.caption, createdAt: story.createdAt, viewCount: 0, seen: false, liked: false, likesCount: 0 }],
    });
  } catch (err) {
    req.log.error({ err }, "POST /stories failed");
    res.status(500).json({ error: "Internal server error" });
  }
});

/* ── POST /api/stories/:id/view — mark as viewed ── */
router.post("/stories/:id/view", async (req, res) => {
  try {
    const { id } = req.params;
    const viewerId = extractUserIdDual(req);
    if (!viewerId) { res.status(401).json({ error: "Giriş yapılmamış" }); return; }

    await db.insert(storyViews).values({ storyId: id, viewerId }).onConflictDoNothing();

    const [{ count }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(storyViews)
      .where(eq(storyViews.storyId, id));

    res.json({ viewed: true, viewCount: count });
  } catch (err) {
    req.log.error({ err }, "POST /stories/:id/view failed");
    res.status(500).json({ error: "Internal server error" });
  }
});

/* ── GET /api/stories/:id/views — who viewed ── */
router.get("/stories/:id/views", async (req, res) => {
  try {
    const { id } = req.params;
    const rows = await db
      .select({ viewerId: storyViews.viewerId, viewedAt: storyViews.viewedAt })
      .from(storyViews)
      .where(eq(storyViews.storyId, id))
      .orderBy(desc(storyViews.viewedAt));
    res.json(rows);
  } catch (err) {
    req.log.error({ err }, "GET /stories/:id/views failed");
    res.status(500).json({ error: "Internal server error" });
  }
});

/* ── POST /api/stories/:id/like — toggle like ── */
router.post("/stories/:id/like", async (req, res) => {
  try {
    const { id } = req.params;
    const userId = extractUserIdDual(req);
    if (!userId) { res.status(401).json({ error: "Giriş yapılmamış" }); return; }

    const existing = await db.select({ id: storyLikes.id })
      .from(storyLikes)
      .where(and(eq(storyLikes.storyId, id), eq(storyLikes.userId, userId)))
      .limit(1);

    if (existing.length > 0) {
      await db.delete(storyLikes)
        .where(and(eq(storyLikes.storyId, id), eq(storyLikes.userId, userId)));
    } else {
      await db.insert(storyLikes).values({ storyId: id, userId }).onConflictDoNothing();

      /* Notify story owner */
      const [story] = await db.select({ userId: stories.userId }).from(stories).where(eq(stories.id, id)).limit(1);
      if (story && story.userId !== userId) {
        const [ownerProfile] = await db.select({ likeNotificationsEnabled: socialProfiles.likeNotificationsEnabled })
          .from(socialProfiles).where(eq(socialProfiles.id, story.userId)).limit(1);
        if (!ownerProfile || ownerProfile.likeNotificationsEnabled) {
          const [senderProfile] = await db.select({ username: socialProfiles.username, avatarUrl: socialProfiles.avatarUrl })
            .from(socialProfiles).where(eq(socialProfiles.id, userId)).limit(1);
          await db.insert(notifications).values({
            receiverId:   story.userId,
            senderId:     userId,
            senderName:   senderProfile?.username ?? userId,
            senderAvatar: senderProfile?.avatarUrl ?? "",
            type:         "like",
            message:      "Hikayeni beğendi",
          });
        }
      }
    }

    const [{ count }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(storyLikes)
      .where(eq(storyLikes.storyId, id));

    res.json({ liked: existing.length === 0, likesCount: count });
  } catch (err) {
    req.log.error({ err }, "POST /stories/:id/like failed");
    res.status(500).json({ error: "Internal server error" });
  }
});

/* ── GET /api/stories/:id/like — like status ── */
router.get("/stories/:id/like", async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.query["userId"] as string | undefined;

    const [{ count }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(storyLikes)
      .where(eq(storyLikes.storyId, id));

    const liked = userId
      ? (await db.select({ id: storyLikes.id }).from(storyLikes)
          .where(and(eq(storyLikes.storyId, id), eq(storyLikes.userId, userId))).limit(1)).length > 0
      : false;

    res.json({ liked, likesCount: count });
  } catch (err) {
    req.log.error({ err }, "GET /stories/:id/like failed");
    res.status(500).json({ error: "Internal server error" });
  }
});

/* ── GET /api/stories/:id/likers — who liked (for owner) ── */
router.get("/stories/:id/likers", async (req, res) => {
  try {
    const { id } = req.params;

    const likerRows = await db
      .select({ userId: storyLikes.userId })
      .from(storyLikes)
      .where(eq(storyLikes.storyId, id))
      .orderBy(desc(storyLikes.createdAt));

    if (likerRows.length === 0) { res.json([]); return; }

    const ids = likerRows.map((r) => r.userId);
    const profiles = await db
      .select({ id: socialProfiles.id, username: socialProfiles.username, avatarUrl: socialProfiles.avatarUrl })
      .from(socialProfiles)
      .where(inArray(socialProfiles.id, ids));

    const profileMap = new Map(profiles.map((p) => [p.id, p]));

    res.json(ids.map((uid) => ({
      userId:    uid,
      username:  profileMap.get(uid)?.username ?? uid,
      avatarUrl: profileMap.get(uid)?.avatarUrl ?? "",
    })));
  } catch (err) {
    req.log.error({ err }, "GET /stories/:id/likers failed");
    res.status(500).json({ error: "Internal server error" });
  }
});

/* ── POST /api/stories/:id/reply — reply to story (also creates DM) ── */
router.post("/stories/:id/reply", async (req, res) => {
  try {
    const { id } = req.params;
    const senderId = extractUserIdDual(req);
    if (!senderId) { res.status(401).json({ error: "Giriş yapılmamış" }); return; }

    const { receiverId, message } = req.body as { receiverId: string; message: string };
    if (!receiverId || !message?.trim()) {
      res.status(400).json({ error: "receiverId and message required" });
      return;
    }

    /* Prevent self-reply */
    if (senderId === receiverId) {
      res.status(400).json({ error: "Cannot reply to own story" });
      return;
    }

    const trimmed = message.trim();

    /* Save story reply */
    await db.insert(storyReplies).values({ storyId: id, senderId, receiverId, message: trimmed });

    /* Create or get existing DM conversation */
    const [userOne, userTwo] = [senderId, receiverId].sort();
    let conv = await db.select().from(conversations)
      .where(and(eq(conversations.userOne, userOne), eq(conversations.userTwo, userTwo)))
      .limit(1);

    let convId: string;
    if (conv.length > 0) {
      convId = conv[0]!.id;
      await db.update(conversations)
        .set({ lastMessage: `Hikayene yanıt verdi: ${trimmed}`, lastMessageAt: new Date() })
        .where(eq(conversations.id, convId));
    } else {
      const [newConv] = await db.insert(conversations)
        .values({ userOne, userTwo, lastMessage: `Hikayene yanıt verdi: ${trimmed}`, lastMessageAt: new Date() })
        .returning();
      convId = newConv!.id;
    }

    /* Insert message into DM */
    await db.insert(messages).values({
      conversationId: convId,
      senderId,
      message: `📸 Hikayene yanıt verdi: ${trimmed}`,
    });

    /* Notify story owner if message notifications enabled */
    const [ownerProfile] = await db.select({ messageNotificationsEnabled: socialProfiles.messageNotificationsEnabled })
      .from(socialProfiles).where(eq(socialProfiles.id, receiverId)).limit(1);
    if (!ownerProfile || ownerProfile.messageNotificationsEnabled) {
      const [senderProfile] = await db.select({ username: socialProfiles.username, avatarUrl: socialProfiles.avatarUrl })
        .from(socialProfiles).where(eq(socialProfiles.id, senderId)).limit(1);
      await db.insert(notifications).values({
        receiverId,
        senderId,
        senderName:   senderProfile?.username ?? senderId,
        senderAvatar: senderProfile?.avatarUrl ?? "",
        type:         "comment",
        message:      `Hikayene yanıt verdi: ${trimmed}`,
      });
    }

    res.json({ ok: true });
  } catch (err) {
    req.log.error({ err }, "POST /stories/:id/reply failed");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
