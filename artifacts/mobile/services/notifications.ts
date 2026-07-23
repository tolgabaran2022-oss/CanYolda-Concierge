/**
 * notifications.ts — native (iOS + Android)
 *
 * Uses lazy require() instead of static import for expo-notifications and
 * expo-device so that Expo Go on Android (SDK 53+) does not crash the app at
 * module initialisation time. The static import throws before any code runs;
 * a try-catch around require() lets the rest of the app continue normally and
 * degrades push-notification support to a no-op in unsupported environments.
 *
 * The .web.ts sibling is resolved by Metro for the web platform, so this file
 * is never loaded on web.
 */

import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";

/* ── Type aliases (import types are erased at runtime — safe) ─────────── */
type NotificationsModule = typeof import("expo-notifications");
type DeviceModule        = typeof import("expo-device");

/* ── Lazy module references ───────────────────────────────────────────── */
let _N: NotificationsModule | null = null; // expo-notifications
let _D: DeviceModule        | null = null; // expo-device

/** Attempt to load native modules once. Returns true if successful. */
function loadNative(): boolean {
  if (_N && _D) return true;
  if (Platform.OS === "web") return false;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    _N = require("expo-notifications") as NotificationsModule;
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    _D = require("expo-device") as DeviceModule;
    return true;
  } catch {
    // Expo Go Android SDK 53+: module throws on initialisation — degrade gracefully.
    _N = null;
    _D = null;
    return false;
  }
}

/* ── Notification handler (foreground display) ────────────────────────── */
// Initialise as early as possible, but inside a try-catch so Expo Go Android
// does not crash the entire module (and therefore AuthContext + login screen).
try {
  if (Platform.OS !== "web") {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const N = require("expo-notifications") as NotificationsModule;
    _N = N;
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    _D = require("expo-device") as DeviceModule;
    N.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert:  true,
        shouldPlaySound:  true,
        shouldSetBadge:   true,
        shouldShowBanner: true,
        shouldShowList:   true,
      }),
    });
  }
} catch {
  // Expo Go Android or other unsupported environment — push notifications
  // will be silently unavailable; auth and all other features work normally.
}

const API_BASE = process.env.EXPO_PUBLIC_DOMAIN
  ? `https://${process.env.EXPO_PUBLIC_DOMAIN}/api`
  : "http://localhost:8080/api";

const PUSH_TOKEN_KEY = "@canyoldasi:pushToken";

/* ── Android notification channels ───────────────────────────────────── */
export async function setupAndroidChannels(): Promise<void> {
  if (!loadNative() || !_N || Platform.OS !== "android") return;
  const N = _N;

  await N.setNotificationChannelAsync("default", {
    name:             "Genel Bildirimler",
    importance:       N.AndroidImportance.DEFAULT,
    vibrationPattern: [0, 250, 250, 250],
    lightColor:       "#7C45D9",
  });
  await N.setNotificationChannelAsync("messages", {
    name:             "Mesajlar",
    description:      "Yeni mesaj bildirimleri",
    importance:       N.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 250, 250],
    lightColor:       "#7C45D9",
  });
  await N.setNotificationChannelAsync("adoption", {
    name:        "Sahiplendirme",
    description: "Sahiplendirme talebi bildirimleri",
    importance:  N.AndroidImportance.HIGH,
    lightColor:  "#7C45D9",
  });
  await N.setNotificationChannelAsync("reminders", {
    name:        "Hatırlatıcılar",
    description: "Aşı, randevu ve ilaç hatırlatıcıları",
    importance:  N.AndroidImportance.DEFAULT,
    lightColor:  "#7C45D9",
  });
  await N.setNotificationChannelAsync("emergency", {
    name:             "Acil Durum",
    description:      "Acil sokak hayvanı bildirimleri",
    importance:       N.AndroidImportance.MAX,
    lightColor:       "#D94040",
    vibrationPattern: [0, 500, 250, 500],
  });
}

type _PermResult = { granted?: boolean; canAskAgain?: boolean; status?: string };

/* ── Request permission ───────────────────────────────────────────────── */
export async function requestNotificationPermission(): Promise<boolean> {
  if (!loadNative() || !_N || !_D) return false;
  if (Platform.OS === "web") return false;
  if (!_D.isDevice) return false;

  const existing = (await _N.getPermissionsAsync()) as _PermResult;
  const isGranted = existing.granted === true || existing.status === "granted";
  if (isGranted) return true;
  if (existing.canAskAgain === false) return false;

  const result = (await _N.requestPermissionsAsync()) as _PermResult;
  return result.granted === true || result.status === "granted";
}

