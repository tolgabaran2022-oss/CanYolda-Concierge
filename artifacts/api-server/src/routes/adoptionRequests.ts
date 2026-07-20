import { Router } from "express";
import { and, desc, eq, ne } from "drizzle-orm";
import { db, adoptionRequests, adoptionListings, notifications } from "@workspace/db";
import { logger } from "../lib/logger.js";
import { extractUserId } from "../lib/jwtAuth.js";
import { sendPushNotification } from "../lib/pushService.js";

const router = Router();

function uid(req: Parameters<Parameters<typeof router.get>[1]>[0]): string {
  return extractUserId(req);
}

/* ── POST /api/adoption-requests ─────────────────────────────── */
router.post("/adoption-requests", async (req, res) => {
  const userId = uid(req);
  if (!userId) { res.status(401).json({ error: "Giriş yapılmamış" }); return; }

  const { listingId, reason, hadPetBefore, livingSpace, hasOtherPets, aloneDuration, note, requesterName, requesterAvatar } =
    req.body as Record<string, unknown>;

  if (!listingId || typeof listingId !== "string") { res.status(400).json({ error: "listingId zorunlu" }); return; }
  if (!reason || String(reason).trim().length < 20) { res.status(400).json({ error: "Neden alanı en az 20 karakter olmalı" }); return; }
  if (hadPetBefore === undefined || hadPetBefore === null) { res.status(400).json({ error: "Evcil hayvan deneyimi zorunlu" }); return; }
  if (!livingSpace) { res.status(400).json({ error: "Yaşam alanı zorunlu" }); return; }
  if (hasOtherPets === undefined || hasOtherPets === null) { res.status(400).json({ error: "Diğer hayvan bilgisi zorunlu" }); return; }
  if (!aloneDuration) { res.status(400).json({ error: "Yalnız kalma süresi zorunlu" }); return; }

  try {
    const [listing] = await db.select().from(adoptionListings).where(eq(adoptionListings.id, listingId));
    if (!listing) { res.status(404).json({ error: "İlan bulunamadı" }); return; }
    if (listing.status !== "Aktif") { res.status(400).json({ error: "Bu ilan artık aktif değil" }); return; }
    if (listing.userId === userId) { res.status(400).json({ error: "Kendi ilanınıza talep gönderemezsiniz" }); return; }

    /* Check for existing active request */
    const [existing] = await db.select({ id: adoptionRequests.id, status: adoptionRequests.status })
      .from(adoptionRequests)
      .where(and(eq(adoptionRequests.listingId, listingId), eq(adoptionRequests.requesterId, userId)));

    if (existing) {
      if (existing.status === "pending" || existing.status === "reviewing") {
        res.status(409).json({ error: "Bu ilan için zaten aktif bir talebiniz var", requestId: existing.id });
        return;
      }
      /* If cancelled/rejected before, remove old and allow re-request */
      await db.delete(adoptionRequests).where(eq(adoptionRequests.id, existing.id));
    }

    const [request] = await db.insert(adoptionRequests).values({
      listingId,
      requesterId:   userId,
      requesterName: String(requesterName ?? ""),
      ownerId:       listing.userId ?? undefined,
      reason:        String(reason).trim(),
      hadPetBefore:  hadPetBefore === true || hadPetBefore === "true",
      livingSpace:   String(livingSpace),
      hasOtherPets:  hasOtherPets === true || hasOtherPets === "true",
      aloneDuration: String(aloneDuration),
      note:          note ? String(note).slice(0, 300) : "",
      status:        "pending",
    }).returning();

    /* Create notification for listing owner (skip if listing was anonymised) */
    if (listing.userId) await db.insert(notifications).values({
      receiverId:   listing.userId,
      senderId:     userId,
      senderName:   String(requesterName ?? ""),
      senderAvatar: String(requesterAvatar ?? ""),
      type:         "adoption_request_received",
      postId:       listingId,
      postImage:    listing.photoUrl ?? "",
      message:      `${String(requesterName ?? "Biri")}, ${listing.petName} için sahiplendirme talebi gönderdi.`,
      read:         false,
    }).catch((err) => logger.error({ err }, "Failed to create adoption notification"));

    res.status(201).json(request);

    /* ── Push notification to listing owner (fire-and-forget) ── */
    if (listing.userId) {
      sendPushNotification(listing.userId, {
        type:     "adoption_request",
        entityId: request.id,
        title:    "Yeni sahiplenme talebi",
        body:     `${String(requesterName ?? "Biri")}, ${listing.petName} için talep gönderdi.`,
      }).catch(() => {});
    }
  } catch (err) {
    req.log.error({ err }, "POST /adoption-requests failed");
    res.status(500).json({ error: "Talep gönderilemedi" });
  }
});

