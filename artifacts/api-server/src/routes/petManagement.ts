import { Router } from "express";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@workspace/db";
import {
  petVaccinations,
  petAppointments,
  petIdentification,
  petNotes,
  petNutrition,
  petProfiles,
} from "@workspace/db";

const router = Router();

function uid(req: Parameters<Parameters<typeof router.get>[1]>[0]): string {
  return (req.headers["x-user-id"] as string | undefined) ?? "";
}

/* ═══════════════════════════════════════════
   VACCINATIONS
═══════════════════════════════════════════ */

router.get("/pets/:petId/vaccinations", async (req, res) => {
  const userId = uid(req);
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }
  try {
    const rows = await db.select().from(petVaccinations)
      .where(and(eq(petVaccinations.petId, req.params.petId), eq(petVaccinations.userId, userId)))
      .orderBy(desc(petVaccinations.nextDueDate));
    res.json(rows);
  } catch { res.status(500).json({ error: "Failed" }); }
});

router.post("/pets/:petId/vaccinations", async (req, res) => {
  const userId = uid(req);
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }
  try {
    const [row] = await db.insert(petVaccinations).values({
      petId:            req.params.petId,
      userId,
      vaccineName:      req.body.vaccineName ?? "",
      vaccineType:      req.body.vaccineType ?? "",
      administeredDate: req.body.administeredDate ?? "",
      nextDueDate:      req.body.nextDueDate ?? "",
      veterinarianName: req.body.veterinarianName ?? "",
      clinicName:       req.body.clinicName ?? "",
      serialNumber:     req.body.serialNumber ?? "",
      description:      req.body.description ?? "",
      status:           req.body.status ?? "current",
    }).returning();
    res.status(201).json(row);
  } catch { res.status(500).json({ error: "Failed" }); }
});

router.patch("/pets/:petId/vaccinations/:id", async (req, res) => {
  const userId = uid(req);
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }
  try {
    const [existing] = await db.select().from(petVaccinations).where(eq(petVaccinations.id, req.params.id));
    if (!existing || existing.userId !== userId) { res.status(403).json({ error: "Forbidden" }); return; }
    const updates: Partial<typeof petVaccinations.$inferInsert> = { updatedAt: new Date() };
    const fields = ["vaccineName","vaccineType","administeredDate","nextDueDate","veterinarianName","clinicName","serialNumber","description","status"] as const;
    for (const f of fields) { if (req.body[f] !== undefined) (updates as Record<string, unknown>)[f] = req.body[f]; }
    const [row] = await db.update(petVaccinations).set(updates).where(eq(petVaccinations.id, req.params.id)).returning();
    res.json(row);
  } catch { res.status(500).json({ error: "Failed" }); }
});

router.delete("/pets/:petId/vaccinations/:id", async (req, res) => {
  const userId = uid(req);
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }
  try {
    await db.delete(petVaccinations).where(and(eq(petVaccinations.id, req.params.id), eq(petVaccinations.userId, userId)));
    res.json({ ok: true });
  } catch { res.status(500).json({ error: "Failed" }); }
});

/* ═══════════════════════════════════════════
   APPOINTMENTS
═══════════════════════════════════════════ */

router.get("/pets/:petId/appointments", async (req, res) => {
  const userId = uid(req);
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }
  try {
    const rows = await db.select().from(petAppointments)
      .where(and(eq(petAppointments.petId, req.params.petId), eq(petAppointments.userId, userId)))
      .orderBy(desc(petAppointments.appointmentDate));
    res.json(rows);
  } catch { res.status(500).json({ error: "Failed" }); }
});

router.post("/pets/:petId/appointments", async (req, res) => {
  const userId = uid(req);
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }
  try {
    const [row] = await db.insert(petAppointments).values({
      petId:            req.params.petId,
      userId,
      appointmentType:  req.body.appointmentType ?? "veteriner",
      title:            req.body.title ?? "",
      appointmentDate:  req.body.appointmentDate ?? "",
      appointmentTime:  req.body.appointmentTime ?? "",
      location:         req.body.location ?? "",
      clinicName:       req.body.clinicName ?? "",
      veterinarianName: req.body.veterinarianName ?? "",
      description:      req.body.description ?? "",
      reminderAt:       req.body.reminderAt ?? "",
      recurrenceRule:   req.body.recurrenceRule ?? "never",
      status:           req.body.status ?? "upcoming",
    }).returning();
    res.status(201).json(row);
  } catch { res.status(500).json({ error: "Failed" }); }
});

router.patch("/pets/:petId/appointments/:id", async (req, res) => {
  const userId = uid(req);
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }
  try {
    const [existing] = await db.select().from(petAppointments).where(eq(petAppointments.id, req.params.id));
    if (!existing || existing.userId !== userId) { res.status(403).json({ error: "Forbidden" }); return; }
    const updates: Partial<typeof petAppointments.$inferInsert> = { updatedAt: new Date() };
    const fields = ["appointmentType","title","appointmentDate","appointmentTime","location","clinicName","veterinarianName","description","reminderAt","recurrenceRule","status"] as const;
    for (const f of fields) { if (req.body[f] !== undefined) (updates as Record<string, unknown>)[f] = req.body[f]; }
    const [row] = await db.update(petAppointments).set(updates).where(eq(petAppointments.id, req.params.id)).returning();
    res.json(row);
  } catch { res.status(500).json({ error: "Failed" }); }
});

router.delete("/pets/:petId/appointments/:id", async (req, res) => {
  const userId = uid(req);
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }
  try {
    await db.delete(petAppointments).where(and(eq(petAppointments.id, req.params.id), eq(petAppointments.userId, userId)));
    res.json({ ok: true });
  } catch { res.status(500).json({ error: "Failed" }); }
});

