import { Router } from "express";
import { z } from "zod";
import { and, desc, eq, sql, ne } from "drizzle-orm";
import {
  db,
  strayAnimals,
  animalInteractions,
  animalComments,
  animalHelpUpdates,
  reportConfirmations,
  volunteerClaims,
  reportStatusHistory,
  moderationQueue,
  userRiskScores,
  animalNotifications,
} from "@workspace/db";
import { logger } from "../lib/logger.js";
import { extractUserId } from "../lib/jwtAuth.js";
import { validateBody } from "../lib/validate.js";
import { createLimiter } from "../lib/rateLimiter.js";
import {
  calculatePriorityScore,
  imageValidationService,
} from "../lib/priorityScore.js";
import { generateReportCode } from "../lib/reportCode.js";

/* ── Zod schemas ─────────────────────────────────────────────── */
const CreateAnimalSchema = z.object({
  imageUrl:        z.string().min(1, "Fotoğraf URL'si gerekli").max(1000),
  animalType:      z.string().trim().max(50).optional().default(""),
  locationName:    z.string().trim().max(255).optional().default(""),
  latitude:        z.coerce.number().min(-90).max(90),
  longitude:       z.coerce.number().min(-180).max(180),
  status:          z.string().trim().max(50).optional().default("unknown"),
  notes:           z.string().trim().max(2000).optional().default(""),
  userName:        z.string().trim().max(200).optional().default(""),
  photoCapturedAt: z.string().optional(), // client EXIF — untrusted, stored only
});

const UpdateAnimalSchema = z.object({
  imageUrl:     z.string().max(1000).optional(),
  notes:        z.string().trim().max(2000).optional(),
});

const CommentSchema = z.object({
  text:     z.string().trim().min(1, "Yorum boş olamaz").max(1000),
  userName: z.string().trim().max(200).optional().default(""),
});

const HelpUpdateSchema = z.object({
  status:   z.string().trim().min(1).max(100),
  note:     z.string().trim().max(2000).optional().default(""),
  photoUrl: z.string().max(1000).optional().default(""),
});

const HelpStatusSchema = z.object({
  helpStatus: z.enum(["OPEN", "CONFIRMED", "HELP_IN_PROGRESS", "RESCUED", "ARCHIVED", "FALSE_REPORT"]),
  reason:     z.string().trim().max(500).optional().default(""),
});

const ConfirmSchema = z.object({
  note:     z.string().trim().max(500).optional().default(""),
  userName: z.string().trim().max(200).optional().default(""),
});

const VolunteerSchema = z.object({
  role:             z.enum(["primary", "assistant"]).default("assistant"),
  estimatedArrival: z.string().trim().max(100).optional(),
  userName:         z.string().trim().max(200).optional().default(""),
});

const MODERATOR_RESTRICTED = new Set(["RESCUED", "FALSE_REPORT"]);

const router = Router();

function uid(req: Parameters<Parameters<typeof router.get>[1]>[0]): string {
  return extractUserId(req);
}

/* ── Haversine distance (meters) ─────────────────────────────── */
function haversineMeters(
  lat1: number, lon1: number,
  lat2: number, lon2: number,
): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/* ── Notify report owner ─────────────────────────────────────── */
async function notifyOwner(
  animalId: string,
  ownerId: string,
  actorId: string,
  type: string,
  title: string,
  body: string,
): Promise<void> {
  if (ownerId === actorId) return; // no self-notification
  try {
    await db.insert(animalNotifications).values({ userId: ownerId, animalId, type, title, body });
  } catch (e) {
    logger.warn({ e }, "notifyOwner failed (non-critical)");
  }
}

