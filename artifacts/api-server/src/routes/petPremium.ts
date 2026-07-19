import { Router } from "express";
import { and, desc, eq } from "drizzle-orm";
import {
  db,
  petCareMembers,
  petDocuments,
  petMedications,
  petProfiles,
} from "@workspace/db";
import { extractUserId } from "../lib/jwtAuth.js";
import {
  getPetPremiumStatus,
  refreshPetPremiumFromRevenueCat,
  requirePetPremium,
} from "../services/petPremiumAccess.js";

const router = Router();

function uid(req: Parameters<Parameters<typeof router.get>[1]>[0]): string {
  return extractUserId(req);
}

async function ownsPet(userId: string, petId: string): Promise<boolean> {
  const [pet] = await db.select({ ownerId: petProfiles.ownerId })
    .from(petProfiles).where(eq(petProfiles.id, petId)).limit(1);
  return pet?.ownerId === userId;
}

async function premiumGuard(userId: string, res: Parameters<Parameters<typeof router.get>[1]>[1]) {
  if (await requirePetPremium(userId)) return true;
  res.status(402).json({
    error: "premium_required",
    message: "Bu özellik Evcilim Premium üyeliği gerektirir.",
  });
  return false;
}

router.get("/pet-premium/status", async (req, res) => {
  const userId = uid(req);
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }
  try { res.json(await getPetPremiumStatus(userId)); }
  catch { res.status(500).json({ error: "premium_status_failed" }); }
});

router.post("/pet-premium/refresh", async (req, res) => {
  const userId = uid(req);
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }
  try { res.json(await refreshPetPremiumFromRevenueCat(userId)); }
  catch (error) {
    const code = error instanceof Error ? error.message : "premium_refresh_failed";
    res.status(code === "revenuecat_secret_missing" ? 503 : 502).json({ error: code });
  }
});

/* Medication data is preserved after expiry; Premium gates new writes only. */
router.get("/pets/:petId/medications", async (req, res) => {
  const userId = uid(req);
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }
  if (!(await ownsPet(userId, req.params.petId))) { res.status(403).json({ error: "Forbidden" }); return; }
  const rows = await db.select().from(petMedications)
    .where(and(eq(petMedications.petId, req.params.petId), eq(petMedications.userId, userId)))
    .orderBy(desc(petMedications.createdAt));
  res.json(rows);
});

router.post("/pets/:petId/medications", async (req, res) => {
  const userId = uid(req);
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }
  if (!(await ownsPet(userId, req.params.petId))) { res.status(403).json({ error: "Forbidden" }); return; }
  if (!(await premiumGuard(userId, res))) return;
  const name = String(req.body.name ?? "").trim();
  if (!name) { res.status(400).json({ error: "name_required" }); return; }
  const [row] = await db.insert(petMedications).values({
    petId: req.params.petId,
    userId,
    name,
    dosage: String(req.body.dosage ?? ""),
    instructions: String(req.body.instructions ?? ""),
    startDate: String(req.body.startDate ?? ""),
    endDate: String(req.body.endDate ?? ""),
    scheduleTimes: JSON.stringify(Array.isArray(req.body.scheduleTimes) ? req.body.scheduleTimes : []),
    recurrenceRule: String(req.body.recurrenceRule ?? "daily"),
    reminderEnabled: req.body.reminderEnabled !== false,
    isActive: req.body.isActive !== false,
  }).returning();
  res.status(201).json(row);
});

router.patch("/pets/:petId/medications/:id", async (req, res) => {
  const userId = uid(req);
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }
  if (!(await ownsPet(userId, req.params.petId))) { res.status(403).json({ error: "Forbidden" }); return; }
  if (!(await premiumGuard(userId, res))) return;
  const [existing] = await db.select().from(petMedications).where(and(
    eq(petMedications.id, req.params.id), eq(petMedications.userId, userId),
  ));
  if (!existing) { res.status(404).json({ error: "Not found" }); return; }
  const fields = ["name", "dosage", "instructions", "startDate", "endDate", "recurrenceRule", "reminderEnabled", "isActive"] as const;
  const updates: Record<string, unknown> = { updatedAt: new Date() };
  for (const field of fields) if (req.body[field] !== undefined) updates[field] = req.body[field];
  if (Array.isArray(req.body.scheduleTimes)) updates.scheduleTimes = JSON.stringify(req.body.scheduleTimes);
  const [row] = await db.update(petMedications).set(updates).where(eq(petMedications.id, existing.id)).returning();
  res.json(row);
});

