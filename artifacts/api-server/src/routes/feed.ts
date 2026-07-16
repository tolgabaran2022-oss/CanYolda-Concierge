import { Router } from "express";
import { extractUserIdDual } from "../lib/jwtAuth.js";
import { and, desc, eq, inArray, or, sql } from "drizzle-orm";
import {
  db,
  feedPosts,
  feedComments,
  feedLikes,
  feedBookmarks,
  notifications,
  follows,
  socialProfiles,
} from "@workspace/db";
import { logger } from "../lib/logger.js";

const router = Router();

const SEED_POSTS = [
  /* ── Original 5 posts ── */
  {
    username: "miyav.house",
    avatarUrl: "https://loremflickr.com/100/100/kitten?lock=11",
    imageUrl: "https://loremflickr.com/600/400/cat?lock=301",
    caption: "Kucuk prensesimiz bugun cok mutlu 🐱💜 Sahiplenmek isteyenler DM ✨",
    location: "Kadikoy, Istanbul",
    timeAgo: "2 saat once",
    likesCount: 128,
    commentsCount: 12,
    sharesCount: 5,
  },
  {
    username: "patili.bir.dunya",
    avatarUrl: "https://loremflickr.com/100/100/puppy?lock=22",
    imageUrl: "https://loremflickr.com/600/400/golden?lock=302",
    caption: "Yeni dostumuz Max, artik guvende 🐶❤️",
    location: "Uskudar, Istanbul",
    timeAgo: "3 saat once",
    likesCount: 342,
    commentsCount: 26,
    sharesCount: 8,
  },
  {
    username: "koydeki.patiler",
    avatarUrl: "https://loremflickr.com/100/100/dog?lock=44",
    imageUrl: "https://loremflickr.com/600/400/cat?lock=303",
    caption: "Yagmurdan sonra biraz mama zamani 🍚🐱",
    location: "Eyup, Istanbul",
    timeAgo: "5 saat once",
    likesCount: 89,
    commentsCount: 7,
    sharesCount: 3,
  },
  {
    username: "pati_dostum",
    avatarUrl: "https://loremflickr.com/100/100/tabby?lock=33",
    imageUrl: "https://loremflickr.com/600/400/kitten?lock=304",
    caption: "Dun sokakta buldugumuz minik can. Sahip ariyoruz! 🐱🏠",
    location: "Besiktas, Istanbul",
    timeAgo: "7 saat once",
    likesCount: 215,
    commentsCount: 18,
    sharesCount: 12,
  },
  {
    username: "sokak.dostlari",
    avatarUrl: "https://loremflickr.com/100/100/puppy?lock=66",
    imageUrl: "https://loremflickr.com/600/400/dog?lock=305",
    caption: "Mahallemizin kopegi bugun veterinere gitti. Tesekkurler herkese 🙏🐕",
    location: "Sariyer, Istanbul",
    timeAgo: "1 gun once",
    likesCount: 456,
    commentsCount: 34,
    sharesCount: 20,
  },

  /* ── 30 new posts ── */
  {
    username: "kucuk.pawlar",
    avatarUrl: "https://loremflickr.com/100/100/cat?lock=55",
    imageUrl: "https://loremflickr.com/600/400/cat?lock=306",
    caption: "Bakirkoy'de bu tatli kiz 3 gun once gozumuze carpti. Mama veriyoruz ama yuva lazim 🏠",
    location: "Bakirkoy, Istanbul",
    timeAgo: "Az once",
    likesCount: 67,
    commentsCount: 4,
    sharesCount: 2,
  },
  {
    username: "minnoslar.evi",
    avatarUrl: "https://loremflickr.com/100/100/kitten?lock=77",
    imageUrl: "https://loremflickr.com/600/400/dog?lock=307",
    caption: "Kartal sahilinde yarali bir golden bulduk. Acil veteriner destegi gerekli 🆘",
    location: "Kartal, Istanbul",
    timeAgo: "15 dakika once",
    likesCount: 523,
    commentsCount: 45,
    sharesCount: 89,
  },
  {
    username: "patici.sultan",
    avatarUrl: "https://loremflickr.com/100/100/dog?lock=88",
    imageUrl: "https://loremflickr.com/600/400/kitten?lock=308",
    caption: "Maltepe'de 5 yavru kedi anneleriyle birlikte. Kisirlastirma kampanyasina katilabilir miyiz?",
    location: "Maltepe, Istanbul",
    timeAgo: "30 dakika once",
    likesCount: 198,
    commentsCount: 22,
    sharesCount: 15,
  },
  {
    username: "miyav.house",
    avatarUrl: "https://loremflickr.com/100/100/kitten?lock=11",
    imageUrl: "https://loremflickr.com/600/400/cat?lock=309",
    caption: "Uskudar'da kaybolan tekir kedi! Son goruldugu yer Iskele sokak. Bilgi icin DM 📩",
    location: "Uskudar, Istanbul",
    timeAgo: "1 saat once",
    likesCount: 412,
    commentsCount: 31,
    sharesCount: 67,
  },
  {
    username: "patili.bir.dunya",
    avatarUrl: "https://loremflickr.com/100/100/puppy?lock=22",
    imageUrl: "https://loremflickr.com/600/400/dog?lock=310",
    caption: "Besiktas'ta her gun ayni saatte gelen dostumuz. Artik ismi 'Cesur' oldu 🐕💪",
    location: "Besiktas, Istanbul",
    timeAgo: "2 saat once",
    likesCount: 267,
    commentsCount: 19,
    sharesCount: 8,
  },
  {
    username: "koydeki.patiler",
    avatarUrl: "https://loremflickr.com/100/100/dog?lock=44",
    imageUrl: "https://loremflickr.com/600/400/cat?lock=311",
    caption: "Eyup'te gece nobeti tutan gonullulerimiz 8 kediye mama verdi. Harikasiniz! 🌙",
    location: "Eyup, Istanbul",
    timeAgo: "3 saat once",
    likesCount: 156,
    commentsCount: 11,
    sharesCount: 6,
  },
  {
    username: "pati_dostum",
    avatarUrl: "https://loremflickr.com/100/100/tabby?lock=33",
    imageUrl: "https://loremflickr.com/600/400/kitten?lock=312",
    caption: "Sariyer'de bahcemize gelen bu guzel kiz 2 haftadir bizimle. Yuva ariyoruz 🐱",
    location: "Sariyer, Istanbul",
    timeAgo: "4 saat once",
    likesCount: 89,
    commentsCount: 7,
    sharesCount: 3,
  },
  {
    username: "sokak.dostlari",
    avatarUrl: "https://loremflickr.com/100/100/puppy?lock=66",
    imageUrl: "https://loremflickr.com/600/400/dog?lock=313",
    caption: "Kadikoy Moda'da bu sabah bir ailemiz daha sahiplendi. Mutlu son! 🏠❤️",
    location: "Kadikoy, Istanbul",
    timeAgo: "5 saat once",
    likesCount: 634,
    commentsCount: 52,
    sharesCount: 104,
  },
  {
    username: "kucuk.pawlar",
    avatarUrl: "https://loremflickr.com/100/100/cat?lock=55",
    imageUrl: "https://loremflickr.com/600/400/cat?lock=314",
    caption: "Bakirkoy pazar alaninda acik bir yara gorduk. Veteriner arkadasimiz mudahale etti 🏥",
    location: "Bakirkoy, Istanbul",
    timeAgo: "6 saat once",
    likesCount: 378,
    commentsCount: 28,
    sharesCount: 43,
  },
  {
    username: "minnoslar.evi",
    avatarUrl: "https://loremflickr.com/100/100/kitten?lock=77",
    imageUrl: "https://loremflickr.com/600/400/dog?lock=315",
    caption: "Kartal'da mama istasyonu kurduk! Bolge halki destek olursa harika olur 🥣",
    location: "Kartal, Istanbul",
    timeAgo: "7 saat once",
    likesCount: 245,
    commentsCount: 17,
    sharesCount: 12,
  },
  {
    username: "patici.sultan",
    avatarUrl: "https://loremflickr.com/100/100/dog?lock=88",
    imageUrl: "https://loremflickr.com/600/400/kitten?lock=316",
    caption: "Maltepe'de bu sabah 3 yavru kopek bulundu. Anneleri etrafta gorunmuyor, acil destek!",
    location: "Maltepe, Istanbul",
    timeAgo: "8 saat once",
    likesCount: 489,
    commentsCount: 38,
    sharesCount: 72,
  },
  {
    username: "miyav.house",
    avatarUrl: "https://loremflickr.com/100/100/kitten?lock=11",
    imageUrl: "https://loremflickr.com/600/400/cat?lock=317",
    caption: "Uskudar Cami onunde her gun bekleyen bu dostumuz. Yoldan gecenler mama birakiyor 🐱",
    location: "Uskudar, Istanbul",
    timeAgo: "9 saat once",
    likesCount: 134,
    commentsCount: 9,
    sharesCount: 4,
  },
  {
    username: "patili.bir.dunya",
    avatarUrl: "https://loremflickr.com/100/100/puppy?lock=22",
    imageUrl: "https://loremflickr.com/600/400/dog?lock=318",
    caption: "Besiktas'ta yasli bir retriever goruldu. Zayif ve yorgun, veteriner kontrolu gerekli 🐕",
    location: "Besiktas, Istanbul",
    timeAgo: "10 saat once",
    likesCount: 312,
    commentsCount: 24,
    sharesCount: 31,
  },
  {
    username: "koydeki.patiler",
    avatarUrl: "https://loremflickr.com/100/100/dog?lock=44",
    imageUrl: "https://loremflickr.com/600/400/cat?lock=319",
    caption: "Eyup'te yeni bir gonullu ekibimiz olustu! Haftada 2 gun mama turu yapacaklar 🚗",
    location: "Eyup, Istanbul",
    timeAgo: "11 saat once",
    likesCount: 567,
    commentsCount: 41,
    sharesCount: 56,
  },
  {
    username: "pati_dostum",
    avatarUrl: "https://loremflickr.com/100/100/tabby?lock=33",
    imageUrl: "https://loremflickr.com/600/400/kitten?lock=320",
    caption: "Sariyer ormanlik alanda yarali bir tilki bulduk. Yarasi dezenfekte edildi 🦊💚",
    location: "Sariyer, Istanbul",
    timeAgo: "12 saat once",
    likesCount: 278,
    commentsCount: 20,
    sharesCount: 18,
  },
  {
    username: "sokak.dostlari",
    avatarUrl: "https://loremflickr.com/100/100/puppy?lock=66",
    imageUrl: "https://loremflickr.com/600/400/dog?lock=321",
    caption: "Kadikoy'de kisirlastirma kampanyamiz basliyor! 20 kediye ucretsiz kisirlastirma 📅",
    location: "Kadikoy, Istanbul",
    timeAgo: "13 saat once",
    likesCount: 445,
    commentsCount: 33,
    sharesCount: 78,
  },
  {
    username: "kucuk.pawlar",
    avatarUrl: "https://loremflickr.com/100/100/cat?lock=55",
    imageUrl: "https://loremflickr.com/600/400/cat?lock=322",
    caption: "Bakirkoy'de okul bahcesine giren bu kiz artik oranin maskotu. Ogrenciler seviyor 📚🐱",
    location: "Bakirkoy, Istanbul",
    timeAgo: "14 saat once",
    likesCount: 189,
    commentsCount: 14,
    sharesCount: 9,
  },
  {
    username: "minnoslar.evi",
    avatarUrl: "https://loremflickr.com/100/100/kitten?lock=77",
    imageUrl: "https://loremflickr.com/600/400/dog?lock=323",
    caption: "Kartal'da bu sabah bir arabanin altindan kopek yavrusu cikti. Guvende simdi 🚗➡️🏠",
    location: "Kartal, Istanbul",
    timeAgo: "15 saat once",
    likesCount: 356,
    commentsCount: 27,
    sharesCount: 45,
  },
  {
    username: "patici.sultan",
    avatarUrl: "https://loremflickr.com/100/100/dog?lock=88",
    imageUrl: "https://loremflickr.com/600/400/kitten?lock=324",
    caption: "Maltepe'de parkta yalniz basina gezen bu kiz. 1 yasinda, cok oyuncu 🎾🐱",
    location: "Maltepe, Istanbul",
    timeAgo: "16 saat once",
    likesCount: 98,
    commentsCount: 6,
    sharesCount: 2,
  },
  {
    username: "miyav.house",
    avatarUrl: "https://loremflickr.com/100/100/kitten?lock=11",
    imageUrl: "https://loremflickr.com/600/400/cat?lock=325",
    caption: "Uskudar'da bahcemizin yeni sakinleri: 4 tavsan yavrusu! Anne tavsan etrafta 🐰",
    location: "Uskudar, Istanbul",
    timeAgo: "17 saat once",
    likesCount: 412,
    commentsCount: 29,
    sharesCount: 51,
  },
  {
    username: "patili.bir.dunya",
    avatarUrl: "https://loremflickr.com/100/100/puppy?lock=22",
    imageUrl: "https://loremflickr.com/600/400/dog?lock=326",
    caption: "Besiktas'ta veteriner klinigimizden harika haber: 3 tedavi tamamlandi! 🏥✅",
    location: "Besiktas, Istanbul",
    timeAgo: "18 saat once",
    likesCount: 234,
    commentsCount: 16,
    sharesCount: 11,
  },
  {
    username: "koydeki.patiler",
    avatarUrl: "https://loremflickr.com/100/100/dog?lock=44",
    imageUrl: "https://loremflickr.com/600/400/cat?lock=327",
    caption: "Eyup'te market onunde sabah aksam bekleyen dostumuz. Musterek besleniyor 🍞🐱",
    location: "Eyup, Istanbul",
    timeAgo: "19 saat once",
    likesCount: 145,
    commentsCount: 10,
    sharesCount: 5,
  },
  {
    username: "pati_dostum",
    avatarUrl: "https://loremflickr.com/100/100/tabby?lock=33",
    imageUrl: "https://loremflickr.com/600/400/kitten?lock=328",
    caption: "Sariyer'de deniz kenarinda bulunan bu guzel. Biraz urkek ama mama yiyor 🌊🐱",
    location: "Sariyer, Istanbul",
    timeAgo: "20 saat once",
    likesCount: 76,
    commentsCount: 5,
    sharesCount: 1,
  },
  {
    username: "sokak.dostlari",
    avatarUrl: "https://loremflickr.com/100/100/puppy?lock=66",
    imageUrl: "https://loremflickr.com/600/400/dog?lock=329",
    caption: "Kadikoy'de dun gece dogum yapan kopek ve 6 yavrusu. Hepsi saglikli 🐶👶",
    location: "Kadikoy, Istanbul",
    timeAgo: "21 saat once",
    likesCount: 578,
    commentsCount: 47,
    sharesCount: 92,
  },
  {
    username: "kucuk.pawlar",
    avatarUrl: "https://loremflickr.com/100/100/cat?lock=55",
    imageUrl: "https://loremflickr.com/600/400/cat?lock=330",
    caption: "Bakirkoy'de kis aylari icin kulube kampanyasi baslattik. Gonullu destegi ariyoruz 🏠❄️",
    location: "Bakirkoy, Istanbul",
    timeAgo: "22 saat once",
    likesCount: 398,
    commentsCount: 30,
    sharesCount: 62,
  },
  {
    username: "minnoslar.evi",
    avatarUrl: "https://loremflickr.com/100/100/kitten?lock=77",
    imageUrl: "https://loremflickr.com/600/400/dog?lock=331",
    caption: "Kartal'da kopekleri severken ısırık riskine karsi dikkatli olalim! Bilgilendirme postu 🩹",
    location: "Kartal, Istanbul",
    timeAgo: "23 saat once",
    likesCount: 167,
    commentsCount: 13,
    sharesCount: 22,
  },
  {
    username: "patici.sultan",
    avatarUrl: "https://loremflickr.com/100/100/dog?lock=88",
    imageUrl: "https://loremflickr.com/600/400/kitten?lock=332",
    caption: "Maltepe'de guzel bir haber! 2 haftadir tedavi goren dostumuz taburcu oldu 🏥🎉",
    location: "Maltepe, Istanbul",
    timeAgo: "1 gun once",
    likesCount: 523,
    commentsCount: 39,
    sharesCount: 81,
  },
  {
    username: "miyav.house",
    avatarUrl: "https://loremflickr.com/100/100/kitten?lock=11",
    imageUrl: "https://loremflickr.com/600/400/cat?lock=333",
    caption: "Uskudar'da kafenin kedisi 'Kahve' artik oranin gercek sahibi ☕🐱",
    location: "Uskudar, Istanbul",
    timeAgo: "1 gun once",
    likesCount: 289,
    commentsCount: 21,
    sharesCount: 14,
  },
  {
    username: "patili.bir.dunya",
    avatarUrl: "https://loremflickr.com/100/100/puppy?lock=22",
    imageUrl: "https://loremflickr.com/600/400/dog?lock=334",
    caption: "Besiktas'ta otobus duraginda duzenli beslenen kopek ailesi. Esnaf cok ilgili 🚌🐕",
    location: "Besiktas, Istanbul",
    timeAgo: "2 gun once",
    likesCount: 198,
    commentsCount: 15,
    sharesCount: 8,
  },
  {
    username: "koydeki.patiler",
    avatarUrl: "https://loremflickr.com/100/100/dog?lock=44",
    imageUrl: "https://loremflickr.com/600/400/cat?lock=335",
    caption: "Eyup'te bu hafta 15 kediye kisirlastirma yapildi. Harika bir basari! 🎯🏥",
    location: "Eyup, Istanbul",
    timeAgo: "2 gun once",
    likesCount: 445,
    commentsCount: 35,
    sharesCount: 67,
  },
];

