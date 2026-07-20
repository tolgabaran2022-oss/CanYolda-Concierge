/**
 * reminderScheduler.ts
 *
 * In-process scheduler that polls pet_reminders due within the next 15 minutes
 * and enqueues push notifications via the notification_events outbox.
 *
 * Reminder policy:
 *  - Checks every 5 minutes.
 *  - Sends notification when the reminder is due within the next 15-minute window.
 *  - Idempotent: event_key = `reminder:{reminderId}:{date}:{time}` — same
 *    reminder at the same date+time can never produce a duplicate push.
 *  - Respects isEnabled flag on the reminder.
 *  - Respects user's remindersEnabled notification preference via the outbox worker.
 *  - Does NOT send for reminders whose date+time has already passed by > 30 min.
 *  - Dates/times stored as text (YYYY-MM-DD and HH:mm).
 *
 * Timezone:
 *  - All wall-clock comparisons use IANA "Europe/Istanbul" via Intl.DateTimeFormat.
 *  - UTC offset is NOT hard-coded. The IANA database is queried at runtime so
 *    any future rule changes (e.g. DST re-introduction) are handled automatically.
 *  - DB timestamps are stored as UTC; local time is derived on the fly.
 *
 * Multi-instance safety:
 *  - enqueueNotification uses INSERT ... ON CONFLICT DO NOTHING (idempotent).
 *  - Two schedulers running simultaneously produce at most one notification_event
 *    per reminder per time-slot — the second INSERT is silently ignored.
 *  - Unique-constraint violations are caught per-reminder and never crash the loop.
 *
 * Scale-to-zero caveat:
 *  - setInterval only works while the Express process is alive.
 *  - If the API server scales to zero, reminders will not fire while it is asleep.
 *  - For guaranteed delivery, run as a dedicated always-on process or use an
 *    external cron that hits POST /api/internal/scheduler/run (future work).
 */

import { and, eq } from "drizzle-orm";
import { db } from "@workspace/db";
import { petReminders, petVaccinations, petAppointments, petMedications, petProfiles } from "@workspace/db";
import { enqueueNotification } from "./notificationWorker.js";
import { logger } from "./logger.js";

const POLL_INTERVAL   = 5 * 60 * 1_000;   /* 5 minutes */
const WINDOW_FUTURE   = 15 * 60 * 1_000;  /* notify up to 15 min ahead */
const WINDOW_PAST     = 30 * 60 * 1_000;  /* ignore if > 30 min overdue */

/* ── In-process metrics (read by health endpoint) ─────────────────── */
export interface SchedulerMetrics {
  lastLoopAt:    Date | null;
  lastSuccessAt: Date | null;
  loopCount:     number;
}

const metrics: SchedulerMetrics = {
  lastLoopAt:    null,
  lastSuccessAt: null,
  loopCount:     0,
};

export function getSchedulerMetrics(): Readonly<SchedulerMetrics> {
  return { ...metrics };
}

/* ── IANA-correct local time for Europe/Istanbul ──────────────────── */
function nowIstanbul(): { dateStr: string; timeStr: string; nowMs: number } {
  const now = new Date();
  /* en-CA gives ISO date "YYYY-MM-DD"; en-GB gives "HH:MM" in short time */
  const dateStr = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Istanbul",
    dateStyle: "short",
  }).format(now);
  const timeStr = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Istanbul",
    timeStyle: "short",
  }).format(now).slice(0, 5);
  return { dateStr, timeStr, nowMs: now.getTime() };
}

/**
 * Convert an Istanbul wall-clock datetime (dateStr + hhmm) to a UTC millisecond
 * timestamp using the IANA Europe/Istanbul timezone — no hard-coded UTC offset.
 *
 * Algorithm:
 *  1. Build a "fake-UTC" Date by treating the local time components as UTC.
 *  2. Ask Intl what Istanbul time corresponds to that fake-UTC Date.
 *     (e.g., Istanbul at fake-UTC 12:00 → "15:00" because Istanbul = UTC+3)
 *  3. Compute the IANA offset: istanbulShown - fakeUtc.
 *  4. Return: fakeUtc - offset = correct UTC instant for the local wall-clock.
 *
 * This handles DST changes automatically because Intl uses the live IANA db.
 */
