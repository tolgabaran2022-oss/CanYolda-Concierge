import { Router } from "express";
import { and, desc, eq, sql } from "drizzle-orm";
import {
  db,
  feedPosts,
  feedComments,
  feedLikes,
  feedBookmarks,
} from "@workspace/db";
import { logger } from "../lib/logger.js";

const router = Router();

const SEED_POSTS = [
  {
    username: "miyav.house",
    avatarUrl: "https://loremflickr.com/100/100/kitten?lock=11",
    imageUrl: "https://loremflickr.com/600/400/cat?lock=301",
    caption: "Küçük prensesimiz bugün çok mutlu 🐱💜 Sahiplenmek isteyenler DM ✨",
    location: "Kadıköy, İstanbul",
    timeAgo: "2 saat önce",
    likesCount: 128,
    commentsCount: 12,
    sharesCount: 5,
  },
  {
    username: "patili.bir.dunya",
    avatarUrl: "https://loremflickr.com/100/100/puppy?lock=22",
    imageUrl: "https://loremflickr.com/600/400/golden?lock=302",
    caption: "Yeni dostumuz Max, artık güvende 🐶❤️",
    location: "Üsküdar, İstanbul",
    timeAgo: "3 saat önce",
    likesCount: 342,
    commentsCount: 26,
    sharesCount: 8,
  },
  {
    username: "koydeki.patiler",
    avatarUrl: "https://loremflickr.com/100/100/dog?lock=44",
    imageUrl: "https://loremflickr.com/600/400/cat?lock=303",
    caption: "Yağmurdan sonra biraz mama zamanı 🍚🐱",
    location: "Eyüp, İstanbul",
    timeAgo: "5 saat önce",
    likesCount: 89,
    commentsCount: 7,
    sharesCount: 3,
  },
  {
    username: "pati_dostum",
    avatarUrl: "https://loremflickr.com/100/100/tabby?lock=33",
    imageUrl: "https://loremflickr.com/600/400/kitten?lock=304",
    caption: "Dün sokakta bulduğumuz minik can. Sahip arıyoruz! 🐱🏠",
    location: "Beşiktaş, İstanbul",
    timeAgo: "7 saat önce",
    likesCount: 215,
    commentsCount: 18,
    sharesCount: 12,
  },
  {
    username: "sokak.dostlari",
    avatarUrl: "https://loremflickr.com/100/100/puppy?lock=66",
    imageUrl: "https://loremflickr.com/600/400/dog?lock=305",
    caption: "Mahallemizin köpeği bugün veterinere gitti. Teşekkürler herkese 🙏🐕",
    location: "Sarıyer, İstanbul",
    timeAgo: "1 gün önce",
    likesCount: 456,
    commentsCount: 34,
    sharesCount: 20,
  },
];

async function seedIfEmpty() {
  try {
    const existing = await db.select({ id: feedPosts.id }).from(feedPosts).limit(1);
    if (existing.length === 0) {
      await db.insert(feedPosts).values(SEED_POSTS);
      logger.info("Feed posts seeded");
    }
  } catch (err) {
    logger.error({ err }, "Seed failed");
  }
}

/* ── GET /api/feed/posts ─────────────────────────────────── */
router.get("/feed/posts", async (req, res) => {
  try {
    await seedIfEmpty();
    const userId = req.headers["x-user-id"] as string | undefined;

    const posts = await db
      .select()
      .from(feedPosts)
      .orderBy(desc(feedPosts.createdAt));

    let likedIds     = new Set<string>();
    let bookmarkedIds = new Set<string>();

    if (userId) {
      const [likes, bookmarks] = await Promise.all([
        db.select({ postId: feedLikes.postId }).from(feedLikes).where(eq(feedLikes.userId, userId)),
        db.select({ postId: feedBookmarks.postId }).from(feedBookmarks).where(eq(feedBookmarks.userId, userId)),
      ]);
      likedIds      = new Set(likes.map((l) => l.postId));
      bookmarkedIds = new Set(bookmarks.map((b) => b.postId));
    }

    res.json(
      posts.map((p) => ({
        ...p,
        liked:      likedIds.has(p.id),
        bookmarked: bookmarkedIds.has(p.id),
      }))
    );
  } catch (err) {
    req.log.error({ err }, "GET /feed/posts failed");
    res.status(500).json({ error: "Internal server error" });
  }
});