/* ── GET /api/adoption-requests/my ─────────────────────────────── */
router.get("/adoption-requests/my", async (req, res) => {
  const userId = uid(req);
  if (!userId) { res.status(401).json({ error: "Giriş yapılmamış" }); return; }

  try {
    const rows = await db.select().from(adoptionRequests)
      .where(eq(adoptionRequests.requesterId, userId))
      .orderBy(desc(adoptionRequests.createdAt));
    res.json(rows);
  } catch (err) {
    req.log.error({ err }, "GET /adoption-requests/my failed");
    res.status(500).json({ error: "Talepler alınamadı" });
  }
});

/* ── GET /api/adoption-requests/received ─────────────────────────── */
router.get("/adoption-requests/received", async (req, res) => {
  const userId = uid(req);
  if (!userId) { res.status(401).json({ error: "Giriş yapılmamış" }); return; }

  try {
    const rows = await db.select().from(adoptionRequests)
      .where(eq(adoptionRequests.ownerId, userId))
      .orderBy(desc(adoptionRequests.createdAt));
    res.json(rows);
  } catch (err) {
    req.log.error({ err }, "GET /adoption-requests/received failed");
    res.status(500).json({ error: "Gelen talepler alınamadı" });
  }
});

/* ── GET /api/adoption-requests/for-listing/:listingId ─────────── */
router.get("/adoption-requests/for-listing/:listingId", async (req, res) => {
  const userId = uid(req);
  if (!userId) { res.status(401).json({ error: "Giriş yapılmamış" }); return; }

  try {
    const [listing] = await db.select({ userId: adoptionListings.userId }).from(adoptionListings).where(eq(adoptionListings.id, req.params.listingId));
    if (!listing || listing.userId !== userId) { res.status(403).json({ error: "Yetki yok" }); return; }

    const rows = await db.select().from(adoptionRequests)
      .where(and(eq(adoptionRequests.listingId, req.params.listingId), ne(adoptionRequests.status, "cancelled")))
      .orderBy(desc(adoptionRequests.createdAt));
    res.json(rows);
  } catch (err) {
    req.log.error({ err }, "GET /adoption-requests/for-listing failed");
    res.status(500).json({ error: "Talepler alınamadı" });
  }
});

/* ── GET /api/adoption-requests/check/:listingId ───────────────── */
router.get("/adoption-requests/check/:listingId", async (req, res) => {
  const userId = uid(req);
  if (!userId) { res.json({ hasRequest: false }); return; }

  try {
    const [existing] = await db.select({ id: adoptionRequests.id, status: adoptionRequests.status })
      .from(adoptionRequests)
      .where(and(eq(adoptionRequests.listingId, req.params.listingId), eq(adoptionRequests.requesterId, userId)));

    res.json({ hasRequest: !!existing, requestId: existing?.id, status: existing?.status });
  } catch (err) {
    req.log.error({ err }, "GET /adoption-requests/check failed");
    res.json({ hasRequest: false });
  }
});

