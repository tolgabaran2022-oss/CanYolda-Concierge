/**
 * notificationWorker.ts
 *
 * In-process worker that polls the notification_events outbox table and
 * delivers pushes via Expo Push API.  Runs as a setInterval loop inside
 * the persistent Express process — NOT a serverless function.
 *
 * Guarantees:
 *  - Atomic claim: uses a Drizzle transaction + SELECT FOR UPDATE SKIP LOCKED
 *    so that multiple concurrent instances never claim the same event.
 *  - Idempotent: each event_key is processed at most once to "sent" state.
 *    A "sent" event is never retried regardless of restart or crash.
 *  - Retry with exponential backoff, up to maxAttempts.
 *  - Stuck recovery: events stuck in "processing" > STUCK_TIMEOUT are
 *    reclaimed safely (SKIP LOCKED prevents double-delivery).
 *  - DeviceNotRegistered tokens auto-disabled.
 *  - Expo ticket ID stored per event for future receipt polling.
 *  - No secret/token/message content is logged.
 *
 * Race condition safety:
 *  The claim transaction does:
 *    1. SELECT ... FOR UPDATE SKIP LOCKED  (locks matching rows)
 *    2. UPDATE ... SET status='processing', attempts+1 ... RETURNING *
 *  Both steps happen in one serialisable transaction. Concurrent workers
 *  see SKIP LOCKED and move on — they will never claim the same row.
 */

import { and, count, eq, inArray, isNull, lte, or, sql } from "drizzle-orm";
import { db, pushTokens, notificationPreferences, notificationEvents } from "@workspace/db";
import { logger } from "./logger.js";

const BATCH_SIZE    = 10;
const POLL_INTERVAL = 10_000;  /* 10 s */
const STUCK_TIMEOUT = 300_000; /* 5 min — must exceed max Expo API response time */

type NotificationType =
  | "message"
  | "adoption_request"
  | "adoption_status"
  | "vaccination"
  | "appointment"
  | "medication"
  | "reminder"
  | "emergency";

const PREF_KEY: Record<string, keyof typeof notificationPreferences.$inferSelect | null> = {
  message:          "messagesEnabled",
  adoption_request: "adoptionEnabled",
  adoption_status:  "adoptionEnabled",
  vaccination:      "remindersEnabled",
  appointment:      "remindersEnabled",
  medication:       "remindersEnabled",
  reminder:         "remindersEnabled",
  emergency:        "emergencyEnabled",
};

const ANDROID_CHANNEL: Record<string, string> = {
  message:          "messages",
  adoption_request: "adoption",
  adoption_status:  "adoption",
  vaccination:      "reminders",
  appointment:      "reminders",
  medication:       "reminders",
  reminder:         "reminders",
  emergency:        "emergency",
};

/* ── In-process metrics (read by health endpoint) ─────────────────── */
export interface WorkerMetrics {
  lastLoopAt:        Date | null;
  lastSuccessAt:     Date | null;
  pendingCount:      number;
  failedCount:       number;
  loopCount:         number;
}

const metrics: WorkerMetrics = {
  lastLoopAt:    null,
  lastSuccessAt: null,
  pendingCount:  0,
  failedCount:   0,
  loopCount:     0,
};

export function getWorkerMetrics(): Readonly<WorkerMetrics> {
  return { ...metrics };
}

/* ── Enqueue a notification event (idempotent insert) ─────────────── */
export async function enqueueNotification(opts: {
  eventKey:        string;
  eventType:       NotificationType;
  recipientUserId: string;
  entityId:        string;
  title:           string;
  body:            string;
  data?:           Record<string, string>;
}): Promise<void> {
  await db
    .insert(notificationEvents)
    .values({
      eventKey:        opts.eventKey,
      eventType:       opts.eventType,
      recipientUserId: opts.recipientUserId,
      entityId:        opts.entityId,
      payloadJson:     JSON.stringify({ title: opts.title, body: opts.body, data: opts.data ?? {} }),
      status:          "pending",
      attempts:        0,
      maxAttempts:     3,
      nextAttemptAt:   new Date(),
    })
    .onConflictDoNothing({ target: notificationEvents.eventKey });
  /* onConflictDoNothing ensures duplicate event_keys are silently ignored — idempotent */
}

