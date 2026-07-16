import { Router } from "express";
import { z } from "zod";
import { and, desc, eq, gt, inArray, sql } from "drizzle-orm";
import { db, adoptionListings, adoptionListingFollows, listingPromotions } from "@workspace/db";
import { logger } from "../lib/logger.js";
import { extractUserId } from "../lib/jwtAuth.js";
import { validateBody } from "../lib/validate.js";

/* ── Zod schemas ─────────────────────────────────────────────── */
const CreateListingSchema = z.object({
  petName:            z.string().trim().min(1, "Hayvan adı zorunlu").max(100),
  petType:            z.string().trim().max(100).optional().default(""),
  petAge:             z.string().trim().max(50).optional().default(""),
  breed:              z.string().trim().max(100).optional().default(""),
  gender:             z.string().trim().max(20).optional().default(""),
  vaccinated:         z.union([z.boolean(), z.enum(["true","false"])]).transform(v => v === true || v === "true").optional().default(false),
  photoUrl:           z.string().max(1000).optional().default(""),
  images:             z.union([z.array(z.string().max(1000)), z.string().max(1000)]).optional(),
  location:           z.string().trim().max(200).optional().default(""),
  description:        z.string().trim().max(5000).optional().default(""),
  userName:           z.string().trim().max(200).optional().default(""),
  contactInfo:        z.string().trim().max(200).optional().default(""),
  allowPhoneContact:  z.union([z.boolean(), z.enum(["true","false"])]).transform(v => v === true || v === "true").optional().default(false),
  allowMessages:      z.union([z.boolean(), z.enum(["true","false"])]).transform(v => v !== false && v !== "false").optional().default(true),
  status:             z.string().trim().max(50).optional().default("Aktif"),
  healthStatus:       z.string().trim().max(50).optional().nullable(),
  vaccinationStatus:  z.string().trim().max(50).optional().nullable(),
  environmentType:    z.string().trim().max(50).optional().nullable(),
  childCompatibility: z.string().trim().max(50).optional().nullable(),
  catCompatibility:   z.string().trim().max(50).optional().nullable(),
  dogCompatibility:   z.string().trim().max(50).optional().nullable(),
  toiletTraining:     z.string().trim().max(50).optional().nullable(),
});

const UpdateListingSchema = CreateListingSchema.partial();

const router = Router();

function uid(req: Parameters<Parameters<typeof router.get>[1]>[0]): string {
  return extractUserId(req);
}

