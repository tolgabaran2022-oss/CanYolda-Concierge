import { db, petPremiumAccess, petProfiles } from "@workspace/db";
import { count, eq, sql } from "drizzle-orm";
import {
  FREE_PET_LIMIT,
  resolveEffectivePetLimit,
} from "./petPremiumLimits.js";

export const PET_PREMIUM_ENTITLEMENT = "evcilim_premium";
export { FREE_PET_LIMIT, resolveEffectivePetLimit };

export type PetPremiumStatus = {
  isPremium: boolean;
  status: string;
  expiresAt: string | null;
  productId: string;
  petLimit: number;         // -1 if premium (unlimited), otherwise effectivePetLimit
  petCount: number;         // current pet count
  existingPetCount: number; // alias of petCount (backward compat)
  freePetLimit: number;     // always FREE_PET_LIMIT
  effectivePetLimit: number; // enforced limit for this user (grandfathering)
  canAddPet: boolean;
};

function active(status: string, expiresAt: Date | null): boolean {
  return (status === "active" || status === "trialing") &&
    (!expiresAt || expiresAt.getTime() > Date.now());
}

/** Ensure old users keep every pet that already existed before Premium gates. */
export async function ensurePetAccessRow(userId: string) {
  const [{ value: petCount }] = await db
    .select({ value: count() })
    .from(petProfiles)
    .where(eq(petProfiles.ownerId, userId));

  const existing = await db
    .select()
    .from(petPremiumAccess)
    .where(eq(petPremiumAccess.userId, userId))
    .limit(1);

  if (existing[0]) return { row: existing[0], petCount: Number(petCount) };

  const [row] = await db.insert(petPremiumAccess).values({
    userId,
    status: "inactive",
    grandfatheredPetLimit: Math.max(1, Number(petCount)),
  }).returning();

  return { row: row!, petCount: Number(petCount) };
}

export async function getPetPremiumStatus(userId: string): Promise<PetPremiumStatus> {
  const { row, petCount } = await ensurePetAccessRow(userId);
  const isPremium = active(row.status, row.expiresAt);
  const effectivePetLimit = resolveEffectivePetLimit(row.grandfatheredPetLimit);
  const petLimit = isPremium ? -1 : effectivePetLimit;
  return {
    isPremium,
    status: isPremium ? row.status : "inactive",
    expiresAt: row.expiresAt?.toISOString() ?? null,
    productId: row.productId,
    petLimit,
    petCount,
    existingPetCount: petCount,
    freePetLimit: FREE_PET_LIMIT,
    effectivePetLimit,
    canAddPet: isPremium || petCount === 0 || petCount < effectivePetLimit,
  };
}

/**
 * Verify the authenticated RevenueCat app_user_id from the trusted backend.
 * The client never supplies an entitlement result or an expiry timestamp.
 */
export async function refreshPetPremiumFromRevenueCat(userId: string): Promise<PetPremiumStatus> {
  const secret = process.env.REVENUECAT_SECRET_API_KEY;
  if (!secret) throw new Error("revenuecat_secret_missing");

  const response = await fetch(
    `https://api.revenuecat.com/v1/subscribers/${encodeURIComponent(userId)}`,
    { headers: { Authorization: `Bearer ${secret}`, "Content-Type": "application/json" } },
  );
  if (!response.ok) throw new Error(`revenuecat_verify_failed:${response.status}`);

  const body = await response.json() as {
    subscriber?: {
      entitlements?: Record<string, {
        expires_date?: string | null;
        product_identifier?: string | null;
        purchase_date?: string | null;
      }>;
    };
  };
  const entitlement = body.subscriber?.entitlements?.[PET_PREMIUM_ENTITLEMENT];
  const expiresAt = entitlement?.expires_date ? new Date(entitlement.expires_date) : null;
  const isActive = Boolean(entitlement) && (!expiresAt || expiresAt.getTime() > Date.now());

  await ensurePetAccessRow(userId);
  await db.update(petPremiumAccess).set({
    status: isActive ? "active" : "inactive",
    productId: entitlement?.product_identifier ?? "",
    entitlementId: PET_PREMIUM_ENTITLEMENT,
    expiresAt: isActive ? expiresAt : null,
    originalPurchaseAt: entitlement?.purchase_date ? new Date(entitlement.purchase_date) : null,
    lastVerifiedAt: new Date(),
    updatedAt: new Date(),
  }).where(eq(petPremiumAccess.userId, userId));

  return getPetPremiumStatus(userId);
}

export async function requirePetPremium(userId: string): Promise<boolean> {
  return (await getPetPremiumStatus(userId)).isPremium;
}