async function seedIfEmpty() {
  try {
    const existing = await db.select({ id: feedPosts.id }).from(feedPosts).limit(1);
    if (existing.length === 0) {
      await db.insert(feedPosts).values(SEED_POSTS);
      logger.info("Feed posts seeded (%d posts)", SEED_POSTS.length);
    }
  } catch (err) {
    logger.error({ err }, "Seed failed");
  }
}

/* ── Force re-seed (dev helper) ──────────────────────────────────────── */
router.post("/feed/reseed", async (_req, res) => {
  try {
    await db.delete(feedPosts);
    await db.insert(feedPosts).values(SEED_POSTS);
    logger.info("Feed re-seeded (%d posts)", SEED_POSTS.length);
    res.json({ seeded: SEED_POSTS.length });
  } catch (err) {
    _req.log.error({ err }, "POST /feed/reseed failed");
    res.status(500).json({ error: "Internal server error" });
  }
});

/* ── GET /api/feed/posts ─────────────────────────────────── */
router.get("/feed/posts", async (req, res) => {
  try {
    await seedIfEmpty();
    const userId       = extractUserIdDual(req) || undefined;
    const filterUserId = req.query["userId"]  as string | undefined;
    const mode         = req.query["mode"]    as string | undefined;

    /* Pagination — only applies to discover/following (not filterUserId) */
    const rawOffset = parseInt(req.query["offset"] as string ?? "0", 10);
    const rawLimit  = parseInt(req.query["limit"]  as string ?? "10", 10);
    const offset = isNaN(rawOffset) ? 0 : Math.max(0, rawOffset);
    const limit  = isNaN(rawLimit)  ? 10 : Math.min(Math.max(1, rawLimit), 50);

    type PostRow = typeof feedPosts.$inferSelect;
    let posts: PostRow[];
    let paginate = false; /* true → return { posts, hasMore }, false → return array */

    if (mode === "following" && userId) {
      paginate = true;
      /* Fetch posts only from followed users + own posts */
      const followingRows = await db
        .select({ followingId: follows.followingId })
        .from(follows)
        .where(eq(follows.followerId, userId));
      /* following_id stores either a real user UUID or a seed username (no seed- prefix) */
      const followingIds = followingRows.map((r) => r.followingId);
      followingIds.push(userId); /* include own posts */

      if (followingIds.length > 0) {
        /* Seed posts have user_id="" but username set; real posts have user_id=UUID.
           Match on username (covers seed posts) OR user_id (covers real user posts). */
        posts = await db
          .select()
          .from(feedPosts)
          .where(or(
            inArray(feedPosts.username, followingIds),
            inArray(feedPosts.userId, followingIds),
          ))
          .orderBy(desc(feedPosts.createdAt));
      } else {
        posts = [];
      }
    } else if (filterUserId) {
      /* Profile page — returns all, no pagination */
      if (filterUserId.startsWith("seed-")) {
        const seedUsername = filterUserId.slice("seed-".length);
        posts = await db
          .select()
          .from(feedPosts)
          .where(and(eq(feedPosts.username, seedUsername), eq(feedPosts.userId, "")))
          .orderBy(desc(feedPosts.createdAt));
      } else {
        posts = await db
          .select()
          .from(feedPosts)
          .where(eq(feedPosts.userId, filterUserId))
          .orderBy(desc(feedPosts.createdAt));
      }
    } else {
      paginate = true;
      /* Discover: filter out private profiles unless viewer follows them */
      const allPosts = await db.select().from(feedPosts).orderBy(desc(feedPosts.createdAt));
      if (!userId) {
        const privateProfiles = await db
          .select({ id: socialProfiles.id })
          .from(socialProfiles)
          .where(eq(socialProfiles.isProfilePublic, false));
        const privateIds = new Set(privateProfiles.map((p) => p.id));
        posts = allPosts.filter((p) => !p.userId || !privateIds.has(p.userId));
      } else {
        const [privateProfiles, myFollowing] = await Promise.all([
          db.select({ id: socialProfiles.id }).from(socialProfiles).where(eq(socialProfiles.isProfilePublic, false)),
          db.select({ followingId: follows.followingId }).from(follows).where(eq(follows.followerId, userId)),
        ]);
        const privateIds   = new Set(privateProfiles.map((p) => p.id));
        const followingSet = new Set(myFollowing.map((f) => f.followingId));
        posts = allPosts.filter((p) => {
          if (!p.userId) return true;
          if (p.userId === userId) return true;
          if (!privateIds.has(p.userId)) return true;
          return followingSet.has(p.userId);
        });
      }
    }

    let likedIds      = new Set<string>();
    let bookmarkedIds = new Set<string>();

    if (userId) {
      const [likes, bookmarks] = await Promise.all([
        db.select({ postId: feedLikes.postId }).from(feedLikes).where(eq(feedLikes.userId, userId)),
        db.select({ postId: feedBookmarks.postId }).from(feedBookmarks).where(eq(feedBookmarks.userId, userId)),
      ]);
      likedIds      = new Set(likes.map((l) => l.postId));
      bookmarkedIds = new Set(bookmarks.map((b) => b.postId));
    }

    const shape = (p: PostRow) => ({
      ...p,
      userId:     p.userId || `seed-${p.username}`,
      liked:      likedIds.has(p.id),
      bookmarked: bookmarkedIds.has(p.id),
    });

    if (paginate) {
      const page    = posts.slice(offset, offset + limit);
      const hasMore = offset + limit < posts.length;
      res.json({ posts: page.map(shape), hasMore });
    } else {
      res.json(posts.map(shape));
    }
  } catch (err) {
    req.log.error({ err }, "GET /feed/posts failed");
    res.status(500).json({ error: "Internal server error" });
  }
});