function parseReminderToUtcMs(dateStr: string, timeStr: string): number | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return null;
  const hhmm = timeStr && /^\d{2}:\d{2}$/.test(timeStr) ? timeStr : "09:00";

  /* Step 1: treat local datetime as if it were UTC (intentionally wrong) */
  const fakeUtc = new Date(`${dateStr}T${hhmm}:00.000Z`);

  /* Step 2: ask IANA what Istanbul shows for that UTC instant */
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Istanbul",
    year:     "numeric",
    month:    "2-digit",
    day:      "2-digit",
    hour:     "2-digit",
    minute:   "2-digit",
    hour12:   false,
  })
    .formatToParts(fakeUtc)
    .filter((p) => p.type !== "literal");

  const p = Object.fromEntries(parts.map((x) => [x.type, x.value]));
  /* "hour" from Intl can be "24" for midnight in some locales — normalise */
  const hour = p.hour === "24" ? "00" : p.hour!;
  const istLocalMs = new Date(`${p.year}-${p.month}-${p.day}T${hour}:${p.minute}:00.000Z`).getTime();

  /* Step 3: IANA offset = istanbulShown - fakeUtc (e.g. +3h for Istanbul) */
  /* Step 4: correct UTC = fakeUtc - offset = 2*fakeUtc - istLocalMs */
  return 2 * fakeUtc.getTime() - istLocalMs;
}

/* ── Process pet_reminders ──────────────────────────────────────── */
async function processPetReminders(): Promise<void> {
  const { nowMs } = nowIstanbul();
  const windowEnd = nowMs + WINDOW_FUTURE;

  const reminders = await db
    .select()
    .from(petReminders)
    .where(eq(petReminders.isEnabled, true));

  for (const r of reminders) {
    try {
      const reminderMs = parseReminderToUtcMs(r.date, r.time);
      if (reminderMs === null) continue;
      if (reminderMs < nowMs - WINDOW_PAST) continue;
      if (reminderMs > windowEnd) continue;

      const [pet] = await db
        .select({ name: petProfiles.name })
        .from(petProfiles)
        .where(eq(petProfiles.id, r.petId))
        .limit(1);

      const petName  = pet?.name ?? "Evcil hayvanınız";
      const eventKey = `reminder:${r.id}:${r.date}:${r.time || "default"}`;

      await enqueueNotification({
        eventKey,
        eventType:       "reminder",
        recipientUserId: r.userId,
        entityId:        r.id,
        title:           `📅 Hatırlatıcı — ${petName}`,
        body:            r.title,
      });
    } catch (err) {
      /* per-reminder catch: unique-constraint violation is silent; other errors logged */
      logger.error({ err, reminderId: r.id }, "reminder_scheduler: failed to enqueue pet reminder");
    }
  }
}

/* ── Process pet_vaccinations — next due date ────────────────────── */
async function processPetVaccinations(): Promise<void> {
  const { nowMs } = nowIstanbul();
  const windowEnd = nowMs + WINDOW_FUTURE;

  const vaccinations = await db
    .select()
    .from(petVaccinations)
    .where(eq(petVaccinations.status, "current"));

  for (const v of vaccinations) {
    if (!v.nextDueDate) continue;

    try {
      const dueMs = parseReminderToUtcMs(v.nextDueDate, "09:00");
      if (dueMs === null) continue;
      if (dueMs < nowMs - WINDOW_PAST) continue;
      if (dueMs > windowEnd + 24 * 60 * 60 * 1_000) continue;

      await enqueueNotification({
        eventKey:        `vaccination:${v.id}:${v.nextDueDate}`,
        eventType:       "vaccination",
        recipientUserId: v.userId,
        entityId:        v.id,
        title:           "💉 Aşı Zamanı",
        body:            `${v.vaccineName} aşısı için randevu zamanı geldi.`,
      });
    } catch (err) {
      logger.error({ err, vaccinationId: v.id }, "reminder_scheduler: failed to enqueue vaccination reminder");
    }
  }
}

