import { apiFetch, API_BASE } from "./apiClient.js";

export type SocialUser = {
  userId:    string;
  username:  string;
  avatarUrl: string;
  postCount: number;
};

export type AppNotification = {
  id:           string;
  senderId:     string;
  senderName:   string;
  senderAvatar: string;
  type:         string;
  postId?:      string;
  postImage?:   string;
  message:      string;
  read:         boolean;
  createdAt:    string;
};

/* ── Profile sync ──────────────────────────────────────── */
export type FullProfile = {
  id:              string;
  email:           string;
  name:            string;
  username:        string | null;
  bio:             string;
  location:        string;
  avatarUrl:       string;
  followersCount:  number;
  followingCount:  number;
  postsCount:      number;
  isProfilePublic: boolean;
};

/** Sync local profile to the server (called after login — JWT may be freshly issued) */
export async function apiSyncProfile(profile: {
  id: string; email: string; name?: string; username?: string;
  bio?: string; location?: string; avatarUrl?: string;
}): Promise<void> {
  await apiFetch(`/users/sync`, {
    method: "POST",
    body: JSON.stringify(profile),
  });
}

/** Authenticated — update the current user's own profile */
export async function apiUpdateProfile(
  userId: string,
  updates: { name?: string; username?: string; bio?: string; location?: string; avatarUrl?: string }
): Promise<FullProfile> {
  const res = await apiFetch(`/users/${encodeURIComponent(userId)}`, {
    method: "PATCH",
    body: JSON.stringify(updates),
  });
  if (res.status === 409) {
    const body = await res.json() as { error: string };
    throw new Error(body.error ?? "Kullanıcı adı alınmış.");
  }
  if (!res.ok) throw new Error("Profile update failed");
  return res.json() as Promise<FullProfile>;
}

/** Public — fetch any user's profile */
export async function apiGetFullProfile(userId: string): Promise<FullProfile | null> {
  const res = await fetch(`${API_BASE}/users/${encodeURIComponent(userId)}`);
  if (!res.ok) return null;
  return res.json() as Promise<FullProfile>;
}

/* ── User search ───────────────────────────────────────── */

/** Public — search users by name/username */
export async function apiSearchUsers(query: string): Promise<SocialUser[]> {
  const res = await fetch(`${API_BASE}/social/users?q=${encodeURIComponent(query)}`);
  if (!res.ok) throw new Error("search users failed");
  const data = await res.json();
  return Array.isArray(data) ? (data as SocialUser[]) : [];
}

/** Public — get a single user's public social profile */
export async function apiGetUser(userId: string): Promise<SocialUser | null> {
  const res = await fetch(`${API_BASE}/social/users/${encodeURIComponent(userId)}`);
  if (!res.ok) return null;
  return res.json() as Promise<SocialUser>;
}

/* ── Notifications ─────────────────────────────────────── */

/** Authenticated — fetch the current user's notifications */
export async function apiFetchNotifications(): Promise<AppNotification[]> {
  const res = await apiFetch("/notifications");
  if (!res.ok) throw new Error("fetch notifications failed");
  const data = await res.json();
  return Array.isArray(data) ? (data as AppNotification[]) : [];
}

/** Authenticated — mark a single notification as read */
export async function apiMarkNotificationRead(id: string): Promise<void> {
  await apiFetch(`/notifications/${id}/read`, { method: "POST" });
}

/** Authenticated — mark all notifications as read */
export async function apiMarkAllNotificationsRead(): Promise<void> {
  await apiFetch("/notifications/read-all", { method: "POST" });
}