const SEED_LISTINGS = [
  {
    petName: "Pamuk", petType: "Kedi", petAge: "2 yaş", breed: "British Shorthair", gender: "Dişi",
    vaccinated: true,
    photoUrl: "https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=600&q=80",
    location: "Kadıköy, İstanbul",
    description: "Pamuk ev ortamına alışkın, sakin ve insanlarla iletişimi güçlü bir kedi. Ona uzun süreli ve güvenli bir yuva arıyoruz.",
    userId: "seed-system", userName: "Ayşe Demir", contactInfo: "0532 111 22 33",
    allowPhoneContact: false, allowMessages: true, status: "Aktif" as const,
    healthStatus: "good", vaccinationStatus: "vaccinated", environmentType: "indoor",
    childCompatibility: "compatible", catCompatibility: "unknown", dogCompatibility: "compatible", toiletTraining: "trained",
  },
  {
    petName: "Boncuk", petType: "Köpek", petAge: "3 yaş", breed: "Golden Retriever", gender: "Erkek",
    vaccinated: true,
    photoUrl: "https://images.unsplash.com/photo-1552053831-71594a27632d?w=600&q=80",
    location: "Beşiktaş, İstanbul",
    description: "Boncuk insanlarla çok iyi anlaşan, enerjik ve sevgi dolu bir köpek. Aktif bir aile için uygun.",
    userId: "seed-system", userName: "Mehmet Kaya", contactInfo: "mehmet.kaya@example.com",
    allowPhoneContact: false, allowMessages: true, status: "Aktif" as const,
    healthStatus: "good", vaccinationStatus: "vaccinated", environmentType: "both",
    childCompatibility: "compatible", catCompatibility: "compatible", dogCompatibility: "compatible", toiletTraining: "trained",
  },
  {
    petName: "Mia", petType: "Kedi", petAge: "1 yaş", breed: "Tekir", gender: "Dişi",
    vaccinated: false,
    photoUrl: "https://images.unsplash.com/photo-1548247416-ec66f4900b2e?w=600&q=80",
    location: "Üsküdar, İstanbul",
    description: "Mia meraklı ve oyuncu bir genç kedi. Ev ortamına kısa sürede uyum sağlıyor.",
    userId: "seed-system", userName: "Elif Yılmaz", contactInfo: "0545 222 33 44",
    allowPhoneContact: true, allowMessages: true, status: "Aktif" as const,
    healthStatus: "good", vaccinationStatus: "not_vaccinated", environmentType: "indoor",
    childCompatibility: "compatible", catCompatibility: "compatible", dogCompatibility: "unknown", toiletTraining: "trained",
  },
  {
    petName: "Tarçın", petType: "Köpek", petAge: "2 yaş", breed: "Melez", gender: "Erkek",
    vaccinated: false,
    photoUrl: "https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=600&q=80",
    location: "Maltepe, İstanbul",
    description: "Tarçın yürüyüş yapmayı ve insanlarla vakit geçirmeyi seviyor. Sorumluluk sahibi bir yuva aranıyor.",
    userId: "seed-system", userName: "Tolga Aydın", contactInfo: "tolga.aydin@example.com",
    allowPhoneContact: false, allowMessages: true, status: "Aktif" as const,
    healthStatus: "good", vaccinationStatus: "not_vaccinated", environmentType: "both",
    childCompatibility: "unknown", catCompatibility: "unknown", dogCompatibility: "compatible", toiletTraining: "in_training",
  },
  {
    petName: "Luna", petType: "Kedi", petAge: "3 yaş", breed: "Scottish Straight", gender: "Dişi",
    vaccinated: true,
    photoUrl: "https://images.unsplash.com/photo-1529778873920-4da4926a72c2?w=600&q=80",
    location: "Ataşehir, İstanbul",
    description: "Luna sakin bir ev ortamını seven, insanlara alışkın ve nazik bir kedi.",
    userId: "seed-system", userName: "Zeynep Arslan", contactInfo: "0555 333 44 55",
    allowPhoneContact: false, allowMessages: true, status: "Aktif" as const,
    healthStatus: "good", vaccinationStatus: "vaccinated", environmentType: "indoor",
    childCompatibility: "compatible", catCompatibility: "compatible", dogCompatibility: "not_compatible", toiletTraining: "trained",
  },
  {
    petName: "Max", petType: "Köpek", petAge: "4 yaş", breed: "Labrador Melez", gender: "Erkek",
    vaccinated: true,
    photoUrl: "https://images.unsplash.com/photo-1633722715463-d30f4f325e24?w=600&q=80",
    location: "Bakırköy, İstanbul",
    description: "Max sosyal ve oyuncu bir köpek. Düzenli yürüyüş yapabilecek bir aile aranıyor.",
    userId: "seed-system", userName: "Mert Çelik", contactInfo: "0532 444 55 66",
    allowPhoneContact: true, allowMessages: true, status: "Aktif" as const,
    healthStatus: "good", vaccinationStatus: "vaccinated", environmentType: "both",
    childCompatibility: "compatible", catCompatibility: "unknown", dogCompatibility: "compatible", toiletTraining: "trained",
  },
  {
    petName: "Zeytin", petType: "Kedi", petAge: "8 aylık", breed: "Siyah Ev Kedisi", gender: "Erkek",
    vaccinated: false,
    photoUrl: "https://images.unsplash.com/photo-1573865526537-6f87431cb8f0?w=600&q=80",
    location: "Şişli, İstanbul",
    description: "Zeytin genç, hareketli ve oyuncu. Ev yaşamına alışkın ve kum eğitimini tamamladı.",
    userId: "seed-system", userName: "Deniz Koç", contactInfo: "deniz.koc@example.com",
    allowPhoneContact: false, allowMessages: true, status: "Aktif" as const,
    healthStatus: "good", vaccinationStatus: "not_vaccinated", environmentType: "indoor",
    childCompatibility: "unknown", catCompatibility: "compatible", dogCompatibility: "unknown", toiletTraining: "trained",
  },
  {
    petName: "Pati", petType: "Köpek", petAge: "1 yaş", breed: "Terrier Melez", gender: "Dişi",
    vaccinated: false,
    photoUrl: "https://images.unsplash.com/photo-1547407139-3c921a66005c?w=600&q=80",
    location: "Beyoğlu, İstanbul",
    description: "Pati küçük yapılı, enerjik ve insanlarla iletişimi güçlü bir köpek.",
    userId: "seed-system", userName: "Selin Şahin", contactInfo: "0546 555 66 77",
    allowPhoneContact: true, allowMessages: true, status: "Aktif" as const,
    healthStatus: "good", vaccinationStatus: "not_vaccinated", environmentType: "both",
    childCompatibility: "compatible", catCompatibility: "unknown", dogCompatibility: "compatible", toiletTraining: "in_training",
  },
  {
    petName: "Duman", petType: "Kedi", petAge: "4 yaş", breed: "British Shorthair Melez", gender: "Erkek",
    vaccinated: true,
    photoUrl: "https://images.unsplash.com/photo-1592194996308-7b43878e84a6?w=600&q=80",
    location: "Sarıyer, İstanbul",
    description: "Duman sakin, ev ortamını seven ve günün büyük bölümünü dinlenerek geçiren bir kedi.",
    userId: "seed-system", userName: "Emre Aksoy", contactInfo: "emre.aksoy@example.com",
    allowPhoneContact: false, allowMessages: true, status: "Aktif" as const,
    healthStatus: "good", vaccinationStatus: "vaccinated", environmentType: "indoor",
    childCompatibility: "unknown", catCompatibility: "unknown", dogCompatibility: "not_compatible", toiletTraining: "trained",
  },
  {
    petName: "Karamel", petType: "Köpek", petAge: "2 yaş", breed: "Melez", gender: "Dişi",
    vaccinated: true,
    photoUrl: "https://images.unsplash.com/photo-1561037404-61cd46aa615b?w=600&q=80",
    location: "Kartal, İstanbul",
    description: "Karamel sevgi dolu ve sosyal bir köpek. Güvenli ve kalıcı bir aile arıyor.",
    userId: "seed-system", userName: "Ceren Yıldız", contactInfo: "0532 666 77 88",
    allowPhoneContact: false, allowMessages: true, status: "Aktif" as const,
    healthStatus: "good", vaccinationStatus: "vaccinated", environmentType: "both",
    childCompatibility: "compatible", catCompatibility: "compatible", dogCompatibility: "compatible", toiletTraining: "trained",
  },
];