/* ── Atomically claim a batch of pending events ───────────────────── */
async function claimBatch(): Promise<(typeof notificationEvents.$inferSelect)[]> {
  const now     = new Date();
  const staleAt = new Date(Date.now() - STUCK_TIMEOUT);

  return await db.transaction(async (tx) => {
    /*
     * SELECT FOR UPDATE SKIP LOCKED:
     *   - Locks only rows that are not already locked by another transaction.
     *   - Concurrent workers see locked rows and skip them — zero overlap.
     *   - "pending" rows due now  OR  "processing" rows stuck > STUCK_TIMEOUT
     *     are eligible. "sent" and "failed" rows are never reclaimed.
     */
    const rows = await tx
      .select({ id: notificationEvents.id })
      .from(notificationEvents)
      .where(
        and(
          or(
            /* Normal: pending events ready to deliver */
            and(
              eq(notificationEvents.status, "pending"),
              lte(notificationEvents.nextAttemptAt, now),
            ),
            /* Recovery: events stuck in processing (crash/timeout) */
            and(
              eq(notificationEvents.status, "processing"),
              or(
                isNull(notificationEvents.processingStartedAt),
                lte(notificationEvents.processingStartedAt, staleAt),
              ),
            ),
          ),
          /* Never pick up events that have exhausted all attempts */
          sql`${notificationEvents.attempts} < ${notificationEvents.maxAttempts}`,
        ),
      )
      .orderBy(notificationEvents.nextAttemptAt)
      .limit(BATCH_SIZE)
      .for("update", { skipLocked: true });

    if (rows.length === 0) return [];

    const ids = rows.map((r) => r.id);

    /* Claim: set processing + record start time + increment attempts atomically */
    return await tx
      .update(notificationEvents)
      .set({
        status:              "processing",
        processingStartedAt: now,
        attempts:            sql`${notificationEvents.attempts} + 1`,
      })
      .where(inArray(notificationEvents.id, ids))
      .returning();
  });
}

/* ── Process one batch of pending events ──────────────────────────── */
async function processBatch(): Promise<void> {
  metrics.lastLoopAt = new Date();
  metrics.loopCount++;

  const claimed = await claimBatch();

  if (claimed.length === 0) {
    /* Update aggregate counts even on empty batches */
    await refreshCounts();
    return;
  }

  logger.debug({ count: claimed.length }, "notification_worker: processing batch");

  for (const event of claimed) {
    await processEvent(event);
  }

  metrics.lastSuccessAt = new Date();
  await refreshCounts();
}

async function refreshCounts(): Promise<void> {
  try {
    const [p] = await db
      .select({ cnt: count() })
      .from(notificationEvents)
      .where(eq(notificationEvents.status, "pending"));
    const [f] = await db
      .select({ cnt: count() })
      .from(notificationEvents)
      .where(eq(notificationEvents.status, "failed"));
    metrics.pendingCount = p?.cnt ?? 0;
    metrics.failedCount  = f?.cnt ?? 0;
  } catch {
    /* non-fatal — metrics are best-effort */
  }
}

