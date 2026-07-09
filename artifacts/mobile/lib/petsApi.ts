const API_BASE = process.env.EXPO_PUBLIC_DOMAIN
  ? `https://${process.env.EXPO_PUBLIC_DOMAIN}/api`
  : "http://localhost:8080/api";

function hdrs(userId?: string): Record<string, string> {
  const h: Record<string, string> = { "Content-Type": "application/json" };
  if (userId) h["x-user-id"] = userId;
  return h;
}

export type ApiPetProfile = {
  id: string;
  ownerId: string;
  name: string;
  type: string;
  breed: string;
  gender: string;
  birthDate: string;
  weight: string;
  color: string;
  avatarUrl: string;
  bio: string;
  location: string;
  postsCount: number;
  followersCount: number;
  createdAt: string;
};

export type ApiPetPost = {
  id: string;
  petId: string;
  ownerId: string;
  imageUrl: string;
  caption: string;
  location: string;
  createdAt: string;
};

export type ApiPetHealth = {
  id: string;
  petId: string;
  vaccineName: string;
  date: string;
  nextDate: string;
  note: string;
  createdAt: string;
};

export async function apiGetMyPets(userId: string): Promise<ApiPetProfile[]> {
  const res = await fetch(`${API_BASE}/pets`, { headers: hdrs(userId) });
  if (!res.ok) throw new Error("fetch pets failed");
  return res.json() as Promise<ApiPetProfile[]>;
}

export async function apiGetPet(petId: string): Promise<ApiPetProfile> {
  const res = await fetch(`${API_BASE}/pets/${petId}`);
  if (!res.ok) throw new Error("fetch pet failed");
  return res.json() as Promise<ApiPetProfile>;
}

export async function apiCreatePet(userId: string, data: {
  name: string; type: string; breed: string; gender: string;
  birthDate: string; weight: string; color: string;
  avatarUrl: string; bio: string; location: string;
}): Promise<ApiPetProfile> {
  const res = await fetch(`${API_BASE}/pets`, {
    method: "POST",
    headers: hdrs(userId),
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("create pet failed");
  return res.json() as Promise<ApiPetProfile>;
}

export async function apiUpdatePet(petId: string, userId: string, data: Partial<{
  name: string; type: string; breed: string; gender: string;
  birthDate: string; weight: string; color: string;
  avatarUrl: string; bio: string; location: string;
}>): Promise<ApiPetProfile> {
  const res = await fetch(`${API_BASE}/pets/${petId}`, {
    method: "PATCH",
    headers: hdrs(userId),
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("update pet failed");
  return res.json() as Promise<ApiPetProfile>;
}

export async function apiDeletePet(petId: string, userId: string): Promise<void> {
  const res = await fetch(`${API_BASE}/pets/${petId}`, {
    method: "DELETE",
    headers: hdrs(userId),
  });
  if (!res.ok) throw new Error("delete pet failed");
}

export async function apiGetPetPosts(petId: string): Promise<ApiPetPost[]> {
  const res = await fetch(`${API_BASE}/pets/${petId}/posts`);
  if (!res.ok) throw new Error("fetch pet posts failed");
  return res.json() as Promise<ApiPetPost[]>;
}

export async function apiCreatePetPost(petId: string, userId: string, data: {
  imageUrl: string; caption: string; location: string;
}): Promise<ApiPetPost> {
  const res = await fetch(`${API_BASE}/pets/${petId}/posts`, {
    method: "POST",
    headers: hdrs(userId),
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("create pet post failed");
  return res.json() as Promise<ApiPetPost>;
}

export async function apiDeletePetPost(petId: string, postId: string, userId: string): Promise<void> {
  const res = await fetch(`${API_BASE}/pets/${petId}/posts/${postId}`, {
    method: "DELETE",
    headers: hdrs(userId),
  });
  if (!res.ok) throw new Error("delete pet post failed");
}

export async function apiGetPetHealth(petId: string): Promise<ApiPetHealth[]> {
  const res = await fetch(`${API_BASE}/pets/${petId}/health`);
  if (!res.ok) throw new Error("fetch pet health failed");
  return res.json() as Promise<ApiPetHealth[]>;
}

export async function apiAddPetHealth(petId: string, userId: string, data: {
  vaccineName: string; date: string; nextDate: string; note: string;
}): Promise<ApiPetHealth> {
  const res = await fetch(`${API_BASE}/pets/${petId}/health`, {
    method: "POST",
    headers: hdrs(userId),
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("add pet health failed");
  return res.json() as Promise<ApiPetHealth>;
}

export async function apiDeletePetHealth(petId: string, healthId: string, userId: string): Promise<void> {
  const res = await fetch(`${API_BASE}/pets/${petId}/health/${healthId}`, {
    method: "DELETE",
    headers: hdrs(userId),
  });
  if (!res.ok) throw new Error("delete pet health failed");
}

export async function apiTogglePetFollow(petId: string, userId: string): Promise<{ following: boolean; followersCount: number }> {
  const res = await fetch(`${API_BASE}/pets/${petId}/follow`, {
    method: "POST",
    headers: hdrs(userId),
  });
  if (!res.ok) throw new Error("toggle pet follow failed");
  return res.json() as Promise<{ following: boolean; followersCount: number }>;
}

export async function apiCheckPetFollow(petId: string, userId: string): Promise<boolean> {
  const res = await fetch(`${API_BASE}/pets/${petId}/following`, { headers: hdrs(userId) });
  if (!res.ok) return false;
  const data = await res.json() as { following: boolean };
  return data.following;
}
