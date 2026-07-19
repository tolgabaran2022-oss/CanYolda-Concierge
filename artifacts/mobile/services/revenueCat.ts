/**
 * Central RevenueCat service for CanYoldaşı.
 *
 * API key selection (platform-specific):
 *   iOS     → EXPO_PUBLIC_REVENUECAT_IOS_API_KEY
 *   Android → EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY
 *
 * Both env vars must be set before submitting to App Store / Google Play.
 * The old single-key var (EXPO_PUBLIC_REVENUECAT_API_KEY) is kept only as a
 * last-resort development fallback so CI/dev builds don't crash silently.
 */

import { Platform } from "react-native";
import type { PurchasesPackage } from "react-native-purchases";

/** Module-level guard — ensures Purchases.configure() is called at most once. */
let _initialized = false;
/** The user ID that was last passed to Purchases.logIn(). */
let _currentRcUserId: string | null = null;

/** Safely import the native SDK. Returns null on web or on error. */
async function getPurchases() {
  if (Platform.OS === "web") return null;
  try {
    const mod = await import("react-native-purchases");
    return { Purchases: mod.default, LOG_LEVEL: mod.LOG_LEVEL };
  } catch {
    return null;
  }
}

/**
 * Resolves the platform-appropriate RevenueCat public SDK key.
 *
 * Priority:
 *   1. Platform-specific key (EXPO_PUBLIC_REVENUECAT_IOS_API_KEY / ANDROID)
 *   2. Legacy single-key (EXPO_PUBLIC_REVENUECAT_API_KEY) — dev fallback only
 *
 * Returns undefined if no key is configured so the caller can warn.
 */
function resolveApiKey(): string | undefined {
  if (Platform.OS === "ios") {
    const iosKey = process.env.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY;
    if (iosKey) return iosKey;
  }

  if (Platform.OS === "android") {
    const androidKey = process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY;
    if (androidKey) return androidKey;
  }

  // Dev fallback — single shared key (Test Store).
  // ⚠ NEVER ship to production without platform-specific keys above.
  const legacyKey = process.env.EXPO_PUBLIC_REVENUECAT_API_KEY;
  if (legacyKey) {
    if (__DEV__) {
      console.warn(
        "[RevenueCat] Using legacy EXPO_PUBLIC_REVENUECAT_API_KEY — " +
        "set platform-specific keys before App Store / Google Play submission."
      );
    }
    return legacyKey;
  }

  return undefined;
}

/**
 * Initialize the RevenueCat SDK.
 * Idempotent — safe to call multiple times (Fast Refresh, Strict Mode, remount).
 * Must be called before any other SDK operation.
 *
 * @param userId - The authenticated user's stable UUID.
 *                 Pass undefined/null when auth is not yet resolved.
 */
