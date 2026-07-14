import { Router } from "express";
import { and, desc, eq, sql } from "drizzle-orm";
import {
  db,
  strayAnimals,
  animalInteractions,
  animalComments,
  animalHelpUpdates,
} from "@workspace/db";
import { logger } from "../lib/logger.js";
import { extractUserId } from "../lib/jwtAuth.js";

const router = Router();

function uid(req: Parameters<Parameters<typeof router.get>[1]>[0]): string {
  return extractUserId(req);
}

const SEED_ANIMALS = [
  {
    imageUrl: "https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=600&q=80",
    animalType: "kedi",
    locationName: "Kadıköy, İstanbul",
    latitude: 40.9925,
    longitude: 29.0234,
    status: "injured",
    notes: "Yürürken arka bacağına tam basamıyor. Bölgede bir süredir görülüyor ve kontrol edilmesi gerekiyor.",
    userId: "seed-system",
    userName: "Ayşe Demir",
  },
  {
    imageUrl: "https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=600&q=80",
    animalType: "kopek",
    locationName: "Beşiktaş, İstanbul",
    latitude: 41.0422,
    longitude: 29.0043,
    status: "healthy",
    notes: "Mahalle sakinleri tarafından mama ve su veriliyor. Genel görünümü sağlıklı.",
    userId: "seed-system",
    userName: "Mehmet Kaya",
  },
  {
    imageUrl: "https://images.unsplash.com/photo-1592194996308-7b43878e84a6?w=600&q=80",
    animalType: "kedi",
    locationName: "Üsküdar, İstanbul",
    latitude: 41.0225,
    longitude: 29.0154,
    status: "injured",
    notes: "Ön patisinde açık yara görülüyor. Yürürken zorlanıyor ve veteriner desteğine ihtiyaç duyabilir.",
    userId: "seed-system",
    userName: "Elif Yılmaz",
  },
  {
    imageUrl: "https://images.unsplash.com/photo-1552053831-71594a27632d?w=600&q=80",
    animalType: "kopek",
    locationName: "Fatih, İstanbul",
    latitude: 41.0186,
    longitude: 28.9395,
    status: "hungry",
    notes: "Oldukça zayıf ve çevrede yiyecek arıyor. Mama ve su desteğine ihtiyaç duyuyor.",
    userId: "seed-system",
    userName: "Tolga Aydın",
  },
  {
    imageUrl: "https://images.unsplash.com/photo-1548247416-ec66f4900b2e?w=600&q=80",
    animalType: "kedi",
    locationName: "Şişli, İstanbul",
    latitude: 41.0603,
    longitude: 28.9877,
    status: "hungry",
    notes: "Sol gözünde yoğun akıntı görülüyor. Bölgede sakin şekilde bekliyor.",
    userId: "seed-system",
    userName: "Zeynep Arslan",
  },
  {
    imageUrl: "https://images.unsplash.com/photo-1547407139-3c921a66005c?w=600&q=80",
    animalType: "kopek",
    locationName: "Bakırköy, İstanbul",
    latitude: 40.9782,
    longitude: 28.8675,
    status: "unknown",
    notes: "Boyun çevresinde belirgin iz var. Sahipli olup olmadığı bilinmiyor.",
    userId: "seed-system",
    userName: "Mert Çelik",
  },
  {
    imageUrl: "https://images.unsplash.com/photo-1573865526537-6f87431cb8f0?w=600&q=80",
    animalType: "kedi",
    locationName: "Ataşehir, İstanbul",
    latitude: 40.9843,
    longitude: 29.1272,
    status: "healthy",
    notes: "Anne kedi üç yavrusuyla birlikte bina bahçesinde yaşıyor. Mama ve su bırakılıyor.",
    userId: "seed-system",
    userName: "Deniz Koç",
  },
  {
    imageUrl: "https://images.unsplash.com/photo-1633722715463-d30f4f325e24?w=600&q=80",
    animalType: "kopek",
    locationName: "Maltepe, İstanbul",
    latitude: 40.9344,
    longitude: 29.1498,
    status: "injured",
    notes: "Koşmaya çalışırken arka ayağını havada tutuyor. Yaralanmış olabilir.",
    userId: "seed-system",
    userName: "Selin Şahin",
  },
  {
    imageUrl: "https://images.unsplash.com/photo-1529778873920-4da4926a72c2?w=600&q=80",
    animalType: "kedi",
    locationName: "Beyoğlu, İstanbul",
    latitude: 41.0335,
    longitude: 28.9772,
    status: "unknown",
    notes: "İnsanlara alışkın görünüyor. Temiz ve sakin ancak sahibinin olup olmadığı bilinmiyor.",
    userId: "seed-system",
    userName: "Emre Aksoy",
  },
  {
    imageUrl: "https://images.unsplash.com/photo-1561037404-61cd46aa615b?w=600&q=80",
    animalType: "kopek",
    locationName: "Sarıyer, İstanbul",
    latitude: 41.1660,
    longitude: 29.0517,
    status: "healthy",
    notes: "Düzenli mama ve su veriliyor. Genel sağlık durumu iyi görünüyor.",
    userId: "seed-system",
    userName: "Ceren Yıldız",
  },
];

