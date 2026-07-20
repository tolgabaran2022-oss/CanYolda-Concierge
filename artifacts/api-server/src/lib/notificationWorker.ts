/**
 * notificationWorker.ts
 *
 * In-process worker that polls the notification_events outbox table and
 * delivers pushes via Expo Push API.  Runs as a setInterval loop inside
 * the persistent Express process — NOT a serverless function.
 *
 * Guarantees:
 *  - Idempotent: each event_key is processed at most once to "sent" state.
 *  - Retry with exponential backoff, up to maxAttempts.
 *  - DeviceNotRegistered tokens auto-disabled.
 *  - No secret/token/message content is logged.
 */

import { and, eq, inArray, lte, or, sql } from "drizzle-orm";
import { db, pushTokens, notificationPreferences, notificationEvents } from "@workspace/db";
import { logger } from "./logger.js";

const BATCH_SIZE      = 10;
const POLL_INTERVAL   = 10_000; /* 10 seconds */

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

/* ── Process one batch of pending events ──────────────────────────── */
async function processBatch(): Promise<void> {
  const now       = new Date();
  const staleAt   = new Date(Date.now() - 60_000); /* crash-recovery: reclaim stale "processing" */

  /* Step 1: SELECT IDs to process (safe for single-process server) */
  const rows = await db
    .select({ id: notificationEvents.id })
    .from(notificationEvents)
    .where(
      and(
        or(
          eq(notificationEvents.status, "pending"),
          and(
            eq(notificationEvents.status, "processing"),
            lte(notificationEvents.nextAttemptAt, staleAt),
          ),
        ),
        lte(notificationEvents.nextAttemptAt, now),
        sql`${notificationEvents.attempts} < ${notificationEvents.maxAttempts}`,
      ),
    )
    .limit(BATCH_SIZE);

  if (rows.length === 0) return;

  const ids = rows.map((r) => r.id);

  /* Step 2: Claim them as "processing" */
  const pending = await db
    .update(notificationEvents)
    .set({ status: "processing" })
    .where(and(
      inArray(notificationEvents.id, ids),
      or(eq(notificationEvents.status, "pending"), eq(notificationEvents.status, "processing")),
    ))
    .returning();

  if (pending.length === 0) return;

  logger.debug({ count: pending.length }, "notification_worker: processing batch");

  for (const event of pending) {
    await processEvent(event);
  }
}

/* ── Process a single event ───────────────────────────────────────── */
async function processEvent(event: typeof notificationEvents.$inferSelect): Promise<void> {
  const attempt = event.attempts + 1;

  try {
    /* 1. fetch active tokens */
    const tokens = await db
      .select({ expoPushToken: pushTokens.expoPushToken, platform: pushTokens.platform })
      .from(pushTokens)
      .where(and(eq(pushTokens.userId, event.recipientUserId), eq(pushTokens.enabled, true)));

    if (tokens.length === 0) {
      /* No active tokens — mark sent (nothing to send) */
      await db.update(notificationEvents)
        .set({ status: "sent", attempts: attempt, processedAt: new Date() })
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
        .set({ status: "sent", attempts: attempt, processedAt: new Date() })
        .where(eq(notificationEvents.id, event.id));
      return;
    }

    const prefKey = PREF_KEY[event.eventType];
    if (prefs && prefKey && !prefs[prefKey as keyof typeof prefs]) {
      await db.update(notificationEvents)
        .set({ status: "sent", attempts: attempt, processedAt: new Date() })
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
    result.data?.forEach((ticket, i) => {
      if (ticket.status === "error" && ticket.details?.error === "DeviceNotRegistered") {
        invalid.push(tokens[i]!.expoPushToken);
      }
    });

    if (invalid.length > 0) {
      await db.update(pushTokens)
        .set({ enabled: false, updatedAt: new Date() })
        .where(inArray(pushTokens.expoPushToken, invalid));
    }

    /* 7. mark sent */
    await db.update(notificationEvents)
      .set({ status: "sent", attempts: attempt, processedAt: new Date() })
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
        attempts:      attempt,
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
  logger.info("notification_worker: started");
  setInterval(() => {
    processBatch().catch((err: unknown) => {
      logger.error({ err }, "notification_worker: batch error");
    });
  }, POLL_INTERVAL);
}
