import { and, eq, inArray } from "drizzle-orm";
import { db, pushTokens, notificationPreferences } from "@workspace/db";

type NotificationType =
  | "message"
  | "adoption_request"
  | "adoption_status"
  | "vaccination"
  | "appointment"
  | "medication"
  | "emergency";

export interface PushPayload {
  type:    NotificationType;
  entityId: string;
  title:   string;
  body:    string;
  data?:   Record<string, string>;
}

/* ── preference key for each notification type ───────────── */
const PREF_KEY: Record<NotificationType, keyof typeof notificationPreferences.$inferSelect | null> = {
  message:          "messagesEnabled",
  adoption_request: "adoptionEnabled",
  adoption_status:  "adoptionEnabled",
  vaccination:      "remindersEnabled",
  appointment:      "remindersEnabled",
  medication:       "remindersEnabled",
  emergency:        "emergencyEnabled",
};

const ANDROID_CHANNEL: Record<NotificationType, string> = {
  message:          "messages",
  adoption_request: "adoption",
  adoption_status:  "adoption",
  vaccination:      "reminders",
  appointment:      "reminders",
  medication:       "reminders",
  emergency:        "emergency",
};

/* ── main send function ───────────────────────────────────── */
export async function sendPushNotification(
  toUserId: string,
  payload:  PushPayload,
): Promise<void> {
  /* 1. fetch active tokens for the user */
  const tokens = await db
    .select({ expoPushToken: pushTokens.expoPushToken, platform: pushTokens.platform })
    .from(pushTokens)
    .where(and(eq(pushTokens.userId, toUserId), eq(pushTokens.enabled, true)));

  if (tokens.length === 0) return;

  /* 2. check notification preferences */
  const [prefs] = await db
    .select()
    .from(notificationPreferences)
    .where(eq(notificationPreferences.userId, toUserId))
    .limit(1);

  if (prefs) {
    /* check general first */
    if (!prefs.generalEnabled) return;

    /* check specific type preference */
    const prefKey = PREF_KEY[payload.type];
    if (prefKey && !prefs[prefKey as keyof typeof prefs]) return;
  }

  /* 3. build Expo push messages */
  const messages = tokens.map((t) => ({
    to:    t.expoPushToken,
    title: payload.title,
    body:  payload.body,
    data:  { type: payload.type, entityId: payload.entityId, ...(payload.data ?? {}) },
    channelId: t.platform === "android" ? ANDROID_CHANNEL[payload.type] : undefined,
    sound: "default" as const,
  }));

  /* 4. send to Expo Push API */
  try {
    const response = await fetch("https://exp.host/--/api/v2/push/send", {
      method:  "POST",
      headers: { "Content-Type": "application/json", "Accept": "application/json", "Accept-Encoding": "gzip, deflate" },
      body:    JSON.stringify(messages),
    });

    if (!response.ok) return;

    const result = (await response.json()) as {
      data?: { status: string; message?: string; details?: { error?: string } }[];
    };

    /* 5. deactivate invalid tokens */
    const invalidTokens: string[] = [];
    result.data?.forEach((ticket, i) => {
      if (ticket.status === "error" && ticket.details?.error === "DeviceNotRegistered") {
        invalidTokens.push(tokens[i]!.expoPushToken);
      }
    });

    if (invalidTokens.length > 0) {
      await db
        .update(pushTokens)
        .set({ enabled: false, updatedAt: new Date() })
        .where(inArray(pushTokens.expoPushToken, invalidTokens));
    }
  } catch {
    /* non-fatal: push delivery failure should not break API responses */
  }
}
