const API_BASE = process.env.EXPO_PUBLIC_DOMAIN
  ? `https://${process.env.EXPO_PUBLIC_DOMAIN}/api`
  : "http://localhost:8080/api";

export type ApiStoryItem = {
  id: string;
  imageUrl: string;
  caption: string;
  createdAt: string;
  viewCount: number;
  seen: boolean;
  liked?: boolean;
  likesCount?: number;
};

export type ApiStoryGroup = {
  userId: string;
  username: string;
  avatarUrl: string;
  hasUnseen: boolean;
  stories: ApiStoryItem[];
};

export type StoryViewer = {
  viewerId: string;
  viewedAt: string;
};

export type StoryLiker = {
  userId: string;
  username: string;
  avatarUrl: string;
};

function hdrs(userId?: string): Record<string, string> {
  const h: Record<string, string> = { "Content-Type": "application/json" };
  if (userId) h["x-user-id"] = userId;
  return h;
}

export async function apiFetchStories(userId?: string): Promise<ApiStoryGroup[]> {
  const res = await fetch(`${API_BASE}/stories`, { headers: hdrs(userId) });
  if (!res.ok) throw new Error("fetch stories failed");
  const data = await res.json();
  return Array.isArray(data) ? (data as ApiStoryGroup[]) : [];
}

export async function apiFetchUserStories(
  profileUserId: string,
  viewerId?: string
): Promise<ApiStoryGroup | null> {
  const res = await fetch(
    `${API_BASE}/stories/user/${encodeURIComponent(profileUserId)}`,
    { headers: hdrs(viewerId) }
  );
  if (!res.ok) return null;
  const data = await res.json();
  return (data as ApiStoryGroup | null) ?? null;
}

export async function apiCreateStory(
  userId: string,
  username: string,
  avatarUrl: string,
  imageUrl: string,
  caption: string
): Promise<ApiStoryGroup> {
  const res = await fetch(`${API_BASE}/stories`, {
    method: "POST",
    headers: hdrs(userId),
    body: JSON.stringify({ userId, username, avatarUrl, imageUrl, caption }),
  });
  if (!res.ok) throw new Error("create story failed");
  return res.json() as Promise<ApiStoryGroup>;
}

export async function apiViewStory(storyId: string, viewerId: string): Promise<{ viewed: boolean; viewCount: number }> {
  const res = await fetch(`${API_BASE}/stories/${storyId}/view`, {
    method: "POST",
    headers: hdrs(viewerId),
  });
  if (!res.ok) throw new Error("view story failed");
  return res.json() as Promise<{ viewed: boolean; viewCount: number }>;
}

export async function apiToggleStoryLike(storyId: string, userId: string): Promise<{ liked: boolean; likesCount: number }> {
  const res = await fetch(`${API_BASE}/stories/${storyId}/like`, {
    method: "POST",
    headers: hdrs(userId),
  });
  if (!res.ok) throw new Error("toggle story like failed");
  return res.json() as Promise<{ liked: boolean; likesCount: number }>;
}

export async function apiGetStoryLikeStatus(storyId: string, userId: string): Promise<{ liked: boolean; likesCount: number }> {
  const res = await fetch(`${API_BASE}/stories/${storyId}/like?userId=${encodeURIComponent(userId)}`);
  if (!res.ok) return { liked: false, likesCount: 0 };
  return res.json() as Promise<{ liked: boolean; likesCount: number }>;
}

export async function apiReplyToStory(
  storyId: string,
  senderId: string,
  receiverId: string,
  message: string
): Promise<{ ok: boolean }> {
  const res = await fetch(`${API_BASE}/stories/${storyId}/reply`, {
    method: "POST",
    headers: hdrs(senderId),
    body: JSON.stringify({ receiverId, message }),
  });
  if (!res.ok) throw new Error("reply to story failed");
  return res.json() as Promise<{ ok: boolean }>;
}

export async function apiGetStoryViewers(storyId: string, ownerId: string): Promise<StoryViewer[]> {
  const res = await fetch(`${API_BASE}/stories/${storyId}/views`, { headers: hdrs(ownerId) });
  if (!res.ok) return [];
  return res.json() as Promise<StoryViewer[]>;
}

export async function apiGetStoryLikers(storyId: string, ownerId: string): Promise<StoryLiker[]> {
  const res = await fetch(`${API_BASE}/stories/${storyId}/likers`, { headers: hdrs(ownerId) });
  if (!res.ok) return [];
  return res.json() as Promise<StoryLiker[]>;
}