/* ── POST /api/feed/posts ────────────────────────────────── */
router.post("/feed/posts", async (req, res) => {
  try {
    const authId = extractUserIdDual(req);
    const { username, avatarUrl, imageUrl, caption, location } = req.body as Record<string, string>;
    if (!username || !imageUrl) {
      res.status(400).json({ error: "username and imageUrl required" });
      return;
    }
    const [post] = await db
      .insert(feedPosts)
      .values({
        userId:    authId || "",
        username,
        avatarUrl: avatarUrl ?? "",
        imageUrl,
        caption:   caption ?? "",
        location:  location ?? "",
        timeAgo:   "Az önce",
      })
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
    const userId = extractUserIdDual(req);
    if (!userId) { res.status(401).json({ error: "Giriş yapılmamış" }); return; }

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

    const [post] = await db.select({ likesCount: feedPosts.likesCount, userId: feedPosts.userId, username: feedPosts.username, imageUrl: feedPosts.imageUrl }).from(feedPosts).where(eq(feedPosts.id, id));
    res.json({ liked, likesCount: post?.likesCount ?? 0 });

    // fire-and-forget notification on new like (respects receiver's like_notifications_enabled)
    if (liked && post?.userId && post.userId !== userId) {
      const senderName = req.headers["x-user-name"] as string ?? "Birisi";
      const senderAvatar = req.headers["x-user-avatar"] as string ?? "";
      db.select({ likeNotificationsEnabled: socialProfiles.likeNotificationsEnabled })
        .from(socialProfiles)
        .where(eq(socialProfiles.id, post.userId))
        .limit(1)
        .then(([pref]) => {
          if (pref?.likeNotificationsEnabled === false) return;
          return db.insert(notifications).values({
            receiverId:   post.userId,
            senderId:     userId,
            senderName,
            senderAvatar,
            type:         "like",
            postId:       id,
            postImage:    post.imageUrl ?? "",
            message:      `${senderName} gönderini beğendi`,
          }).catch(() => {});
        }).catch(() => {});
    }
  } catch (err) {
    req.log.error({ err }, "POST /feed/posts/:id/like failed");
    res.status(500).json({ error: "Internal server error" });
  }
});