async function seedIfEmpty() {
  try {
    const existing = await db.select({ id: adoptionListings.id }).from(adoptionListings).limit(1);
    if (existing.length === 0) {
      await db.insert(adoptionListings).values(SEED_LISTINGS);
      logger.info("Adoption listings seeded");
    }
  } catch (err) {
    logger.error({ err }, "Adoption seed failed");
  }
}

/* ── GET /api/adoption ─────────────────────────────────────── */
router.get("/adoption", async (req, res) => {
  try {
    await seedIfEmpty();
    /* DB-level promoted-first ordering:
     * 1. CASE WHEN → 0 for active promo, 1 for normal/expired (ASC = promoted first)
     * 2. Among promoted: latest expiry first (NULLS LAST covers non-promoted rows)
     * 3. Among non-promoted: newest created_at first
     * 4. Stable ID tiebreaker (deterministic across equal timestamps)
     */
    const listings = await db.select().from(adoptionListings).orderBy(
      sql`CASE WHEN ${adoptionListings.promotedUntil} IS NOT NULL AND ${adoptionListings.promotedUntil} > NOW() THEN 0 ELSE 1 END`,
      sql`CASE WHEN ${adoptionListings.promotedUntil} IS NOT NULL AND ${adoptionListings.promotedUntil} > NOW() THEN ${adoptionListings.promotedUntil} ELSE NULL END DESC NULLS LAST`,
      desc(adoptionListings.createdAt),
      desc(adoptionListings.id)
    );

    if (!listings.length) {
      res.json([]);
      return;
    }

    const listingIds = listings.map((l) => l.id);
    type PromoEntry = { expiresAt: Date; packageName: string; startsAt: Date | null };
    const activePromos: Record<string, PromoEntry> = {};

    const now = new Date();

    /* Primary: IAP-based promotions via adoptionListings.promoted_until */
    for (const l of listings) {
      if (l.promotedUntil && l.promotedUntil > now) {
        activePromos[l.id] = {
          expiresAt:   l.promotedUntil,
          packageName: "Öne Çıkarılmış",
          startsAt:    null,
        };
      }
    }

    /* Secondary: legacy Stripe-based listing_promotions (fallback only) */
    try {
      const promos = await db
        .select({
          listingId:   listingPromotions.listingId,
          expiresAt:   listingPromotions.expiresAt,
          packageName: listingPromotions.packageName,
          startsAt:    listingPromotions.startsAt,
        })
        .from(listingPromotions)
        .where(
          and(
            inArray(listingPromotions.listingId, listingIds),
            eq(listingPromotions.status, "active"),
            gt(listingPromotions.expiresAt, now)
          )
        );
      for (const p of promos) {
        if (p.expiresAt && !activePromos[p.listingId]) {
          activePromos[p.listingId] = { expiresAt: p.expiresAt, packageName: p.packageName, startsAt: p.startsAt };
        }
      }
    } catch {
      /* listing_promotions may not exist yet — continue */
    }

    const enriched = listings.map((l) => ({
      ...l,
      isFeatured:          !!activePromos[l.id],
      featuredUntil:       activePromos[l.id]?.expiresAt?.toISOString() ?? null,
      featuredPackageName: activePromos[l.id]?.packageName ?? null,
      promotedUntil:       l.promotedUntil?.toISOString() ?? null,
    }));

    /* Secondary JS sort: re-applies the same promoted-first rule after isFeatured
     * enrichment (accounts for legacy listing_promotions entries where promoted_until
     * may be null but the listing_promotions row is still active).
     * DB sort already handles the promoted_until case; this pass catches the
     * listing_promotions fallback and adds a stable id tiebreaker. */
    enriched.sort((a, b) => {
      const af = a.isFeatured ? 0 : 1;
      const bf = b.isFeatured ? 0 : 1;
      if (af !== bf) return af - bf;
      if (af === 0) {
        const ae = activePromos[a.id]?.expiresAt?.getTime() ?? 0;
        const be = activePromos[b.id]?.expiresAt?.getTime() ?? 0;
        if (be !== ae) return be - ae;
      }
      const cd = (b.createdAt?.getTime() ?? 0) - (a.createdAt?.getTime() ?? 0);
      if (cd !== 0) return cd;
      return a.id < b.id ? -1 : 1;
    });

    res.json(enriched);
  } catch (err) {
    req.log.error({ err }, "GET /adoption failed");
    res.status(500).json({ error: "İlanlar alınamadı" });
  }
});