async function seedIfEmpty() {
  try {
    const existing = await db.select({ id: strayAnimals.id }).from(strayAnimals).limit(1);
    if (existing.length === 0) {
      await db.insert(strayAnimals).values(SEED_ANIMALS);
      logger.info("Stray animals seeded");
    }
  } catch (err) {
    logger.error({ err }, "Animal seed failed");
  }
}

/* ── GET /api/animals ─────────────────────────────────────── */
router.get("/animals", async (req, res) => {
  try {
    await seedIfEmpty();
    const userId = uid(req);

    const animals = await db.select().from(strayAnimals).orderBy(desc(strayAnimals.createdAt));

    const [helpCountRows, latestHelpResult, fedRows, needsHelpRows, userHelpRows] = await Promise.all([
      db.select({
        animalId: animalHelpUpdates.animalId,
        helperCount: sql<number>`COUNT(DISTINCT ${animalHelpUpdates.userId})::int`,
      }).from(animalHelpUpdates).groupBy(animalHelpUpdates.animalId),

      db.execute(sql`
        SELECT DISTINCT ON (animal_id) animal_id, status AS help_status, created_at AS help_at
        FROM animal_help_updates ORDER BY animal_id, created_at DESC
      `),

      userId
        ? db.select({ animalId: animalInteractions.animalId }).from(animalInteractions)
            .where(and(eq(animalInteractions.userId, userId), eq(animalInteractions.type, "fed")))
        : Promise.resolve([]),

      userId
        ? db.select({ animalId: animalInteractions.animalId }).from(animalInteractions)
            .where(and(eq(animalInteractions.userId, userId), eq(animalInteractions.type, "needs_help")))
        : Promise.resolve([]),

      userId
        ? db.select({ animalId: animalHelpUpdates.animalId }).from(animalHelpUpdates)
            .where(eq(animalHelpUpdates.userId, userId))
        : Promise.resolve([]),
    ]);

    const countMap = new Map(
      (helpCountRows as Array<{ animalId: string; helperCount: number }>).map(r => [r.animalId, r.helperCount])
    );
    const latestMap = new Map<string, { helpStatus: string; helpAt: string }>();
    for (const row of ((latestHelpResult as unknown as { rows: Array<{ animal_id: string; help_status: string; help_at: unknown }> }).rows)) {
      latestMap.set(row.animal_id, { helpStatus: row.help_status, helpAt: String(row.help_at) });
    }
    const fedSet       = new Set((fedRows as Array<{ animalId: string }>).map(r => r.animalId));
    const needsHelpSet = new Set((needsHelpRows as Array<{ animalId: string }>).map(r => r.animalId));
    const userHelpSet  = new Set((userHelpRows as Array<{ animalId: string }>).map(r => r.animalId));

    const result = animals.map((a) => ({
      ...a,
      isFedByMe:            fedSet.has(a.id),
      isNeedsHelpByMe:      needsHelpSet.has(a.id),
      helpUpdateCount:      countMap.get(a.id) ?? 0,
      hasCurrentUserHelped: userHelpSet.has(a.id),
      latestHelpStatus:     latestMap.get(a.id)?.helpStatus ?? null,
      latestHelpAt:         latestMap.get(a.id)?.helpAt ?? null,
    }));

    res.json(result);
  } catch (err) {
    req.log.error({ err }, "GET /animals failed");
    res.status(500).json({ error: "Hayvan listesi alınamadı" });
  }
});