/* ── Process pet_appointments upcoming ───────────────────────────── */
async function processPetAppointments(): Promise<void> {
  const { nowMs } = nowIstanbul();
  const windowEnd = nowMs + WINDOW_FUTURE;

  const appointments = await db
    .select()
    .from(petAppointments)
    .where(eq(petAppointments.status, "upcoming"));

  for (const a of appointments) {
    try {
      const apptMs = parseReminderToUtcMs(a.appointmentDate, a.appointmentTime);
      if (apptMs === null) continue;
      if (apptMs < nowMs - WINDOW_PAST) continue;
      if (apptMs > windowEnd) continue;

      await enqueueNotification({
        eventKey:        `appointment:${a.id}:${a.appointmentDate}:${a.appointmentTime || "default"}`,
        eventType:       "appointment",
        recipientUserId: a.userId,
        entityId:        a.id,
        title:           "🏥 Randevu Hatırlatıcısı",
        body:            a.title || "Veteriner randevunuz yaklaşıyor.",
      });
    } catch (err) {
      logger.error({ err, appointmentId: a.id }, "reminder_scheduler: failed to enqueue appointment reminder");
    }
  }
}

/* ── Process pet_medications with active schedule ────────────────── */
async function processPetMedications(): Promise<void> {
  const { dateStr, nowMs } = nowIstanbul();
  const windowEnd = nowMs + WINDOW_FUTURE;

  const medications = await db
    .select()
    .from(petMedications)
    .where(and(eq(petMedications.isActive, true), eq(petMedications.reminderEnabled, true)));

  for (const med of medications) {
    if (med.endDate && med.endDate < dateStr) continue;
    if (med.startDate && med.startDate > dateStr) continue;

    let times: string[] = [];
    try {
      times = JSON.parse(med.scheduleTimes) as string[];
    } catch {
      continue;
    }

    for (const t of times) {
      try {
        const medMs = parseReminderToUtcMs(dateStr, t);
        if (medMs === null) continue;
        if (medMs < nowMs - WINDOW_PAST) continue;
        if (medMs > windowEnd) continue;

        await enqueueNotification({
          eventKey:        `medication:${med.id}:${dateStr}:${t}`,
          eventType:       "medication",
          recipientUserId: med.userId,
          entityId:        med.id,
          title:           "💊 İlaç Zamanı",
          body:            `${med.name} için ilaç zamanı.`,
        });
      } catch (err) {
        logger.error({ err, medicationId: med.id }, "reminder_scheduler: failed to enqueue medication reminder");
      }
    }
  }
}

/* ── Main poll function ─────────────────────────────────────────── */
async function pollDueReminders(): Promise<void> {
  metrics.lastLoopAt = new Date();
  metrics.loopCount++;

  try {
    await Promise.allSettled([
      processPetReminders(),
      processPetVaccinations(),
      processPetAppointments(),
      processPetMedications(),
    ]);
    metrics.lastSuccessAt = new Date();
  } catch (err) {
    logger.error({ err }, "reminder_scheduler: poll failed");
  }
}

/* ── Start the scheduler ─────────────────────────────────────────── */
export function startReminderScheduler(): void {
  logger.info(
    { pollIntervalMs: POLL_INTERVAL, windowFutureMs: WINDOW_FUTURE, timezone: "Europe/Istanbul" },
    "reminder_scheduler: started",
  );
  pollDueReminders().catch((err: unknown) =>
    logger.error({ err }, "reminder_scheduler: initial poll failed"),
  );
  setInterval(() => {
    pollDueReminders().catch((err: unknown) =>
      logger.error({ err }, "reminder_scheduler: interval failed"),
    );
  }, POLL_INTERVAL);
}
