/**
 * Central RevenueCat service for CanYoldaşı.
 *
 * ⚠️  IMPORTANT — TEST STORE KEY WARNING:
 *   EXPO_PUBLIC_REVENUECAT_API_KEY currently uses the RevenueCat TEST STORE
 *   public SDK key during development.
 *   Before App Store / Google Play production release this MUST be replaced
 *   with the platform-specific production RevenueCat public API keys
 *   (EXPO_PUBLIC_REVENUECAT_IOS_API_KEY / EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY).
 *   NEVER ship production intentionally using the Test Store key.
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
 * Initialize the RevenueCat SDK.
 * Idempotent — safe to call multiple times (Fast Refresh, Strict Mode, remount).
 * Must be called before any other SDK operation.
 *
 * @param userId - The authenticated user's stable UUID.
 *                 Pass undefined/null when auth is not yet resolved.
 */
export async function initializeRevenueCat(userId?: string | null): Promise<void> {
  if (Platform.OS === "web") return;

  const apiKey = process.env.EXPO_PUBLIC_REVENUECAT_API_KEY;
  if (!apiKey) {
    if (__DEV__) console.warn("[RevenueCat] API key is missing — EXPO_PUBLIC_REVENUECAT_API_KEY not set");
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
      if (__DEV__) console.log("[RevenueCat] SDK configured");
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
