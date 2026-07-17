const API_BASE = process.env.EXPO_PUBLIC_DOMAIN
  ? `https://${process.env.EXPO_PUBLIC_DOMAIN}/api`
  : "http://localhost:8080/api";

function hdrs(userId?: string): Record<string, string> {
  const h: Record<string, string> = { "Content-Type": "application/json" };
  if (userId) h["x-user-id"] = userId;
  return h;
}

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

export async function apiSyncProfile(profile: {
  id: string; email: string; name?: string; username?: string;
  bio?: string; location?: string; avatarUrl?: string;
}): Promise<void> {
  await fetch(`${API_BASE}/users/sync`, {
    method: "POST",
    headers: hdrs(),
    body: JSON.stringify(profile),
  });
}

export async function apiUpdateProfile(
  userId: string,
  updates: { name?: string; username?: string; bio?: string; location?: string; avatarUrl?: string }
): Promise<FullProfile> {
  const res = await fetch(`${API_BASE}/users/${encodeURIComponent(userId)}`, {
    method: "PATCH",
    headers: hdrs(userId),
    body: JSON.stringify(updates),
  });
  if (res.status === 409) {
    const body = await res.json() as { error: string };
    throw new Error(body.error ?? "Kullanıcı adı alınmış.");
  }
  if (!res.ok) throw new Error("Profile update failed");
  return res.json() as Promise<FullProfile>;
}

export async function apiGetFullProfile(userId: string): Promise<FullProfile | null> {
  const res = await fetch(`${API_BASE}/users/${encodeURIComponent(userId)}`);
  if (!res.ok) return null;
  return res.json() as Promise<FullProfile>;
}

/* ── User search ───────────────────────────────────────── */
export async function apiSearchUsers(query: string): Promise<SocialUser[]> {
  const res = await fetch(`${API_BASE}/social/users?q=${encodeURIComponent(query)}`);
  if (!res.ok) throw new Error("search users failed");
  const data = await res.json();
  return Array.isArray(data) ? (data as SocialUser[]) : [];
}

export async function apiGetUser(userId: string): Promise<SocialUser | null> {
  const res = await fetch(`${API_BASE}/social/users/${encodeURIComponent(userId)}`);
  if (!res.ok) return null;
  return res.json() as Promise<SocialUser>;
}

/* ── Notifications ─────────────────────────────────────── */
export async function apiFetchNotifications(userId: string): Promise<AppNotification[]> {
  const res = await fetch(`${API_BASE}/notifications`, { headers: hdrs(userId) });
  if (!res.ok) throw new Error("fetch notifications failed");
  const data = await res.json();
  return Array.isArray(data) ? (data as AppNotification[]) : [];
}

export async function apiMarkNotificationRead(id: string, userId: string): Promise<void> {
  await fetch(`${API_BASE}/notifications/${id}/read`, {
    method: "POST",
    headers: hdrs(userId),
  });
}

export async function apiMarkAllNotificationsRead(userId: string): Promise<void> {
  await fetch(`${API_BASE}/notifications/read-all`, {
    method: "POST",
    headers: hdrs(userId),
  });
}
