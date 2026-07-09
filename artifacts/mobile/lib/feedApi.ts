const API_BASE = process.env.EXPO_PUBLIC_DOMAIN
  ? `https://${process.env.EXPO_PUBLIC_DOMAIN}/api`
  : "http://localhost:8080/api";

export type ApiPost = {
  id: string;
  username: string;
  avatarUrl: string;
  imageUrl: string;
  caption: string;
  location: string;
  timeAgo: string;
  likesCount: number;
  commentsCount: number;
  sharesCount: number;
  liked: boolean;
  bookmarked: boolean;
  createdAt: string;
};

export type ApiComment = {
  id: string;
  postId: string;
  username: string;
  text: string;
  createdAt: string;
};

function hdrs(userId?: string): Record<string, string> {
  const h: Record<string, string> = { "Content-Type": "application/json" };
  if (userId) h["x-user-id"] = userId;
  return h;
}

export async function apiFetchPosts(userId?: string): Promise<ApiPost[]> {
  const res = await fetch(`${API_BASE}/feed/posts`, { headers: hdrs(userId) });
  if (!res.ok) throw new Error("fetch posts failed");
  return res.json() as Promise<ApiPost[]>;
}

export async function apiFetchUserPosts(userId: string): Promise<ApiPost[]> {
  const res = await fetch(`${API_BASE}/feed/posts?userId=${encodeURIComponent(userId)}`, { headers: hdrs(userId) });
  if (!res.ok) throw new Error("fetch user posts failed");
  return res.json() as Promise<ApiPost[]>;
}

export async function apiToggleLike(
  postId: string,
  userId: string
): Promise<{ liked: boolean; likesCount: number }> {
  const res = await fetch(`${API_BASE}/feed/posts/${postId}/like`, {
    method: "POST",
    headers: hdrs(userId),
  });
  if (!res.ok) throw new Error("toggle like failed");
  return res.json() as Promise<{ liked: boolean; likesCount: number }>;
}

export async function apiToggleBookmark(
  postId: string,
  userId: string
): Promise<{ bookmarked: boolean }> {
  const res = await fetch(`${API_BASE}/feed/posts/${postId}/bookmark`, {
    method: "POST",
    headers: hdrs(userId),
  });
  if (!res.ok) throw new Error("toggle bookmark failed");
  return res.json() as Promise<{ bookmarked: boolean }>;
}

export async function apiFetchComments(postId: string): Promise<ApiComment[]> {
  const res = await fetch(`${API_BASE}/feed/posts/${postId}/comments`);
  if (!res.ok) throw new Error("fetch comments failed");
  return res.json() as Promise<ApiComment[]>;
}

export async function apiAddComment(
  postId: string,
  username: string,
  text: string
): Promise<ApiComment> {
  const res = await fetch(`${API_BASE}/feed/posts/${postId}/comments`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, text }),
  });
  if (!res.ok) throw new Error("add comment failed");
  return res.json() as Promise<ApiComment>;
}

export async function apiCreatePost(data: {
  username: string;
  avatarUrl: string;
  imageUrl: string;
  caption: string;
  location: string;
  userId: string;
}): Promise<ApiPost & { liked: boolean; bookmarked: boolean }> {
  const res = await fetch(`${API_BASE}/feed/posts`, {
    method: "POST",
    headers: hdrs(data.userId),
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("create post failed");
  return res.json() as Promise<ApiPost & { liked: boolean; bookmarked: boolean }>;
}
