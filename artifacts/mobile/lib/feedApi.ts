const API_BASE = process.env.EXPO_PUBLIC_DOMAIN
  ? `https://${process.env.EXPO_PUBLIC_DOMAIN}/api`
  : "http://localhost:8080/api";

export type ApiPost = {
  id: string;
  userId: string;
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
  const data = await res.json();
  return Array.isArray(data) ? (data as ApiPost[]) : [];
}

export async function apiFetchFollowingPosts(userId: string): Promise<ApiPost[]> {
  const res = await fetch(`${API_BASE}/feed/posts?mode=following`, { headers: hdrs(userId) });
  if (!res.ok) throw new Error("fetch following posts failed");
  const data = await res.json();
  return Array.isArray(data) ? (data as ApiPost[]) : [];
}

export async function apiFetchUserPosts(userId: string): Promise<ApiPost[]> {
  const res = await fetch(`${API_BASE}/feed/posts?userId=${encodeURIComponent(userId)}`, { headers: hdrs(userId) });
  if (!res.ok) throw new Error("fetch user posts failed");
  const data = await res.json();
  return Array.isArray(data) ? (data as ApiPost[]) : [];
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
  const data = await res.json();
  return Array.isArray(data) ? (data as ApiComment[]) : [];
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

export async function apiFetchPost(postId: string, userId?: string): Promise<ApiPost> {
  const res = await fetch(`${API_BASE}/feed/posts/${postId}`, { headers: hdrs(userId) });
  if (!res.ok) throw new Error("fetch post failed");
  return res.json() as Promise<ApiPost>;
}

export async function apiEditPost(
  postId: string,
  userId: string,
  data: { caption?: string; location?: string }
): Promise<ApiPost> {
  const res = await fetch(`${API_BASE}/feed/posts/${postId}`, {
    method: "PATCH",
    headers: hdrs(userId),
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("edit post failed");
  return res.json() as Promise<ApiPost>;
}

export async function apiDeletePost(postId: string, userId: string): Promise<void> {
  const res = await fetch(`${API_BASE}/feed/posts/${postId}`, {
    method: "DELETE",
    headers: hdrs(userId),
  });
  if (!res.ok) throw new Error("delete post failed");
}

export async function apiDeleteComment(
  postId: string,
  commentId: string,
  userId: string
): Promise<void> {
  const res = await fetch(`${API_BASE}/feed/posts/${postId}/comments/${commentId}`, {
    method: "DELETE",
    headers: hdrs(userId),
  });
  if (!res.ok) throw new Error("delete comment failed");
}

export async function apiFetchBookmarkedPosts(userId: string): Promise<ApiPost[]> {
  const res = await fetch(`${API_BASE}/feed/bookmarks`, { headers: hdrs(userId) });
  if (!res.ok) throw new Error("fetch bookmarks failed");
  const data = await res.json();
  return Array.isArray(data) ? (data as ApiPost[]) : [];
}

export async function apiFetchUnreadCount(userId: string): Promise<number> {
  try {
    const res = await fetch(`${API_BASE}/notifications`, { headers: hdrs(userId) });
    if (!res.ok) return 0;
    const rows = await res.json() as { read: boolean }[];
    return rows.filter((r) => !r.read).length;
  } catch {
    return 0;
  }
}