/* ── GET /api/adoption/my ──────────────────────────────────── */
router.get("/adoption/my", async (req, res) => {
  const userId = uid(req);
  if (!userId) { res.status(401).json({ error: "Giriş yapılmamış" }); return; }
  try {
    const listings = await db.select().from(adoptionListings)
      .where(eq(adoptionListings.userId, userId))
      .orderBy(desc(adoptionListings.createdAt));
    res.json(listings);
  } catch (err) {
    req.log.error({ err }, "GET /adoption/my failed");
    res.status(500).json({ error: "İlanlarınız alınamadı" });
  }
});

/* ── GET /api/adoption/followed ─────────────────────────────── */
/* MUST be before /:id to avoid "followed" being caught as an id param */
router.get("/adoption/followed", async (req, res) => {
  const userId = uid(req);
  if (!userId) { res.status(401).json({ error: "Giriş yapılmamış" }); return; }
  try {
    const follows = await db
      .select({ listingId: adoptionListingFollows.listingId, followedAt: adoptionListingFollows.createdAt })
      .from(adoptionListingFollows)
      .where(eq(adoptionListingFollows.userId, userId))
      .orderBy(desc(adoptionListingFollows.createdAt));

    if (follows.length === 0) { res.json([]); return; }

    const ids = follows.map((f) => f.listingId);
    const listings = await db.select().from(adoptionListings).where(inArray(adoptionListings.id, ids));

    /* Preserve follow order (most recent first) and attach followedAt */
    const listingMap = new Map(listings.map((l) => [l.id, l]));
    const ordered = follows
      .map((f) => {
        const l = listingMap.get(f.listingId);
        if (!l) return null;
        return { ...l, followedAt: f.followedAt, isFollowedByMe: true };
      })
      .filter(Boolean);

    res.json(ordered);
  } catch (err) {
    req.log.error({ err }, "GET /adoption/followed failed");
    res.status(500).json({ error: "Takip edilen ilanlar alınamadı" });
  }
});