/* ── GET /api/animals/:id ─────────────────────────────────── */
router.get("/animals/:id", async (req, res) => {
  try {
    const userId = uid(req);
    const [animal] = await db.select().from(strayAnimals).where(eq(strayAnimals.id, req.params.id));
    if (!animal) { res.status(404).json({ error: "Hayvan bulunamadı" }); return; }

    const [comments, helpCountRow, latestHelpResult, userHelpCheck, fedRow, helpRow] = await Promise.all([
      db.select().from(animalComments)
        .where(eq(animalComments.animalId, req.params.id))
        .orderBy(animalComments.createdAt),

      db.select({
        count: sql<number>`COUNT(DISTINCT ${animalHelpUpdates.userId})::int`,
      }).from(animalHelpUpdates).where(eq(animalHelpUpdates.animalId, req.params.id)),

      db.execute(sql`
        SELECT status AS help_status, created_at AS help_at
        FROM animal_help_updates WHERE animal_id = ${req.params.id}
        ORDER BY created_at DESC LIMIT 1
      `),

      userId
        ? db.select({ id: animalHelpUpdates.id }).from(animalHelpUpdates)
            .where(and(eq(animalHelpUpdates.animalId, req.params.id), eq(animalHelpUpdates.userId, userId)))
            .limit(1)
        : Promise.resolve([]),

      userId
        ? db.select().from(animalInteractions)
            .where(and(eq(animalInteractions.animalId, req.params.id), eq(animalInteractions.userId, userId), eq(animalInteractions.type, "fed")))
            .limit(1)
        : Promise.resolve([]),

      userId
        ? db.select().from(animalInteractions)
            .where(and(eq(animalInteractions.animalId, req.params.id), eq(animalInteractions.userId, userId), eq(animalInteractions.type, "needs_help")))
            .limit(1)
        : Promise.resolve([]),
    ]);

    const latestHelpRow = ((latestHelpResult as unknown as { rows: Array<{ help_status: string; help_at: unknown }> }).rows)[0];

    res.json({
      ...animal,
      comments,
      isFedByMe:            (fedRow as unknown[]).length > 0,
      isNeedsHelpByMe:      (helpRow as unknown[]).length > 0,
      helpUpdateCount:      (helpCountRow[0] as { count: number } | undefined)?.count ?? 0,
      hasCurrentUserHelped: (userHelpCheck as unknown[]).length > 0,
      latestHelpStatus:     latestHelpRow?.help_status ?? null,
      latestHelpAt:         latestHelpRow?.help_at ? String(latestHelpRow.help_at) : null,
    });
  } catch (err) {
    req.log.error({ err }, "GET /animals/:id failed");
    res.status(500).json({ error: "Hayvan bilgisi alınamadı" });
  }
});

/* ── POST /api/animals ────────────────────────────────────── */
router.post("/animals", async (req, res) => {
  const userId = uid(req);
  if (!userId) { res.status(401).json({ error: "Giriş yapılmamış" }); return; }

  try {
    const { imageUrl, animalType, locationName, latitude, longitude, status, notes, userName } =
      req.body as Record<string, string>;

    if (!latitude || !longitude) {
      res.status(400).json({ error: "Konum bilgisi zorunlu" });
      return;
    }

    const [animal] = await db.insert(strayAnimals).values({
      imageUrl:     imageUrl ?? "",
      animalType:   animalType ?? "",
      locationName: locationName ?? "",
      latitude:     parseFloat(latitude),
      longitude:    parseFloat(longitude),
      status:       status ?? "unknown",
      notes:        notes ?? "",
      userId,
      userName:     userName ?? "",
    }).returning();

    res.status(201).json({ ...animal, comments: [], isFedByMe: false, isNeedsHelpByMe: false });
  } catch (err) {
    req.log.error({ err }, "POST /animals failed");
    res.status(500).json({ error: "Hayvan raporu oluşturulamadı" });
  }
});