/* ── Risk check — blocks reporter if flagged ────────────────── */
async function checkReporterAllowed(userId: string): Promise<{ blocked: boolean; reason?: string }> {
  const [risk] = await db.select().from(userRiskScores).where(eq(userRiskScores.userId, userId));
  if (!risk) return { blocked: false };
  if (risk.isReportingBlocked) {
    if (risk.blockedUntil && risk.blockedUntil < new Date()) {
      // Unblock expired ban
      await db.update(userRiskScores)
        .set({ isReportingBlocked: false, blockedUntil: null })
        .where(eq(userRiskScores.userId, userId));
      return { blocked: false };
    }
    const until = risk.blockedUntil
      ? new Date(risk.blockedUntil).toLocaleDateString("tr-TR")
      : "süresiz";
    return { blocked: true, reason: `Rapor oluşturma yetkiniz ${until} tarihine kadar kısıtlanmıştır.` };
  }
  return { blocked: false };
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
      for (const seed of SEED_ANIMALS) {
        const priority = calculatePriorityScore({ status: seed.status, animalType: seed.animalType, notes: seed.notes });
        const code = await generateReportCode();
        const lockAt = new Date(Date.now() - 1000); // already locked
        await db.insert(strayAnimals).values({
          ...seed,
          reportCode: code,
          priorityScore: priority.score,
          priorityLevel: priority.level,
          editLockedAt: lockAt,
          photoUploadedAt: new Date(),
        });
      }
      logger.info("Stray animals seeded");
    }
  } catch (err) {
    logger.error({ err }, "Animal seed failed");
  }
}

/* ─────────────────────────────────────────────────────────────────────────────
   GET /api/animals/nearby — duplicate detection
   Query: lat, lng, radiusMeters (default 100), animalType, windowMinutes (default 60)
───────────────────────────────────────────────────────────────────────────── */
router.get("/animals/nearby", async (req, res) => {
  try {
    const lat  = parseFloat(req.query["lat"] as string ?? "0");
    const lng  = parseFloat(req.query["lng"] as string ?? "0");
    const radius = Math.min(parseFloat(req.query["radius"] as string ?? "100"), 500);
    const windowMin = Math.min(parseInt(req.query["window"] as string ?? "60", 10), 1440);
    const type = (req.query["animalType"] as string ?? "").toLowerCase();

    if (isNaN(lat) || isNaN(lng)) {
      res.status(400).json({ error: "Geçersiz koordinat" });
      return;
    }

    const sinceMs = Date.now() - windowMin * 60 * 1000;
    const since   = new Date(sinceMs);

    // Fetch candidates within bounding box (rough filter), then haversine in JS
    const degRadius = radius / 111000;
    const rows = await db.select({
      id:           strayAnimals.id,
      reportCode:   strayAnimals.reportCode,
      animalType:   strayAnimals.animalType,
      status:       strayAnimals.status,
      latitude:     strayAnimals.latitude,
      longitude:    strayAnimals.longitude,
      locationName: strayAnimals.locationName,
      notes:        strayAnimals.notes,
      helpStatus:   strayAnimals.helpStatus,
      priorityLevel: strayAnimals.priorityLevel,
      confirmationCount: strayAnimals.confirmationCount,
      createdAt:    strayAnimals.createdAt,
    }).from(strayAnimals)
      .where(
        and(
          sql`latitude BETWEEN ${lat - degRadius} AND ${lat + degRadius}`,
          sql`longitude BETWEEN ${lng - degRadius} AND ${lng + degRadius}`,
          sql`created_at >= ${since}`,
          ne(strayAnimals.helpStatus, "ARCHIVED"),
          ne(strayAnimals.helpStatus, "FALSE_REPORT"),
        )
      );

    const nearby = rows.filter((r) => {
      const distM = haversineMeters(lat, lng, r.latitude, r.longitude);
      if (distM > radius) return false;
      if (type && r.animalType && !r.animalType.toLowerCase().includes(type)) return false;
      return true;
    }).map((r) => ({
      ...r,
      distanceMeters: Math.round(haversineMeters(lat, lng, r.latitude, r.longitude)),
    }));

    res.json({ nearby, count: nearby.length });
  } catch (err) {
    req.log.error({ err }, "GET /animals/nearby failed");
    res.status(500).json({ error: "Yakın bildirimler alınamadı" });
  }
});