/* ── POST /api/adoption/:id/follow ──────────────────────────── */
router.post("/adoption/:id/follow", async (req, res) => {
  const userId = uid(req);
  if (!userId) { res.status(401).json({ error: "Giriş yapılmamış" }); return; }
  try {
    const [listing] = await db.select({ id: adoptionListings.id }).from(adoptionListings).where(eq(adoptionListings.id, req.params.id));
    if (!listing) { res.status(404).json({ error: "İlan bulunamadı" }); return; }

    await db.insert(adoptionListingFollows).values({ userId, listingId: req.params.id }).onConflictDoNothing();

    /* Bump favorite count */
    db.update(adoptionListings)
      .set({ favoriteCount: sql`favorite_count + 1` })
      .where(eq(adoptionListings.id, req.params.id))
      .catch(() => {});

    res.json({ ok: true, isFollowedByMe: true });
  } catch (err) {
    req.log.error({ err }, "POST /adoption/:id/follow failed");
    res.status(500).json({ error: "Takip edilemedi" });
  }
});

/* ── DELETE /api/adoption/:id/follow ────────────────────────── */
router.delete("/adoption/:id/follow", async (req, res) => {
  const userId = uid(req);
  if (!userId) { res.status(401).json({ error: "Giriş yapılmamış" }); return; }
  try {
    await db.delete(adoptionListingFollows).where(
      and(eq(adoptionListingFollows.userId, userId), eq(adoptionListingFollows.listingId, req.params.id))
    );

    /* Decrement favorite count (floor at 0) */
    db.update(adoptionListings)
      .set({ favoriteCount: sql`GREATEST(favorite_count - 1, 0)` })
      .where(eq(adoptionListings.id, req.params.id))
      .catch(() => {});

    res.json({ ok: true, isFollowedByMe: false });
  } catch (err) {
    req.log.error({ err }, "DELETE /adoption/:id/follow failed");
    res.status(500).json({ error: "Takip bırakılamadı" });
  }
});

/* ── POST /api/adoption ─────────────────────────────────────── */
router.post("/adoption", validateBody(CreateListingSchema), async (req, res) => {
  const userId = uid(req);
  if (!userId) { res.status(401).json({ error: "Giriş yapılmamış" }); return; }

  try {
    const body = req.body as z.infer<typeof CreateListingSchema>;
    const imagesRaw = body.images;
    const imagesArr: string[] = Array.isArray(imagesRaw)
      ? imagesRaw.filter(Boolean)
      : imagesRaw ? [String(imagesRaw)] : body.photoUrl ? [body.photoUrl] : [];
    const coverUrl = imagesArr[0] ?? body.photoUrl ?? "";

    const [listing] = await db.insert(adoptionListings).values({
      petName:            body.petName,
      petType:            body.petType ?? "",
      petAge:             body.petAge ?? "",
      breed:              body.breed ?? "",
      gender:             body.gender ?? "",
      vaccinated:         body.vaccinated ?? false,
      photoUrl:           coverUrl,
      images:             imagesArr,
      location:           body.location ?? "",
      description:        body.description ?? "",
      userId,
      userName:           body.userName ?? "",
      contactInfo:        body.contactInfo ?? "",
      allowPhoneContact:  body.allowPhoneContact ?? false,
      allowMessages:      body.allowMessages ?? true,
      status:             body.status ?? "Aktif",
      healthStatus:       body.healthStatus ?? null,
      vaccinationStatus:  body.vaccinationStatus ?? null,
      environmentType:    body.environmentType ?? null,
      childCompatibility: body.childCompatibility ?? null,
      catCompatibility:   body.catCompatibility ?? null,
      dogCompatibility:   body.dogCompatibility ?? null,
      toiletTraining:     body.toiletTraining ?? null,
    }).returning();

    res.status(201).json(listing);
  } catch (err) {
    req.log.error({ err }, "POST /adoption failed");
    res.status(500).json({ error: "İlan oluşturulamadı" });
  }
});