/* ── PATCH /api/animals/:id ───────────────────────────────── */
router.patch("/animals/:id", async (req, res) => {
  const userId = uid(req);
  if (!userId) { res.status(401).json({ error: "Giriş yapılmamış" }); return; }

  try {
    const [existing] = await db.select().from(strayAnimals).where(eq(strayAnimals.id, req.params.id));
    if (!existing) { res.status(404).json({ error: "Hayvan bulunamadı" }); return; }
    if (existing.userId !== userId) { res.status(403).json({ error: "Yetki yok" }); return; }

    const { imageUrl, animalType, locationName, latitude, longitude, status, notes } =
      req.body as Record<string, string>;

    const updates: Partial<typeof strayAnimals.$inferInsert> = { updatedAt: new Date() };
    if (imageUrl     !== undefined) updates.imageUrl     = imageUrl;
    if (animalType   !== undefined) updates.animalType   = animalType;
    if (locationName !== undefined) updates.locationName = locationName;
    if (latitude     !== undefined) updates.latitude     = parseFloat(latitude);
    if (longitude    !== undefined) updates.longitude    = parseFloat(longitude);
    if (status       !== undefined) updates.status       = status;
    if (notes        !== undefined) updates.notes        = notes;

    const [updated] = await db.update(strayAnimals).set(updates).where(eq(strayAnimals.id, req.params.id)).returning();
    res.json(updated);
  } catch (err) {
    req.log.error({ err }, "PATCH /animals/:id failed");
    res.status(500).json({ error: "Hayvan güncellenemedi" });
  }
});

/* ── DELETE /api/animals/:id ──────────────────────────────── */
router.delete("/animals/:id", async (req, res) => {
  const userId = uid(req);
  if (!userId) { res.status(401).json({ error: "Giriş yapılmamış" }); return; }

  try {
    const [existing] = await db.select().from(strayAnimals).where(eq(strayAnimals.id, req.params.id));
    if (!existing) { res.status(404).json({ error: "Hayvan bulunamadı" }); return; }
    if (existing.userId !== userId && existing.userId !== "seed-system") {
      res.status(403).json({ error: "Yetki yok" });
      return;
    }
    await db.delete(strayAnimals).where(eq(strayAnimals.id, req.params.id));
    res.json({ ok: true });
  } catch (err) {
    req.log.error({ err }, "DELETE /animals/:id failed");
    res.status(500).json({ error: "Hayvan silinemedi" });
  }
});

/* ── POST /api/animals/:id/fed ────────────────────────────── */
router.post("/animals/:id/fed", async (req, res) => {
  const userId = uid(req);
  if (!userId) { res.status(401).json({ error: "Giriş yapılmamış" }); return; }

  try {
    const existing = await db.select().from(animalInteractions)
      .where(and(
        eq(animalInteractions.animalId, req.params.id),
        eq(animalInteractions.userId, userId),
        eq(animalInteractions.type, "fed"),
      )).limit(1);

    let fed: boolean;
    if (existing.length > 0) {
      await db.delete(animalInteractions).where(
        and(
          eq(animalInteractions.animalId, req.params.id),
          eq(animalInteractions.userId, userId),
          eq(animalInteractions.type, "fed"),
        )
      );
      await db.update(strayAnimals)
        .set({ fedCount: sql`GREATEST(fed_count - 1, 0)`, updatedAt: new Date() })
        .where(eq(strayAnimals.id, req.params.id));
      fed = false;
    } else {
      await db.insert(animalInteractions).values({ animalId: req.params.id, userId, type: "fed" }).onConflictDoNothing();
      await db.update(strayAnimals)
        .set({ fedCount: sql`fed_count + 1`, updatedAt: new Date() })
        .where(eq(strayAnimals.id, req.params.id));
      fed = true;
    }

    const [animal] = await db.select({ fedCount: strayAnimals.fedCount }).from(strayAnimals).where(eq(strayAnimals.id, req.params.id));
    res.json({ fed, fedCount: animal?.fedCount ?? 0 });
  } catch (err) {
    req.log.error({ err }, "POST /animals/:id/fed failed");
    res.status(500).json({ error: "İşlem başarısız" });
  }
});