/* ── GET /api/animals ─────────────────────────────────────────── */
router.get("/animals", async (req, res) => {
  try {
    await seedIfEmpty();
    const userId = uid(req);

    const animals = await db.select().from(strayAnimals).orderBy(desc(strayAnimals.createdAt));

    const [helpCountRows, latestHelpResult, fedRows, needsHelpRows, userHelpRows, confirmRows, volunteerRows] =
      await Promise.all([
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

        userId
          ? db.select({ animalId: reportConfirmations.animalId }).from(reportConfirmations)
              .where(eq(reportConfirmations.userId, userId))
          : Promise.resolve([]),

        userId
          ? db.select({ animalId: volunteerClaims.animalId }).from(volunteerClaims)
              .where(and(eq(volunteerClaims.userId, userId), eq(volunteerClaims.status, "active")))
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
    const confirmedSet = new Set((confirmRows as Array<{ animalId: string }>).map(r => r.animalId));
    const volunteerSet = new Set((volunteerRows as Array<{ animalId: string }>).map(r => r.animalId));

    const result = animals.map((a) => ({
      ...a,
      isFedByMe:            fedSet.has(a.id),
      isNeedsHelpByMe:      needsHelpSet.has(a.id),
      helpUpdateCount:      countMap.get(a.id) ?? 0,
      hasCurrentUserHelped: userHelpSet.has(a.id),
      latestHelpStatus:     latestMap.get(a.id)?.helpStatus ?? null,
      latestHelpAt:         latestMap.get(a.id)?.helpAt ?? null,
      isConfirmedByMe:      confirmedSet.has(a.id),
      isVolunteerByMe:      volunteerSet.has(a.id),
    }));

    res.json(result);
  } catch (err) {
    req.log.error({ err }, "GET /animals failed");
    res.status(500).json({ error: "Hayvan listesi alınamadı" });
  }
});

/* ── GET /api/animals/:id ─────────────────────────────────────── */
router.get("/animals/:id", async (req, res) => {
  try {
    const userId = uid(req);
    const [animal] = await db.select().from(strayAnimals).where(eq(strayAnimals.id, req.params.id));
    if (!animal) { res.status(404).json({ error: "Hayvan bulunamadı" }); return; }

    const [
      comments, helpCountRow, latestHelpResult, userHelpCheck, fedRow, helpRow,
      confirmCountRow, userConfirmRow, activeVolunteerRows, userVolunteerRow, statusHistory,
    ] = await Promise.all([
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

      db.select({ count: sql<number>`COUNT(*)::int` })
        .from(reportConfirmations)
        .where(eq(reportConfirmations.animalId, req.params.id)),

      userId
        ? db.select().from(reportConfirmations)
            .where(and(eq(reportConfirmations.animalId, req.params.id), eq(reportConfirmations.userId, userId)))
            .limit(1)
        : Promise.resolve([]),

      db.select().from(volunteerClaims)
        .where(and(eq(volunteerClaims.animalId, req.params.id), eq(volunteerClaims.status, "active"))),

      userId
        ? db.select().from(volunteerClaims)
            .where(and(eq(volunteerClaims.animalId, req.params.id), eq(volunteerClaims.userId, userId), eq(volunteerClaims.status, "active")))
            .limit(1)
        : Promise.resolve([]),

      db.select().from(reportStatusHistory)
        .where(eq(reportStatusHistory.animalId, req.params.id))
        .orderBy(reportStatusHistory.createdAt),
    ]);

    const latestHelpRow = ((latestHelpResult as unknown as { rows: Array<{ help_status: string; help_at: unknown }> }).rows)[0];
    const primaryVolunteer = (activeVolunteerRows as typeof volunteerClaims.$inferSelect[]).find(v => v.role === "primary");

    res.json({
      ...animal,
      comments,
      isFedByMe:            (fedRow as unknown[]).length > 0,
      isNeedsHelpByMe:      (helpRow as unknown[]).length > 0,
      helpUpdateCount:      (helpCountRow[0] as { count: number } | undefined)?.count ?? 0,
      hasCurrentUserHelped: (userHelpCheck as unknown[]).length > 0,
      latestHelpStatus:     latestHelpRow?.help_status ?? null,
      latestHelpAt:         latestHelpRow?.help_at ? String(latestHelpRow.help_at) : null,
      confirmationCount:    (confirmCountRow[0] as { count: number } | undefined)?.count ?? animal.confirmationCount,
      isConfirmedByMe:      (userConfirmRow as unknown[]).length > 0,
      activeVolunteers:     activeVolunteerRows,
      primaryVolunteer:     primaryVolunteer ?? null,
      isVolunteerByMe:      (userVolunteerRow as unknown[]).length > 0,
      statusHistory,
    });
  } catch (err) {
    req.log.error({ err }, "GET /animals/:id failed");
    res.status(500).json({ error: "Hayvan bilgisi alınamadı" });
  }
});

/* ── POST /api/animals/validate-image ─────────────────────────── */
router.post("/animals/validate-image", async (req, res) => {
  const userId = uid(req);
  if (!userId) { res.status(401).json({ error: "Giriş yapılmamış" }); return; }

  const { imageUrl } = req.body as { imageUrl?: string };
  if (!imageUrl || typeof imageUrl !== "string" || !imageUrl.trim()) {
    res.status(400).json({ error: "imageUrl gerekli" });
    return;
  }

  try {
    const result = await imageValidationService.validate(imageUrl);
    res.json(result);
  } catch (err) {
    req.log.error({ err }, "POST /animals/validate-image failed");
    res.status(500).json({ error: "Doğrulama gerçekleştirilemedi" });
  }
});

/* ── POST /api/animals ────────────────────────────────────────── */
router.post("/animals", createLimiter, validateBody(CreateAnimalSchema), async (req, res) => {
  const userId = uid(req);
  if (!userId) { res.status(401).json({ error: "Giriş yapılmamış" }); return; }

  const blocked = await checkReporterAllowed(userId);
  if (blocked.blocked) { res.status(403).json({ error: blocked.reason }); return; }

  const { imageUrl, animalType, locationName, latitude, longitude, status, notes, userName, photoCapturedAt } =
    req.body as z.infer<typeof CreateAnimalSchema>;

  try {
    // Priority score — server-only
    const priority = calculatePriorityScore({ status, animalType, notes });

    // Report code
    const reportCode = await generateReportCode();

    // Edit lock: 15 minutes from now
    const editLockedAt = new Date(Date.now() + 15 * 60 * 1000);

    const [animal] = await db.insert(strayAnimals).values({
      imageUrl,
      animalType,
      locationName,
      latitude,
      longitude,
      status,
      notes,
      userId,
      userName,
      reportCode,
      priorityScore: priority.score,
      priorityLevel: priority.level,
      helpStatus: "OPEN",
      photoUploadedAt: new Date(),
      photoCapturedAt: photoCapturedAt ? new Date(photoCapturedAt) : null,
      editLockedAt,
    }).returning();

    // Insert initial status history entry
    await db.insert(reportStatusHistory).values({
      animalId: animal.id,
      fromStatus: "NEW",
      toStatus: "OPEN",
      changedBy: userId,
      reason: "Rapor oluşturuldu",
    });

    // Queue in moderation: high/critical priority reports
    const needsQueue = priority.level === "critical" || priority.level === "high";
    if (needsQueue) {
      const queueType = priority.level === "critical" ? "high_priority" : "pending_review";
      const reason = `Otomatik: priority=${priority.level} score=${priority.score}`;
      await db.insert(moderationQueue).values({
        animalId: animal.id,
        queueType,
        reason,
        reportedBy: userId,
      }).catch(() => {});
    }

    res.status(201).json({
      ...animal,
      comments: [],
      isFedByMe: false,
      isNeedsHelpByMe: false,
      isConfirmedByMe: false,
      isVolunteerByMe: false,
    });
  } catch (err) {
    req.log.error({ err }, "POST /animals failed");
    res.status(500).json({ error: "Hayvan raporu oluşturulamadı" });
  }
});

/* ── PATCH /api/animals/:id ───────────────────────────────────── */
/* Only imageUrl and notes may be edited. Locked after 15 minutes (spec §26). */
router.patch("/animals/:id", validateBody(UpdateAnimalSchema), async (req, res) => {
  const id = req.params["id"] as string;
  const userId = uid(req);
  if (!userId) { res.status(401).json({ error: "Giriş yapılmamış" }); return; }

  try {
    const [existing] = await db.select().from(strayAnimals).where(eq(strayAnimals.id, id));
    if (!existing) { res.status(404).json({ error: "Hayvan bulunamadı" }); return; }
    if (existing.userId !== userId) { res.status(403).json({ error: "Yetki yok" }); return; }

    // 15-minute edit window check
    const lockAt = existing.editLockedAt ?? new Date(existing.createdAt!.getTime() + 15 * 60 * 1000);
    if (new Date() > lockAt) {
      res.status(403).json({
        error: "Düzenleme süresi doldu. Raporlar yalnızca ilk 15 dakika içinde düzenlenebilir.",
        code: "EDIT_LOCKED",
      });
      return;
    }

    const body = req.body as z.infer<typeof UpdateAnimalSchema>;
    const updates: Partial<typeof strayAnimals.$inferInsert> = { updatedAt: new Date() };
    if (body.imageUrl !== undefined) {
      updates.imageUrl = body.imageUrl;
      updates.photoUploadedAt = new Date();
    }
    if (body.notes !== undefined) {
      updates.notes = body.notes;
      // Re-calculate priority when notes change
      const priority = calculatePriorityScore({
        status: existing.status,
        animalType: existing.animalType,
        notes: body.notes,
        confirmationCount: existing.confirmationCount,
      });
      updates.priorityScore = priority.score;
      updates.priorityLevel = priority.level;
    }

    const [updated] = await db.update(strayAnimals).set(updates).where(eq(strayAnimals.id, id)).returning();
    res.json(updated);
  } catch (err) {
    req.log.error({ err }, "PATCH /animals/:id failed");
    res.status(500).json({ error: "Hayvan güncellenemedi" });
  }
});

/* ── DELETE /api/animals/:id ──────────────────────────────────── */
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

/* ── POST /api/animals/:id/confirm — community confirmation ──── */
router.post("/animals/:id/confirm", validateBody(ConfirmSchema), async (req, res) => {
  const userId = uid(req);
  if (!userId) { res.status(401).json({ error: "Giriş yapılmamış" }); return; }

  const animalId = req.params["id"] as string;
  const { note, userName } = req.body as z.infer<typeof ConfirmSchema>;

  try {
    const [animal] = await db.select().from(strayAnimals).where(eq(strayAnimals.id, animalId));
    if (!animal) { res.status(404).json({ error: "Hayvan bulunamadı" }); return; }
    if (animal.userId === userId) { res.status(400).json({ error: "Kendi bildiriinizi doğrulayamazsınız" }); return; }

    // Upsert confirmation (unique per user per animal)
    try {
      await db.insert(reportConfirmations).values({ animalId, userId, userName: userName ?? "", note: note ?? "" });
    } catch {
      res.json({ alreadyConfirmed: true, confirmationCount: animal.confirmationCount });
      return;
    }

    // Increment counter and recalculate priority
    const newCount = (animal.confirmationCount ?? 0) + 1;
    const priority = calculatePriorityScore({
      status: animal.status,
      animalType: animal.animalType,
      notes: animal.notes,
      confirmationCount: newCount,
    });

    // Auto-transition OPEN → CONFIRMED when ≥3 confirmations
    let newHelpStatus = animal.helpStatus ?? "OPEN";
    if (newCount >= 3 && newHelpStatus === "OPEN") {
      newHelpStatus = "CONFIRMED";
      await db.insert(reportStatusHistory).values({
        animalId,
        fromStatus: "OPEN",
        toStatus: "CONFIRMED",
        changedBy: "system",
        reason: `Topluluk onayı: ${newCount} kişi doğruladı`,
      });
    }

    await db.update(strayAnimals).set({
      confirmationCount: newCount,
      priorityScore: priority.score,
      priorityLevel: priority.level,
      helpStatus: newHelpStatus,
      updatedAt: new Date(),
    }).where(eq(strayAnimals.id, animalId));

    // Notify report owner
    await notifyOwner(animalId, animal.userId, userId, "confirmation",
      "Bildiriminiz doğrulandı",
      `${userName || "Biri"} sokak hayvanı bildiriminizi doğruladı.`);

    res.json({ ok: true, confirmationCount: newCount, helpStatus: newHelpStatus, alreadyConfirmed: false });
  } catch (err) {
    req.log.error({ err }, "POST /animals/:id/confirm failed");
    res.status(500).json({ error: "Doğrulama işlemi başarısız" });
  }
});

/* ── POST /api/animals/:id/volunteer-claim ─────────────────────── */
router.post("/animals/:id/volunteer-claim", validateBody(VolunteerSchema), async (req, res) => {
  const userId = uid(req);
  if (!userId) { res.status(401).json({ error: "Giriş yapılmamış" }); return; }

  const animalId = req.params["id"] as string;
  const { role, estimatedArrival, userName } = req.body as z.infer<typeof VolunteerSchema>;

  try {
    const [animal] = await db.select().from(strayAnimals).where(eq(strayAnimals.id, animalId));
    if (!animal) { res.status(404).json({ error: "Hayvan bulunamadı" }); return; }
    if (["RESCUED", "ARCHIVED", "FALSE_REPORT"].includes(animal.helpStatus ?? "")) {
      res.status(400).json({ error: "Bu rapor için gönüllü talebi yapılamaz" });
      return;
    }

    // Check existing active claim by this user
    const [existingClaim] = await db.select().from(volunteerClaims)
      .where(and(eq(volunteerClaims.animalId, animalId), eq(volunteerClaims.userId, userId), eq(volunteerClaims.status, "active")))
      .limit(1);

    if (existingClaim) {
      // Cancel existing claim
      await db.update(volunteerClaims).set({ status: "cancelled", updatedAt: new Date() })
        .where(eq(volunteerClaims.id, existingClaim.id));
      res.json({ ok: true, action: "cancelled" });
      return;
    }

    // If requesting primary, check if one already exists
    if (role === "primary") {
      const [existingPrimary] = await db.select().from(volunteerClaims)
        .where(and(eq(volunteerClaims.animalId, animalId), eq(volunteerClaims.role, "primary"), eq(volunteerClaims.status, "active")))
        .limit(1);
      if (existingPrimary) {
        // Demote to assistant automatically
        const [claim] = await db.insert(volunteerClaims).values({
          animalId, userId, userName: userName ?? "", role: "assistant", estimatedArrival, status: "active",
        }).returning();

        // Update help status
        if ((animal.helpStatus ?? "OPEN") === "OPEN" || (animal.helpStatus ?? "") === "CONFIRMED") {
          await db.update(strayAnimals).set({ helpStatus: "HELP_IN_PROGRESS", updatedAt: new Date() }).where(eq(strayAnimals.id, animalId));
          await db.insert(reportStatusHistory).values({
            animalId, fromStatus: animal.helpStatus ?? "OPEN", toStatus: "HELP_IN_PROGRESS",
            changedBy: userId, reason: "Gönüllü yardım başladı (asistan)",
          });
        }
        await notifyOwner(animalId, animal.userId, userId, "volunteer",
          "Yeni asistan gönüllü",
          `${userName || "Biri"} yardım etmek için yola çıkıyor.`);
        res.status(201).json({ ok: true, claim, role: "assistant", note: "primary_taken" });
        return;
      }
    }

    const [claim] = await db.insert(volunteerClaims).values({
      animalId, userId, userName: userName ?? "", role, estimatedArrival, status: "active",
    }).returning();

    // Auto-transition to HELP_IN_PROGRESS
    if ((animal.helpStatus ?? "OPEN") === "OPEN" || (animal.helpStatus ?? "") === "CONFIRMED") {
      await db.update(strayAnimals).set({ helpStatus: "HELP_IN_PROGRESS", updatedAt: new Date() }).where(eq(strayAnimals.id, animalId));
      await db.insert(reportStatusHistory).values({
        animalId, fromStatus: animal.helpStatus ?? "OPEN", toStatus: "HELP_IN_PROGRESS",
        changedBy: userId, reason: `Gönüllü yardım başladı (${role})`,
      });
    }

    await notifyOwner(animalId, animal.userId, userId, "volunteer",
      "Gönüllü yola çıkıyor",
      `${userName || "Biri"} yardım etmek için yola çıkıyor.`);

    res.status(201).json({ ok: true, claim, role });
  } catch (err) {
    req.log.error({ err }, "POST /animals/:id/volunteer-claim failed");
    res.status(500).json({ error: "Gönüllü talebi oluşturulamadı" });
  }
});

/* ── PATCH /api/animals/:id/help-status — lifecycle transitions ── */
router.patch("/animals/:id/help-status", validateBody(HelpStatusSchema), async (req, res) => {
  const userId = uid(req);
  if (!userId) { res.status(401).json({ error: "Giriş yapılmamış" }); return; }

  const animalId = req.params["id"] as string;
  const { helpStatus: newStatus, reason } = req.body as z.infer<typeof HelpStatusSchema>;

  try {
    const [animal] = await db.select().from(strayAnimals).where(eq(strayAnimals.id, animalId));
    if (!animal) { res.status(404).json({ error: "Hayvan bulunamadı" }); return; }

    // Moderator-only transitions
    if (MODERATOR_RESTRICTED.has(newStatus)) {
      // For now: owner can mark RESCUED, only moderator can mark FALSE_REPORT
      if (newStatus === "FALSE_REPORT" && animal.userId !== userId) {
        // Check if this is a moderator (future: check is_moderator flag on user)
        // For now: moderator must be the report owner or system
        res.status(403).json({ error: "Yalnızca moderatörler bu durumu ayarlayabilir" });
        return;
      }
    }

    const oldStatus = animal.helpStatus ?? "OPEN";
    if (oldStatus === newStatus) {
      res.json({ ok: true, helpStatus: newStatus, changed: false });
      return;
    }

    await db.update(strayAnimals)
      .set({ helpStatus: newStatus, updatedAt: new Date() })
      .where(eq(strayAnimals.id, animalId));

    await db.insert(reportStatusHistory).values({
      animalId, fromStatus: oldStatus, toStatus: newStatus, changedBy: userId,
      reason: reason ?? "",
    });

    // If FALSE_REPORT → update risk score
    if (newStatus === "FALSE_REPORT") {
      await db.insert(userRiskScores).values({
        userId: animal.userId,
        falseReportCount: 1,
        riskScore: 20,
      }).onConflictDoUpdate({
        target: userRiskScores.userId,
        set: {
          falseReportCount: sql`false_report_count + 1`,
          riskScore: sql`LEAST(risk_score + 20, 100)`,
          isReportingBlocked: sql`(false_report_count + 1) >= 3`,
          blockedUntil: sql`CASE WHEN (false_report_count + 1) >= 3 THEN NOW() + INTERVAL '7 days' ELSE blocked_until END`,
          lastUpdatedAt: sql`NOW()`,
        },
      });

      await db.insert(moderationQueue).values({
        animalId, queueType: "reported_false",
        reason: reason ?? "Kullanıcı tarafından sahte rapor olarak işaretlendi",
        reportedBy: userId,
      }).catch(() => {});
    }

    // Notify report owner of status change
    const statusLabels: Record<string, string> = {
      CONFIRMED: "Doğrulandı",
      HELP_IN_PROGRESS: "Yardım Devam Ediyor",
      RESCUED: "Kurtarıldı",
      ARCHIVED: "Arşivlendi",
      FALSE_REPORT: "Sahte Rapor",
    };
    await notifyOwner(animalId, animal.userId, userId, "status_change",
      `Rapor durumu: ${statusLabels[newStatus] ?? newStatus}`,
      `${animal.reportCode ?? animal.id} numaralı rapor durumu güncellendi.`);

    res.json({ ok: true, helpStatus: newStatus, changed: true });
  } catch (err) {
    req.log.error({ err }, "PATCH /animals/:id/help-status failed");
    res.status(500).json({ error: "Durum güncellenemedi" });
  }
});

/* ── POST /api/animals/:id/fed ────────────────────────────────── */
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

/* ── POST /api/animals/:id/needs-help ────────────────────────── */
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

/* ── POST /api/animals/:id/comments ──────────────────────────── */
router.post("/animals/:id/comments", validateBody(CommentSchema), async (req, res) => {
  const id = req.params["id"] as string;
  const userId = uid(req);
  if (!userId) { res.status(401).json({ error: "Giriş yapılmamış" }); return; }

  const { text, userName } = req.body as z.infer<typeof CommentSchema>;
  try {
    const [comment] = await db.insert(animalComments).values({
      animalId: id,
      userId,
      userName: userName ?? "",
      text: text.trim(),
    }).returning();

    await db.update(strayAnimals)
      .set({ commentsCount: sql`comments_count + 1`, updatedAt: new Date() })
      .where(eq(strayAnimals.id, id));

    res.status(201).json(comment);
  } catch (err) {
    req.log.error({ err }, "POST /animals/:id/comments failed");
    res.status(500).json({ error: "Yorum eklenemedi" });
  }
});

/* ── POST /api/animals/:id/location-open ─────────────────────── */
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

/* ── DELETE /api/animals/:id/comments/:commentId ─────────────── */
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

/* ── GET /api/animals/:id/help-updates ───────────────────────── */
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

/* ── POST /api/animals/:id/help-updates ──────────────────────── */
router.post("/animals/:id/help-updates", validateBody(HelpUpdateSchema), async (req, res) => {
  const id = req.params["id"] as string;
  const userId = uid(req);
  if (!userId) { res.status(401).json({ error: "Giriş yapılmamış" }); return; }

  try {
    const [animal] = await db.select().from(strayAnimals).where(eq(strayAnimals.id, id));
    if (!animal) { res.status(404).json({ error: "Hayvan bulunamadı" }); return; }

    const { status, note = "", photoUrl = "" } = req.body as z.infer<typeof HelpUpdateSchema>;
    const userName = "Anonim";

    const [inserted] = await db.insert(animalHelpUpdates).values({
      animalId: id,
      userId,
      userName,
      status,
      note,
      photoUrl,
    }).returning();

    const [countRow] = await db.select({
      count: sql<number>`COUNT(DISTINCT ${animalHelpUpdates.userId})::int`,
    }).from(animalHelpUpdates).where(eq(animalHelpUpdates.animalId, id));

    res.status(201).json({ update: inserted, uniqueHelperCount: countRow?.count ?? 1 });
  } catch (err) {
    req.log.error({ err }, "POST /animals/:id/help-updates failed");
    res.status(500).json({ error: "Yardım güncellemesi eklenemedi" });
  }
});

/* ── GET /api/animals/:id/helpers ────────────────────────────── */
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

/* ── GET /api/animals/:id/volunteers ─────────────────────────── */
router.get("/animals/:id/volunteers", async (req, res) => {
  try {
    const active = await db.select().from(volunteerClaims)
      .where(and(eq(volunteerClaims.animalId, req.params.id), eq(volunteerClaims.status, "active")));
    res.json({ volunteers: active });
  } catch (err) {
    req.log.error({ err }, "GET /animals/:id/volunteers failed");
    res.status(500).json({ error: "Gönüllü listesi alınamadı" });
  }
});

export default router;