export async function initializeRevenueCat(userId?: string | null): Promise<void> {
  if (Platform.OS === "web") return;

  const apiKey = resolveApiKey();
  if (!apiKey) {
    if (__DEV__) {
      console.warn(
        "[RevenueCat] No API key configured. " +
        "Set EXPO_PUBLIC_REVENUECAT_IOS_API_KEY or EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY."
      );
    }
    return;
  }

  const sdk = await getPurchases();
  if (!sdk) {
    if (__DEV__) console.warn("[RevenueCat] SDK unavailable on this runtime (Expo Go / web)");
    return;
  }

  const { Purchases, LOG_LEVEL } = sdk;

  try {
    if (!_initialized) {
      /* Debug logging must be set before configure() */
      if (__DEV__) {
        Purchases.setLogLevel(LOG_LEVEL.DEBUG);
      }

      Purchases.configure({ apiKey });
      _initialized = true;
      if (__DEV__) console.log("[RevenueCat] SDK configured (platform:", Platform.OS, ")");
    }

    /* Associate with the authenticated user UUID if provided */
    if (userId && userId !== _currentRcUserId) {
      await Purchases.logIn(userId);
      _currentRcUserId = userId;
      if (__DEV__) console.log("[RevenueCat] Logged in user");
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (__DEV__) console.warn("[RevenueCat] Initialization failed:", msg);
    /* Do not rethrow — RC failure must never crash the app */
  }
}

/**
 * Associate an authenticated user with RevenueCat.
 * Call after login, register, or session restore once user.id is available.
 */
export async function loginRevenueCat(userId: string): Promise<void> {
  if (Platform.OS === "web" || !userId) return;
  if (userId === _currentRcUserId) return;

  const sdk = await getPurchases();
  if (!sdk || !_initialized) {
    /* SDK not yet configured — initialize will handle login */
    await initializeRevenueCat(userId);
    return;
  }

  try {
    await sdk.Purchases.logIn(userId);
    _currentRcUserId = userId;
    if (__DEV__) console.log("[RevenueCat] User identity updated");
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (__DEV__) console.warn("[RevenueCat] logIn failed:", msg);
  }
}

/**
 * Reset RevenueCat identity on logout.
 * Switches the SDK back to an anonymous customer so the next
 * user's purchases are not mixed with the previous user's.
 */
export async function logoutRevenueCat(): Promise<void> {
  if (Platform.OS === "web") return;
  if (!_initialized) return;

  const sdk = await getPurchases();
  if (!sdk) return;

  try {
    await sdk.Purchases.logOut();
    _currentRcUserId = null;
    if (__DEV__) console.log("[RevenueCat] Logged out — identity reset to anonymous");
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (__DEV__) console.warn("[RevenueCat] logOut failed:", msg);
  }
}

/** Returns whether the SDK has been configured in this session. */
export function isRevenueCatInitialized(): boolean {
  return _initialized;
}

/* ──────────────────────────────────────────────────────────────
   Offerings
────────────────────────────────────────────────────────────── */

/** Expected offering identifier for CanYoldaşı boost feature */
const EXPECTED_OFFERING_ID = "canyoldasi_boost";
export const PET_PREMIUM_OFFERING_ID = "evcilim_premium";
export const PET_PREMIUM_ENTITLEMENT_ID = "evcilim_premium";

/**
 * Fetch boost packages from RevenueCat.
 *
 * Lookup order: offerings.current → offerings.all["canyoldasi_boost"]
 * Throws on network / SDK error so callers can show a retry UI.
 * Returns an empty array on web (native IAP not supported).
 */
export async function fetchOfferings(): Promise<PurchasesPackage[]> {
  if (Platform.OS === "web") return [];

  const sdk = await getPurchases();
  if (!sdk) throw new Error("RevenueCat SDK unavailable");
  if (!_initialized) throw new Error("RevenueCat SDK not yet initialized");

  const allOfferings = await sdk.Purchases.getOfferings();

  /* Prefer the current/default offering; fall back to explicit ID */
  const offering =
    allOfferings.current ?? allOfferings.all[EXPECTED_OFFERING_ID] ?? null;

  if (!offering) {
    throw new Error("No RevenueCat offering available");
  }

  if (__DEV__ && offering.identifier !== EXPECTED_OFFERING_ID) {
    console.warn(
      `[RevenueCat] Unexpected offering identifier: "${offering.identifier}" (expected "${EXPECTED_OFFERING_ID}")`
    );
  }

  return offering.availablePackages as PurchasesPackage[];
}

/** Fetch the subscription packages dedicated to Evcilim Premium. */
export async function fetchPetPremiumOfferings(): Promise<PurchasesPackage[]> {
  if (Platform.OS === "web") return [];
  const sdk = await getPurchases();
  if (!sdk) throw new Error("RevenueCat SDK unavailable");
  if (!_initialized) throw new Error("RevenueCat SDK not yet initialized");
  const offerings = await sdk.Purchases.getOfferings();
  const offering = offerings.all[PET_PREMIUM_OFFERING_ID] ?? null;
  if (!offering) throw new Error("Evcilim Premium offering unavailable");
  return offering.availablePackages as PurchasesPackage[];
}

export async function purchasePetPremium(pkg: PurchasesPackage) {
  if (Platform.OS === "web") throw new Error("native_purchase_required");
  const sdk = await getPurchases();
  if (!sdk || !_initialized) throw new Error("RevenueCat SDK unavailable");
  return sdk.Purchases.purchasePackage(pkg);
}

export async function getPetPremiumCustomerInfo() {
  if (Platform.OS === "web") return null;
  const sdk = await getPurchases();
  if (!sdk || !_initialized) return null;
  return sdk.Purchases.getCustomerInfo();
}

/* ──────────────────────────────────────────────────────────────
   Restore Purchases
────────────────────────────────────────────────────────────── */

/**
 * Restore previous purchases from the App Store / Google Play.
 *
 * Required by App Store Review Guidelines §3.1.1 on every paywall screen.
 * Returns the refreshed CustomerInfo; throws on SDK error.
 * Web: no-op (returns null).
 */
export async function restorePurchases() {
  if (Platform.OS === "web") return null;

  const sdk = await getPurchases();
  if (!sdk) throw new Error("RevenueCat SDK unavailable");
  if (!_initialized) throw new Error("RevenueCat SDK not yet initialized");

  if (__DEV__) console.log("[RevenueCat] Restoring purchases…");
  const customerInfo = await sdk.Purchases.restorePurchases();
  if (__DEV__) console.log("[RevenueCat] Restore complete");
  return customerInfo;
}
