const API_BASE = process.env.EXPO_PUBLIC_DOMAIN
  ? `https://${process.env.EXPO_PUBLIC_DOMAIN}/api`
  : "http://localhost:8080/api";

function hdrs(userId?: string): Record<string, string> {
  const h: Record<string, string> = { "Content-Type": "application/json" };
  if (userId) h["x-user-id"] = userId;
  return h;
}

export type ContactPrefs = {
  allowPhoneContact: boolean;
  allowMessages:     boolean;
};

export type PhoneRevealResult = {
  phoneNumber:       string;
  allowPhoneContact: boolean;
  allowMessages:     boolean;
};

/** Save contact prefs + phone number for a listing (owner only). */
export async function apiSaveListingContact(
  myId: string,
  listingId: string,
  phoneNumber: string,
  allowPhoneContact: boolean,
  allowMessages: boolean
): Promise<void> {
  const res = await fetch(`${API_BASE}/listings/contact`, {
    method: "POST",
    headers: hdrs(myId),
    body: JSON.stringify({ listingId, phoneNumber, allowPhoneContact, allowMessages }),
  });
  if (!res.ok) throw new Error("save contact failed");
}

/** Reveal the phone number for a listing (requires auth; fails if owner disabled it). */
export async function apiRevealPhone(
  myId: string,
  listingId: string
): Promise<PhoneRevealResult> {
  const res = await fetch(`${API_BASE}/listings/${listingId}/phone`, {
    headers: hdrs(myId),
  });
  if (res.status === 403) {
    const body = await res.json() as { error: string };
    throw new Error(body.error ?? "Telefon numarası paylaşılmıyor");
  }
  if (res.status === 404) {
    throw new Error("İletişim bilgisi bulunamadı");
  }
  if (!res.ok) throw new Error("phone reveal failed");
  return res.json() as Promise<PhoneRevealResult>;
}

/** Get public contact preferences for a listing (no auth required). */
export async function apiGetContactPrefs(listingId: string): Promise<ContactPrefs> {
  try {
    const res = await fetch(`${API_BASE}/listings/${listingId}/contact-prefs`);
    if (!res.ok) return { allowPhoneContact: true, allowMessages: true };
    return res.json() as Promise<ContactPrefs>;
  } catch {
    return { allowPhoneContact: true, allowMessages: true };
  }
}
