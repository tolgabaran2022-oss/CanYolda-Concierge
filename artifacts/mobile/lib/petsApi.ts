import { apiFetch, API_BASE } from "./apiClient.js";

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

/** Public — fetch another user's pets (no auth required) */
export async function apiGetUserPets(targetUserId: string): Promise<ApiPetProfile[]> {
  const res = await fetch(`${API_BASE}/pets/user/${encodeURIComponent(targetUserId)}`);
  if (!res.ok) return [];
  return res.json() as Promise<ApiPetProfile[]>;
}

/** Authenticated — fetch the current user's pets */
export async function apiGetMyPets(): Promise<ApiPetProfile[]> {
  const res = await apiFetch("/pets");
  if (!res.ok) throw new Error("fetch pets failed");
  return res.json() as Promise<ApiPetProfile[]>;
}

/** Public — fetch a single pet profile */
export async function apiGetPet(petId: string): Promise<ApiPetProfile> {
  const res = await fetch(`${API_BASE}/pets/${petId}`);
  if (!res.ok) throw new Error("fetch pet failed");
  return res.json() as Promise<ApiPetProfile>;
}

/** Authenticated — create a new pet */
export async function apiCreatePet(data: {
  name: string; type: string; breed: string; gender: string;
  birthDate: string; weight: string; color: string;
  avatarUrl: string; bio: string; location: string;
}): Promise<ApiPetProfile> {
  const res = await apiFetch("/pets", {
    method: "POST",
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("create pet failed");
  return res.json() as Promise<ApiPetProfile>;
}

/** Authenticated — update a pet (must be owner) */
export async function apiUpdatePet(petId: string, data: Partial<{
  name: string; type: string; breed: string; gender: string;
  birthDate: string; weight: string; color: string;
  avatarUrl: string; bio: string; location: string;
}>): Promise<ApiPetProfile> {
  const res = await apiFetch(`/pets/${petId}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("update pet failed");
  return res.json() as Promise<ApiPetProfile>;
}

/** Authenticated — delete a pet (must be owner) */
export async function apiDeletePet(petId: string): Promise<void> {
  const res = await apiFetch(`/pets/${petId}`, { method: "DELETE" });
  if (!res.ok) throw new Error("delete pet failed");
}

/** Public — fetch a pet's posts */
export async function apiGetPetPosts(petId: string): Promise<ApiPetPost[]> {
  const res = await fetch(`${API_BASE}/pets/${petId}/posts`);
  if (!res.ok) throw new Error("fetch pet posts failed");
  return res.json() as Promise<ApiPetPost[]>;
}

/** Authenticated — create a post for a pet (must be owner) */
export async function apiCreatePetPost(petId: string, data: {
  imageUrl: string; caption: string; location: string;
}): Promise<ApiPetPost> {
  const res = await apiFetch(`/pets/${petId}/posts`, {
    method: "POST",
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("create pet post failed");
  return res.json() as Promise<ApiPetPost>;
}

/** Authenticated — delete a pet post (must be owner) */
export async function apiDeletePetPost(petId: string, postId: string): Promise<void> {
  const res = await apiFetch(`/pets/${petId}/posts/${postId}`, { method: "DELETE" });
  if (!res.ok) throw new Error("delete pet post failed");
}

/** Public — fetch a pet's legacy health records */
export async function apiGetPetHealth(petId: string): Promise<ApiPetHealth[]> {
  const res = await fetch(`${API_BASE}/pets/${petId}/health`);
  if (!res.ok) throw new Error("fetch pet health failed");
  return res.json() as Promise<ApiPetHealth[]>;
}

/** Authenticated — add a legacy health record (must be owner) */
export async function apiAddPetHealth(petId: string, data: {
  vaccineName: string; date: string; nextDate: string; note: string;
}): Promise<ApiPetHealth> {
  const res = await apiFetch(`/pets/${petId}/health`, {
    method: "POST",
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("add pet health failed");
  return res.json() as Promise<ApiPetHealth>;
}

/** Authenticated — delete a legacy health record (must be owner) */
export async function apiDeletePetHealth(petId: string, healthId: string): Promise<void> {
  const res = await apiFetch(`/pets/${petId}/health/${healthId}`, { method: "DELETE" });
  if (!res.ok) throw new Error("delete pet health failed");
}

/** Authenticated — toggle follow on a pet */
export async function apiTogglePetFollow(petId: string): Promise<{ following: boolean; followersCount: number }> {
  const res = await apiFetch(`/pets/${petId}/follow`, { method: "POST" });
  if (!res.ok) throw new Error("toggle pet follow failed");
  return res.json() as Promise<{ following: boolean; followersCount: number }>;
}

/** Authenticated — check if the current user follows a pet */
export async function apiCheckPetFollow(petId: string): Promise<boolean> {
  const res = await apiFetch(`/pets/${petId}/following`);
  if (!res.ok) return false;
  const data = await res.json() as { following: boolean };
  return data.following;
}
