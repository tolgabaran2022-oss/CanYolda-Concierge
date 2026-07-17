---
name: RevenueCat platform-specific API keys
description: Production requires separate iOS/Android RC keys; single-key was Test Store only; restorePurchases required for App Store approval.
---

## Rule

`revenueCat.ts` must select the API key by `Platform.OS`:
- iOS   → `EXPO_PUBLIC_REVENUECAT_IOS_API_KEY`
- Android → `EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY`
- Dev fallback only → legacy `EXPO_PUBLIC_REVENUECAT_API_KEY`

The `resolveApiKey()` helper in `revenueCat.ts` implements this priority chain.

**Why:** RevenueCat issues separate public API keys per platform (App Store connect project vs Google Play project). Using one Test Store key for both platforms causes purchase validation failures in production and links iOS/Android transactions to the wrong app.

**How to apply:** Before any App Store / Google Play submission, set `EXPO_PUBLIC_REVENUECAT_IOS_API_KEY` and `EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY` as Replit secrets. The legacy key (`EXPO_PUBLIC_REVENUECAT_API_KEY`) must NOT be present in production builds.

## Restore purchases

`restorePurchases()` is exported from `revenueCat.ts`. The `boost-packages.tsx` paywall screen calls it via `handleRestore` and displays a "Satın Alımları Geri Yükle" button. This is required by App Store Review Guidelines §3.1.1 on every paywall screen that offers non-subscription IAP.

The restore flow for `NON_RENEWING` boosts iterates `customerInfo.nonSubscriptionTransactions` filtered by our known product IDs and re-calls `/api/promotions/verify-purchase` (idempotent).

## Two activation tables (historical context)

There are two boost activation tables:
- `listing_promotions` — used by `/api/boost/verify-iap` (legacy endpoint, NOT called by mobile)
- `listing_promotion_purchases` — used by `/api/promotions/verify-purchase` (active endpoint, called by mobile)

The mobile client (`boost-packages.tsx`) always calls `/api/promotions/verify-purchase`. The `/api/boost/verify-iap` route is a legacy artifact that can be removed in a future cleanup pass without affecting mobile functionality.