/* ── PATCH /api/adoption/:id ────────────────────────────────── */
router.patch("/adoption/:id", validateBody(UpdateListingSchema), async (req, res) => {
  const id = req.params["id"] as string;
  const userId = uid(req);
  if (!userId) { res.status(401).json({ error: "Giriş yapılmamış" }); return; }

  try {
    const [existing] = await db.select().from(adoptionListings).where(eq(adoptionListings.id, id));
    if (!existing) { res.status(404).json({ error: "İlan bulunamadı" }); return; }
    if (existing.userId !== userId) { res.status(403).json({ error: "Yetki yok" }); return; }

    const body = req.body as z.infer<typeof UpdateListingSchema>;
    const updates: Partial<typeof adoptionListings.$inferInsert> = { updatedAt: new Date() };

    if (body.petName            !== undefined) updates.petName            = body.petName;
    if (body.petType            !== undefined) updates.petType            = body.petType;
    if (body.petAge             !== undefined) updates.petAge             = body.petAge;
    if (body.breed              !== undefined) updates.breed              = body.breed;
    if (body.gender             !== undefined) updates.gender             = body.gender;
    if (body.vaccinated         !== undefined) updates.vaccinated         = body.vaccinated;
    if (body.images !== undefined) {
      const imagesRaw = body.images;
      const imagesArr: string[] = Array.isArray(imagesRaw)
        ? imagesRaw.filter(Boolean)
        : imagesRaw ? [String(imagesRaw)] : [];
      updates.images   = imagesArr;
      updates.photoUrl = imagesArr[0] ?? body.photoUrl ?? existing.photoUrl ?? "";
    } else if (body.photoUrl    !== undefined) {
      updates.photoUrl = body.photoUrl;
    }
    if (body.location           !== undefined) updates.location           = body.location;
    if (body.description        !== undefined) updates.description        = body.description;
    if (body.contactInfo        !== undefined) updates.contactInfo        = body.contactInfo;
    if (body.allowPhoneContact  !== undefined) updates.allowPhoneContact  = body.allowPhoneContact;
    if (body.allowMessages      !== undefined) updates.allowMessages      = body.allowMessages;
    if (body.status             !== undefined) updates.status             = body.status;
    if (body.healthStatus       !== undefined) updates.healthStatus       = body.healthStatus ?? null;
    if (body.vaccinationStatus  !== undefined) updates.vaccinationStatus  = body.vaccinationStatus ?? null;
    if (body.environmentType    !== undefined) updates.environmentType    = body.environmentType ?? null;
    if (body.childCompatibility !== undefined) updates.childCompatibility = body.childCompatibility ?? null;
    if (body.catCompatibility   !== undefined) updates.catCompatibility   = body.catCompatibility ?? null;
    if (body.dogCompatibility   !== undefined) updates.dogCompatibility   = body.dogCompatibility ?? null;
    if (body.toiletTraining     !== undefined) updates.toiletTraining     = body.toiletTraining ?? null;

    const [updated] = await db.update(adoptionListings).set(updates).where(eq(adoptionListings.id, id)).returning();
    res.json(updated);
  } catch (err) {
    req.log.error({ err }, "PATCH /adoption/:id failed");
    res.status(500).json({ error: "İlan güncellenemedi" });
  }
});

/* ── DELETE /api/adoption/:id ───────────────────────────────── */
router.delete("/adoption/:id", async (req, res) => {
  const userId = uid(req);
  if (!userId) { res.status(401).json({ error: "Giriş yapılmamış" }); return; }

  try {
    const [existing] = await db.select().from(adoptionListings).where(eq(adoptionListings.id, req.params.id));
    if (!existing) { res.status(404).json({ error: "İlan bulunamadı" }); return; }
    if (existing.userId !== userId) { res.status(403).json({ error: "Yetki yok" }); return; }

    await db.delete(adoptionListings).where(eq(adoptionListings.id, req.params.id));
    res.json({ ok: true });
  } catch (err) {
    req.log.error({ err }, "DELETE /adoption/:id failed");
    res.status(500).json({ error: "İlan silinemedi" });
  }
});

export default router;