/* ── GET /api/adoption-requests/:id ─────────────────────────────── */
router.get("/adoption-requests/:id", async (req, res) => {
  const userId = uid(req);
  if (!userId) { res.status(401).json({ error: "Giriş yapılmamış" }); return; }

  try {
    const [request] = await db.select().from(adoptionRequests).where(eq(adoptionRequests.id, req.params.id));
    if (!request) { res.status(404).json({ error: "Talep bulunamadı" }); return; }
    if (request.requesterId !== userId && request.ownerId !== userId) {
      res.status(403).json({ error: "Yetki yok" }); return;
    }
    res.json(request);
  } catch (err) {
    req.log.error({ err }, "GET /adoption-requests/:id failed");
    res.status(500).json({ error: "Talep alınamadı" });
  }
});

/* ── PATCH /api/adoption-requests/:id/status ────────────────────── */
router.patch("/adoption-requests/:id/status", async (req, res) => {
  const userId = uid(req);
  if (!userId) { res.status(401).json({ error: "Giriş yapılmamış" }); return; }

  const { status } = req.body as { status?: string };
  if (!status) { res.status(400).json({ error: "status zorunlu" }); return; }

  try {
    const [request] = await db.select().from(adoptionRequests).where(eq(adoptionRequests.id, req.params.id));
    if (!request) { res.status(404).json({ error: "Talep bulunamadı" }); return; }

    const isOwner     = request.ownerId === userId;
    const isRequester = request.requesterId === userId;

    /* Only owner can accept/reject; only requester can cancel */
    if (status === "cancelled" && !isRequester) { res.status(403).json({ error: "Yetki yok" }); return; }
    if ((status === "accepted" || status === "rejected" || status === "reviewing") && !isOwner) {
      res.status(403).json({ error: "Yetki yok" }); return;
    }

    const updates: Record<string, unknown> = { status, updatedAt: new Date() };
    if (status === "accepted")  updates.acceptedAt = new Date();
    if (status === "rejected")  updates.rejectedAt = new Date();

    const [updated] = await db.update(adoptionRequests).set(updates as Parameters<typeof db.update>[0] extends (table: unknown) => { set: (values: infer V) => unknown } ? V : never)
      .where(eq(adoptionRequests.id, req.params.id)).returning();

    /* Send notification to requester when owner accepts/rejects */
    if (status === "accepted" || status === "rejected") {
      const [listing] = await db.select({ petName: adoptionListings.petName, photoUrl: adoptionListings.photoUrl })
        .from(adoptionListings).where(eq(adoptionListings.id, request.listingId));

      const notifType = status === "accepted" ? "adoption_request_accepted" : "adoption_request_rejected";
      const msg = status === "accepted"
        ? `${listing?.petName ?? "İlan"} için gönderdiğin sahiplendirme talebi kabul edildi 🎉`
        : `${listing?.petName ?? "İlan"} için gönderdiğin talep bu kez olumlu sonuçlanmadı.`;

      await db.insert(notifications).values({
        receiverId:   request.requesterId,
        senderId:     userId,
        senderName:   "",
        senderAvatar: "",
        type:         notifType,
        postId:       request.listingId,
        postImage:    listing?.photoUrl ?? "",
        message:      msg,
        read:         false,
      }).catch(() => {});
    }

    res.json(updated);

    /* ── Push notification to requester on accept/reject (fire-and-forget) ── */
    if (status === "accepted" || status === "rejected") {
      const [listing] = await db
        .select({ petName: adoptionListings.petName })
        .from(adoptionListings)
        .where(eq(adoptionListings.id, request.listingId));

      const pushBody = status === "accepted"
        ? `${listing?.petName ?? "İlan"} için talebiniz kabul edildi 🎉`
        : `${listing?.petName ?? "İlan"} için talebiniz bu kez kabul edilmedi.`;

      sendPushNotification(request.requesterId, {
        type:     "adoption_request",
        entityId: request.id,
        title:    status === "accepted" ? "Talep Kabul Edildi" : "Talep Güncellendi",
        body:     pushBody,
      }).catch(() => {});
    }
  } catch (err) {
    req.log.error({ err }, "PATCH /adoption-requests/:id/status failed");
    res.status(500).json({ error: "Durum güncellenemedi" });
  }
});

export default router;
