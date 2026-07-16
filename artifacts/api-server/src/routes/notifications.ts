import { Router } from "express";
import { desc, eq } from "drizzle-orm";
import { db, notifications } from "@workspace/db";

import { extractUserId } from "../lib/jwtAuth.js";

const router = Router();

/* ── GET /api/notifications ────────────────────────────── */
router.get("/notifications", async (req, res) => {
  try {
    const userId = extractUserId(req);
    if (!userId) { res.status(401).json({ error: "Giriş yapılmamış" }); return; }

    const rows = await db
      .select()
      .from(notifications)
      .where(eq(notifications.receiverId, userId))
      .orderBy(desc(notifications.createdAt))
      .limit(50);

    res.json(rows);
  } catch (err) {
    req.log.error({ err }, "GET /notifications failed");
    res.status(500).json({ error: "Internal server error" });
  }
});

/* ── POST /api/notifications/:id/read ─────────────────── */
router.post("/notifications/:id/read", async (req, res) => {
  try {
    const userId = extractUserId(req);
    if (!userId) { res.status(401).json({ error: "Giriş yapılmamış" }); return; }

    const { id } = req.params;

    /* Ownership check — only the notification receiver may mark it as read */
    const [notif] = await db
      .select({ receiverId: notifications.receiverId })
      .from(notifications)
      .where(eq(notifications.id, id))
      .limit(1);

    if (!notif) { res.status(404).json({ error: "Bildirim bulunamadı" }); return; }
    if (notif.receiverId !== userId) { res.status(403).json({ error: "Bu bildirimi okuma yetkiniz yok" }); return; }

    await db.update(notifications).set({ read: true }).where(eq(notifications.id, id));
    res.json({ ok: true });
  } catch (err) {
    req.log.error({ err }, "POST /notifications/:id/read failed");
    res.status(500).json({ error: "Internal server error" });
  }
});

/* ── POST /api/notifications/read-all ─────────────────── */
router.post("/notifications/read-all", async (req, res) => {
  try {
    const userId = extractUserId(req);
    if (!userId) { res.status(401).json({ error: "Giriş yapılmamış" }); return; }
    await db.update(notifications).set({ read: true }).where(eq(notifications.receiverId, userId));
    res.json({ ok: true });
  } catch (err) {
    req.log.error({ err }, "POST /notifications/read-all failed");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
