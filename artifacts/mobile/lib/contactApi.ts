import { apiFetch, API_BASE } from "./apiClient.js";

export type ContactPrefs = {
  allowPhoneContact: boolean;
  allowMessages:     boolean;
};

export type PhoneRevealResult = {
  phoneNumber:       string;
  allowPhoneContact: boolean;
  allowMessages:     boolean;
};

/** Authenticated — save contact prefs + phone number for a listing (owner only). */
export async function apiSaveListingContact(
  listingId: string,
  phoneNumber: string,
  allowPhoneContact: boolean,
  allowMessages: boolean
): Promise<void> {
  const res = await apiFetch("/listings/contact", {
    method: "POST",
    body: JSON.stringify({ listingId, phoneNumber, allowPhoneContact, allowMessages }),
  });
  if (!res.ok) throw new Error("save contact failed");
}

/** Authenticated — reveal the phone number for a listing. */
export async function apiRevealPhone(listingId: string): Promise<PhoneRevealResult> {
  const res = await apiFetch(`/listings/${listingId}/phone`);
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

/** Public — get public contact preferences for a listing (no auth required). */
export async function apiGetContactPrefs(listingId: string): Promise<ContactPrefs> {
  try {
    const res = await fetch(`${API_BASE}/listings/${listingId}/contact-prefs`);
    if (!res.ok) return { allowPhoneContact: true, allowMessages: true };
    return res.json() as Promise<ContactPrefs>;
  } catch {
    return { allowPhoneContact: true, allowMessages: true };
  }
}
