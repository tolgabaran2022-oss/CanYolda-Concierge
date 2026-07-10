import { Router } from "express";
import { desc, eq, sql } from "drizzle-orm";
import { db, adoptionListings } from "@workspace/db";
import { logger } from "../lib/logger.js";

const router = Router();

function uid(req: Parameters<Parameters<typeof router.get>[1]>[0]): string {
  return (req.headers["x-user-id"] as string | undefined) ?? "";
}

const SEED_LISTINGS = [
  {
    petName: "Pamuk",
    petType: "Kedi",
    petAge: "British Shorthair • 2 yaş",
    photoUrl: "https://images.unsplash.com/photo-1592194996308-7b43878e84a6?w=400&q=80",
    location: "Kadıköy, İstanbul",
    description: "Sakin, oyuncu ve sevgi dolu bir patili dost. Aşıları tamam.",
    userId: "seed-system",
    userName: "Zeynep K.",
    contactInfo: "zeynep@example.com",
    status: "Aktif" as const,
  },
  {
    petName: "Badem",
    petType: "Köpek",
    petAge: "Golden Retriever • 1.5 yaş",
    photoUrl: "https://images.unsplash.com/photo-1633722715463-d30f4f325e24?w=400&q=80",
    location: "Üsküdar, İstanbul",
    description: "Enerjik, arkadaş canlısı ve çocuklarla çok iyi anlaşır.",
    userId: "seed-system",
    userName: "Ahmet M.",
    contactInfo: "0532 XXX XX XX",
    status: "Aktif" as const,
  },
  {
    petName: "Misket",
    petType: "Kedi",
    petAge: "Tekir • 3 ay",
    photoUrl: "https://images.unsplash.com/photo-1548247416-ec66f4900b2e?w=400&q=80",
    location: "Beşiktaş, İstanbul",
    description: "Oyuncu, meraklı ve çok tatlı bir yavru kedi.",
    userId: "seed-system",
    userName: "Selin A.",
    contactInfo: "selin@example.com",
    status: "Aktif" as const,
  },
  {
    petName: "Limon",
    petType: "Tavşan",
    petAge: "Hollanda Lop • 6 ay",
    photoUrl: "https://images.unsplash.com/photo-1585110396000-c9ffd4e4b308?w=400&q=80",
    location: "Bakırköy, İstanbul",
    description: "Sevecen, tuvalet eğitimi var ve sağlıklıdır.",
    userId: "seed-system",
    userName: "Merve T.",
    contactInfo: "merve@example.com",
    status: "Aktif" as const,
  },
  {
    petName: "Atlas",
    petType: "Köpek",
    petAge: "Husky • 2 yaş",
    photoUrl: "https://images.unsplash.com/photo-1547407139-3c921a66005c?w=400&q=80",
    location: "Şişli, İstanbul",
    description: "Aktif, zeki ve geniş alana ihtiyaç duyan bir Husky.",
    userId: "seed-system",
    userName: "Can B.",
    contactInfo: "can@example.com",
    status: "Aktif" as const,
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
    const listings = await db.select().from(adoptionListings).orderBy(desc(adoptionListings.createdAt));
    res.json(listings);
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

/* ── GET /api/adoption/:id ─────────────────────────────────── */
router.get("/adoption/:id", async (req, res) => {
  try {
    const [listing] = await db.select().from(adoptionListings).where(eq(adoptionListings.id, req.params.id));
    if (!listing) { res.status(404).json({ error: "İlan bulunamadı" }); return; }

    /* Increment view count (fire and forget) */
    db.update(adoptionListings)
      .set({ viewsCount: sql`views_count + 1` })
      .where(eq(adoptionListings.id, req.params.id))
      .catch(() => {});

    res.json(listing);
  } catch (err) {
    req.log.error({ err }, "GET /adoption/:id failed");
    res.status(500).json({ error: "İlan alınamadı" });
  }
});

/* ── POST /api/adoption ─────────────────────────────────────── */
router.post("/adoption", async (req, res) => {
  const userId = uid(req);
  if (!userId) { res.status(401).json({ error: "Giriş yapılmamış" }); return; }

  try {
    const {
      petName, petType, petAge, breed, gender, vaccinated,
      photoUrl, location, description, userName, contactInfo,
      allowPhoneContact, allowMessages, status,
    } = req.body as Record<string, string | boolean>;

    if (!petName || !String(petName).trim()) {
      res.status(400).json({ error: "Hayvan adı zorunlu" });
      return;
    }

    const [listing] = await db.insert(adoptionListings).values({
      petName:           String(petName),
      petType:           String(petType ?? ""),
      petAge:            String(petAge ?? ""),
      breed:             String(breed ?? ""),
      gender:            String(gender ?? ""),
      vaccinated:        vaccinated === true || vaccinated === "true",
      photoUrl:          String(photoUrl ?? ""),
      location:          String(location ?? ""),
      description:       String(description ?? ""),
      userId,
      userName:          String(userName ?? ""),
      contactInfo:       String(contactInfo ?? ""),
      allowPhoneContact: allowPhoneContact === true || allowPhoneContact === "true",
      allowMessages:     allowMessages !== false && allowMessages !== "false",
      status:            String(status ?? "Aktif"),
    }).returning();

    res.status(201).json(listing);
  } catch (err) {
    req.log.error({ err }, "POST /adoption failed");
    res.status(500).json({ error: "İlan oluşturulamadı" });
  }
});

/* ── PATCH /api/adoption/:id ────────────────────────────────── */
router.patch("/adoption/:id", async (req, res) => {
  const userId = uid(req);
  if (!userId) { res.status(401).json({ error: "Giriş yapılmamış" }); return; }

  try {
    const [existing] = await db.select().from(adoptionListings).where(eq(adoptionListings.id, req.params.id));
    if (!existing) { res.status(404).json({ error: "İlan bulunamadı" }); return; }
    if (existing.userId !== userId) { res.status(403).json({ error: "Yetki yok" }); return; }

    const {
      petName, petType, petAge, breed, gender, vaccinated,
      photoUrl, location, description, contactInfo,
      allowPhoneContact, allowMessages, status,
    } = req.body as Record<string, string | boolean | undefined>;

    const updates: Partial<typeof adoptionListings.$inferInsert> = { updatedAt: new Date() };
    if (petName           !== undefined) updates.petName           = String(petName);
    if (petType           !== undefined) updates.petType           = String(petType);
    if (petAge            !== undefined) updates.petAge            = String(petAge);
    if (breed             !== undefined) updates.breed             = String(breed);
    if (gender            !== undefined) updates.gender            = String(gender);
    if (vaccinated        !== undefined) updates.vaccinated        = vaccinated === true || vaccinated === "true";
    if (photoUrl          !== undefined) updates.photoUrl          = String(photoUrl);
    if (location          !== undefined) updates.location          = String(location);
    if (description       !== undefined) updates.description       = String(description);
    if (contactInfo       !== undefined) updates.contactInfo       = String(contactInfo);
    if (allowPhoneContact !== undefined) updates.allowPhoneContact = allowPhoneContact === true || allowPhoneContact === "true";
    if (allowMessages     !== undefined) updates.allowMessages     = allowMessages !== false && allowMessages !== "false";
    if (status            !== undefined) updates.status            = String(status);

    const [updated] = await db.update(adoptionListings).set(updates).where(eq(adoptionListings.id, req.params.id)).returning();
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
