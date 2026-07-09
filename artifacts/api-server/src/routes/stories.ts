import { Router } from "express";
import { and, desc, eq, gt, sql } from "drizzle-orm";
import { db, stories, storyViews } from "@workspace/db";
import { logger } from "../lib/logger.js";

const router = Router();
const STORY_LIFETIME_HOURS = 24;

function expiry() {
  return new Date(Date.now() + STORY_LIFETIME_HOURS * 60 * 60 * 1000);
}

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

// GET /api/stories — active stories with view counts
router.get("/stories", async (req, res) => {
  try {
    await seedIfEmpty();
    const viewerId = req.headers["x-user-id"] as string | undefined;
    const now = new Date();

    const rows = await db
      .select()
      .from(stories)
      .where(gt(stories.expiresAt, now))
      .orderBy(desc(stories.createdAt));

    const storyIds = rows.map((r) => r.id);

    const [views, myViews] = await Promise.all([
      db
        .select({ storyId: storyViews.storyId, count: sql<number>`count(*)::int` })
        .from(storyViews)
        .where(sql`${storyViews.storyId} IN (${sql.join(storyIds.map((id) => sql`${id}`), sql`, `)})`)
        .groupBy(storyViews.storyId),
      viewerId
        ? db
            .select({ storyId: storyViews.storyId })
            .from(storyViews)
            .where(
              and(
                sql`${storyViews.storyId} IN (${sql.join(storyIds.map((id) => sql`${id}`), sql`, `)})`,
                eq(storyViews.viewerId, viewerId)
              )
            )
        : [],
    ]);

    const viewMap = new Map(views.map((v) => [v.storyId, v.count]));
    const seenSet = new Set(myViews.map((v) => v.storyId));

    // Group by user
    const byUser = new Map<string, typeof rows>();
    for (const s of rows) {
      const arr = byUser.get(s.userId) ?? [];
      arr.push(s);
      byUser.set(s.userId, arr);
    }

    const result = Array.from(byUser.entries()).map(([userId, userStories]) => ({
      userId,
      username: userStories[0]!.username,
      avatarUrl: userStories[0]!.avatarUrl,
      hasUnseen: userStories.some((s) => !seenSet.has(s.id)),
      stories: userStories.map((s) => ({
        id: s.id,
        imageUrl: s.imageUrl,
        caption: s.caption,
        createdAt: s.createdAt,
        viewCount: viewMap.get(s.id) ?? 0,
        seen: seenSet.has(s.id),
      })),
    }));

    // Current user first, then unseen first
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

// POST /api/stories — create story
router.post("/stories", async (req, res) => {
  try {
    const { userId, username, avatarUrl, imageUrl, caption } = req.body as Record<string, string>;
    if (!userId || !imageUrl) {
      res.status(400).json({ error: "userId and imageUrl required" });
      return;
    }
    const [story] = await db
      .insert(stories)
      .values({
        userId,
        username: username ?? "Kullanici",
        avatarUrl: avatarUrl ?? "",
        imageUrl,
        caption: caption ?? "",
        expiresAt: expiry(),
      })
      .returning();
    res.json({
      userId,
      username: story.username,
      avatarUrl: story.avatarUrl,
      hasUnseen: true,
      stories: [{
        id: story.id,
        imageUrl: story.imageUrl,
        caption: story.caption,
        createdAt: story.createdAt,
        viewCount: 0,
        seen: false,
      }],
    });
  } catch (err) {
    req.log.error({ err }, "POST /stories failed");
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/stories/:id/view — mark as viewed
router.post("/stories/:id/view", async (req, res) => {
  try {
    const { id } = req.params;
    const viewerId = req.headers["x-user-id"] as string;
    if (!viewerId) { res.status(400).json({ error: "x-user-id header required" }); return; }

    await db.insert(storyViews)
      .values({ storyId: id, viewerId })
      .onConflictDoNothing();

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

// GET /api/stories/:id/views — who viewed
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

export default router;
