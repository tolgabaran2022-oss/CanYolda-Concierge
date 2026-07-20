/**
 * health.ts
 *
 * GET /api/healthz — liveness + worker/scheduler readiness
 *
 * Returns:
 *   status: "ok"       — all systems healthy
 *   status: "degraded" — DB alive but worker or scheduler is stuck/dead
 *   HTTP 503           — DB unreachable
 *
 * Degraded conditions (after each system's grace period):
 *   - worker.lastSuccessAt is null (worker never completed a loop)
 *   - scheduler.lastSuccessAt is null (scheduler never completed a loop)
 *   - lastLoopAt is more than 2× poll interval in the past (stuck)
 *
 * Public endpoint — no secrets, no stack traces, no internal error strings.
 */

import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import {
  getWorkerMetrics,
  WORKER_POLL_MS,
  WORKER_GRACE_MS,
} from "../lib/notificationWorker.js";
import {
  getSchedulerMetrics,
  SCHEDULER_POLL_MS,
  SCHEDULER_GRACE_MS,
} from "../lib/reminderScheduler.js";

const router: IRouter = Router();

function isStale(lastLoopAt: Date | null, pollMs: number): boolean {
  if (!lastLoopAt) return false; /* not started yet — handled by grace-period check */
  return Date.now() - lastLoopAt.getTime() > 2 * pollMs;
}

function pastGrace(startedAt: Date | null, graceMs: number): boolean {
  if (!startedAt) return false;
  return Date.now() - startedAt.getTime() > graceMs;
}

router.get("/healthz", async (_req, res) => {
  /* ── DB liveness ─────────────────────────────────────────────────── */
  try {
    await db.execute(sql`SELECT 1`);
  } catch {
    /* Don't expose connection string or internal error */
    res.status(503).json({ status: "error", db: "unreachable" });
    return;
  }

  const worker    = getWorkerMetrics();
  const scheduler = getSchedulerMetrics();
  const now       = Date.now();

  /* ── Degraded conditions ─────────────────────────────────────────── */
  const issues: string[] = [];

  /* Worker: null lastSuccessAt after grace period → never completed a loop */
  if (pastGrace(worker.startedAt, WORKER_GRACE_MS) && worker.lastSuccessAt === null) {
    issues.push("worker_never_succeeded");
  }
  /* Worker: last loop is older than 2× poll interval → stuck */
  if (isStale(worker.lastLoopAt, WORKER_POLL_MS)) {
    issues.push("worker_stale");
  }

  /* Scheduler: null lastSuccessAt after grace period */
  if (pastGrace(scheduler.startedAt, SCHEDULER_GRACE_MS) && scheduler.lastSuccessAt === null) {
    issues.push("scheduler_never_succeeded");
  }
  /* Scheduler: last loop is older than 2× poll interval → stuck */
  if (isStale(scheduler.lastLoopAt, SCHEDULER_POLL_MS)) {
    issues.push("scheduler_stale");
  }

  const status = issues.length > 0 ? "degraded" : "ok";

  res.status(issues.length > 0 ? 207 : 200).json({
    status,
    ...(issues.length > 0 ? { issues } : {}),
    worker: {
      startedAt:     worker.startedAt?.toISOString()     ?? null,
      lastLoopAt:    worker.lastLoopAt?.toISOString()    ?? null,
      lastSuccessAt: worker.lastSuccessAt?.toISOString() ?? null,
      pendingEvents: worker.pendingCount,
      failedEvents:  worker.failedCount,
      loopCount:     worker.loopCount,
    },
    scheduler: {
      startedAt:     scheduler.startedAt?.toISOString()     ?? null,
      lastLoopAt:    scheduler.lastLoopAt?.toISOString()    ?? null,
      lastSuccessAt: scheduler.lastSuccessAt?.toISOString() ?? null,
      loopCount:     scheduler.loopCount,
    },
    db: "ok",
  });
});

router.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

export default router;