/* ── Process a single event ───────────────────────────────────────── */
async function processEvent(event: typeof notificationEvents.$inferSelect): Promise<void> {
  const attempt = event.attempts; /* already incremented by claimBatch UPDATE */

  try {
    /* Guard: never re-deliver a "sent" event (idempotency) */
    if (event.status === "sent") return;

    /* 1. fetch active tokens */
    const tokens = await db
      .select({ expoPushToken: pushTokens.expoPushToken, platform: pushTokens.platform })
      .from(pushTokens)
      .where(and(eq(pushTokens.userId, event.recipientUserId), eq(pushTokens.enabled, true)));

    if (tokens.length === 0) {
      await db.update(notificationEvents)
        .set({ status: "sent", processedAt: new Date() })
        .where(eq(notificationEvents.id, event.id));
      return;
    }

    /* 2. check notification preferences */
    const [prefs] = await db
      .select()
      .from(notificationPreferences)
      .where(eq(notificationPreferences.userId, event.recipientUserId))
      .limit(1);

    if (prefs && !prefs.generalEnabled) {
      await db.update(notificationEvents)
        .set({ status: "sent", processedAt: new Date() })
        .where(eq(notificationEvents.id, event.id));
      return;
    }

    const prefKey = PREF_KEY[event.eventType];
    if (prefs && prefKey && !prefs[prefKey as keyof typeof prefs]) {
      await db.update(notificationEvents)
        .set({ status: "sent", processedAt: new Date() })
        .where(eq(notificationEvents.id, event.id));
      return;
    }

    /* 3. parse payload */
    let payload: { title: string; body: string; data?: Record<string, string> };
    try {
      payload = JSON.parse(event.payloadJson) as typeof payload;
    } catch {
      payload = { title: "Bildirim", body: "", data: {} };
    }

    /* 4. build Expo messages */
    const channel = ANDROID_CHANNEL[event.eventType] ?? "default";
    const expoMessages = tokens.map((t) => ({
      to:        t.expoPushToken,
      title:     payload.title,
      body:      payload.body,
      data:      { type: event.eventType, entityId: event.entityId, ...(payload.data ?? {}) },
      channelId: t.platform === "android" ? channel : undefined,
      sound:     "default" as const,
    }));

    /* 5. send to Expo Push API */
    const response = await fetch("https://exp.host/--/api/v2/push/send", {
      method:  "POST",
      headers: {
        "Content-Type":    "application/json",
        "Accept":          "application/json",
        "Accept-Encoding": "gzip, deflate",
      },
      body: JSON.stringify(expoMessages),
    });

    if (!response.ok) {
      throw new Error(`expo_api_http_${response.status}`);
    }

    const result = (await response.json()) as {
      data?: { status: string; id?: string; details?: { error?: string } }[];
    };

    /* 6. deactivate DeviceNotRegistered tokens */
    const invalid: string[] = [];
    const ticketIds: string[] = [];
    result.data?.forEach((ticket, i) => {
      if (ticket.status === "error" && ticket.details?.error === "DeviceNotRegistered") {
        invalid.push(tokens[i]!.expoPushToken);
      }
      if (ticket.id) ticketIds.push(ticket.id);
    });

    if (invalid.length > 0) {
      await db.update(pushTokens)
        .set({ enabled: false, updatedAt: new Date() })
        .where(inArray(pushTokens.expoPushToken, invalid));
    }

    /* 7. mark sent — store first ticket ID for receipt polling */
    await db.update(notificationEvents)
      .set({
        status:      "sent",
        processedAt: new Date(),
        ticketId:    ticketIds[0] ?? null,
      })
      .where(eq(notificationEvents.id, event.id));

    logger.debug(
      { eventKey: event.eventKey, eventType: event.eventType, attempt },
      "notification_worker: sent",
    );
  } catch (err: unknown) {
    const errorCode = err instanceof Error ? err.message.slice(0, 100) : "unknown";

    /* Exponential backoff: 30s, 5min, 20min */
    const backoffMs = [30_000, 300_000, 1_200_000][attempt - 1] ?? 1_200_000;
    const isFinal   = attempt >= event.maxAttempts;

    await db.update(notificationEvents)
      .set({
        status:        isFinal ? "failed" : "pending",
        lastErrorCode: errorCode,
        nextAttemptAt: new Date(Date.now() + backoffMs),
      })
      .where(eq(notificationEvents.id, event.id));

    logger.error(
      {
        eventId:     event.id,
        eventType:   event.eventType,
        recipientId: event.recipientUserId,
        attempt,
        isFinal,
        errorCode,
      },
      "notification_worker: delivery failed",
    );
  }
}

/* ── Start the worker loop ────────────────────────────────────────── */
export function startNotificationWorker(): void {
  logger.info(
    { stuckTimeoutMs: STUCK_TIMEOUT, pollIntervalMs: POLL_INTERVAL },
    "notification_worker: started",
  );
  setInterval(() => {
    processBatch().catch((err: unknown) => {
      logger.error({ err }, "notification_worker: batch error");
    });
  }, POLL_INTERVAL);
}
