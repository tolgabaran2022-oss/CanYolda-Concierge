const API_BASE = process.env.EXPO_PUBLIC_DOMAIN
  ? `https://${process.env.EXPO_PUBLIC_DOMAIN}/api`
  : "http://localhost:8080/api";

function hdrs(userId?: string): Record<string, string> {
  const h: Record<string, string> = { "Content-Type": "application/json" };
  if (userId) h["x-user-id"] = userId;
  return h;
}

export type ApiConversation = {
  id:             string;
  userOne:        string;
  userTwo:        string;
  otherUserId:    string;
  otherUsername:  string;
  otherAvatarUrl: string;
  listingId?:     string;
  listingTitle?:  string;
  listingImage?:  string;
  lastMessage:    string;
  lastMessageAt:  string;
  unreadCount:    number;
};

export type ApiMessage = {
  id:             string;
  conversationId: string;
  senderId:       string;
  message:        string;
  imageUrl?:      string;
  isRead:         boolean;
  createdAt:      string;
};

export async function apiGetOrCreateConversation(
  myId: string,
  otherId: string,
  listing?: { id: string; title: string; imageUrl: string }
): Promise<ApiConversation> {
  const res = await fetch(`${API_BASE}/messages/conversations`, {
    method: "POST",
    headers: hdrs(myId),
    body: JSON.stringify({ otherId, listing }),
  });
  if (!res.ok) throw new Error("create conversation failed");
  return res.json() as Promise<ApiConversation>;
}

export async function apiGetConversations(myId: string): Promise<ApiConversation[]> {
  const res = await fetch(`${API_BASE}/messages/conversations`, { headers: hdrs(myId) });
  if (!res.ok) throw new Error("fetch conversations failed");
  return res.json() as Promise<ApiConversation[]>;
}

export async function apiGetMessages(
  conversationId: string,
  myId: string,
  after?: string
): Promise<ApiMessage[]> {
  const url = after
    ? `${API_BASE}/messages/conversations/${conversationId}/messages?after=${encodeURIComponent(after)}`
    : `${API_BASE}/messages/conversations/${conversationId}/messages`;
  const res = await fetch(url, { headers: hdrs(myId) });
  if (!res.ok) throw new Error("fetch messages failed");
  return res.json() as Promise<ApiMessage[]>;
}

export async function apiSendMessage(
  conversationId: string,
  myId: string,
  message: string,
  imageUrl?: string
): Promise<ApiMessage> {
  const res = await fetch(`${API_BASE}/messages/conversations/${conversationId}/messages`, {
    method: "POST",
    headers: hdrs(myId),
    body: JSON.stringify({ message, imageUrl }),
  });
  if (!res.ok) throw new Error("send message failed");
  return res.json() as Promise<ApiMessage>;
}

export async function apiMarkRead(conversationId: string, myId: string): Promise<void> {
  await fetch(`${API_BASE}/messages/conversations/${conversationId}/read`, {
    method: "POST",
    headers: hdrs(myId),
  });
}

export async function apiGetUnreadTotal(myId: string): Promise<number> {
  try {
    const convs = await apiGetConversations(myId);
    return convs.reduce((sum, c) => sum + (c.unreadCount ?? 0), 0);
  } catch { return 0; }
}
