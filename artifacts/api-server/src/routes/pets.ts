import { Router } from "express";
import { db } from "@workspace/db";
import { petProfiles, petPosts, petHealth, petFollowers } from "@workspace/db";
import { eq, and, desc, sql } from "drizzle-orm";
import { getPetPremiumStatus } from "../services/petPremiumAccess.js";

import { extractUserId } from "../lib/jwtAuth.js";

const router = Router();

const FREE_PET_LIMIT = 1;

function uid(req: Parameters<Parameters<typeof router.get>[1]>[0]): string {
  return extractUserId(req);
}

// ── Pet Profiles ─────────────────────────────────────────────────────────────

router.get("/pets", async (req, res) => {
  const userId = uid(req);
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }
  try {
    const pets = await db.select().from(petProfiles)
      .where(eq(petProfiles.ownerId, userId))
      .orderBy(desc(petProfiles.createdAt));
    res.json(pets);
  } catch { res.status(500).json({ error: "Failed to fetch pets" }); }
});

/* ── GET /api/pets/user/:userId — public: another user's pets ── */
router.get("/pets/user/:userId", async (req, res) => {
  try {
    const pets = await db.select().from(petProfiles)
      .where(eq(petProfiles.ownerId, req.params.userId))
      .orderBy(desc(petProfiles.createdAt));
    res.json(pets);
  } catch { res.status(500).json({ error: "Failed to fetch pets" }); }
});

router.get("/pets/:petId", async (req, res) => {
  try {
    const [pet] = await db.select().from(petProfiles).where(eq(petProfiles.id, req.params.petId));
    if (!pet) { res.status(404).json({ error: "Not found" }); return; }
    res.json(pet);
  } catch { res.status(500).json({ error: "Failed to fetch pet" }); }
});

router.post("/pets", async (req, res) => {
  const userId = uid(req);
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const { name, type, breed, age, gender, birthDate, weight, color, avatarUrl, bio, location, vaccinationInfo, feedingNotes } = req.body as Record<string, string>;
  if (!name?.trim()) { res.status(400).json({ error: "name required" }); return; }
  try {
    const premium = await getPetPremiumStatus(userId);
    if (!premium.canAddPet) {
      res.status(402).json({
        code: "PET_PREMIUM_REQUIRED",
        message: "Evcilim Premium is required to add another pet.",
        petCount: premium.existingPetCount,
        freePetLimit: FREE_PET_LIMIT,
        canAddPet: false,
      });
      return;
    }
    const [pet] = await db.insert(petProfiles).values({
      ownerId: userId, name, type: type ?? "cat",
      breed: breed ?? "", age: age ?? "", gender: gender ?? "", birthDate: birthDate ?? "",
      weight: weight ?? "", color: color ?? "", avatarUrl: avatarUrl ?? "",
      bio: bio ?? "", location: location ?? "",
      vaccinationInfo: vaccinationInfo ?? "", feedingNotes: feedingNotes ?? "",
    }).returning();
    res.status(201).json(pet);
  } catch { res.status(500).json({ error: "Failed to create pet" }); }
});

router.patch("/pets/:petId", async (req, res) => {
  const userId = uid(req);
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }
  try {
    const [existing] = await db.select().from(petProfiles).where(eq(petProfiles.id, req.params.petId));
    if (!existing) { res.status(404).json({ error: "Not found" }); return; }
    if (existing.ownerId !== userId) { res.status(403).json({ error: "Forbidden" }); return; }
    const { name, type, breed, age, gender, birthDate, weight, color, avatarUrl, bio, location, vaccinationInfo, feedingNotes } = req.body as Record<string, string>;
    const updates: Partial<typeof petProfiles.$inferInsert> = { updatedAt: new Date() };
    if (name            !== undefined) updates.name            = name;
    if (type            !== undefined) updates.type            = type;
    if (breed           !== undefined) updates.breed           = breed;
    if (age             !== undefined) updates.age             = age;
    if (gender          !== undefined) updates.gender          = gender;
    if (birthDate       !== undefined) updates.birthDate       = birthDate;
    if (weight          !== undefined) updates.weight          = weight;
    if (color           !== undefined) updates.color           = color;
    if (avatarUrl       !== undefined) updates.avatarUrl       = avatarUrl;
    if (bio             !== undefined) updates.bio             = bio;
    if (location        !== undefined) updates.location        = location;
    if (vaccinationInfo !== undefined) updates.vaccinationInfo = vaccinationInfo;
    if (feedingNotes    !== undefined) updates.feedingNotes    = feedingNotes;
    const [updated] = await db.update(petProfiles).set(updates).where(eq(petProfiles.id, req.params.petId)).returning();
    res.json(updated);
  } catch { res.status(500).json({ error: "Failed to update pet" }); }
});

router.delete("/pets/:petId", async (req, res) => {
  const userId = uid(req);
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }
  try {
    const [existing] = await db.select().from(petProfiles).where(eq(petProfiles.id, req.params.petId));
    if (!existing) { res.status(404).json({ error: "Not found" }); return; }
    if (existing.ownerId !== userId) { res.status(403).json({ error: "Forbidden" }); return; }
    await db.delete(petPosts).where(eq(petPosts.petId, req.params.petId));
    await db.delete(petHealth).where(eq(petHealth.petId, req.params.petId));
    await db.delete(petFollowers).where(eq(petFollowers.petId, req.params.petId));
    await db.delete(petProfiles).where(eq(petProfiles.id, req.params.petId));
    res.json({ ok: true });
  } catch { res.status(500).json({ error: "Failed to delete pet" }); }
});

