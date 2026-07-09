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

export type FollowCounts = {
  followers: number;
  following: number;
};

export type AppNotification = {
  id:           string;
  senderId:     string;
  senderName:   string;
  senderAvatar: string;
  type:         "follow" | "like" | "comment" | "story_view";
  postId?:      string;
  postImage?:   string;
  message:      string;
  read:         boolean;
  createdAt:    string;
};

/* ── Follow / unfollow ─────────────────────────────────── */
export async function apiToggleFollow(
  currentUserId: string,
  targetId: string
): Promise<{ following: boolean }> {
  const res = await fetch(`${API_BASE}/social/follow/${encodeURIComponent(targetId)}`, {
    method: "POST",
    headers: hdrs(currentUserId),
  });
  if (!res.ok) throw new Error("toggle follow failed");
  return res.json() as Promise<{ following: boolean }>;
}

export async function apiCheckFollowing(
  followerId: string,
  targetId: string
): Promise<{ following: boolean }> {
  const res = await fetch(
    `${API_BASE}/social/follow/check?followerId=${encodeURIComponent(followerId)}&targetId=${encodeURIComponent(targetId)}`,
    { headers: hdrs(followerId) }
  );
  if (!res.ok) throw new Error("check follow failed");
  return res.json() as Promise<{ following: boolean }>;
}

export async function apiGetFollowCounts(userId: string): Promise<FollowCounts> {
  const res = await fetch(`${API_BASE}/social/follow/counts?userId=${encodeURIComponent(userId)}`);
  if (!res.ok) throw new Error("get follow counts failed");
  return res.json() as Promise<FollowCounts>;
}

/* ── User search ───────────────────────────────────────── */
export async function apiSearchUsers(query: string): Promise<SocialUser[]> {
  const res = await fetch(`${API_BASE}/social/users?q=${encodeURIComponent(query)}`);
  if (!res.ok) throw new Error("search users failed");
  return res.json() as Promise<SocialUser[]>;
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
  return res.json() as Promise<AppNotification[]>;
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
