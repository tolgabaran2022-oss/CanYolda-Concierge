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
};

export type ApiStoryGroup = {
  userId: string;
  username: string;
  avatarUrl: string;
  hasUnseen: boolean;
  stories: ApiStoryItem[];
};

function hdrs(userId?: string): Record<string, string> {
  const h: Record<string, string> = { "Content-Type": "application/json" };
  if (userId) h["x-user-id"] = userId;
  return h;
}

export async function apiFetchStories(userId?: string): Promise<ApiStoryGroup[]> {
  const res = await fetch(`${API_BASE}/stories`, { headers: hdrs(userId) });
  if (!res.ok) throw new Error("fetch stories failed");
  return res.json() as Promise<ApiStoryGroup[]>;
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
