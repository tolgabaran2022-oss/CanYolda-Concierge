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

/** Simplified package data returned from RC for display & purchase. */
export interface RCPackageInfo {
  /** RC package identifier, e.g. "boost_1_day" */
  identifier: string;
  /** Localized product title from RevenueCat / App Store / Play Store */
  title: string;
  /** Localized price string including currency symbol, e.g. "₺29,99" */
  priceString: string;
  /** Raw numeric price (for sorting / comparison) */
  price: number;
  /** ISO currency code, e.g. "TRY" */
  currencyCode: string;
  /** Raw PurchasesPackage object — pass to Purchases.purchasePackage() when ready */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  nativePackage: any;
}

/** RC offering identifier used by CanYoldaşı */
const OFFERING_ID = "canyoldasi_boost";

/**
 * Fetch the canyoldasi_boost offering from RevenueCat.
 * Returns available packages sorted by price ascending.
 * Throws on network/SDK error so callers can show a retry UI.
 */
export async function fetchOfferings(): Promise<RCPackageInfo[]> {
  if (Platform.OS === "web") return [];

  const sdk = await getPurchases();
  if (!sdk) throw new Error("RevenueCat SDK unavailable");
  if (!_initialized) throw new Error("RevenueCat SDK not yet initialized");

  const offerings = await sdk.Purchases.getOfferings();
  const offering = offerings.all[OFFERING_ID] ?? offerings.current;
  if (!offering) throw new Error(`Offering "${OFFERING_ID}" not found`);

  return offering.availablePackages
    .map((pkg: any): RCPackageInfo => ({
      identifier:    pkg.identifier,
      title:         pkg.product.title ?? pkg.product.localizedTitle ?? pkg.identifier,
      priceString:   pkg.product.priceString,
      price:         pkg.product.price,
      currencyCode:  pkg.product.currencyCode ?? "TRY",
      nativePackage: pkg,
    }))
    .sort((a: RCPackageInfo, b: RCPackageInfo) => a.price - b.price);
}
