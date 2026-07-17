import AsyncStorage from "@react-native-async-storage/async-storage";

const TOKEN_KEY = "@canyoldasi:jwt";

export const API_BASE = process.env.EXPO_PUBLIC_DOMAIN
  ? `https://${process.env.EXPO_PUBLIC_DOMAIN}/api`
  : "http://localhost:8080/api";

/**
 * Shared authenticated fetch for all API lib modules.
 *
 * Reads the JWT from AsyncStorage and injects `Authorization: Bearer <token>`
 * into every request. x-user-id is never sent.
 *
 * Callers may still pass additional headers in opts.headers — they are
 * merged BEFORE the Authorization header so they cannot override it.
 */
export async function apiFetch(path: string, opts: RequestInit = {}): Promise<Response> {
  const token = await AsyncStorage.getItem(TOKEN_KEY);
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(opts.headers as Record<string, string> ?? {}),
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  return fetch(`${API_BASE}${path}`, { ...opts, headers });
}