/* ── POST /api/feed/posts/:id/bookmark ──────────────────── */
router.post("/feed/posts/:id/bookmark", async (req, res) => {
  try {
    const { id } = req.params;
    const userId = extractUserIdDual(req);
    if (!userId) { res.status(401).json({ error: "Giriş yapılmamış" }); return; }

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
    const commentText = text || (req.body as any).content;
    if (!username || !commentText) { res.status(400).json({ error: "username and text required" }); return; }

    const [comment] = await db
      .insert(feedComments)
      .values({ postId: id, username, text: commentText })
      .returning();
    await db.update(feedPosts).set({ commentsCount: sql`comments_count + 1` }).where(eq(feedPosts.id, id));
    res.json(comment);

    // fire-and-forget notification on new comment (respects receiver's comment_notifications_enabled)
    const postRow = await db.select({ userId: feedPosts.userId, imageUrl: feedPosts.imageUrl }).from(feedPosts).where(eq(feedPosts.id, id)).limit(1).catch(() => []);
    if (postRow[0]?.userId && postRow[0].userId !== username) {
      const senderAvatar = req.headers["x-user-avatar"] as string ?? "";
      const receiverId = postRow[0].userId;
      const postImage  = postRow[0].imageUrl ?? "";
      db.select({ commentNotificationsEnabled: socialProfiles.commentNotificationsEnabled })
        .from(socialProfiles)
        .where(eq(socialProfiles.id, receiverId))
        .limit(1)
        .then(([pref]) => {
          if (pref?.commentNotificationsEnabled === false) return;
          return db.insert(notifications).values({
            receiverId,
            senderId:     username,
            senderName:   username,
            senderAvatar,
            type:         "comment",
            postId:       id,
            postImage,
            message:      `${username} gönderine yorum yaptı: ${text.slice(0, 50)}`,
          }).catch(() => {});
        }).catch(() => {});
    }
  } catch (err) {
    req.log.error({ err }, "POST /feed/posts/:id/comments failed");
    res.status(500).json({ error: "Internal server error" });
  }
});