/* ── POST /api/animals/:id/needs-help ────────────────────── */
router.post("/animals/:id/needs-help", async (req, res) => {
  const userId = uid(req);
  if (!userId) { res.status(401).json({ error: "Giriş yapılmamış" }); return; }

  try {
    const existing = await db.select().from(animalInteractions)
      .where(and(
        eq(animalInteractions.animalId, req.params.id),
        eq(animalInteractions.userId, userId),
        eq(animalInteractions.type, "needs_help"),
      )).limit(1);

    let needsHelp: boolean;
    if (existing.length > 0) {
      await db.delete(animalInteractions).where(
        and(
          eq(animalInteractions.animalId, req.params.id),
          eq(animalInteractions.userId, userId),
          eq(animalInteractions.type, "needs_help"),
        )
      );
      await db.update(strayAnimals)
        .set({ needsHelpCount: sql`GREATEST(needs_help_count - 1, 0)`, updatedAt: new Date() })
        .where(eq(strayAnimals.id, req.params.id));
      needsHelp = false;
    } else {
      await db.insert(animalInteractions).values({ animalId: req.params.id, userId, type: "needs_help" }).onConflictDoNothing();
      await db.update(strayAnimals)
        .set({ needsHelpCount: sql`needs_help_count + 1`, updatedAt: new Date() })
        .where(eq(strayAnimals.id, req.params.id));
      needsHelp = true;
    }

    const [animal] = await db.select({ needsHelpCount: strayAnimals.needsHelpCount }).from(strayAnimals).where(eq(strayAnimals.id, req.params.id));
    res.json({ needsHelp, needsHelpCount: animal?.needsHelpCount ?? 0 });
  } catch (err) {
    req.log.error({ err }, "POST /animals/:id/needs-help failed");
    res.status(500).json({ error: "İşlem başarısız" });
  }
});

/* ── POST /api/animals/:id/comments ──────────────────────── */
router.post("/animals/:id/comments", async (req, res) => {
  const userId = uid(req);
  if (!userId) { res.status(401).json({ error: "Giriş yapılmamış" }); return; }

  try {
    const { text, userName } = req.body as Record<string, string>;
    if (!text?.trim()) { res.status(400).json({ error: "Yorum metni boş olamaz" }); return; }

    const [comment] = await db.insert(animalComments).values({
      animalId: req.params.id,
      userId,
      userName: userName ?? "",
      text: text.trim(),
    }).returning();

    await db.update(strayAnimals)
      .set({ commentsCount: sql`comments_count + 1`, updatedAt: new Date() })
      .where(eq(strayAnimals.id, req.params.id));

    res.status(201).json(comment);
  } catch (err) {
    req.log.error({ err }, "POST /animals/:id/comments failed");
    res.status(500).json({ error: "Yorum eklenemedi" });
  }
});

/* ── POST /api/animals/:id/location-open ─────────────────── */
router.post("/animals/:id/location-open", async (req, res) => {
  try {
    const [animal] = await db
      .select({ locationOpenCount: strayAnimals.locationOpenCount })
      .from(strayAnimals)
      .where(eq(strayAnimals.id, req.params.id));
    if (!animal) { res.status(404).json({ error: "Hayvan bulunamadı" }); return; }

    const [updated] = await db
      .update(strayAnimals)
      .set({ locationOpenCount: sql`location_open_count + 1`, updatedAt: new Date() })
      .where(eq(strayAnimals.id, req.params.id))
      .returning({ locationOpenCount: strayAnimals.locationOpenCount });

    res.json({ locationOpenCount: updated?.locationOpenCount ?? 0 });
  } catch (err) {
    req.log.error({ err }, "POST /animals/:id/location-open failed");
    res.status(500).json({ error: "Konum açılışı kaydedilemedi" });
  }
});