/* ── Get or register Expo push token ─────────────────────────────────── */
export async function getExpoPushToken(): Promise<string | null> {
  if (!loadNative() || !_N || !_D) return null;
  if (Platform.OS === "web") return null;
  if (!_D.isDevice) return null;

  try {
    const projectId: string =
      (Constants.expoConfig?.extra?.eas?.projectId as string | undefined) ??
      (Constants.easConfig?.projectId as string | undefined) ??
      "";
    const tokenData = await _N.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined
    );
    return tokenData.data;
  } catch {
    return null;
  }
}

/* ── Register push token with backend ────────────────────────────────── */
export async function registerPushTokenWithBackend(
  token: string,
  authToken: string
): Promise<void> {
  try {
    const platform   = Platform.OS === "ios" ? "ios" : "android";
    const appVersion = Constants.expoConfig?.version ?? "1.0.0";

    const cached = await AsyncStorage.getItem(PUSH_TOKEN_KEY);
    if (cached === token) return;

    const res = await fetch(`${API_BASE}/push-tokens`, {
      method:  "POST",
      headers: {
        "Content-Type":  "application/json",
        "Authorization": `Bearer ${authToken}`,
      },
      body: JSON.stringify({ token, platform, appVersion }),
    });

    if (res.ok) {
      await AsyncStorage.setItem(PUSH_TOKEN_KEY, token);
    }
  } catch {
    /* non-fatal */
  }
}

/* ── Deregister push token on logout ─────────────────────────────────── */
export async function deregisterPushToken(authToken: string): Promise<void> {
  try {
    const token = await AsyncStorage.getItem(PUSH_TOKEN_KEY);
    if (!token) return;

    await fetch(`${API_BASE}/push-tokens`, {
      method:  "DELETE",
      headers: {
        "Content-Type":  "application/json",
        "Authorization": `Bearer ${authToken}`,
      },
      body: JSON.stringify({ token }),
    });

    await AsyncStorage.removeItem(PUSH_TOKEN_KEY);
  } catch {
    /* non-fatal */
  }
}

/**
 * syncExistingPushToken — called silently on login/register.
 * Only syncs if system permission is already granted.
 * Never opens a permission dialog.
 */
export async function syncExistingPushToken(authToken: string): Promise<void> {
  if (!loadNative() || !_N || !_D) return;
  if (Platform.OS === "web") return;
  if (!_D.isDevice) return;

  try {
    const perm          = (await _N.getPermissionsAsync()) as _PermResult;
    const alreadyGranted = perm.granted === true || perm.status === "granted";
    if (!alreadyGranted) return;

    await setupAndroidChannels();

    const token = await getExpoPushToken();
    if (!token) return;

    await registerPushTokenWithBackend(token, authToken);
  } catch {
    /* non-fatal */
  }
}

/**
 * requestAndRegisterPushToken — call ONLY after explicit user action.
 * This is the function that may open the OS permission dialog.
 */
export async function requestAndRegisterPushToken(
  authToken: string
): Promise<boolean> {
  if (!loadNative() || !_N || !_D) return false;
  if (Platform.OS === "web") return false;
  if (!_D.isDevice) return false;

  await setupAndroidChannels();

  const granted = await requestNotificationPermission();
  if (!granted) return false;

  const token = await getExpoPushToken();
  if (!token) return false;

  await registerPushTokenWithBackend(token, authToken);
  return true;
}

/* ── Notification deep-link payload type ─────────────────────────────── */
export type NotificationPayload = {
  type:
    | "message"
    | "adoption_request"
    | "vaccination"
    | "appointment"
    | "medication"
    | "emergency";
  entityId: string;
};

const ALLOWED_ROUTES: Record<
  NotificationPayload["type"],
  (entityId: string) => string
> = {
  message:          (id) => `/messages/${id}`,
  adoption_request: (id) => `/adoption/${id}`,
  vaccination:      (id) => `/evcilim/${id}/vaccinations`,
  appointment:      (id) => `/evcilim/${id}/appointments`,
  medication:       (id) => `/evcilim/${id}/medications`,
  emergency:        (id) => `/animal/${id}`,
};

export function resolveNotificationRoute(
  payload: NotificationPayload
): string | null {
  const builder = ALLOWED_ROUTES[payload.type];
  return builder ? builder(payload.entityId) : null;
}