/* ═══════════════════════════════════════════
   IDENTIFICATION
═══════════════════════════════════════════ */

router.get("/pets/:petId/identification", async (req, res) => {
  const userId = uid(req);
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }
  try {
    const [row] = await db.select().from(petIdentification)
      .where(and(eq(petIdentification.petId, req.params.petId), eq(petIdentification.userId, userId)));
    if (!row) { res.status(404).json(null); return; }
    res.json(row);
  } catch { res.status(500).json({ error: "Failed" }); }
});

router.put("/pets/:petId/identification", async (req, res) => {
  const userId = uid(req);
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }
  try {
    const [existing] = await db.select().from(petIdentification)
      .where(and(eq(petIdentification.petId, req.params.petId), eq(petIdentification.userId, userId)));
    if (existing) {
      const [row] = await db.update(petIdentification)
        .set({ ...req.body, updatedAt: new Date() })
        .where(eq(petIdentification.id, existing.id))
        .returning();
      res.json(row);
    } else {
      const [row] = await db.insert(petIdentification).values({
        petId:  req.params.petId,
        userId,
        microchipNumber:       req.body.microchipNumber ?? "",
        passportNumber:        req.body.passportNumber ?? "",
        healthBookNumber:      req.body.healthBookNumber ?? "",
        registrationNumber:    req.body.registrationNumber ?? "",
        insuranceInfo:         req.body.insuranceInfo ?? "",
        veterinarianName:      req.body.veterinarianName ?? "",
        veterinarianPhone:     req.body.veterinarianPhone ?? "",
        emergencyContactName:  req.body.emergencyContactName ?? "",
        emergencyContactPhone: req.body.emergencyContactPhone ?? "",
      }).returning();
      res.status(201).json(row);
    }
  } catch { res.status(500).json({ error: "Failed" }); }
});

/* ═══════════════════════════════════════════
   NOTES
═══════════════════════════════════════════ */

router.get("/pets/:petId/notes", async (req, res) => {
  const userId = uid(req);
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }
  try {
    const rows = await db.select().from(petNotes)
      .where(and(eq(petNotes.petId, req.params.petId), eq(petNotes.userId, userId)))
      .orderBy(desc(petNotes.updatedAt));
    res.json(rows);
  } catch { res.status(500).json({ error: "Failed" }); }
});

router.post("/pets/:petId/notes", async (req, res) => {
  const userId = uid(req);
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }
  try {
    const [row] = await db.insert(petNotes).values({
      petId:   req.params.petId,
      userId,
      title:   req.body.title ?? "",
      content: req.body.content ?? "",
    }).returning();
    res.status(201).json(row);
  } catch { res.status(500).json({ error: "Failed" }); }
});

router.patch("/pets/:petId/notes/:id", async (req, res) => {
  const userId = uid(req);
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }
  try {
    const [existing] = await db.select().from(petNotes).where(eq(petNotes.id, req.params.id));
    if (!existing || existing.userId !== userId) { res.status(403).json({ error: "Forbidden" }); return; }
    const [row] = await db.update(petNotes)
      .set({ title: req.body.title ?? existing.title, content: req.body.content ?? existing.content, updatedAt: new Date() })
      .where(eq(petNotes.id, req.params.id)).returning();
    res.json(row);
  } catch { res.status(500).json({ error: "Failed" }); }
});

router.delete("/pets/:petId/notes/:id", async (req, res) => {
  const userId = uid(req);
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }
  try {
    await db.delete(petNotes).where(and(eq(petNotes.id, req.params.id), eq(petNotes.userId, userId)));
    res.json({ ok: true });
  } catch { res.status(500).json({ error: "Failed" }); }
});

/* ═══════════════════════════════════════════
   NUTRITION
═══════════════════════════════════════════ */

router.get("/pets/:petId/nutrition", async (req, res) => {
  const userId = uid(req);
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }
  try {
    const [row] = await db.select().from(petNutrition)
      .where(and(eq(petNutrition.petId, req.params.petId), eq(petNutrition.userId, userId)));
    if (!row) { res.status(404).json(null); return; }
    res.json(row);
  } catch { res.status(500).json({ error: "Failed" }); }
});

router.put("/pets/:petId/nutrition", async (req, res) => {
  const userId = uid(req);
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }
  try {
    const [existing] = await db.select().from(petNutrition)
      .where(and(eq(petNutrition.petId, req.params.petId), eq(petNutrition.userId, userId)));
    if (existing) {
      const [row] = await db.update(petNutrition)
        .set({ ...req.body, updatedAt: new Date() })
        .where(eq(petNutrition.id, existing.id)).returning();
      res.json(row);
    } else {
      const [row] = await db.insert(petNutrition).values({
        petId:                req.params.petId,
        userId,
        foodBrand:            req.body.foodBrand ?? "",
        foodName:             req.body.foodName ?? "",
        foodType:             req.body.foodType ?? "kuru",
        dailyAmountGrams:     req.body.dailyAmountGrams ?? 0,
        mealsPerDay:          req.body.mealsPerDay ?? 2,
        mealTimes:            req.body.mealTimes ?? "",
        packageAmountGrams:   req.body.packageAmountGrams ?? 0,
        remainingAmountGrams: req.body.remainingAmountGrams ?? 0,
        openedAt:             req.body.openedAt ?? "",
        allergies:            req.body.allergies ?? "",
        veterinarianNotes:    req.body.veterinarianNotes ?? "",
      }).returning();
      res.status(201).json(row);
    }
  } catch { res.status(500).json({ error: "Failed" }); }
});

export { router as petManagementRouter };
export default router;
