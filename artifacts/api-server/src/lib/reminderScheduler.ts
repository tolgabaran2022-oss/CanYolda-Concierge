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
 *  - Dates/times stored as text (YYYY-MM-DD and HH:mm); all comparisons in UTC+3
 *    (Turkey time, IANA: Europe/Istanbul).
 *
 * Scheduler safety:
 *  - Runs inside the persistent Express process — no HTTP endpoint exposed.
 *  - No external request needed; idempotent inserts handle concurrent startup.
 */

import { and, eq, sql } from "drizzle-orm";
import { db } from "@workspace/db";
import { petReminders, petVaccinations, petAppointments, petMedications, petProfiles } from "@workspace/db";
import { enqueueNotification } from "./notificationWorker.js";
import { logger } from "./logger.js";

const POLL_INTERVAL   = 5 * 60 * 1_000;   /* 5 minutes */
const WINDOW_FUTURE   = 15 * 60 * 1_000;  /* notify up to 15 min ahead */
const WINDOW_PAST     = 30 * 60 * 1_000;  /* ignore if > 30 min overdue */

/* Turkey is UTC+3 (Europe/Istanbul). Compute local date/time strings. */
function nowTurkey(): { dateStr: string; timeStr: string; nowMs: number } {
  const now   = new Date();
  const tz    = Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Istanbul", dateStyle: "short" }).format(now);
  const tzT   = Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Istanbul", timeStyle: "short" }).format(now);
  return { dateStr: tz, timeStr: tzT.slice(0, 5), nowMs: now.getTime() };
}

/* Parse "YYYY-MM-DD" and optional "HH:mm" into a UTC millisecond timestamp */
function parseReminderMs(dateStr: string, timeStr: string): number | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return null;
  const [y, m, d] = dateStr.split("-").map(Number) as [number, number, number];
  const hhmm = timeStr && /^\d{2}:\d{2}$/.test(timeStr) ? timeStr : "09:00";
  const [hh, mm] = hhmm.split(":").map(Number) as [number, number];

  /* Construct the timestamp as Istanbul local time → UTC.
     Turkey is UTC+3 (no DST); offset is fixed. */
  return Date.UTC(y!, m! - 1, d!, hh! - 3, mm!);
}

/* ── Process pet_reminders ──────────────────────────────────────── */
async function processPetReminders(): Promise<void> {
  const { nowMs } = nowTurkey();
  const windowStart = nowMs;
  const windowEnd   = nowMs + WINDOW_FUTURE;

  const reminders = await db
    .select()
    .from(petReminders)
    .where(eq(petReminders.isEnabled, true));

  for (const r of reminders) {
    try {
      const reminderMs = parseReminderMs(r.date, r.time);
      if (reminderMs === null) continue;

      /* Only notify if within window */
      if (reminderMs < windowStart - WINDOW_PAST) continue;
      if (reminderMs > windowEnd) continue;

      /* Fetch pet name for a friendly notification */
      const [pet] = await db
        .select({ name: petProfiles.name })
        .from(petProfiles)
        .where(eq(petProfiles.id, r.petId))
        .limit(1);

      const petName = pet?.name ?? "Evcil hayvanınız";

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
      logger.error({ err, reminderId: r.id }, "reminder_scheduler: failed to enqueue pet reminder");
    }
  }
}

/* ── Process pet_vaccinations — next due date ────────────────────── */
async function processPetVaccinations(): Promise<void> {
  const { nowMs } = nowTurkey();
  const windowEnd = nowMs + WINDOW_FUTURE;

  const vaccinations = await db
    .select()
    .from(petVaccinations)
    .where(eq(petVaccinations.status, "current"));

  for (const v of vaccinations) {
    if (!v.nextDueDate) continue;

    try {
      const dueMs = parseReminderMs(v.nextDueDate, "09:00");
      if (dueMs === null) continue;
      if (dueMs < nowMs - WINDOW_PAST) continue;
      if (dueMs > windowEnd + 24 * 60 * 60 * 1_000) continue; /* only 1 day lookahead for vaccines */

      const eventKey = `vaccination:${v.id}:${v.nextDueDate}`;

      await enqueueNotification({
        eventKey,
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
  const { nowMs } = nowTurkey();
  const windowEnd = nowMs + WINDOW_FUTURE;

  const appointments = await db
    .select()
    .from(petAppointments)
    .where(eq(petAppointments.status, "upcoming"));

  for (const a of appointments) {
    try {
      const apptMs = parseReminderMs(a.appointmentDate, a.appointmentTime);
      if (apptMs === null) continue;
      if (apptMs < nowMs - WINDOW_PAST) continue;
      if (apptMs > windowEnd) continue;

      const eventKey = `appointment:${a.id}:${a.appointmentDate}:${a.appointmentTime || "default"}`;

      await enqueueNotification({
        eventKey,
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
  const { dateStr, nowMs } = nowTurkey();
  const windowEnd = nowMs + WINDOW_FUTURE;

  const medications = await db
    .select()
    .from(petMedications)
    .where(and(eq(petMedications.isActive, true), eq(petMedications.reminderEnabled, true)));

  for (const med of medications) {
    /* Only active within start/end date range */
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
        const medMs = parseReminderMs(dateStr, t);
        if (medMs === null) continue;
        if (medMs < nowMs - WINDOW_PAST) continue;
        if (medMs > windowEnd) continue;

        const eventKey = `medication:${med.id}:${dateStr}:${t}`;

        await enqueueNotification({
          eventKey,
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
  try {
    await Promise.allSettled([
      processPetReminders(),
      processPetVaccinations(),
      processPetAppointments(),
      processPetMedications(),
    ]);
  } catch (err) {
    logger.error({ err }, "reminder_scheduler: poll failed");
  }
}

/* ── Start the scheduler ─────────────────────────────────────────── */
export function startReminderScheduler(): void {
  logger.info("reminder_scheduler: started (interval=5min, window=15min, timezone=Europe/Istanbul)");
  /* Run once immediately on startup to catch any missed reminders */
  pollDueReminders().catch((err: unknown) => logger.error({ err }, "reminder_scheduler: initial poll failed"));
  setInterval(() => {
    pollDueReminders().catch((err: unknown) => logger.error({ err }, "reminder_scheduler: interval failed"));
  }, POLL_INTERVAL);
}