/* ── GET /api/feed/bookmarks ─ saved posts for a user ───── */
router.get("/feed/bookmarks", async (req, res) => {
  try {
    const userId = extractUserIdDual(req);
    if (!userId) { res.status(401).json({ error: "Giriş yapılmamış" }); return; }

    const bookmarked = await db
      .select({ postId: feedBookmarks.postId })
      .from(feedBookmarks)
      .where(eq(feedBookmarks.userId, userId))
      .orderBy(desc(feedBookmarks.createdAt));

    if (bookmarked.length === 0) { res.json([]); return; }

    const postIds = bookmarked.map((b) => b.postId);
    const posts   = await db
      .select()
      .from(feedPosts)
      .where(inArray(feedPosts.id, postIds));

    /* Re-order to match bookmark creation order (most recent first) */
    const postMap     = new Map(posts.map((p) => [p.id, p]));
    const orderedPosts = postIds.map((id) => postMap.get(id)).filter(Boolean) as typeof posts;

    /* Apply the same seed-userId fill as the main posts endpoint */
    res.json(orderedPosts.map((p) => ({
      ...p,
      userId:     p.userId || `seed-${p.username}`,
      liked:      false,
      bookmarked: true,
    })));
  } catch (err) {
    req.log.error({ err }, "GET /feed/bookmarks failed");
    res.status(500).json({ error: "Internal server error" });
  }
});