/* ── DELETE /api/animals/:id/comments/:commentId ─────────── */
router.delete("/animals/:id/comments/:commentId", async (req, res) => {
  const userId = uid(req);
  if (!userId) { res.status(401).json({ error: "Giriş yapılmamış" }); return; }

  try {
    const [comment] = await db.select().from(animalComments).where(eq(animalComments.id, req.params.commentId));
    if (!comment) { res.status(404).json({ error: "Yorum bulunamadı" }); return; }
    if (comment.userId !== userId) { res.status(403).json({ error: "Yetki yok" }); return; }

    await db.delete(animalComments).where(eq(animalComments.id, req.params.commentId));
    await db.update(strayAnimals)
      .set({ commentsCount: sql`GREATEST(comments_count - 1, 0)`, updatedAt: new Date() })
      .where(eq(strayAnimals.id, req.params.id));

    res.json({ ok: true });
  } catch (err) {
    req.log.error({ err }, "DELETE /animals/:id/comments/:commentId failed");
    res.status(500).json({ error: "Yorum silinemedi" });
  }
});

/* ── GET /api/animals/:id/help-updates ───────────────────── */
router.get("/animals/:id/help-updates", async (req, res) => {
  try {
    const updates = await db.select().from(animalHelpUpdates)
      .where(eq(animalHelpUpdates.animalId, req.params.id))
      .orderBy(desc(animalHelpUpdates.createdAt));

    const uniqueHelperCount = (await db.select({
      count: sql<number>`COUNT(DISTINCT ${animalHelpUpdates.userId})::int`,
    }).from(animalHelpUpdates).where(eq(animalHelpUpdates.animalId, req.params.id)))[0]?.count ?? 0;

    res.json({ updates, uniqueHelperCount });
  } catch (err) {
    req.log.error({ err }, "GET /animals/:id/help-updates failed");
    res.status(500).json({ error: "Yardım güncellemeleri alınamadı" });
  }
});

/* ── POST /api/animals/:id/help-updates ──────────────────── */
router.post("/animals/:id/help-updates", async (req, res) => {
  const userId = uid(req);
  if (!userId) { res.status(401).json({ error: "Giriş yapılmamış" }); return; }

  try {
    const [animal] = await db.select().from(strayAnimals).where(eq(strayAnimals.id, req.params.id));
    if (!animal) { res.status(404).json({ error: "Hayvan bulunamadı" }); return; }

    const { status, note = "", photoUrl = "", userName = "Anonim" } = req.body as {
      status: string;
      note?: string;
      photoUrl?: string;
      userName?: string;
    };

    if (!status) { res.status(400).json({ error: "Durum gerekli" }); return; }

    const [inserted] = await db.insert(animalHelpUpdates).values({
      animalId: req.params.id,
      userId,
      userName,
      status,
      note,
      photoUrl,
    }).returning();

    const [countRow] = await db.select({
      count: sql<number>`COUNT(DISTINCT ${animalHelpUpdates.userId})::int`,
    }).from(animalHelpUpdates).where(eq(animalHelpUpdates.animalId, req.params.id));

    res.status(201).json({ update: inserted, uniqueHelperCount: countRow?.count ?? 1 });
  } catch (err) {
    req.log.error({ err }, "POST /animals/:id/help-updates failed");
    res.status(500).json({ error: "Yardım güncellemesi eklenemedi" });
  }
});

/* ── GET /api/animals/:id/helpers ────────────────────────── */
router.get("/animals/:id/helpers", async (req, res) => {
  try {
    const rows = await db.select({
      userId:   animalHelpUpdates.userId,
      userName: animalHelpUpdates.userName,
      count:    sql<number>`COUNT(*)::int`,
      lastAt:   sql<string>`MAX(${animalHelpUpdates.createdAt})`,
    }).from(animalHelpUpdates)
      .where(eq(animalHelpUpdates.animalId, req.params.id))
      .groupBy(animalHelpUpdates.userId, animalHelpUpdates.userName)
      .orderBy(sql`MAX(${animalHelpUpdates.createdAt}) DESC`);

    res.json({ helpers: rows, uniqueHelperCount: rows.length });
  } catch (err) {
    req.log.error({ err }, "GET /animals/:id/helpers failed");
    res.status(500).json({ error: "Yardımcı listesi alınamadı" });
  }
});

export default router;
