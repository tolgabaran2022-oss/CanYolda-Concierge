---
name: Local URI upload bug pattern
description: ImagePicker returns device-local file:// URIs that must be uploaded before persisting; 6 screens had this bug fixed in production audit
---

## Rule
Every screen that lets a user pick a photo with ImagePicker **must** call the `/api/upload` multipart endpoint first, then store only the returned `https://` URL in the database. Never pass the raw `file://` / `content://` / `ph://` URI to a context mutation or API call.

**Why:** Local URIs are device-private paths. They break on every other device, survive 0 app updates, and cause silent broken-image bugs that are hard to reproduce. Two pet_profiles rows in production were found with device-local paths that had to be cleared to empty string.

## How to apply
Before each `addX()` / `updateX()` call that takes an image URL:
```ts
let remoteUrl: string | undefined;
if (localUri && (localUri.startsWith("file://") || localUri.startsWith("content://") || localUri.startsWith("ph://"))) {
  try { remoteUrl = await uploadImage(localUri); }
  catch { /* alert user, fall through with undefined */ }
}
```

## Screens fixed
- `add-pet.tsx` — addPet
- `evcilim/add.tsx` — addPet (separate duplicate screen for Evcilim tab)
- `evcilim/[petId].tsx` — updatePet
- `adoption/edit/[id].tsx` — updateListing (multi-image array; use `Promise.all` + `isLocalUri()` guard to skip already-remote URLs)
- `profile-edit.tsx` — updateProfile avatar
- `help-update/[animalId].tsx` — was sending full base64 in JSON body (413 risk); switched to multipart upload

## safeJson pattern
All context `.json()` calls replaced with:
```ts
async function safeJson<T>(res: Response): Promise<T> {
  const ct = res.headers.get("content-type") ?? "";
  if (!ct.includes("application/json"))
    throw new Error(`Sunucudan beklenmedik yanıt alındı (HTTP ${res.status})`);
  return res.json() as Promise<T>;
}
```
Added to: AnimalsContext, PetsContext, AdoptionContext, AuthContext.