/* ── GET /api/feed/posts/:id ─────────────────────────────── */
router.get("/feed/posts/:id", async (req, res) => {
  try {
    const { id }   = req.params;
    const userId   = extractUserIdDual(req) || undefined;
    const rows     = await db.select().from(feedPosts).where(eq(feedPosts.id, id)).limit(1);
    if (!rows[0]) { res.status(404).json({ error: "Post not found" }); return; }

    let liked = false; let bookmarked = false;
    if (userId) {
      const [l, b] = await Promise.all([
        db.select().from(feedLikes).where(and(eq(feedLikes.postId, id), eq(feedLikes.userId, userId))).limit(1),
        db.select().from(feedBookmarks).where(and(eq(feedBookmarks.postId, id), eq(feedBookmarks.userId, userId))).limit(1),
      ]);
      liked = l.length > 0; bookmarked = b.length > 0;
    }
    const p = rows[0];
    res.json({ ...p, userId: p.userId || `seed-${p.username}`, liked, bookmarked });
  } catch (err) {
    req.log.error({ err }, "GET /feed/posts/:id failed");
    res.status(500).json({ error: "Internal server error" });
  }
});

/* ── PATCH /api/feed/posts/:id ─ edit (owner only) ──────── */
router.patch("/feed/posts/:id", async (req, res) => {
  try {
    const { id }   = req.params;
    const userId   = extractUserIdDual(req);
    if (!userId) { res.status(401).json({ error: "Giriş yapılmamış" }); return; }

    const post = await db.select().from(feedPosts).where(eq(feedPosts.id, id)).limit(1);
    if (!post[0]) { res.status(404).json({ error: "Post not found" }); return; }
    if (post[0].userId !== userId) { res.status(403).json({ error: "Forbidden" }); return; }

    const { caption, location } = req.body as { caption?: string; location?: string };
    const [updated] = await db
      .update(feedPosts)
      .set({
        ...(caption  !== undefined && { caption }),
        ...(location !== undefined && { location }),
      })
      .where(eq(feedPosts.id, id))
      .returning();
    res.json({ ...updated, liked: false, bookmarked: false });
  } catch (err) {
    req.log.error({ err }, "PATCH /feed/posts/:id failed");
    res.status(500).json({ error: "Internal server error" });
  }
});

