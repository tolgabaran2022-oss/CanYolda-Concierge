/**
 * Web stub — expo-notifications is not supported on web.
 * All exports match the native notifications.ts signature; all are no-ops.
 * Metro resolves .web.ts before .ts for the web platform.
 */

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

export async function setupAndroidChannels(): Promise<void> {}

export async function requestNotificationPermission(): Promise<boolean> {
  return false;
}

export async function getExpoPushToken(): Promise<string | null> {
  return null;
}

export async function registerPushTokenWithBackend(
  _token: string,
  _authToken: string
): Promise<void> {}

export async function deregisterPushToken(_authToken: string): Promise<void> {}

export async function syncExistingPushToken(_authToken: string): Promise<void> {}

export async function requestAndRegisterPushToken(
  _authToken: string
): Promise<boolean> {
  return false;
}

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