// ── Pet Posts ─────────────────────────────────────────────────────────────────

router.get("/pets/:petId/posts", async (req, res) => {
  try {
    const posts = await db.select().from(petPosts)
      .where(eq(petPosts.petId, req.params.petId))
      .orderBy(desc(petPosts.createdAt));
    res.json(posts);
  } catch { res.status(500).json({ error: "Failed to fetch pet posts" }); }
});

router.post("/pets/:petId/posts", async (req, res) => {
  const userId = uid(req);
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const { imageUrl, caption, location } = req.body as Record<string, string>;
  if (!imageUrl?.trim()) { res.status(400).json({ error: "imageUrl required" }); return; }
  try {
    const [post] = await db.insert(petPosts).values({
      petId: req.params.petId, ownerId: userId,
      imageUrl, caption: caption ?? "", location: location ?? "",
    }).returning();
    await db.update(petProfiles)
      .set({ postsCount: sql`${petProfiles.postsCount} + 1`, updatedAt: new Date() })
      .where(eq(petProfiles.id, req.params.petId));
    res.status(201).json(post);
  } catch { res.status(500).json({ error: "Failed to create pet post" }); }
});

router.delete("/pets/:petId/posts/:postId", async (req, res) => {
  const userId = uid(req);
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }
  try {
    const [post] = await db.select().from(petPosts).where(eq(petPosts.id, req.params.postId));
    if (!post) { res.status(404).json({ error: "Not found" }); return; }
    if (post.ownerId !== userId) { res.status(403).json({ error: "Forbidden" }); return; }
    await db.delete(petPosts).where(eq(petPosts.id, req.params.postId));
    await db.update(petProfiles)
      .set({ postsCount: sql`GREATEST(${petProfiles.postsCount} - 1, 0)`, updatedAt: new Date() })
      .where(eq(petProfiles.id, req.params.petId));
    res.json({ ok: true });
  } catch { res.status(500).json({ error: "Failed to delete pet post" }); }
});

// ── Pet Health ────────────────────────────────────────────────────────────────

router.get("/pets/:petId/health", async (req, res) => {
  try {
    const records = await db.select().from(petHealth)
      .where(eq(petHealth.petId, req.params.petId))
      .orderBy(desc(petHealth.createdAt));
    res.json(records);
  } catch { res.status(500).json({ error: "Failed to fetch health records" }); }
});

router.post("/pets/:petId/health", async (req, res) => {
  const userId = uid(req);
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const { vaccineName, date, nextDate, note } = req.body as Record<string, string>;
  if (!vaccineName?.trim() || !date?.trim()) { res.status(400).json({ error: "vaccineName and date required" }); return; }
  try {
    const [row] = await db.insert(petHealth).values({
      petId: req.params.petId, vaccineName, date,
      nextDate: nextDate ?? "", note: note ?? "",
    }).returning();
    res.status(201).json(row);
  } catch { res.status(500).json({ error: "Failed to add health record" }); }
});

router.delete("/pets/:petId/health/:healthId", async (req, res) => {
  const userId = uid(req);
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }
  try {
    await db.delete(petHealth).where(eq(petHealth.id, req.params.healthId));
    res.json({ ok: true });
  } catch { res.status(500).json({ error: "Failed to delete health record" }); }
});

// ── Pet Followers ─────────────────────────────────────────────────────────────

router.get("/pets/:petId/following", async (req, res) => {
  const userId = uid(req);
  if (!userId) { res.json({ following: false }); return; }
  try {
    const [row] = await db.select().from(petFollowers)
      .where(and(eq(petFollowers.petId, req.params.petId), eq(petFollowers.userId, userId)));
    res.json({ following: !!row });
  } catch { res.json({ following: false }); }
});

router.post("/pets/:petId/follow", async (req, res) => {
  const userId = uid(req);
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const petId = req.params.petId;
  try {
    const [existing] = await db.select().from(petFollowers)
      .where(and(eq(petFollowers.petId, petId), eq(petFollowers.userId, userId)));
    if (existing) {
      await db.delete(petFollowers).where(eq(petFollowers.id, existing.id));
      const [updated] = await db.update(petProfiles)
        .set({ followersCount: sql`GREATEST(${petProfiles.followersCount} - 1, 0)`, updatedAt: new Date() })
        .where(eq(petProfiles.id, petId)).returning();
      res.json({ following: false, followersCount: updated?.followersCount ?? 0 });
    } else {
      await db.insert(petFollowers).values({ petId, userId });
      const [updated] = await db.update(petProfiles)
        .set({ followersCount: sql`${petProfiles.followersCount} + 1`, updatedAt: new Date() })
        .where(eq(petProfiles.id, petId)).returning();
      res.json({ following: true, followersCount: updated?.followersCount ?? 0 });
    }
  } catch { res.status(500).json({ error: "Failed to toggle follow" }); }
});

export default router;
