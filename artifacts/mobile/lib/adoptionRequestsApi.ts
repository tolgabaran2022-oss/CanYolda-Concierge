import AsyncStorage from "@react-native-async-storage/async-storage";

const TOKEN_KEY = "@canyoldasi:jwt";

export const API_BASE = process.env.EXPO_PUBLIC_DOMAIN
  ? `https://${process.env.EXPO_PUBLIC_DOMAIN}/api`
  : "http://localhost:8080/api";

export interface AdoptionRequest {
  id: string;
  listingId: string;
  requesterId: string;
  requesterName: string;
  ownerId: string;
  reason: string;
  hadPetBefore: boolean;
  livingSpace: string;
  hasOtherPets: boolean;
  aloneDuration: string;
  note: string;
  status: "pending" | "reviewing" | "accepted" | "rejected" | "cancelled" | "completed";
  createdAt: string;
  updatedAt: string;
  acceptedAt?: string;
  rejectedAt?: string;
}

async function apiFetch(path: string, opts: RequestInit = {}): Promise<Response> {
  const token = await AsyncStorage.getItem(TOKEN_KEY);
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(opts.headers as Record<string, string> ?? {}),
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  return fetch(`${API_BASE}${path}`, { ...opts, headers });
}

export interface SendAdoptionRequestPayload {
  listingId: string;
  userId: string;
  requesterName: string;
  requesterAvatar?: string;
  reason: string;
  hadPetBefore: boolean;
  livingSpace: string;
  hasOtherPets: boolean;
  aloneDuration: string;
  note?: string;
}

export async function apiSendAdoptionRequest(payload: SendAdoptionRequestPayload): Promise<AdoptionRequest> {
  const res = await apiFetch("/adoption-requests", {
    method: "POST",
    headers: { "x-user-id": payload.userId },
    body: JSON.stringify({
      listingId:      payload.listingId,
      requesterName:  payload.requesterName,
      requesterAvatar: payload.requesterAvatar ?? "",
      reason:         payload.reason,
      hadPetBefore:   payload.hadPetBefore,
      livingSpace:    payload.livingSpace,
      hasOtherPets:   payload.hasOtherPets,
      aloneDuration:  payload.aloneDuration,
      note:           payload.note ?? "",
    }),
  });
  const data = await res.json() as Record<string, unknown>;
  if (!res.ok) throw new Error(String(data.error ?? "Talep gönderilemedi"));
  return data as unknown as AdoptionRequest;
}

export async function apiGetMyRequests(userId: string): Promise<AdoptionRequest[]> {
  const res = await apiFetch("/adoption-requests/my", { headers: { "x-user-id": userId } });
  if (!res.ok) return [];
  return res.json() as Promise<AdoptionRequest[]>;
}

export async function apiGetReceivedRequests(userId: string): Promise<AdoptionRequest[]> {
  const res = await apiFetch("/adoption-requests/received", { headers: { "x-user-id": userId } });
  if (!res.ok) return [];
  return res.json() as Promise<AdoptionRequest[]>;
}

export async function apiCheckAdoptionRequest(
  listingId: string,
  userId: string
): Promise<{ hasRequest: boolean; requestId?: string; status?: string }> {
  const res = await apiFetch(`/adoption-requests/check/${listingId}`, { headers: { "x-user-id": userId } });
  if (!res.ok) return { hasRequest: false };
  return res.json() as Promise<{ hasRequest: boolean; requestId?: string; status?: string }>;
}

export async function apiUpdateRequestStatus(
  requestId: string,
  userId: string,
  status: "accepted" | "rejected" | "cancelled" | "reviewing"
): Promise<AdoptionRequest> {
  const res = await apiFetch(`/adoption-requests/${requestId}/status`, {
    method: "PATCH",
    headers: { "x-user-id": userId },
    body: JSON.stringify({ status }),
  });
  const data = await res.json() as Record<string, unknown>;
  if (!res.ok) throw new Error(String(data.error ?? "Durum güncellenemedi"));
  return data as unknown as AdoptionRequest;
}

export async function apiGetRequestsForListing(listingId: string, userId: string): Promise<AdoptionRequest[]> {
  const res = await apiFetch(`/adoption-requests/for-listing/${listingId}`, { headers: { "x-user-id": userId } });
  if (!res.ok) return [];
  return res.json() as Promise<AdoptionRequest[]>;
}
