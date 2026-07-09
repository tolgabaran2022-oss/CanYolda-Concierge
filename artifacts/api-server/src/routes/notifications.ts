import { Router } from "express";
import { desc, eq } from "drizzle-orm";
import { db, notifications } from "@workspace/db";

const router = Router();

/* ── GET /api/notifications ────────────────────────────── */
router.get("/notifications", async (req, res) => {
  try {
    const userId = req.headers["x-user-id"] as string;
    if (!userId) { res.status(400).json({ error: "x-user-id required" }); return; }

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
    const { id } = req.params;
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
    const userId = req.headers["x-user-id"] as string;
    if (!userId) { res.status(400).json({ error: "x-user-id required" }); return; }
    await db.update(notifications).set({ read: true }).where(eq(notifications.receiverId, userId));
    res.json({ ok: true });
  } catch (err) {
    req.log.error({ err }, "POST /notifications/read-all failed");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