router.delete("/pets/:petId/medications/:id", async (req, res) => {
  const userId = uid(req);
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }
  if (!(await ownsPet(userId, req.params.petId))) { res.status(403).json({ error: "Forbidden" }); return; }
  await db.delete(petMedications).where(and(eq(petMedications.id, req.params.id), eq(petMedications.userId, userId)));
  res.json({ ok: true });
});

/* Existing documents remain readable after expiry; new uploads require Premium. */
router.get("/pets/:petId/documents", async (req, res) => {
  const userId = uid(req);
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }
  if (!(await ownsPet(userId, req.params.petId))) { res.status(403).json({ error: "Forbidden" }); return; }
  const rows = await db.select().from(petDocuments)
    .where(and(eq(petDocuments.petId, req.params.petId), eq(petDocuments.userId, userId)))
    .orderBy(desc(petDocuments.createdAt));
  res.json(rows);
});

router.post("/pets/:petId/documents", async (req, res) => {
  const userId = uid(req);
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }
  if (!(await ownsPet(userId, req.params.petId))) { res.status(403).json({ error: "Forbidden" }); return; }
  if (!(await premiumGuard(userId, res))) return;
  const title = String(req.body.title ?? "").trim();
  const fileUrl = String(req.body.fileUrl ?? "").trim();
  if (!title || !fileUrl) { res.status(400).json({ error: "title_and_file_required" }); return; }
  const [row] = await db.insert(petDocuments).values({
    petId: req.params.petId,
    userId,
    title,
    fileUrl,
    category: String(req.body.category ?? "other"),
    fileName: String(req.body.fileName ?? ""),
    mimeType: String(req.body.mimeType ?? "application/octet-stream"),
    fileSize: Number(req.body.fileSize ?? 0),
    documentDate: String(req.body.documentDate ?? ""),
    notes: String(req.body.notes ?? ""),
  }).returning();
  res.status(201).json(row);
});

router.delete("/pets/:petId/documents/:id", async (req, res) => {
  const userId = uid(req);
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }
  if (!(await ownsPet(userId, req.params.petId))) { res.status(403).json({ error: "Forbidden" }); return; }
  await db.delete(petDocuments).where(and(eq(petDocuments.id, req.params.id), eq(petDocuments.userId, userId)));
  res.json({ ok: true });
});

router.get("/pets/:petId/caregivers", async (req, res) => {
  const userId = uid(req);
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }
  if (!(await ownsPet(userId, req.params.petId))) { res.status(403).json({ error: "Forbidden" }); return; }
  const rows = await db.select().from(petCareMembers)
    .where(and(eq(petCareMembers.petId, req.params.petId), eq(petCareMembers.ownerId, userId)))
    .orderBy(desc(petCareMembers.createdAt));
  res.json(rows);
});

router.post("/pets/:petId/caregivers", async (req, res) => {
  const userId = uid(req);
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }
  if (!(await ownsPet(userId, req.params.petId))) { res.status(403).json({ error: "Forbidden" }); return; }
  if (!(await premiumGuard(userId, res))) return;
  const inviteEmail = String(req.body.inviteEmail ?? "").trim().toLowerCase();
  if (!inviteEmail.includes("@")) { res.status(400).json({ error: "valid_email_required" }); return; }
  const [row] = await db.insert(petCareMembers).values({
    petId: req.params.petId,
    ownerId: userId,
    inviteEmail,
    role: req.body.role === "viewer" ? "viewer" : "caregiver",
  }).onConflictDoUpdate({
    target: [petCareMembers.petId, petCareMembers.inviteEmail],
    set: { status: "pending", updatedAt: new Date() },
  }).returning();
  res.status(201).json(row);
});

export default router;
