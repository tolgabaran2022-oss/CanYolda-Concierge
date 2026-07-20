import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { getWorkerMetrics }    from "../lib/notificationWorker.js";
import { getSchedulerMetrics } from "../lib/reminderScheduler.js";

const router: IRouter = Router();

router.get("/healthz", async (_req, res) => {
  try {
    /* DB liveness check */
    await db.execute(sql`SELECT 1`);

    const worker    = getWorkerMetrics();
    const scheduler = getSchedulerMetrics();

    /* Pending / failed counts from in-memory metrics (refreshed every loop) */
    res.json({
      status: "ok",
      worker: {
        lastLoopAt:    worker.lastLoopAt?.toISOString()    ?? null,
        lastSuccessAt: worker.lastSuccessAt?.toISOString() ?? null,
        pendingEvents: worker.pendingCount,
        failedEvents:  worker.failedCount,
        loopCount:     worker.loopCount,
      },
      scheduler: {
        lastLoopAt:    scheduler.lastLoopAt?.toISOString()    ?? null,
        lastSuccessAt: scheduler.lastSuccessAt?.toISOString() ?? null,
        loopCount:     scheduler.loopCount,
      },
      db: "ok",
    });
  } catch (err: unknown) {
    res.status(503).json({
      status: "error",
      db:     "unreachable",
      error:  err instanceof Error ? err.message : "unknown",
    });
  }
});

router.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

export default router;