/* ── POST /api/feed/posts ────────────────────────────────── */
router.post("/feed/posts", async (req, res) => {
  try {
    const { username, avatarUrl, imageUrl, caption, location } = req.body as Record<string, string>;
    if (!username || !imageUrl) {
      res.status(400).json({ error: "username and imageUrl required" });
      return;
    }
    const [post] = await db
      .insert(feedPosts)
      .values({ username, avatarUrl: avatarUrl ?? "", imageUrl, caption: caption ?? "", location: location ?? "", timeAgo: "Az önce" })
      .returning();
    res.json({ ...post, liked: false, bookmarked: false });
  } catch (err) {
    req.log.error({ err }, "POST /feed/posts failed");
    res.status(500).json({ error: "Internal server error" });
  }
});

/* ── POST /api/feed/posts/:id/like ──────────────────────── */
router.post("/feed/posts/:id/like", async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.headers["x-user-id"] as string;
    if (!userId) { res.status(400).json({ error: "x-user-id header required" }); return; }

    const existing = await db
      .select()
      .from(feedLikes)
      .where(and(eq(feedLikes.postId, id), eq(feedLikes.userId, userId)))
      .limit(1);

    let liked: boolean;
    if (existing.length > 0) {
      await db.delete(feedLikes).where(and(eq(feedLikes.postId, id), eq(feedLikes.userId, userId)));
      await db.update(feedPosts).set({ likesCount: sql`likes_count - 1` }).where(eq(feedPosts.id, id));
      liked = false;
    } else {
      await db.insert(feedLikes).values({ postId: id, userId }).onConflictDoNothing();
      await db.update(feedPosts).set({ likesCount: sql`likes_count + 1` }).where(eq(feedPosts.id, id));
      liked = true;
    }

    const [post] = await db.select({ likesCount: feedPosts.likesCount }).from(feedPosts).where(eq(feedPosts.id, id));
    res.json({ liked, likesCount: post?.likesCount ?? 0 });
  } catch (err) {
    req.log.error({ err }, "POST /feed/posts/:id/like failed");
    res.status(500).json({ error: "Internal server error" });
  }
});

/* ── POST /api/feed/posts/:id/bookmark ──────────────────── */
router.post("/feed/posts/:id/bookmark", async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.headers["x-user-id"] as string;
    if (!userId) { res.status(400).json({ error: "x-user-id header required" }); return; }

    const existing = await db
      .select()
      .from(feedBookmarks)
      .where(and(eq(feedBookmarks.postId, id), eq(feedBookmarks.userId, userId)))
      .limit(1);

    let bookmarked: boolean;
    if (existing.length > 0) {
      await db.delete(feedBookmarks).where(and(eq(feedBookmarks.postId, id), eq(feedBookmarks.userId, userId)));
      bookmarked = false;
    } else {
      await db.insert(feedBookmarks).values({ postId: id, userId }).onConflictDoNothing();
      bookmarked = true;
    }

    res.json({ bookmarked });
  } catch (err) {
    req.log.error({ err }, "POST /feed/posts/:id/bookmark failed");
    res.status(500).json({ error: "Internal server error" });
  }
});

/* ── GET /api/feed/posts/:id/comments ───────────────────── */
router.get("/feed/posts/:id/comments", async (req, res) => {
  try {
    const { id } = req.params;
    const comments = await db
      .select()
      .from(feedComments)
      .where(eq(feedComments.postId, id))
      .orderBy(desc(feedComments.createdAt));
    res.json(comments);
  } catch (err) {
    req.log.error({ err }, "GET /feed/posts/:id/comments failed");
    res.status(500).json({ error: "Internal server error" });
  }
});

/* ── POST /api/feed/posts/:id/comments ──────────────────── */
router.post("/feed/posts/:id/comments", async (req, res) => {
  try {
    const { id } = req.params;
    const { username, text } = req.body as { username: string; text: string };
    if (!username || !text) { res.status(400).json({ error: "username and text required" }); return; }

    const [comment] = await db
      .insert(feedComments)
      .values({ postId: id, username, text })
      .returning();
    await db.update(feedPosts).set({ commentsCount: sql`comments_count + 1` }).where(eq(feedPosts.id, id));
    res.json(comment);
  } catch (err) {
    req.log.error({ err }, "POST /feed/posts/:id/comments failed");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
