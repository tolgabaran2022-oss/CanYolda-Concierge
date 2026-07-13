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

const router = Router();

function uid(req: Parameters<Parameters<typeof router.get>[1]>[0]): string {
  return (req.headers["x-user-id"] as string | undefined) ?? "";
}

const SEED_ANIMALS = [
  {
    imageUrl: "https://loremflickr.com/600/400/dog,stray?lock=301",
    animalType: "kopek",
    locationName: "Eyüp, İstanbul",
    latitude: 41.0082,
    longitude: 28.9784,
    status: "hungry",
    notes: "Köprü altında bekliyor, düzenli mama verilmesi gerekiyor",
    userId: "seed-system",
    userName: "Ayşe Y.",
  },
  {
    imageUrl: "https://loremflickr.com/600/400/cat,stray?lock=302",
    animalType: "kedi",
    locationName: "Kadıköy, İstanbul",
    latitude: 41.014,
    longitude: 28.972,
    status: "healthy",
    notes: "Park girişinde yaşıyor, mahalle sakinleri besliyor",
    userId: "seed-system",
    userName: "Mehmet K.",
    fedCount: 3,
  },
  {
    imageUrl: "https://loremflickr.com/600/400/dog,injured?lock=303",
    animalType: "kopek",
    locationName: "Üsküdar, İstanbul",
    latitude: 40.998,
    longitude: 29.018,
    status: "injured",
    notes: "Ön bacağında yara var, veteriner yardımı gerekiyor",
    userId: "seed-system",
    userName: "Fatma D.",
    needsHelpCount: 2,
  },
  {
    imageUrl: "https://loremflickr.com/600/400/cat,black?lock=304",
    animalType: "kedi",
    locationName: "Ataşehir, İstanbul",
    latitude: 41.022,
    longitude: 28.963,
    status: "unknown",
    notes: "İlk kez görüldü, durumu bilinmiyor",
    userId: "seed-system",
    userName: "Ali R.",
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

    let fedSet = new Set<string>();
    let helpSet = new Set<string>();

    if (userId) {
      const [fedRows, helpRows] = await Promise.all([
        db.select({ animalId: animalInteractions.animalId })
          .from(animalInteractions)
          .where(and(eq(animalInteractions.userId, userId), eq(animalInteractions.type, "fed"))),
        db.select({ animalId: animalInteractions.animalId })
          .from(animalInteractions)
          .where(and(eq(animalInteractions.userId, userId), eq(animalInteractions.type, "needs_help"))),
      ]);
      fedSet  = new Set(fedRows.map((r) => r.animalId));
      helpSet = new Set(helpRows.map((r) => r.animalId));
    }

    const result = animals.map((a) => ({
      ...a,
      isFedByMe:         fedSet.has(a.id),
      isNeedsHelpByMe:   helpSet.has(a.id),
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

    const comments = await db.select().from(animalComments)
      .where(eq(animalComments.animalId, req.params.id))
      .orderBy(animalComments.createdAt);

    let isFedByMe = false;
    let isNeedsHelpByMe = false;

    if (userId) {
      const [fedRow, helpRow] = await Promise.all([
        db.select().from(animalInteractions)
          .where(and(eq(animalInteractions.animalId, req.params.id), eq(animalInteractions.userId, userId), eq(animalInteractions.type, "fed")))
          .limit(1),
        db.select().from(animalInteractions)
          .where(and(eq(animalInteractions.animalId, req.params.id), eq(animalInteractions.userId, userId), eq(animalInteractions.type, "needs_help")))
          .limit(1),
      ]);
      isFedByMe       = fedRow.length > 0;
      isNeedsHelpByMe = helpRow.length > 0;
    }

    res.json({ ...animal, comments, isFedByMe, isNeedsHelpByMe });
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

export default router;
