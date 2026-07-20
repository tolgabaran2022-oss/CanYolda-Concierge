import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";

const API_BASE = process.env.EXPO_PUBLIC_DOMAIN
  ? `https://${process.env.EXPO_PUBLIC_DOMAIN}/api`
  : "http://localhost:8080/api";

const PUSH_TOKEN_KEY = "@canyoldasi:pushToken";

/* ── Notification handler (foreground display) ─────────── */
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge:  true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

/* ── Android notification channels ─────────────────────── */
export async function setupAndroidChannels(): Promise<void> {
  if (Platform.OS !== "android") return;

  await Notifications.setNotificationChannelAsync("default", {
    name:          "Genel Bildirimler",
    importance:    Notifications.AndroidImportance.DEFAULT,
    vibrationPattern: [0, 250, 250, 250],
    lightColor:    "#7C45D9",
  });

  await Notifications.setNotificationChannelAsync("messages", {
    name:          "Mesajlar",
    description:   "Yeni mesaj bildirimleri",
    importance:    Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 250, 250],
    lightColor:    "#7C45D9",
  });

  await Notifications.setNotificationChannelAsync("adoption", {
    name:          "Sahiplendirme",
    description:   "Sahiplendirme talebi bildirimleri",
    importance:    Notifications.AndroidImportance.HIGH,
    lightColor:    "#7C45D9",
  });

  await Notifications.setNotificationChannelAsync("reminders", {
    name:          "Hatırlatıcılar",
    description:   "Aşı, randevu ve ilaç hatırlatıcıları",
    importance:    Notifications.AndroidImportance.DEFAULT,
    lightColor:    "#7C45D9",
  });

  await Notifications.setNotificationChannelAsync("emergency", {
    name:          "Acil Durum",
    description:   "Acil sokak hayvanı bildirimleri",
    importance:    Notifications.AndroidImportance.MAX,
    lightColor:    "#D94040",
    vibrationPattern: [0, 500, 250, 500],
  });
}

type _PermResult = { granted?: boolean; canAskAgain?: boolean; status?: string };

/* ── Request permission (with pre-permission rationale) ─── */
export async function requestNotificationPermission(): Promise<boolean> {
  if (Platform.OS === "web") return false;
  if (!Device.isDevice) return false;

  const existing = (await Notifications.getPermissionsAsync()) as _PermResult;
  const isGranted = existing.granted === true || existing.status === "granted";
  if (isGranted) return true;

  /* canAskAgain: false means permanently denied — bail early */
  if (existing.canAskAgain === false) return false;

  const result = (await Notifications.requestPermissionsAsync()) as _PermResult;
  return result.granted === true || result.status === "granted";
}

/* ── Get or register Expo push token ────────────────────── */
export async function getExpoPushToken(): Promise<string | null> {
  if (Platform.OS === "web") return null;
  if (!Device.isDevice)       return null;

  try {
    const projectId: string =
      (Constants.expoConfig?.extra?.eas?.projectId as string | undefined) ??
      (Constants.easConfig?.projectId as string | undefined) ??
      "";

    const tokenData = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined
    );
    return tokenData.data;
  } catch {
    return null;
  }
}

/* ── Register push token with backend ───────────────────── */
export async function registerPushTokenWithBackend(
  token: string,
  authToken: string
): Promise<void> {
  try {
    const platform = Platform.OS === "ios" ? "ios" : "android";
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
    /* non-fatal: push token registration failure should not block auth */
  }
}

/* ── Deregister push token on logout ────────────────────── */
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

/* ── Full registration flow (call after login) ───────────── */
export async function registerForPushNotifications(authToken: string): Promise<void> {
  if (Platform.OS === "web") return;
  if (!Device.isDevice)       return;

  await setupAndroidChannels();

  const granted = await requestNotificationPermission();
  if (!granted) return;

  const token = await getExpoPushToken();
  if (!token) return;

  await registerPushTokenWithBackend(token, authToken);
}

/* ── Notification deep-link payload type ────────────────── */
export type NotificationPayload = {
  type:     "message" | "adoption_request" | "vaccination" | "appointment" | "medication" | "emergency";
  entityId: string;
};

const ALLOWED_ROUTES: Record<NotificationPayload["type"], (entityId: string) => string> = {
  message:          (id) => `/messages/${id}`,
  adoption_request: (id) => `/adoption/${id}`,
  vaccination:      (id) => `/evcilim/${id}/vaccinations`,
  appointment:      (id) => `/evcilim/${id}/appointments`,
  medication:       (id) => `/evcilim/${id}/medications`,
  emergency:        (id) => `/animal/${id}`,
};

export function resolveNotificationRoute(payload: NotificationPayload): string | null {
  const builder = ALLOWED_ROUTES[payload.type];
  if (!builder) return null;
  return builder(payload.entityId);
}