/* ── DELETE /api/feed/posts/:id ─ delete (owner only) ────── */
router.delete("/feed/posts/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const userId = extractUserIdDual(req);
    if (!userId) { res.status(401).json({ error: "Giriş yapılmamış" }); return; }

    const post = await db.select().from(feedPosts).where(eq(feedPosts.id, id)).limit(1);
    if (!post[0]) { res.status(404).json({ error: "Post not found" }); return; }
    if (post[0].userId !== userId) { res.status(403).json({ error: "Forbidden" }); return; }

    await Promise.all([
      db.delete(feedLikes).where(eq(feedLikes.postId, id)),
      db.delete(feedBookmarks).where(eq(feedBookmarks.postId, id)),
      db.delete(feedComments).where(eq(feedComments.postId, id)),
    ]);
    await db.delete(feedPosts).where(eq(feedPosts.id, id));
    res.json({ deleted: true });
  } catch (err) {
    req.log.error({ err }, "DELETE /feed/posts/:id failed");
    res.status(500).json({ error: "Internal server error" });
  }
});

/* ── DELETE /api/feed/posts/:id/comments/:commentId ────────── */
router.delete("/feed/posts/:id/comments/:commentId", async (req, res) => {
  try {
    const { id, commentId } = req.params;
    const userId = extractUserIdDual(req);
    if (!userId) { res.status(401).json({ error: "Giriş yapılmamış" }); return; }

    const postOwner = await db.select({ userId: feedPosts.userId }).from(feedPosts).where(eq(feedPosts.id, id)).limit(1);
    const isPostOwner = postOwner[0]?.userId === userId;
    const comment = await db.select().from(feedComments).where(eq(feedComments.id, commentId)).limit(1);
    if (!comment[0]) { res.status(404).json({ error: "Comment not found" }); return; }
    if (comment[0].username !== userId && !isPostOwner) {
      res.status(403).json({ error: "Forbidden" }); return;
    }
    await db.delete(feedComments).where(eq(feedComments.id, commentId));
    await db.update(feedPosts).set({ commentsCount: sql`GREATEST(comments_count - 1, 0)` }).where(eq(feedPosts.id, id));
    res.json({ deleted: true });
  } catch (err) {
    req.log.error({ err }, "DELETE /feed/posts/:id/comments/:commentId failed");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
